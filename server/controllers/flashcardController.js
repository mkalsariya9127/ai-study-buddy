const Flashcard = require("../models/Flashcard");

const GEMINI_MODELS = ["gemini-3.5-flash", "gemini-flash-latest"];

// @desc    Get all flashcards for authenticated user
// @route   GET /api/flashcards
const getFlashcards = async (req, res, next) => {
  try {
    const { deck } = req.query;
    const filter = { user: req.user._id };
    if (deck) filter.deckName = deck;

    const flashcards = await Flashcard.find(filter).sort({ createdAt: -1 });
    const decks = await Flashcard.distinct("deckName", { user: req.user._id });

    res.status(200).json({
      success: true,
      count: flashcards.length,
      decks,
      data: flashcards,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new manual flashcard
// @route   POST /api/flashcards
const createFlashcard = async (req, res, next) => {
  try {
    const { front, back, deckName = "General Study" } = req.body || {};
    if (!front || !back) {
      return res.status(400).json({ success: false, message: "Front and back content are required." });
    }

    const card = await Flashcard.create({
      user: req.user._id,
      deckName: deckName.trim() || "General Study",
      front: front.trim(),
      back: back.trim(),
    });

    res.status(201).json({ success: true, data: card });
  } catch (error) {
    next(error);
  }
};

// @desc    Review & update flashcard (spaced repetition interval)
// @route   PUT /api/flashcards/:id/review
const reviewFlashcard = async (req, res, next) => {
  try {
    const { difficulty = "medium" } = req.body || {};
    const card = await Flashcard.findOne({ _id: req.params.id, user: req.user._id });
    if (!card) {
      return res.status(404).json({ success: false, message: "Flashcard not found." });
    }

    // Spaced repetition schedule calculation:
    // easy -> next review in 4 days
    // medium -> next review in 2 days
    // hard -> review again tomorrow (1 day)
    const daysToAdd = difficulty === "easy" ? 4 : difficulty === "medium" ? 2 : 1;
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + daysToAdd);

    card.difficulty = difficulty;
    card.reviewCount = (card.reviewCount || 0) + 1;
    card.lastReviewedAt = new Date();
    card.nextReviewDate = nextDate;
    await card.save();

    res.status(200).json({ success: true, data: card });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a flashcard
// @route   DELETE /api/flashcards/:id
const deleteFlashcard = async (req, res, next) => {
  try {
    const card = await Flashcard.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!card) {
      return res.status(404).json({ success: false, message: "Flashcard not found." });
    }
    res.status(200).json({ success: true, message: "Flashcard deleted successfully." });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate AI Flashcards deck from topic or note text
// @route   POST /api/flashcards/generate-ai
const generateAiFlashcards = async (req, res, next) => {
  try {
    const { topic, text, deckName } = req.body || {};
    const targetTopic = (topic || deckName || "Exam Revision").trim();
    const sourceContent = (text || topic || "Core Academic Concepts").trim();

    let generatedCards = [
      {
        front: `What is the core definition of ${targetTopic}?`,
        back: `${targetTopic} refers to the foundational principles, structures, and practical rules governing this domain.`,
      },
      {
        front: `Explain the key advantages of understanding ${targetTopic}.`,
        back: `Improves problem-solving speed, minimizes theoretical mistakes, and provides structured concepts for exam questions.`,
      },
      {
        front: `What is a common real-world application of ${targetTopic}?`,
        back: `Widely used in software architecture, system optimization, and professional academic projects.`,
      },
    ];

    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (apiKey) {
      for (const model of GEMINI_MODELS) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 25000);
          const prompt = `You are a spaced repetition study flashcard creator. Generate 5 high-yield question-and-answer study flashcards for this topic/content:\n\nTopic: ${targetTopic}\nNotes/Excerpt: ${sourceContent.slice(0, 2000)}\n\nRespond ONLY with a valid JSON array matching this schema:\n[\n  {\n    "front": "Concise Question or Concept Term",\n    "back": "Clear, memorable answer explanation"\n  }\n]`;

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 900, temperature: 0.4 },
              }),
              signal: controller.signal,
            }
          );
          clearTimeout(timeout);

          const data = await response.json();
          const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleanJson = rawText.replace(/```json\n?|```/g, "").trim();
            const parsed = JSON.parse(cleanJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              generatedCards = parsed;
              break;
            }
          }
        } catch (aiErr) {
          console.warn(`[Flashcards AI Notice for ${model}]:`, aiErr.message);
        }
      }
    }

    // Save cards directly to user's database collection
    const createdCards = await Promise.all(
      generatedCards.map((c) =>
        Flashcard.create({
          user: req.user._id,
          deckName: targetTopic,
          front: c.front,
          back: c.back,
        })
      )
    );

    res.status(201).json({
      success: true,
      message: `Generated and saved ${createdCards.length} flashcards!`,
      deckName: targetTopic,
      data: createdCards,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFlashcards,
  createFlashcard,
  reviewFlashcard,
  deleteFlashcard,
  generateAiFlashcards,
};
