const mongoose = require("mongoose");

const preferenceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Please enter a User"],
    unique: true,
  },
  preferences: {
    board: {
      type: String,
      default: "GSEB",
      enum: ["GSEB", "CBSE", "ICSE"],
    },
    medium: {
      type: String,
      default: "ENG",
      enum: ["ENG","GUJ" ,"HIN"],
    },
    standard: {
      type: Number,
      default: 10,
      min: [1, "Standard must be at least 1"],
      max: [12, "Standard cannot exceed 12"],
    },
    theme: {
      type: String,
      default: "system",
      enum: ["light", "dark", "system"],
    },
    notifications: {
      type: Boolean,
      default: true,
    },
    language: {
      type: String,
      default: "en",
      enum: ["en", "gu", "hi"],
    },
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("Preference", preferenceSchema);