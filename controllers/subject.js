const Subject = require("../models/subject");
const User = require("../models/user");

const allowedFields = [
  "subject_id",
  "title",
  "details",
  "medium",
  "board",
  "standard",
  "free_chapters",
  "all_chapters",
  "blueprint",
  "owner",
  "cover_image_url",
  "questions",
  "notes",
  "maps",
  "videos",
];

const filterRequestBody = (body) => {
  const filteredBody = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      filteredBody[field] = body[field];
    }
  }
  return filteredBody;
};

exports.createSubject = async (req, res) => {
  try {
    const filteredBody = filterRequestBody(req.body);
    const subject = new Subject(filteredBody);
    await subject.save();
    const user = await User.findById(req.user._id);
    if (user) {
      user.createdSubjects = user.createdSubjects || [];
      user.createdSubjects.push({ subject: subject._id });
      await user.save();
    }
    res.status(201).json({ success: true, data: subject });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getAllSubjects = async (req, res) => {
  try {
     const { medium, standard } = req.query;

    // Build filter dynamically
    const filter = {};

    if (medium) {
      filter.medium = medium;
    }

    if (standard) {
      filter.standard = standard;
    }

    const subjects = await Subject.find(filter).populate(
      "owner",
      "name email imageUrl role"
    );
    res.status(200).json({ success: true, data: subjects });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id).populate(
      "owner",
      "name email imageUrl role"
    );
    if (!subject) {
      return res
        .status(404)
        .json({ success: false, message: "Subject not found" });
    }
    res.status(200).json({ success: true, data: subject });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getSubjectsByUser = async (req, res) => {
  try {
    const subjects = await Subject.find({ owner: req.params.userId }).populate(
      "owner",
      "name email imageUrl role"
    );
    if (!subjects.length) {
      return res
        .status(404)
        .json({ success: false, message: "No subjects found for this user" });
    }
    res
      .status(200)
      .json({ success: true, count: subjects.length, data: subjects });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getSubjectsByFilters = async (req, res) => {
  try {
    const filters = filterRequestBody(req.query);
    const subjects = await Subject.find(filters).populate(
      "owner",
      "name email imageUrl role"
    );
    res
      .status(200)
      .json({ success: true, count: subjects.length, data: subjects });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const filteredBody = filterRequestBody(req.body);
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res
        .status(404)
        .json({ success: false, message: "Subject not found" });
    }
    if (subject.owner.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({
          success: false,
          message: "You are not authorized to update this subject",
        });
    }
    const updatedSubject = await Subject.findByIdAndUpdate(
      req.params.id,
      filteredBody,
      { new: true, runValidators: true }
    );
    res.status(200).json({ success: true, data: updatedSubject });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res
        .status(404)
        .json({ success: false, message: "Subject not found" });
    }
    if (subject.owner.toString() !== req.user._id.toString()) {
      return res
        .status(401)
        .json({
          success: false,
          message: "You are not authorized to delete this subject",
        });
    }
    await subject.deleteOne();
    res
      .status(200)
      .json({ success: true, message: "Subject deleted successfully" });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
