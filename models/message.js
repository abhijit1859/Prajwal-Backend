const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  message_time: {
    type: Date,
    default: Date.now,
  },

  message_content: {
    type: String,
    default: "na",
  },

  pinned: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("message", messageSchema);
