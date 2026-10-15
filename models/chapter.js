const mongoose = require("mongoose");

const chapterSchema = new mongoose.Schema({
  chapter_id: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    default: "na",
  },
  name: {
    type: String,
    required: true,
    default: "na",
  },
  subject_id: {
    type: String,
    required: true,
    default: "na",
  },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
  medium: {
    type: String,
    default: "eng",
  },
  board: {
    type: String,
    default: "gseb",
  },
  standard: {
    type: String,
    default: "10",
  },
  question_topics: {
    type: [String],
    default: [],
  },
  video_topics: {
    type: [String],
    default: [],
  },
  note_topics: {
    type: [String],
    default: [],
  },
  created_at: { type: Date, default: Date.now },
  last_updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Chapter", chapterSchema);
