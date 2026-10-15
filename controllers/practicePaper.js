const mongoose = require("mongoose");
const PracticePaper = require("../models/practicePaper");
const PracticeSubject = require("../models/practice_subjects");

// Helper to safely build query matching either MongoDB _id or custom paper_id
const getPaperLookupQuery = (id) => {
  if (!id) return null;
  const trimmedId = String(id).trim();
  if (mongoose.Types.ObjectId.isValid(trimmedId)) {
    return { $or: [{ _id: trimmedId }, { paper_id: trimmedId }] };
  }
  return { paper_id: trimmedId };
};

// ✅ Create a single PracticePaper
exports.createPracticePaper = async (req, res) => {
  try {
    const { paper_id, paper_subject_id, title, url } = req.body;

    if (!paper_id || !paper_subject_id || !title || !url) {
      return res.status(400).json({
        success: false,
        message: "paper_id, paper_subject_id, title, and url are required fields",
      });
    }

    // Optional check: ensure practice subject exists
    const subjectExists = await PracticeSubject.exists({
      paper_subject_id: String(paper_subject_id).trim(),
    });
    if (!subjectExists) {
      return res.status(400).json({
        success: false,
        message: `PracticeSubject with paper_subject_id '${paper_subject_id}' does not exist`,
      });
    }

    const paper = new PracticePaper({
      ...req.body,
      paper_id: String(paper_id).trim(),
      paper_subject_id: String(paper_subject_id).trim(),
      title: String(title).trim(),
      url: String(url).trim(),
    });

    await paper.save();

    res.status(201).json({
      success: true,
      message: "PracticePaper created successfully",
      data: paper,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: `PracticePaper with paper_id '${req.body.paper_id}' already exists`,
      });
    }

    res.status(400).json({
      success: false,
      message: "Error creating PracticePaper",
      error: error.message,
    });
  }
};

// ✅ Bulk insert multiple PracticePapers
exports.bulkInsertPracticePapers = async (req, res) => {
  try {
    const papers = req.body;

    if (!Array.isArray(papers) || papers.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request body must be a non-empty array",
      });
    }

    // Validate that required fields exist on every item
    for (let i = 0; i < papers.length; i++) {
      const item = papers[i];
      if (!item.paper_id || !item.paper_subject_id || !item.title || !item.url) {
        return res.status(400).json({
          success: false,
          message: `Item at index ${i} is missing one of required fields: paper_id, paper_subject_id, title, url`,
        });
      }
    }

    // Check for internal duplicates within the payload
    const payloadIds = papers.map((p) => String(p.paper_id).trim());
    const uniqueIds = new Set(payloadIds);
    if (uniqueIds.size !== payloadIds.length) {
      return res.status(400).json({
        success: false,
        message: "Request contains duplicate paper_id values within the array",
      });
    }

    // Find already existing paper_ids in the database
    const existing = await PracticePaper.find({ paper_id: { $in: payloadIds } }).select("paper_id");
    const existingSet = new Set(existing.map((e) => e.paper_id));

    const toInsert = papers
      .filter((p) => !existingSet.has(String(p.paper_id).trim()))
      .map((p) => ({
        ...p,
        paper_id: String(p.paper_id).trim(),
        paper_subject_id: String(p.paper_subject_id).trim(),
        title: String(p.title).trim(),
        url: String(p.url).trim(),
      }));

    const skipped = papers.filter((p) => existingSet.has(String(p.paper_id).trim()));

    if (toInsert.length === 0) {
      return res.status(200).json({
        success: false,
        message: "No new papers inserted. All provided paper_id values already exist.",
        skipped,
      });
    }

    const insertedPapers = await PracticePaper.insertMany(toInsert, { ordered: false });

    res.status(201).json({
      success: true,
      message: `${insertedPapers.length} PracticePapers inserted successfully`,
      insertedCount: insertedPapers.length,
      data: insertedPapers,
      skipped,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "One or more practice papers have duplicate paper_id",
        error: error.message,
      });
    }

    res.status(400).json({
      success: false,
      message: "Error inserting PracticePapers",
      error: error.message,
    });
  }
};

