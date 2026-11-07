import React, { useState, useEffect } from "react";
import {
  Layers,
  Sparkles,
  Plus,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
} from "lucide-react";
import "./Flashcards.css";
import BackButton from "../components/BackButton";
import { flashcardsAPI } from "../services/api";

function Flashcards() {
  const [cards, setCards] = useState([]);
  const [decks, setDecks] = useState([]);
  const [selectedDeck, setSelectedDeck] = useState("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Modals state
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [generatingAi, setGeneratingAi] = useState(false);

  const [showManualModal, setShowManualModal] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [newDeck, setNewDeck] = useState("");

  useEffect(() => {
    let isMounted = true;
    const loadCards = async () => {
      try {
        const res = await flashcardsAPI.getAll(selectedDeck === "all" ? "" : selectedDeck);
        if (isMounted && res.success && Array.isArray(res.data)) {
          setCards(res.data);
          if (res.decks) setDecks(res.decks);
          setCurrentIndex(0);
          setIsFlipped(false);
        }
      } catch (err) {
        console.warn("Could not load flashcards:", err);
      }
    };
    loadCards();
    return () => {
      isMounted = false;
    };
  }, [selectedDeck]);

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1 < cards.length ? prev + 1 : 0));
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 >= 0 ? prev - 1 : cards.length - 1));
  };

  const handleReview = async (difficulty) => {
    const currentCard = cards[currentIndex];
    if (!currentCard) return;

    try {
      await flashcardsAPI.review(currentCard._id || currentCard.id, difficulty);
    } catch (err) {
      console.warn("Review status sync skipped:", err);
    }
    handleNext();
  };

  const handleDeleteCard = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this flashcard?")) return;

    try {
      await flashcardsAPI.delete(id);
      setCards((prev) => prev.filter((c) => (c._id !== id && c.id !== id)));
      if (currentIndex >= cards.length - 1) {
        setCurrentIndex(Math.max(0, cards.length - 2));
      }
    } catch (err) {
      alert("Could not delete flashcard.");
      console.error(err);
    }
  };

  const handleCreateManual = async (e) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) {
      alert("Please enter both question (front) and answer (back).");
      return;
    }

    try {
      const res = await flashcardsAPI.create({
        front: newFront,
        back: newBack,
        deckName: newDeck.trim() || "General Study",
      });
      if (res.success && res.data) {
        setCards((prev) => [res.data, ...prev]);
        setShowManualModal(false);
        setNewFront("");
        setNewBack("");
        setNewDeck("");
      }
    } catch (err) {
      alert("Error saving flashcard.");
      console.error(err);
    }
  };

  const handleGenerateAiDeck = async (e) => {
    e.preventDefault();
    if (!aiTopic.trim()) {
      alert("Please enter a study topic.");
      return;
    }

    setGeneratingAi(true);
    try {
      const res = await flashcardsAPI.generateAI(aiTopic);
      if (res.success && Array.isArray(res.data)) {
        setCards(res.data);
        if (res.deckName && !decks.includes(res.deckName)) {
          setDecks((prev) => [...prev, res.deckName]);
        }
        setSelectedDeck("all");
        setCurrentIndex(0);
        setIsFlipped(false);
        setShowAiModal(false);
        setAiTopic("");
      } else {
        alert(res.message || "Could not generate flashcards.");
      }
    } catch (err) {
      alert("AI Generation failed. Check backend connection.");
      console.error(err);
    } finally {
      setGeneratingAi(false);
    }
  };

  const currentCard = cards[currentIndex];

  return (
    <div className="flashcards-page">
      <BackButton />

      <header className="flashcards-header">
        <div>
          <span className="fc-badge">SPACED REPETITION ENGINE</span>
          <h1>AI Smart Flashcards</h1>
          <p>Boost your memory retention with interactive 3D study cards.</p>
        </div>

        <div className="fc-header-actions">
          <button
            type="button"
            className="btn-fc-ai"
            onClick={() => setShowAiModal(true)}
          >
            <Sparkles size={18} /> AI Generate Deck
          </button>
          <button
            type="button"
            className="btn-fc-new"
            onClick={() => setShowManualModal(true)}
          >
            <Plus size={18} /> New Card
          </button>
        </div>
      </header>

      {/* DECK FILTER BAR */}
      <div className="fc-decks-bar">
        <button
          type="button"
          className={`fc-deck-chip ${selectedDeck === "all" ? "active" : ""}`}
          onClick={() => setSelectedDeck("all")}
        >
          All Cards ({cards.length})
        </button>
        {decks.map((deck, idx) => (
          <button
            key={idx}
            type="button"
            className={`fc-deck-chip ${selectedDeck === deck ? "active" : ""}`}
            onClick={() => setSelectedDeck(deck)}
          >
            {deck}
          </button>
        ))}
      </div>

      {/* 3D STUDY CARD CONTAINER */}
      {cards.length > 0 && currentCard ? (
        <section className="fc-study-section">
          <div className="fc-study-counter">
            Card {currentIndex + 1} of {cards.length}
            <span className="fc-card-deck-name">• {currentCard.deckName || "General"}</span>
          </div>

          <div
            className={`fc-3d-card ${isFlipped ? "flipped" : ""}`}
            onClick={() => setIsFlipped((prev) => !prev)}
            role="button"
            tabIndex={0}
            aria-label="Click to flip flashcard"
          >
            {/* FRONT OF CARD */}
            <div className="fc-card-face fc-card-front">
              <div className="fc-face-header">
                <span className="fc-face-label">QUESTION</span>
                <span className="fc-flip-hint">
                  <RotateCw size={13} /> Click card to flip
                </span>
              </div>
              <div className="fc-face-body">
                <h3>{currentCard.front}</h3>
              </div>
              <div className="fc-face-footer">
                <span>{currentCard.deckName}</span>
                <span className="fc-level-tag">{currentCard.difficulty || "medium"}</span>
              </div>
            </div>

            {/* BACK OF CARD */}
            <div className="fc-card-face fc-card-back">
              <div className="fc-face-header">
                <span className="fc-face-label">ANSWER</span>
                <span className="fc-flip-hint">
                  <RotateCw size={13} /> Click to return
                </span>
              </div>
              <div className="fc-face-body">
                <p>{currentCard.back}</p>
              </div>
              <div className="fc-face-footer">
                <span>Reviewed {currentCard.reviewCount || 0} times</span>
                <button
                  type="button"
                  className="fc-delete-btn"
                  onClick={(e) => handleDeleteCard(currentCard._id || currentCard.id, e)}
                  title="Delete card"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* CONTROLS & RATING BUTTONS */}
          <div className="fc-controls">
            <button type="button" className="fc-nav-btn" onClick={handlePrev} title="Previous card">
              <ChevronLeft size={20} />
            </button>

            <div className="fc-rating-buttons">
              <button
                type="button"
                className="btn-rate btn-hard"
                onClick={() => handleReview("hard")}
                title="Review again tomorrow"
              >
                🔴 Hard (1d)
              </button>
              <button
                type="button"
                className="btn-rate btn-medium"
                onClick={() => handleReview("medium")}
                title="Review in 2 days"
              >
                🟡 Good (2d)
              </button>
              <button
                type="button"
                className="btn-rate btn-easy"
                onClick={() => handleReview("easy")}
                title="Review in 4 days"
              >
                🟢 Easy (4d)
              </button>
            </div>

            <button type="button" className="fc-nav-btn" onClick={handleNext} title="Next card">
              <ChevronRight size={20} />
            </button>
          </div>
        </section>
      ) : (
        <div className="fc-empty-state">
          <Layers size={50} color="#7047eb" />
          <h3>No Flashcards in this Deck</h3>
          <p>Generate a complete flashcard deck using AI or create your own custom card.</p>
          <button
            type="button"
            className="btn-fc-ai"
            onClick={() => setShowAiModal(true)}
          >
            <Sparkles size={18} /> Generate Deck with AI
          </button>
        </div>
      )}

      {/* AI GENERATE MODAL */}
      {showAiModal && (
        <div className="fc-modal-overlay">
          <div className="fc-modal-card">
            <div className="fc-modal-header">
              <div className="fc-modal-title">
                <Sparkles size={20} color="#7047eb" />
                <h3>AI Flashcard Generator</h3>
              </div>
              <button
                type="button"
                className="fc-close-btn"
                onClick={() => setShowAiModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleGenerateAiDeck} className="fc-modal-form">
              <p>Enter any topic, chapter, or syllabus concept to generate 5-8 smart flashcards:</p>
              <input
                type="text"
                placeholder="e.g. React State & Props, Photosynthesis, Python Lists..."
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                disabled={generatingAi}
                required
              />

              <div className="fc-modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAiModal(false)}
                  disabled={generatingAi}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={generatingAi || !aiTopic.trim()}
                >
                  {generatingAi ? "Generating Flashcards..." : "Generate AI Deck"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE MANUAL MODAL */}
      {showManualModal && (
        <div className="fc-modal-overlay">
          <div className="fc-modal-card">
            <div className="fc-modal-header">
              <div className="fc-modal-title">
                <Plus size={20} color="#7047eb" />
                <h3>Create New Flashcard</h3>
              </div>
              <button
                type="button"
                className="fc-close-btn"
                onClick={() => setShowManualModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateManual} className="fc-modal-form">
              <label>Deck / Subject Name</label>
              <input
                type="text"
                placeholder="e.g. Computer Science, Math, History"
                value={newDeck}
                onChange={(e) => setNewDeck(e.target.value)}
              />

              <label>Front (Question / Prompt)</label>
              <textarea
                placeholder="What is the concept or question to test?"
                value={newFront}
                onChange={(e) => setNewFront(e.target.value)}
                rows={3}
                required
              />

              <label>Back (Answer / Explanation)</label>
              <textarea
                placeholder="Detailed answer, definition, or key formula..."
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                rows={4}
                required
              />

              <div className="fc-modal-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowManualModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Save Flashcard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Flashcards;
