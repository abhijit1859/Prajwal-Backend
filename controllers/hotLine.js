// Bulk create hot lines
exports.bulkCreateHotLines = async (req, res) => {
  try {
    if (!Array.isArray(req.body) || req.body.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Request body must be a non-empty array",
        });
    }
    for (const m of req.body) {
      if (!m.hl_id || !m.chapter_id || !m.url) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Each hot line  must have hl_id, chapter_id, url",
          });
      }
    }
    const hotLines = await HotLine.insertMany(req.body, { ordered: false });
    res.status(201).json({ success: true, data: hotLines });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
const HotLine = require("../models/hotLine");

// Create hot line
exports.createHotLine = async (req, res) => {
  try {
    const {
      hl_id,
      subject_id,
      medium,
      board,
      chapter_id,
      standard,
      url,
      created_by,
    } = req.body;
    if (!hl_id || !chapter_id || !url) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (hl_id, chapter_id, url)",
      });
    }
    const hotLine = await HotLine.create({
      hl_id,
      subject_id,
      medium,
      board,
      chapter_id,
      standard,
      url,
      created_by,
    });
    res.status(201).json({
      success: true,
      message: "Hot line created successfully",
      data: hotLine,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating hot line",
      error: error.message,
    });
  }
};

// Get all hot lines
exports.getAllHotLines = async (req, res) => {
  try {
    const hotLines = await HotLine.find()
      .populate("created_by", "name email")
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      count: hotLines.length,
      data: hotLines,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching hot lines",
      error: error.message,
    });
  }
};

// Update hot line (by id or hl_id)
exports.updateHotLine = async (req, res) => {
  try {
    const { url, chapter_id } = req.body;
    if (!url || !chapter_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (url, chapter_id)",
      });
    }
    let hotLine = null;
    if (req.params.id) {
      hotLine = await HotLine.findById(req.params.id);
    } else if (req.query.hl_id) {
      hotLine = await HotLine.findOne({ hl_id: req.query.hl_id });
    }
    if (!hotLine) {
      return res.status(404).json({
        success: false,
        message: "Hot line not found",
      });
    }
    Object.assign(hotLine, req.body);
    hotLine.last_updated_at = new Date();
    await hotLine.save();
    res.status(200).json({
      success: true,
      message: "Hot line updated successfully",
      data: hotLine,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating hot line",
      error: error.message,
    });
  }
};

// Delete hot line (by id or hl_id)
exports.deleteHotLine = async (req, res) => {
  try {
    let hotLine = null;

    if (req.params.id) {
      hotLine = await HotLine.findById(req.params.id);
    } else if (req.query.hl_id) {
      hotLine = await HotLine.findOne({ hl_id: req.query.hl_id });
    }

    if (!hotLine) {
      return res.status(404).json({
        success: false,
        message: "Hot line not found",
      });
    }

    await hotLine.deleteOne();

    res.status(200).json({
      success: true,
      message: "Hot line deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting hot line",
      error: error.message,
    });
  }
};

// Get hot lines by chapterId
exports.getHotLinesByChapterId = async (req, res) => {
  try {
    const { chapterId } = req.query;
    if (!chapterId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing chapterId in query" });
    }
    const hotLines = await HotLine.find({ chapter_id: chapterId })
      .populate("created_by", "name email")
      .sort({ created_at: -1 });
    res.status(200).json({ success: true, data: hotLines });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
