const express = require("express");
const submitCodeRouter = express.Router();

const {
  submitCode,
  getUserProblemSubmissions,
} = require("../controllers/submission.controller");
const userAuth = require("../middleware/userAuth");

// User Code Submission (Requires user login)
submitCodeRouter.post("/:problemId", userAuth, submitCode);

// Get all submissions for a problem by logged-in user (Requires user login)
submitCodeRouter.get("/:problemId", userAuth, getUserProblemSubmissions);

module.exports = submitCodeRouter;

