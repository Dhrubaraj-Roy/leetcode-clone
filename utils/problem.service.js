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
 * Strictly supports C++ and Python.
 */
const getLanguageById = (language) => {
  if (!language) return null;
  const lang = language.toString().toLowerCase().trim();

  switch (lang) {
    case "c++":
    case "cpp":
    case "105":
    case "54":
      return 105; // C++ (GCC 15)
    case "python":
    case "python3":
    case "py":
    case "113":
    case "71":
      return 113; // Python (3.14)
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
 * Waits for a specified number of milliseconds (default 1000ms / 1 second).
 * @param {number} ms - Milliseconds to pause execution
 */
const wait = (ms = 1000) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  wait,
  getLanguageById,
  submitBatch,
  getBatchResults,
};
