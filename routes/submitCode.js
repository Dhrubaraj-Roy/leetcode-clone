const express = require("express");
const submitCodeRouter = express.Router();

const { submitCode } = require("../controllers/submission.controller");
const userAuth = require("../middleware/userAuth");

// User Code Submission (Requires user login)
// Allows problemId either in URL param or in request body
submitCodeRouter.post("/:problemId", userAuth, submitCode);

module.exports = submitCodeRouter;

