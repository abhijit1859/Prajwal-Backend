const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema({
  subject_id: { type: String, required: true, default: "na" },
  title: { type: String, required: true, default: "na" },
  details: {
    description: { type: String, default: "na" },
    total_mcq_questions: { type: Number, default: 0 },
    total_blank_questions: { type: Number, default: 0 },
    total_tf_questions: { type: Number, default: 0 },
    total_sa_questions: { type: Number, default: 0 },
    total_owa_questions: { type: Number, default: 0 },
    total_match_questions: { type: Number, default: 0 },
    total_balance_questions: { type: Number, default: 0 },
    total_whoami_questions: { type: Number, default: 0 },
    total_2m_questions: { type: Number, default: 0 },
    total_3m_questions: { type: Number, default: 0 },
    total_4m_questions: { type: Number, default: 0 },
  },
  medium: { type: String, default: "eng" },
  board: { type: String, default: "gseb" },
  standard: { type: String, default: "10" },
  free_chapters: { type: [String], default: [] },
  all_chapters: { type: [String], default: [] },
  blueprint: { type: [String], default: [] },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  cover_image_url: { type: String, default: "na" },
  questions: { type: [String], default: [] },
  notes: { type: [String], default: [] },
  maps: { type: [String], default: [] },
  videos: { type: [String], default: [] },
  created_at: { type: Date, default: Date.now },
  last_updated_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Subject", subjectSchema);
