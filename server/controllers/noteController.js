const Note = require("../models/Note");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// @desc    Get all notes for logged-in user
// @route   GET /api/notes
const getNotes = async (req, res, next) => {
  try {
    const { search } = req.query;
    let query = { user: req.user._id };

    if (typeof search === "string" && search.trim() !== "") {
      if (search.length > 100) {
        return res.status(400).json({ success: false, message: "Search text is too long." });
      }
      const regex = new RegExp(escapeRegex(search.trim()), "i");
      query.$or = [{ title: regex }, { subject: regex }, { content: regex }];
    }

    const notes = await Note.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: notes.length, data: notes });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new note
// @route   POST /api/notes
const createNote = async (req, res, next) => {
  try {
    const { title, subject, content } = req.body || {};
    if (
      typeof title !== "string" ||
      !title.trim() ||
      title.length > 200 ||
      typeof content !== "string" ||
      !content.trim() ||
      content.length > 100000 ||
      (subject !== undefined && (typeof subject !== "string" || subject.length > 100))
    ) {
      return res.status(400).json({ success: false, message: "Invalid note details." });
    }

    const note = await Note.create({
      user: req.user._id,
      title,
      subject: subject || "General",
      content,
    });

    res.status(201).json({ success: true, message: "Note created successfully", data: note });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a note
// @route   PUT /api/notes/:id
const updateNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    // Verify ownership
    if (note.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to update this note" });
    }

    const { title, subject, content } = req.body || {};
    if (
      (title !== undefined && (typeof title !== "string" || !title.trim() || title.length > 200)) ||
      (subject !== undefined && (typeof subject !== "string" || subject.length > 100)) ||
      (content !== undefined && (typeof content !== "string" || !content.trim() || content.length > 100000))
    ) {
      return res.status(400).json({ success: false, message: "Invalid note details." });
    }

    if (title !== undefined) note.title = title.trim();
    if (subject !== undefined) note.subject = subject;
    if (content !== undefined) note.content = content;

    const updatedNote = await note.save();
    res.status(200).json({ success: true, message: "Note updated successfully", data: updatedNote });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a note
// @route   DELETE /api/notes/:id
const deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ success: false, message: "Note not found" });
    }

    if (note.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to delete this note" });
    }

    await note.deleteOne();
    res.status(200).json({ success: true, message: "Note deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotes,
  createNote,
  updateNote,
  deleteNote,
};
