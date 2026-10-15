const Course = require("../models/course");
const User = require("../models/user");
const Subject = require("../models/subject");

// Define allowed fields for Course model
const allowedFields = [
  "title",
  "courseDetails",
  "courseId",
  "price",
  "board",
  "medium",
  "subject",
  "standard",
  "isPaid",
  "imageUrl",
  "owner",
  "questions",
  "courseType",
  "freeChapters",
  "allChapters",
  "bluePrint",
  "linkedCourses",
  "faq",
];

// Function to filter request body based on allowed fields
const filterRequestBody = (body) => {
  const filteredBody = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      filteredBody[field] = body[field];
    }
  }
  return filteredBody;
};

//! Create Course
exports.createCourse = async (req, res) => {
  try {
    const filteredBody = filterRequestBody(req.body);

    // Resolve subject name to ObjectId
    if (!req.body.subjectName) {
      return res
        .status(400)
        .json({ success: false, message: "Subject name is required" });
    }

    const subjectDoc = await Subject.findOne({ name: req.body.subjectName });
    if (!subjectDoc) {
      return res
        .status(404)
        .json({ success: false, message: "Subject not found" });
    }

    filteredBody.subject = subjectDoc._id;

    const course = new Course(filteredBody);
    await course.save();

    const user = await User.findById(req.user._id);
    user.createdCourses.push({ course: course._id });
    await user.save();

    res.status(201).json({
      success: true,
      data: course,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

//! Get All Courses
exports.getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find().populate(
      "owner",
      "name email imageUrl role"
    ); // Populate owner details
    res.status(200).json({
      success: true,
      data: courses,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

//! Get Course by ID
exports.getCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate(
      "owner",
      "name email imageUrl role"
    );
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }
    res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

//! Get Courses by User
exports.getCoursesByUser = async (req, res) => {
  try {
    const courses = await Course.find({ owner: req.params.userId }).populate(
      "owner",
      "name email imageUrl role"
    );
    if (!courses.length) {
      return res.status(404).json({
        success: false,
        message: "No courses found for this user",
      });
    }
    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

//! Get Courses by Filters
exports.getCoursesByFilters = async (req, res) => {
  try {
    const filters = filterRequestBody(req.query); // Filter the query parameters
    const courses = await Course.find(filters).populate(
      "owner",
      "name email imageUrl role"
    );
    res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

//! Update Course
exports.updateCourse = async (req, res) => {
  try {
    const filteredBody = filterRequestBody(req.body); // Filter the request body
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }
    if (course.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: "You are not authorized to update this course",
      });
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      req.params.id,
      filteredBody,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      data: updatedCourse,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

//! Delete Course
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }
    if (course.owner.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: "You are not authorized to delete this course",
      });
    }
    await course.deleteOne();
    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
