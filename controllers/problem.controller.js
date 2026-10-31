const Problem = require("../models/problem.model");
const { isValidObjectId } = require("../utils/validator");
const {
  getLanguageById,
  submitBatch,
  getBatchResults,
  wait,
} = require("../utils/problem.service");

// 1. Create a new problem (Admin only)
const createProblem = async (req, res) => {
  try {
    const {
      title,
      description,
      difficulty,
      tags,
      visibleTestCases,
      hiddenTestCases,
      startCode,
      referenceSolution,
    } = req.body;

    // Validate required fields
    if (!title || !description || !difficulty) {
      return res.status(400).json({
        message: "Title, description, and difficulty are required.",
      });
    }

    const normalizedDifficulty = difficulty.toLowerCase().trim();
    if (!["easy", "medium", "hard"].includes(normalizedDifficulty)) {
      return res.status(400).json({
        message: "Difficulty must be 'easy', 'medium', or 'hard'.",
      });
    }

    const refSolutions = Array.isArray(referenceSolution)
      ? referenceSolution
      : referenceSolution
      ? [referenceSolution]
      : [];

    // Combine test cases for Judge0 submission array
    const allTestCases = [
      ...(visibleTestCases || []),
      ...(hiddenTestCases || []),
    ];

    // Build the submissions array:
    // - source_code: complete code
    // - language_id: language's ID
    // - stdin: input
    // - expected_output: output
    const submissions = [];

    for (const refSol of refSolutions) {
      const languageId = getLanguageById(refSol.language);
      if (!languageId) {
        return res.status(400).json({
          message: `Unsupported language: "${refSol.language}". Only C++ and Python are supported.`,
        });
      }

      for (const tc of allTestCases) {
        submissions.push({
          source_code: refSol.completeCode,
          language_id: languageId,
          stdin: tc.input,
          expected_output: tc.output,
        });
      }
    }

    if (submissions.length === 0) {
      return res.status(400).json({
        message: "At least one reference solution and test case are required.",
      });
    }

    const submitResult = await submitBatch(submissions);

    // Extract tokens returned by OnlineCompiler / Judge0
    const tokens = submitResult.map((item) => item.token);

    // Fetch batch results
    let testResult = await getBatchResults(tokens);

    // Status ID 1: In Queue, Status ID 2: Processing
    // Wait and poll every 1 second until compilation and execution finish
    let attempts = 0;
    const maxAttempts = 15; // Max 15 seconds

    while (
      testResult?.submissions?.some(
        (s) => s.status.id === 1 || s.status.id === 2
      ) &&
      attempts < maxAttempts
    ) {
      attempts++;
      await wait(1000); // Wait 1 second
      testResult = await getBatchResults(tokens);
    }

    // Verify status IDs: every test case must have status.id === 3 (Accepted)
    for (let i = 0; i < testResult.submissions.length; i++) {
      const sub = testResult.submissions[i];
      const statusId = sub.status.id;
      const statusDesc = sub.status.description;

      // Status 3 means Accepted
      if (statusId !== 3) {
        const failureReason = statusDesc || "Test case failed";
        const errorDetail =
          sub.compile_output || sub.stderr || sub.message || null;

        return res.status(400).json({
          message: `Reference solution verification failed: ${failureReason}`,
          statusId,
          statusDescription: statusDesc,
          error: errorDetail,
          failedTestCaseIndex: i % allTestCases.length,
          submissionResult: sub,
        });
      }
    }

    // All test cases passed with status 3 (Accepted) -> Save problem to database
    const problem = new Problem({
      title,
      description,
      difficulty: normalizedDifficulty,
      tags: tags || [],
      visibleTestCases: visibleTestCases || [],
      hiddenTestCases: hiddenTestCases || [],
      startCode: startCode || [],
      referenceSolution: refSolutions,
      problemCreator: req.user._id,
    });

    await problem.save();

    res.status(201).json({
      message: "Problem verified and created successfully",
      problem,
      verification: {
        totalTestCases: submissions.length,
        status: "Accepted",
        allPassed: true,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.response?.data || err.message });
  }
};

// 2. Update an existing problem (Admin only)
const updateProblem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid problem ID format." });
    }

    const allowedUpdates = [
      "title",
      "description",
      "difficulty",
      "tags",
      "visibleTestCases",
      "hiddenTestCases",
      "startCode",
      "referenceSolution",
    ];

    const updates = {};
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        if (key === "difficulty") {
          const normalized = req.body[key].toLowerCase().trim();
          if (!["easy", "medium", "hard"].includes(normalized)) {
            return res.status(400).json({
              message: "Difficulty must be 'easy', 'medium', or 'hard'.",
            });
          }
          updates[key] = normalized;
        } else {
          updates[key] = req.body[key];
        }
      }
    }

    if (updates.referenceSolution) {
      const refSolutions = Array.isArray(updates.referenceSolution)
        ? updates.referenceSolution
        : [updates.referenceSolution];
      for (const refSol of refSolutions) {
        if (!getLanguageById(refSol.language)) {
          return res.status(400).json({
            message: `Unsupported language: "${refSol.language}". Only C++ and Python are supported.`,
          });
        }
      }
    }

    const updatedProblem = await Problem.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!updatedProblem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    res.status(200).json({
      message: "Problem updated successfully",
      problem: updatedProblem,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 3. Delete a problem (Admin only)
const deleteProblem = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid problem ID format." });
    }

    const deletedProblem = await Problem.findByIdAndDelete(id);
    if (!deletedProblem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    res.status(200).json({
      message: "Problem deleted successfully",
      id: deletedProblem._id,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 4. Get all problems (Public / Normal User)
// Hidden test cases and reference solutions are excluded for regular users
const getAllProblems = async (req, res) => {
  try {
    const { difficulty, tag, page, limit } = req.query;

    const filter = {};
    if (difficulty) {
      filter.difficulty = difficulty.toLowerCase().trim();
    }
    if (tag) {
      filter.tags = tag.toLowerCase().trim();
    }

    // Pagination parameters (default page: 1, default limit: 10)
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    // Total problems matching filter
    const totalProblems = await Problem.countDocuments(filter);

    // Exclude hidden test cases and reference solution from public listing
    const problems = await Problem.find(filter)
      .select("-hiddenTestCases -referenceSolution")
      .populate("problemCreator", "firstName lastName emailId")
      .skip(skip)
      .limit(limitNum);

    res.status(200).json({
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(totalProblems / limitNum),
      totalProblems,
      count: problems.length,
      problems,
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 5. Get one problem by ID (Public / Normal User)
// Hidden test cases and reference solutions are excluded unless accessed by an admin
const getProblemById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid problem ID format." });
    }

    // Do not leak hidden test cases or reference solution to regular users
    const query = Problem.findById(id).populate(
      "problemCreator",
      "firstName lastName emailId"
    );

    // If an admin is requesting, include hidden cases and reference solution
    if (!req.user || req.user.role !== "admin") {
      query.select("-hiddenTestCases -referenceSolution");
    }

    const problem = await query;
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    res.status(200).json({ problem });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// 6. Solve / Submit a problem (Normal User - requires login)
const solveProblem = async (req, res) => {
  try {
    const { id } = req.params;
    const { language, code } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid problem ID format." });
    }

    if (!language || !code) {
      return res.status(400).json({
        message: "Language and code are required to submit a solution.",
      });
    }

    const problem = await Problem.findById(id);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found" });
    }

    // Acknowledge submission (code execution engine will evaluate this against hidden test cases)
    res.status(200).json({
      message: "Solution submitted successfully for evaluation",
      problemId: problem._id,
      title: problem.title,
      submittedBy: {
        id: req.user._id,
        emailId: req.user.emailId,
      },
      language,
      code,
      status: "Pending Evaluation",
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

module.exports = {
  createProblem,
  updateProblem,
  deleteProblem,
  getAllProblems,
  getProblemById,
  solveProblem,
};
