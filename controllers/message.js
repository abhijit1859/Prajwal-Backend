const Message = require("../models/message");

// POST: Save a new message
exports.createMessage = async (req, res) => {
  try {
    const { message_time, message_content, pinned } = req.body;

    // Check if message_content is provided
    if (!message_content || message_content.trim() === "") {
      return res
        .status(400)
        .json({ success: false, error: "Message content is required." });
    }

    const newMessage = new Message({
      message_time: message_time || Date.now(),
      message_content: message_content,
      pinned: pinned || false,
    });

    await newMessage.save();
    res.status(201).json({ success: true, message: "Message saved" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET: Fetch the latest message
exports.getLatestMessage = async (req, res) => {
  try {
    const latestMessage = await Message.findOne().sort({ message_time: -1 });
    if (!latestMessage) {
      return res.status(200).json({
        message_time: new Date(),
        message_content: "na",
      });
    }
    res.status(200).json(latestMessage);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE: Delete a message by ID
exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedMessage = await Message.findByIdAndDelete(id);
    if (!deletedMessage) {
      return res
        .status(404)
        .json({ success: false, error: "Message not found." });
    }
    res.status(200).json({ success: true, message: "Message deleted." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