// ✅ Get PracticePapers with subject, category, and standard/board filters + pagination
exports.getPracticePapersBySubjectAndCategory = async (req, res) => {
  try {
    const { subject_id, paper_subject_id, category, medium, board, standard } = req.query;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
    const skip = (page - 1) * limit;

    // Build filter dynamically
    const filter = {};

    const targetSubjectId = subject_id || paper_subject_id;
    if (targetSubjectId) filter.paper_subject_id = targetSubjectId;
    if (category) filter.category = category;
    if (medium) filter.medium = medium;
    if (board) filter.board = board;
    if (standard) filter.standard = standard;

    const [papers, total] = await Promise.all([
      PracticePaper.find(filter)
        .sort({ order: 1, created_at: -1 })
        .skip(skip)
        .limit(limit),
      PracticePaper.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      page,
      limit,
      totalPages: total > 0 ? Math.ceil(total / limit) : 0,
      totalRecords: total,
      data: papers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching PracticePapers",
      error: error.message,
    });
  }
};

// ✅ Get all PracticePapers (with optional filters)
exports.getAllPracticePapers = async (req, res) => {
  try {
    const { medium, board, standard, paper_subject_id, subject_id, category } = req.query;
    const filter = {};

    const targetSubjectId = subject_id || paper_subject_id;
    if (targetSubjectId) filter.paper_subject_id = targetSubjectId;
    if (category) filter.category = category;
    if (medium) filter.medium = medium;
    if (board) filter.board = board;
    if (standard) filter.standard = standard;

    const papers = await PracticePaper.find(filter).sort({ order: 1, created_at: -1 });

    res.status(200).json({
      success: true,
      totalRecords: papers.length,
      data: papers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching PracticePapers",
      error: error.message,
    });
  }
};

// ✅ Get a single PracticePaper by MongoDB _id OR custom paper_id
exports.getPracticePaperById = async (req, res) => {
  try {
    const lookup = getPaperLookupQuery(req.params.id);
    if (!lookup) {
      return res.status(400).json({ success: false, message: "Valid paper ID is required" });
    }

    const paper = await PracticePaper.findOne(lookup);
    if (!paper) {
      return res.status(404).json({
        success: false,
        message: "PracticePaper not found",
      });
    }

    res.status(200).json({
      success: true,
      data: paper,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching PracticePaper",
      error: error.message,
    });
  }
};

// ✅ Update a PracticePaper by MongoDB _id OR custom paper_id
exports.updatePracticePaper = async (req, res) => {
  try {
    const lookup = getPaperLookupQuery(req.params.id);
    if (!lookup) {
      return res.status(400).json({ success: false, message: "Valid paper ID is required" });
    }

    const updatedPaper = await PracticePaper.findOneAndUpdate(
      lookup,
      { ...req.body, last_updated_at: Date.now() },
      { new: true, runValidators: true }
    );

    if (!updatedPaper) {
      return res.status(404).json({
        success: false,
        message: "PracticePaper not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "PracticePaper updated successfully",
      data: updatedPaper,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Another PracticePaper with this paper_id already exists",
      });
    }

    res.status(400).json({
      success: false,
      message: "Error updating PracticePaper",
      error: error.message,
    });
  }
};

// ✅ Delete a PracticePaper by MongoDB _id OR custom paper_id
exports.deletePracticePaper = async (req, res) => {
  try {
    const lookup = getPaperLookupQuery(req.params.id);
    if (!lookup) {
      return res.status(400).json({ success: false, message: "Valid paper ID is required" });
    }

    const deletedPaper = await PracticePaper.findOneAndDelete(lookup);

    if (!deletedPaper) {
      return res.status(404).json({
        success: false,
        message: "PracticePaper not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "PracticePaper deleted successfully",
      data: deletedPaper,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting PracticePaper",
      error: error.message,
    });
  }
};
