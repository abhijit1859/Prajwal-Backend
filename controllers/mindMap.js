// Bulk create mind maps
exports.bulkCreateMindMaps = async (req, res) => {
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
      if (!m.map_id || !m.chapter_id || !m.url) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Each mind map must have map_id, chapter_id, url",
          });
      }
    }
    const mindMaps = await MindMap.insertMany(req.body, { ordered: false });
    res.status(201).json({ success: true, data: mindMaps });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
const MindMap = require("../models/mindMap");

// Create mind map
exports.createMindMap = async (req, res) => {
  try {
    const {
      map_id,
      subject_id,
      medium,
      board,
      chapter_id,
      standard,
      title,
      image_url,
      url,
      created_by,
    } = req.body;
    if (!map_id || !chapter_id || !url) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (map_id, chapter_id, url)",
      });
    }
    const mindMap = await MindMap.create({
      map_id,
      subject_id,
      medium,
      board,
      chapter_id,
      standard,
      title,
      image_url,
      url,
      created_by,
    });
    res.status(201).json({
      success: true,
      message: "Mind map created successfully",
      data: mindMap,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating mind map",
      error: error.message,
    });
  }
};

// Get all mind maps
exports.getAllMindMaps = async (req, res) => {
  try {
    const mindMaps = await MindMap.find()
      .populate("created_by", "name email")
      .sort({ created_at: -1 });

    res.status(200).json({
      success: true,
      count: mindMaps.length,
      data: mindMaps,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching mind maps",
      error: error.message,
    });
  }
};

// Update mind map (by id or map_id)
exports.updateMindMap = async (req, res) => {
  try {
    const { url, chapter_id } = req.body;
    if (!url || !chapter_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (url, chapter_id)",
      });
    }
    let mindMap = null;
    if (req.params.id) {
      mindMap = await MindMap.findById(req.params.id);
    } else if (req.query.map_id) {
      mindMap = await MindMap.findOne({ map_id: req.query.map_id });
    }
    if (!mindMap) {
      return res.status(404).json({
        success: false,
        message: "Mind map not found",
      });
    }
    Object.assign(mindMap, req.body);
    mindMap.last_updated_at = new Date();
    await mindMap.save();
    res.status(200).json({
      success: true,
      message: "Mind map updated successfully",
      data: mindMap,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating mind map",
      error: error.message,
    });
  }
};

// Delete mind map (by id or map_id)
exports.deleteMindMap = async (req, res) => {
  try {
    let mindMap = null;

    if (req.params.id) {
      mindMap = await MindMap.findById(req.params.id);
    } else if (req.query.map_id) {
      mindMap = await MindMap.findOne({ map_id: req.query.map_id });
    }

    if (!mindMap) {
      return res.status(404).json({
        success: false,
        message: "Mind map not found",
      });
    }

    await mindMap.deleteOne();

    res.status(200).json({
      success: true,
      message: "Mind map deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting mind map",
      error: error.message,
    });
  }
};

// Get mind maps by chapterId
exports.getMindMapsByChapterId = async (req, res) => {
  try {
    const { chapterId } = req.query;
    if (!chapterId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing chapterId in query" });
    }
    const mindMaps = await MindMap.find({ chapter_id: chapterId })
      .populate("created_by", "name email")
      .sort({ created_at: -1 });
    res.status(200).json({ success: true, data: mindMaps });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
