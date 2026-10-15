const mongoose = require("mongoose");
const PracticeSubject = require("../models/practice_subjects");
const PracticePaper = require("../models/practicePaper");

// Helper to safely build query matching either MongoDB _id or custom paper_subject_id
const getSubjectLookupQuery = (id) => {
  if (!id) return null;
  const trimmedId = String(id).trim();
  if (mongoose.Types.ObjectId.isValid(trimmedId)) {
    return { $or: [{ _id: trimmedId }, { paper_subject_id: trimmedId }] };
  }
  return { paper_subject_id: trimmedId };
};

/**
 * Create a new PracticeSubject (supports single object or array)
 * Required in body: paper_subject_id, title
 */
exports.createPracticeSubject = async (req, res) => {
  try {
    const payloads = Array.isArray(req.body) ? req.body : [req.body];

    if (!payloads.length) {
      return res
        .status(400)
        .json({ success: false, message: "Request body must contain at least one subject" });
    }

    // Validate required fields
    const invalid = payloads.find((p) => !p || !p.paper_subject_id || !p.title);
    if (invalid) {
      return res.status(400).json({
        success: false,
        message: "Each subject requires paper_subject_id and title",
      });
    }

    // Normalize and sanitize payload fields
    const normalized = payloads.map((p) => ({
      paper_subject_id: String(p.paper_subject_id).trim(),
      title: String(p.title).trim(),
      cover_image_url: p.cover_image_url ? String(p.cover_image_url).trim() : "",
      order: Number.isFinite(Number(p.order)) ? parseInt(p.order, 10) : 0,
      medium: p.medium ? String(p.medium).trim() : undefined,
      board: p.board ? String(p.board).trim() : undefined,
      standard: p.standard ? String(p.standard).trim() : undefined,
    }));

    // Find existing subjects by paper_subject_id to skip duplicates
    const ids = normalized.map((n) => n.paper_subject_id);
    const existingDocs = await PracticeSubject.find({ paper_subject_id: { $in: ids } }).select("paper_subject_id");
    const existingSet = new Set(existingDocs.map((d) => d.paper_subject_id));

    const toInsert = normalized.filter((n) => !existingSet.has(n.paper_subject_id));
    const skipped = normalized.filter((n) => existingSet.has(n.paper_subject_id));

    if (!toInsert.length) {
      return res.status(200).json({
        success: false,
        message: "No new subjects to create. All provided paper_subject_id values already exist.",
        skipped,
      });
    }

    const created = await PracticeSubject.insertMany(toInsert, { ordered: false });

    return res.status(201).json({
      success: true,
      message: `${created.length} practice subject(s) created`,
      createdCount: created.length,
      created,
      skipped,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Duplicate paper_subject_id detected",
        error: error.message,
      });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all PracticeSubjects
 * Query filters: medium, board, standard
 * Pagination (optional): ?page=1&limit=20
 * Sorting (optional): ?sort=order | ?sort=created_at | ?sort=title
 */
exports.getAllPracticeSubjects = async (req, res) => {
  try {
    const { medium, board, standard, sort, page, limit } = req.query;

    const filter = {};
    if (medium) filter.medium = medium;
    if (board) filter.board = board;
    if (standard) filter.standard = standard;

    // Sorting logic
    const sortOption = {};
    if (sort === "created_at") {
      sortOption.created_at = -1;
    } else if (sort === "title") {
      sortOption.title = 1;
    } else {
      sortOption.order = 1;
      sortOption.created_at = -1;
    }

    // Optional pagination
    let query = PracticeSubject.find(filter).sort(sortOption);

    const totalCount = await PracticeSubject.countDocuments(filter);

    if (page || limit) {
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit, 10) || 20);
      const skip = (pageNum - 1) * limitNum;

      const subjects = await query.skip(skip).limit(limitNum);

      return res.status(200).json({
        success: true,
        page: pageNum,
        limit: limitNum,
        totalPages: totalCount > 0 ? Math.ceil(totalCount / limitNum) : 0,
        totalCount,
        data: subjects,
      });
    }

    const subjects = await query;

    return res.status(200).json({
      success: true,
      totalCount,
      data: subjects,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get a single PracticeSubject by MongoDB _id OR paper_subject_id
 */
exports.getPracticeSubjectById = async (req, res) => {
  try {
    const lookup = getSubjectLookupQuery(req.params.id);
    if (!lookup) {
      return res.status(400).json({ success: false, message: "Valid subject ID is required" });
    }

    const subject = await PracticeSubject.findOne(lookup);
    if (!subject) {
      return res.status(404).json({ success: false, message: "PracticeSubject not found" });
    }

    // Also count practice papers under this subject
    const paperCount = await PracticePaper.countDocuments({
      paper_subject_id: subject.paper_subject_id,
    });

    return res.status(200).json({
      success: true,
      data: {
        ...subject.toObject(),
        total_papers: paperCount,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update PracticeSubject by MongoDB _id OR paper_subject_id
 */
exports.updatePracticeSubject = async (req, res) => {
  try {
    const lookup = getSubjectLookupQuery(req.params.id);
    if (!lookup) {
      return res.status(400).json({ success: false, message: "Valid subject ID is required" });
    }

    const updated = await PracticeSubject.findOneAndUpdate(
      lookup,
      { ...req.body, last_updated_at: Date.now() },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: "PracticeSubject not found" });
    }

    return res.status(200).json({
      success: true,
      message: "PracticeSubject updated successfully",
      data: updated,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Another PracticeSubject with this paper_subject_id already exists",
      });
    }
    return res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * Delete PracticeSubject by MongoDB _id OR paper_subject_id
 * Supports query ?cascade=true to delete associated papers as well
 */
exports.deletePracticeSubject = async (req, res) => {
  try {
    const lookup = getSubjectLookupQuery(req.params.id);
    if (!lookup) {
      return res.status(400).json({ success: false, message: "Valid subject ID is required" });
    }

    const subject = await PracticeSubject.findOne(lookup);
    if (!subject) {
      return res.status(404).json({ success: false, message: "PracticeSubject not found" });
    }

    const linkedPapersCount = await PracticePaper.countDocuments({
      paper_subject_id: subject.paper_subject_id,
    });

    const cascade = req.query.cascade === "true";
    let deletedPapersCount = 0;

    if (linkedPapersCount > 0) {
      if (cascade) {
        const result = await PracticePaper.deleteMany({
          paper_subject_id: subject.paper_subject_id,
        });
        deletedPapersCount = result.deletedCount || 0;
      } else {
        return res.status(400).json({
          success: false,
          message: `Cannot delete PracticeSubject. It has ${linkedPapersCount} linked practice papers. Pass ?cascade=true to delete both.`,
          linkedPapersCount,
        });
      }
    }

    await PracticeSubject.deleteOne({ _id: subject._id });

    return res.status(200).json({
      success: true,
      message: "PracticeSubject deleted successfully",
      deletedSubject: subject,
      deletedPapersCount,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};