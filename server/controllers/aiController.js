const { solveMath, solveEducationalQuery } = require("../utils/aiTutor");

const GEMINI_MODELS = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.8-flash"];

// @desc    Chat with AI Study Assistant
// @route   POST /api/ai/chat
const chatWithAI = async (req, res, next) => {
  try {
    const { message, history } = req.body || {};

    if (typeof message !== "string" || message.trim() === "") {
      return res.status(400).json({ success: false, message: "Please provide a question or message" });
    }
    if (message.length > 8000) {
      return res.status(413).json({ success: false, message: "Message is too long." });
    }

    const trimmed = message.trim();
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();

    // 1. PRIMARY: Real Google Gemini Generative AI (Live cloud LLM just like ChatGPT/Antigravity)
    if (apiKey !== "") {
      const systemPrompt = "You are StudyBuddy AI, an intelligent, conversational, and highly capable study tutor, like ChatGPT or Google Antigravity. Answer ANY question asked by the student in the language they write in (such as Gujarati, Hindi, or English). Give direct, crystal-clear, structured answers with headings, bullet points, step-by-step math breakdowns, and code snippets where appropriate. Be warm, supportive, and engaging.";

      // Build multi-turn conversational contents
      const contents = [];
      if (Array.isArray(history) && history.length > 0) {
        for (const item of history.slice(-6)) {
          if (item && item.text) {
            contents.push({
              role: item.role === "assistant" ? "model" : "user",
              parts: [{ text: String(item.text) }],
            });
          }
        }
      }
      contents.push({
        role: "user",
        parts: [{ text: `${systemPrompt}\n\nStudent Question: ${trimmed}` }],
      });

      // Try available Gemini models in priority order
      for (const model of GEMINI_MODELS) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 60000);

          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents,
              generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.7,
              },
            }),
            signal: controller.signal,
          });
          clearTimeout(timeout);

          const data = await response.json();

          if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            const aiResponse = data.candidates[0].content.parts[0].text;
            return res.status(200).json({ success: true, reply: aiResponse });
          }
        } catch (modelError) {
          console.warn(`[Gemini model ${model} notice]:`, modelError.message);
        }
      }
    }

    // 2. Fallback: Direct Math Calculation Engine
    const mathResult = solveMath(trimmed);
    if (mathResult) {
      return res.status(200).json({ success: true, reply: mathResult });
    }

    // 3. Fallback: Built-in Knowledge Base Engine
    const reply = solveEducationalQuery(trimmed);
    return res.status(200).json({ success: true, reply });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  chatWithAI,
};
