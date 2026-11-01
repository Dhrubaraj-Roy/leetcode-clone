const express = require("express");
const problemRouter = express.Router();

const {
  createProblem,
  updateProblem,
  deleteProblem,
  getAllProblems,
  getProblemById,
} = require("../controllers/problem.controller");
const {
  submitCode,
  runCode,
  getSolvedProblems,
} = require("../controllers/submission.controller");

const userAuth = require("../middleware/userAuth");
const adminAuth = require("../middleware/adminAuth");

// Admin-Only Routes (Requires Admin Login)

// Create a new problem
problemRouter.post("/create", userAuth, adminAuth, createProblem);

// Update a problem
problemRouter.patch("/update/:id", userAuth, adminAuth, updateProblem);
problemRouter.put("/update/:id", userAuth, adminAuth, updateProblem);

// Delete a problem
problemRouter.delete("/delete/:id", userAuth, adminAuth, deleteProblem);

// User / Public Routes

// Get all problems
problemRouter.get("/all", getAllProblems);
problemRouter.get("/getAll", getAllProblems);
problemRouter.get("/", getAllProblems);

// Get all unique problems solved by the logged in user
problemRouter.get("/solved", userAuth, getSolvedProblems);

// Get a single problem by ID
problemRouter.get("/get/:id", getProblemById);
problemRouter.get("/:id", getProblemById);

// Run code against example test cases (Requires User Login - No DB storage)
problemRouter.post("/run/:id", userAuth, runCode);

// Solve / Submit problem (Requires User Login)
problemRouter.post("/solve/:id", userAuth, submitCode);

module.exports = problemRouter;
