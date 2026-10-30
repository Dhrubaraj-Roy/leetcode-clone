const express = require("express");
const problemRouter = express.Router();

const {
  createProblem,
  updateProblem,
  deleteProblem,
  getAllProblems,
  getProblemById,
  solveProblem,
} = require("../controllers/problem");

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

// Get a single problem by ID
problemRouter.get("/get/:id", getProblemById);
problemRouter.get("/:id", getProblemById);

// Solve / Submit problem (Requires User Login)
problemRouter.post("/solve/:id", userAuth, solveProblem);

module.exports = problemRouter;
