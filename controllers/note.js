// Bulk create notes
exports.bulkCreateNotes = async (req, res) => {
  try {
    if (!Array.isArray(req.body) || req.body.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Request body must be a non-empty array",
        });
    }
    for (const n of req.body) {
      if (
        !n.note_id ||
        !n.title ||
        !n.cover_image_url ||
        !n.url ||
        !n.chapter_id
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Each note must have note_id, title, cover_image_url, url, chapter_id",
          });
      }
    }
    const notes = await Note.insertMany(req.body, { ordered: false });
    res.status(201).json({ success: true, data: notes });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
const Note = require("../models/note");

exports.createNote = async (req, res) => {
  try {
    const {
      note_id,
      title,
      cover_image_url,
      url,
      subject_id,
      topics,
      medium,
      board,
      chapter_id,
      standard,
    } = req.body;
    if (!note_id || !title || !cover_image_url || !url || !chapter_id) {
      return res.status(400).json({
        error:
          "Missing required fields (note_id, title, cover_image_url, url, chapter_id)",
      });
    }
    const note = new Note({
      note_id,
      title,
      cover_image_url,
      url,
      subject_id,
      topics,
      medium,
      board,
      chapter_id,
      standard,
    });
    await note.save();
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getNotes = async (req, res) => {
  try {
    const notes = await Note.find();
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getNoteById = async (req, res) => {
  try {
    const note = await Note.findOne({ note_id: req.params.id });
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateNote = async (req, res) => {
  try {
    const { url, chapter_id } = req.body;
    if (!url || !chapter_id) {
      return res
        .status(400)
        .json({ error: "Missing required fields (url, chapter_id)" });
    }
    const note = await Note.findOneAndUpdate(
      { note_id: req.params.id },
      req.body,
      { new: true }
    );
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ note_id: req.params.id });
    if (!note) return res.status(404).json({ error: "Note not found" });
    res.json({ message: "Note deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get notes by chapterId
exports.getNotesByChapterId = async (req, res) => {
  try {
    const { chapterId } = req.query;
    if (!chapterId) {
      return res.status(400).json({ error: "Missing chapterId in query" });
    }
    const notes = await Note.find({ chapter_id: chapterId });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
