const Chapter = require("../models/chapter");
const Course = require("../models/course");
const Subject = require("../models/subject");

// Create Chapter
exports.createChapter = async (req, res) => {
  try {
    const chapter = await Chapter.create(req.body);
    res.status(201).json({
      success: true,
      message: "Chapter created successfully",
      data: chapter,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating chapter",
      error: error.message,
    });
  }
};

// Get all chapters
exports.getAllChapters = async (req, res) => {
  try {
    const chapters = await Chapter.find().sort({ created_at: -1 });
    res.status(200).json({
      success: true,
      count: chapters.length,
      data: chapters,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching chapters",
      error: error.message,
    });
  }
};

// Delete chapter (by id or chapter_id)
exports.deleteChapter = async (req, res) => {
  try {
    let chapter = null;

    if (req.params.id) {
      chapter = await Chapter.findById(req.params.id);
    } else if (req.query.chapter_id) {
      chapter = await Chapter.findOne({ chapter_id: req.query.chapter_id });
    }

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: "Chapter not found",
      });
    }

    await chapter.deleteOne();

    res.status(200).json({
      success: true,
      message: "Chapter deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting chapter",
      error: error.message,
    });
  }
};

// Update chapter (by id or chapter_id)
exports.updateChapter = async (req, res) => {
  try {
    let chapter = null;

    if (req.params.id) {
      chapter = await Chapter.findById(req.params.id);
    } else if (req.query.chapter_id) {
      chapter = await Chapter.findOne({ chapter_id: req.query.chapter_id });
    }

    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: "Chapter not found",
      });
    }

    Object.assign(chapter, req.body);
    chapter.last_updated_at = new Date();
    await chapter.save();

    res.status(200).json({
      success: true,
      message: "Chapter updated successfully",
      data: chapter,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating chapter",
      error: error.message,
    });
  }
};

// Get chapters by subjectId
exports.getChaptersBySubjectId = async (req, res) => {
  try {
    const { subjectId } = req.query;
    if (!subjectId) {
      return res.status(400).json({ success: false, message: 'subjectId is required' });
    }
    const chapters = await Chapter.find({ subject_id: subjectId }).sort({ created_at: -1 });
    res.status(200).json({
      success: true,
      count: chapters.length,
      data: chapters,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching chapters by subjectId',
      error: error.message,
    });
  }
};
