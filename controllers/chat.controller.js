const axios = require("axios");

/**
 * Constructs the dynamic system prompt for the Rude DSA Teacher.
 * Injects student information, active problem title & description,
 * and current code from the editor into the prompt context.
 */
function buildSystemPrompt({
  user,
  problemTitle,
  problemDescription,
  currentCode,
  language,
}) {
  const studentName = user?.firstName || "Student";

  let prompt = `You are a rude, sarcastic, demanding, and uncompromising DSA (Data Structures and Algorithms) teacher.
Your student's name is "${studentName}".

Your Persona and Strict Teaching Rules:
1. Tone & Attitude: You are harsh, blunt, impatient, and demanding. Mock trivial questions, scoff at unoptimized solutions, and call out lazy thinking, sloppy logic, or poor variable naming. Do NOT sugarcoat anything or offer fake polite praise. No "Great question!" or "Happy to help!".
2. Technical Accuracy: Despite your rude, tough-love demeanor, you are an algorithmic genius. Your explanations, data structures intuition, and algorithmic breakdowns MUST be 100% technically accurate, precise, and rigorous.
3. Time & Space Complexity: Always evaluate and demand optimal Time Complexity and Space Complexity using Big-O notation. If an algorithm is $O(N^2)$ when an $O(N)$ or $O(N \\log N)$ approach exists, roast the student for being inefficient.
4. Constructive Guidance: Tear their mistakes apart, but always guide them to the correct algorithmic pattern (e.g. Two Pointers, Sliding Window, Fast & Slow Pointers, Monotonic Stack, Dynamic Programming, Binary Search, DFS/BFS, Trie).`;

  // Inject Problem Title and Description if available
  if (problemTitle || problemDescription) {
    prompt += `\n\n========================================
CURRENT PROBLEM CONTEXT
========================================`;
    if (problemTitle) {
      prompt += `\nProblem Title: ${problemTitle}`;
    }
    if (problemDescription) {
      // Limit to 5000 characters to prevent token overflow while retaining full context
      const cleanDesc =
        typeof problemDescription === "string"
          ? problemDescription.trim().slice(0, 5000)
          : "";
      prompt += `\n\nProblem Description:\n${cleanDesc}`;
    }
  }

  // Inject Student's Current Code from Monaco Editor if available
  if (currentCode && typeof currentCode === "string" && currentCode.trim() !== "") {
    const lang = (language || "code").toLowerCase();
    const cleanCode = currentCode.trim().slice(0, 5000);
    prompt += `\n\n========================================
STUDENT'S CURRENT CODE (${lang.toUpperCase()})
========================================
\`\`\`${lang}
${cleanCode}
\`\`\`
Instructions regarding the student's code:
- Scrutinize this code thoroughly.
- Point out every bug, edge case failure, syntax error, memory leak, or suboptimal complexity.
- Ridicule any obvious or sloppy mistakes, then tell them what specific logic needs to change to solve the problem properly.`;
  } else {
    prompt += `\n\n[Note: The student has not submitted any code from the editor yet. If they ask how to solve it or ask you to write code for them, mock them for being lazy and asking for answers without writing a single line of code first.]`;
  }

  prompt += `\n\nAnswer the student directly in your signature rude DSA teacher tone. Deliver ruthless criticism accompanied by rigorous algorithmic instruction.`;

  return prompt;
}

/**
 * Chat Controller
 * Evaluates student questions via Groq API using the AI_CHAT_BOT key from .env.
 * Protected by userAuth middleware: requires authenticated user.
 */
const handleChat = async (req, res) => {
  try {
    const {
      message,
      history,
      problemId,
      problemTitle,
      problemDescription,
      currentCode,
      language,
    } = req.body;

    if (!message || typeof message !== "string" || message.trim() === "") {
      return res.status(400).json({
        message: "Message is required and cannot be empty.",
      });
    }

    // Retrieve API key from environment (.env)
    const apiKey = (
      process.env.AI_CHAT_BOT ||
      process.env.GROQ_API_KEY ||
      ""
    )
      .replace(/['"]/g, "")
      .trim();

    if (!apiKey) {
      return res.status(500).json({
        message: "AI_CHAT_BOT API key is not configured in backend .env",
      });
    }

    // Build the dynamic system prompt with problem details, user info, and code
    const systemPrompt = buildSystemPrompt({
      user: req.user,
      problemTitle,
      problemDescription,
      currentCode,
      language,
    });

    // Prepare message sequence for Groq chat completions
    const formattedMessages = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

    // Append prior conversational history if available (limit to last 6 for prompt efficiency)
    if (Array.isArray(history)) {
      const recentHistory = history.slice(-6);
      for (const item of recentHistory) {
        if (item.content && item.role) {
          formattedMessages.push({
            role:
              item.role === "assistant" || item.role === "teacher"
                ? "assistant"
                : "user",
            content: String(item.content),
          });
        }
      }
    }

    // Append the current student message
    formattedMessages.push({
      role: "user",
      content: message.trim(),
    });

    // Primary and fallback models available for the Groq key
    const modelsToTry = [
      "qwen/qwen3.8-27b",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
    ];

    let reply = null;
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        const groqResponse = await axios.post(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            model,
            messages: formattedMessages,
            temperature: 0.7,
            max_tokens: 1024,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 25000,
          }
        );

        reply = groqResponse.data?.choices?.[0]?.message?.content;
        if (reply) break;
      } catch (err) {
        lastError = err;
        console.warn(`Groq model ${model} failed:`, err.response?.data || err.message);
      }
    }

    if (!reply) {
      throw lastError || new Error("Failed to receive response from AI model.");
    }

    return res.status(200).json({
      reply,
      status: "success",
    });
  } catch (err) {
    console.error("Chat error:", err.response?.data || err.message);
    const errorMessage =
      err.response?.data?.error?.message ||
      err.message ||
      "Failed to process chat message.";

    return res.status(500).json({
      message: errorMessage,
    });
  }
};

module.exports = {
  handleChat,
  buildSystemPrompt,
};


