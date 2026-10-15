const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema(
  {
    courseId: {
      type: String,
      required: [true, "Please enter a courseID"],
    },
    title: {
      type: String,
      required: [true, "Please enter a Title"],
    },
    courseDetails: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: new Map(),
      required: [false, "Please enter Course Details"],
    },
    board: {
      type: String,
      required: [true, "Please enter a board"],
    },
    medium: {
      type: String,
      required: [true, "Please enter a medium"],
    },
    standard: {
      type: Number,
      required: [true, "Please enter a standard"],
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    price: {
      type: Number,
      default: 0,
    },
    freeChapters: {
      type: Map,
      of: [String],
      default: {},
    },
    allChapters: {
      type: Map,
      of: [String],
      default: {},
    },
    bluePrint: {
      type: [String],
      default: [],
    },
    pdfs: {
      type: [String],
      default: [],
    },
    eliteMedia: {
      type: [String],
      default: [],
    },
    linkedCourses: [
      {
        courses: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "courses",
        },
      },
    ],
    faq: {
      type: Map,
      of: String,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Please enter a subject"],
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Please enter a Owner"],
    },
    questions: [
      {
        question: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Question",
        },
      },
    ],
    courseType: {
      type: String,
      required: [true, "Please enter a course type"],
      enum: ["course", "practice", "test", "mentorship"],
    },
    imageUrl: {
      type: String,
      required: [true, "Please enter a Image Url"],
    },
  },
  {
    timestamps: true,
  }
);
module.exports = mongoose.model("Course", courseSchema);
