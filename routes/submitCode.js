const express = require("express");
const submitCodeRouter = express.Router();

const { submitCode } = require("../controllers/submission.controller");
const userAuth = require("../middleware/userAuth");

// User Code Submission (Requires user login)
submitCodeRouter.post("/:problemId", userAuth, submitCode);

module.exports = submitCodeRouter;

