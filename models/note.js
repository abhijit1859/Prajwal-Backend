const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  note_id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  cover_image_url: { type: String, required: true },
  url: { type: String, required: true },
  subject_id: { type: String, default: "na" },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
  topics: { type: [String], default: [] },
  medium: { type: String, default: "na" },
  board: { type: String, default: "na" },
  chapter_id: { type: String, required: true, default: "na" },
  chapter: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter" },
  standard: { type: String, default: "na" }
});

module.exports = mongoose.model("Note", noteSchema); 