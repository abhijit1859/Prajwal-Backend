const mongoose = require("mongoose");

const practiceSubjectSchema = new mongoose.Schema({
  paper_subject_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  cover_image_url: {
    type: String,
    default: "",
    trim: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  medium: {
    type: String,
    trim: true,
  },
  board: {
    type: String,
    trim: true,
  },
  standard: {
    type: String,
    trim: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
  last_updated_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("PracticeSubject", practiceSubjectSchema);
