const mongoose = require("mongoose");

const practicePaperSchema = new mongoose.Schema({
  paper_id: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true,
  },
  paper_subject_id: {
    type: String,
    required: true,
    trim: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  url: {
    type: String,
    required: true,
    trim: true,
  },
  order: {
    type: Number,
    default: 0,
  },
  description: {
    type: String,
    default: "",
    trim: true,
  },
  category: {
    type: String,
    trim: true,
    index: true,
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

module.exports = mongoose.model("PracticePaper", practicePaperSchema);
