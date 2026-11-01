const Problem = require("../models/problem.model");
const Submission = require("../models/submission.model");
const { isValidObjectId } = require("../utils/validator");
const {
  getLanguageById,
  submitBatch,
  getBatchResults,
  wait,
} = require("../utils/problem.service");

/**
 * Maps Judge0 status IDs to our Submission schema enum values.
 */
const mapJudge0Status = (statusId, statusDesc) => {
  if (statusId === 3) return "Accepted";
  if (statusId === 4) return "Wrong Answer";
  if (statusId === 5) return "Time Limit Exceeded";
  if (statusId === 6) return "Compilation Error";
  if (statusId >= 7 && statusId <= 12) return "Runtime Error";
  if (statusDesc && statusDesc.toLowerCase().includes("memory")) {
    return "Memory Limit Exceeded";
  }
  if (statusDesc && statusDesc.startsWith("Runtime Error")) {
    return "Runtime Error";
  }
  return statusDesc || "Wrong Answer";
};

/**
 * Controller to handle user code submissions.
 * 1. Validates problem ID, language, and non-empty code.
 * 2. Fetches the problem and its test cases (visible + hidden).
 * 3. Saves the initial submission to MongoDB with status "Pending".
 * 4. Submits the code batch to OnlineCompiler/Judge0.
 * 5. Polls for evaluation results.
 * 6. Updates the submission in MongoDB with runtime metrics, passed test cases, and verdict.
 */
const submitCode = async (req, res) => {
  try {
    const problemId = req.params.problemId || req.params.id || req.body.problemId;
    const { language, code } = req.body;

    // 1. Validate Problem ID
    if (!problemId || !isValidObjectId(problemId)) {
      return res.status(400).json({ message: "Invalid problem ID format." });
    }

    // 2. Validate Code & Language
    if (!code || typeof code !== "string" || code.trim() === "") {
      return res.status(400).json({ message: "Code is required and cannot be empty." });
    }

    if (!language) {
      return res.status(400).json({ message: "Language is required." });
    }

    const languageId = getLanguageById(language);
    if (!languageId) {
      return res.status(400).json({
        message: `Unsupported language: "${language}". Only C++ and Python are supported.`,
      });
    }

    // Normalize language string for schema enum ("cpp" or "python")
    const normalizedLang =
      language.toLowerCase().trim() === "c++" ? "cpp" : language.toLowerCase().trim();

    // 3. Find problem in MongoDB
    const problem = await Problem.findById(problemId);
    if (!problem) {
      return res.status(404).json({ message: "Problem not found." });
    }

    // Combine visible and hidden test cases
    const allTestCases = [
      ...(problem.visibleTestCases || []),
      ...(problem.hiddenTestCases || []),
    ];

    if (allTestCases.length === 0) {
      return res.status(400).json({
        message: "Problem has no test cases configured for evaluation.",
      });
    }

    // 4. Save submission into MongoDB FIRST with status "Pending"
    const submission = new Submission({
      userId: req.user._id,
      problemId: problem._id,
      code,
      language: normalizedLang,
      status: "Pending",
      totalTestCases: allTestCases.length,
    });

    await submission.save();

    // 5. Construct batch submissions for OnlineCompiler
    const submissions = allTestCases.map((tc) => ({
      source_code: code,
      language_id: languageId,
      stdin: tc.input,
      expected_output: tc.output,
    }));

    // 6. Submit batch to OnlineCompiler
    let submitResult;
    try {
      submitResult = await submitBatch(submissions);
    } catch (judgeErr) {
      submission.status = "Internal Error";
      submission.errorMessage =
        judgeErr.response?.data?.error || judgeErr.response?.data || judgeErr.message;
      await submission.save();

      return res.status(502).json({
        message: "Compiler service error while submitting code.",
        error: submission.errorMessage,
        submissionId: submission._id,
      });
    }

    const tokens = submitResult.map((item) => item.token);

    // 7. Poll until compilation and execution complete
    let testResult = await getBatchResults(tokens);
    let attempts = 0;
    const maxAttempts = 15; // Max 15 seconds

    while (
      testResult?.submissions?.some(
        (s) => s.status.id === 1 || s.status.id === 2
      ) &&
      attempts < maxAttempts
    ) {
      attempts++;
      await wait(1000);
      testResult = await getBatchResults(tokens);
    }

    // 8. Analyze execution results across all test cases
    let testCasesPassed = 0;
    let finalStatus = "Accepted";
    let maxTime = 0;
    let maxMemory = 0;
    let errorMessage = null;
    let compileOutput = null;

    for (let i = 0; i < testResult.submissions.length; i++) {
      const sub = testResult.submissions[i];
      const statusId = sub.status.id;
      const statusDesc = sub.status.description;

      // Track peak execution time and peak memory consumption
      if (sub.time && parseFloat(sub.time) > maxTime) {
        maxTime = parseFloat(sub.time);
      }
      if (sub.memory && parseInt(sub.memory, 10) > maxMemory) {
        maxMemory = parseInt(sub.memory, 10);
      }

      if (statusId === 3) {
        testCasesPassed++;
      } else if (finalStatus === "Accepted") {
        // First failing testcase determines the overall status verdict
        finalStatus = mapJudge0Status(statusId, statusDesc);
        errorMessage = sub.stderr || sub.message || null;
        compileOutput = sub.compile_output || null;
      }
    }

    // 9. Update the submission document in MongoDB
    submission.status = finalStatus;
    submission.time = maxTime;
    submission.memory = maxMemory;
    submission.testCasesPassed = testCasesPassed;
    submission.errorMessage = errorMessage;
    submission.compileOutput = compileOutput;

    await submission.save();

    // 10. Return evaluation response
    res.status(200).json({
      message: "Code evaluated successfully",
      submission: {
        id: submission._id,
        problemId: submission.problemId,
        status: submission.status,
        time: `${submission.time}s`,
        memory: `${submission.memory} KB`,
        testCasesPassed: submission.testCasesPassed,
        totalTestCases: submission.totalTestCases,
        errorMessage: submission.errorMessage,
        compileOutput: submission.compileOutput,
        createdAt: submission.createdAt,
      },
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

module.exports = {
  submitCode,
};

