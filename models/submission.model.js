const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      enum: ["cpp", "python"],
    },
    status: {
      type: String,
      required: true,
      default: "Pending",
      enum: [
        "Pending",
        "Accepted",
        "Wrong Answer",
        "Time Limit Exceeded",
        "Memory Limit Exceeded",
        "Compilation Error",
        "Runtime Error",
        "Internal Error",
      ],
    },
    time: {
      type: Number, // Execution time in seconds (e.g., 0.015)
      default: 0,
    },
    memory: {
      type: Number, // Memory consumed in KB (e.g., 2048)
      default: 0,
    },
    testCasesPassed: {
      type: Number,
      default: 0,
    },
    totalTestCases: {
      type: Number,
      default: 0,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    compileOutput: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast querying of user submission history
submissionSchema.index({ userId: 1, problemId: 1 });
submissionSchema.index({ createdAt: -1 });

const Submission = mongoose.model("Submission", submissionSchema);

module.exports = Submission;

