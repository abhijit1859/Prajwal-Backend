const express = require("express");
const {
  syncSubjectsWithQuestions,
  clearUploadsDirectory,
  syncUserBookmarkedQuestions,
  clearNonExistingUserPreferences,
  syncPaidSubjectsWithUsers,
} = require("../controllers/sync");
const { isAuthenticated, isAdmin } = require("../middlewares/auth");
const router = express.Router();

// Define routes
router
  .route("/sync/subjects")
  .get(isAuthenticated, isAdmin, syncSubjectsWithQuestions);
router
  .route("/sync/uploads")
  .get(isAuthenticated, isAdmin, clearUploadsDirectory);
router
  .route("/sync/bookmarks")
  .get(isAuthenticated, isAdmin, syncUserBookmarkedQuestions);
router
  .route("/sync/preferences")
  .get(isAuthenticated, isAdmin, clearNonExistingUserPreferences);
//router.route("/sync/purchased-courses").get(isAuthenticated, isAdmin, syncPaidSubjectsWithUsers);

module.exports = router;
