const mongoose = require("mongoose");

const hotLineSchema = new mongoose.Schema({
  hl_id: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    default: "na",
  },
  subject_id: { type: String, required: true, default: "na" },
  medium: { type: String, default: "eng" },
  board: { type: String, default: "gseb" },
  chapter_id: { type: String, required: true, default: "na" },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
  chapter: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter" },
  url: { type: String, required: true },
  standard: { type: String, default: "10" },
  // title: { type: String, required: true, default: "na" },
  // image_url: { type: String, required: true, default: "na" },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  created_at: { type: Date, default: Date.now },
  last_updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("HotLine", hotLineSchema);
