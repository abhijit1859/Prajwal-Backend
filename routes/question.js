const express = require("express");
const {
  createQuestion,
  getAllQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  uploadQuestionFile,
  getPaginatedQuestions,
  getPaginatedUserBookmarkedQuestions,
  getPaginatedCourseQuestions,
  getPaginatedSubjectQuestions,
} = require("../controllers/question");
const { isAuthenticated, isAdmin } = require("../middlewares/auth");
const {
  uploadQuestionFileMiddleware,
} = require("../middlewares/fileUpload");

const router = express.Router();

// Create a new question
router.route("/question").post(isAuthenticated, isAdmin, createQuestion);

// Get a single question by Question ID
router.route("/question/:id").get(isAuthenticated, getQuestionById);

// Get all questions
router.route("/questions").get(isAuthenticated, getAllQuestions);

// Update a question
router.route("/question/:id").put(isAuthenticated, isAdmin, updateQuestion);

// Delete a question
router.route("/question/:id").delete(isAuthenticated, isAdmin, deleteQuestion);

// Upload a question file (JSON) and save data to the database
router.route("/questions/upload").post(uploadQuestionFileMiddleware, uploadQuestionFile);

// Get paginated questions
router
  .route("/questions/paginated")
  .get(isAuthenticated, getPaginatedQuestions);

// Get paginated user bookmarked questions
router
  .route("/questions/bookmarked")
  .get(isAuthenticated, getPaginatedUserBookmarkedQuestions);

// Get paginated course questions
/*router
  .route("/questions/course")
  .get(isAuthenticated, getPaginatedCourseQuestions);*/

// Get paginated subject questions
router
  .route("/questions/subject")
  .get(isAuthenticated, getPaginatedSubjectQuestions);

module.exports = router;
