// Bulk create videos
exports.bulkCreateVideos = async (req, res) => {
  try {
    if (!Array.isArray(req.body) || req.body.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Request body must be a non-empty array",
        });
    }
    // Validate each video object minimally
    for (const v of req.body) {
      if (!v.video_id || !v.title || !v.url || !v.chapter_id) {
        return res
          .status(400)
          .json({
            success: false,
            message: "Each video must have video_id, title, url, chapter_id",
          });
      }
    }
    const videos = await Video.insertMany(req.body, { ordered: false });
    res.status(201).json({ success: true, data: videos });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
const Video = require("../models/video");

// Create Video
exports.createVideo = async (req, res) => {
  try {
    const {
      video_id,
      title,
      url,
      subject_id,
      topics,
      medium,
      board,
      chapter_id,
      standard,
    } = req.body;
    if (!video_id || !title || !url || !chapter_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (video_id, title, url, chapter_id)",
      });
    }
    const video = new Video({
      video_id,
      title,
      url,
      subject_id,
      topics,
      medium,
      board,
      chapter_id,
      standard,
    });
    await video.save();
    res.status(201).json({ success: true, data: video });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get All Videos
exports.getAllVideos = async (req, res) => {
  try {
    const videos = await Video.find();
    res.status(200).json({ success: true, data: videos });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get Video by ID
exports.getVideo = async (req, res) => {
  try {
    const video = await Video.findOne({ video_id: req.params.id });
    if (!video) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }
    res.status(200).json({ success: true, data: video });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update Video
exports.updateVideo = async (req, res) => {
  try {
    console.log("DEBUG updateVideo req.body:", req.body);
    const { url, chapter_id } = req.body;
    if (!url || !chapter_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields (url, chapter_id)",
      });
    }
    const video = await Video.findOneAndUpdate(
      { video_id: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!video) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }
    res.status(200).json({ success: true, data: video });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete Video
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findOneAndDelete({ video_id: req.params.id });
    if (!video) {
      return res
        .status(404)
        .json({ success: false, message: "Video not found" });
    }
    res
      .status(200)
      .json({ success: true, message: "Video deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Get videos by chapterId
exports.getVideosByChapterId = async (req, res) => {
  try {
    const { chapterId } = req.query;
    if (!chapterId) {
      return res
        .status(400)
        .json({ success: false, message: "Missing chapterId in query" });
    }
    const videos = await Video.find({ chapter_id: chapterId });
    res.status(200).json({ success: true, data: videos });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
