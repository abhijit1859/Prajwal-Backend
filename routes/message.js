const express = require("express");
const router = express.Router();
const {
  createMessage,
  getLatestMessage,
  deleteMessage,
} = require("../controllers/message");

// Routes
router.post("/message", createMessage);
router.get("/message/latest", getLatestMessage);
router.get("/message/all", async (req, res) => {
  try {
    const messages = await require("../models/message")
      .find()
      .sort({ message_time: -1 });
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add delete message route
router.delete("/message/:id", deleteMessage);

module.exports = router;
