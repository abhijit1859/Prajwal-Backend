const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema({
  video_id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  url: { type: String, required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
  chapter: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter" },
  subject_id: { type: String, default: "na" },
  topics: { type: [String], default: [] },
  medium: { type: String, default: "na" },
  board: { type: String, default: "na" },
  chapter_id: { type: String, required: true, default: "na" },
  standard: { type: String, default: "na" }
});

module.exports = mongoose.model("Video", videoSchema); 