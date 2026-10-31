const axios = require("axios");

const getBaseURL = () => {
  return (
    process.env.JUDGE0_URL ||
    "https://api.onlinecompiler.io/api/judge0"
  ).replace(/\/$/, "");
};

const getHeaders = () => {
  return {
    "Content-Type": "application/json",
    "X-Auth-Token": process.env.ONLINECOMPILER_API_KEY,
    Authorization: process.env.ONLINECOMPILER_API_KEY,
  };
};

/**
 * Maps a programming language name to its corresponding Judge0/OnlineCompiler language ID.
 * OnlineCompiler natively supports both modern IDs (105, 91, 113, 102) and standard Judge0 IDs (54, 62, 71, 63).
 */
const getLanguageById = (language) => {
  if (!language) return null;
  const lang = language.toString().toLowerCase().trim();

  switch (lang) {
    case "c++":
    case "cpp":
    case "105":
    case "54":
      return 105; // OnlineCompiler C++ (GCC 15) / Judge0 compatible
    case "java":
    case "91":
    case "62":
      return 91; // OnlineCompiler Java (OpenJDK 25) / Judge0 compatible
    case "python":
    case "python3":
    case "py":
    case "113":
    case "71":
      return 113; // OnlineCompiler Python (3.14) / Judge0 compatible
    case "javascript":
    case "js":
    case "nodejs":
    case "102":
    case "63":
      return 102; // OnlineCompiler JavaScript (Node.js 24) / Judge0 compatible
    case "typescript":
    case "ts":
    case "101":
      return 101; // TypeScript (Deno 2)
    case "c":
    case "103":
      return 103; // C (GCC 15)
    case "go":
    case "golang":
    case "107":
      return 107; // Go (1.26)
    case "rust":
    case "108":
      return 108; // Rust (1.93)
    default:
      return null;
  }
};

/**
 * Submits a batch of code solutions to OnlineCompiler (Judge0 compatible) for evaluation using Axios.
 * @param {Array} submissions - Array of objects: { source_code, language_id, stdin, expected_output }
 */
const submitBatch = async (submissions) => {
  const url = `${getBaseURL()}/submissions/batch`;

  const response = await axios.post(
    url,
    { submissions },
    {
      headers: getHeaders(),
    }
  );

  return response.data;
};

/**
 * Retrieves the results of batch submissions by their tokens.
 * @param {Array<string>|string} tokens - Array of token strings or comma-separated tokens string
 */
const getBatchResults = async (tokens) => {
  const tokenList = Array.isArray(tokens) ? tokens.join(",") : tokens;
  const url = `${getBaseURL()}/submissions/batch?tokens=${encodeURIComponent(tokenList)}`;

  const response = await axios.get(url, {
    headers: getHeaders(),
  });

  return response.data;
};

/**
 * Submits a single code solution (with optional synchronous wait=true).
 * @param {Object} submission - { source_code, language_id, stdin, expected_output }
 * @param {boolean} wait - If true, waits for execution result instead of returning token to poll
 */
const submitSingle = async (submission, wait = true) => {
  const url = `${getBaseURL()}/submissions?wait=${wait}`;

  const response = await axios.post(url, submission, {
    headers: getHeaders(),
  });

  return response.data;
};

module.exports = {
  getLanguageById,
  submitBatch,
  getBatchResults,
  submitSingle,
};
