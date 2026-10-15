const express = require("express");
const router = express.Router();
const {
  createPracticeSubject,
  getAllPracticeSubjects,
  getPracticeSubjectById,
  updatePracticeSubject,
  deletePracticeSubject,
} = require("../controllers/practiceSubject");
const { isAuthenticated } = require("../middlewares/auth");

// Public reading routes
router.get("/practice-subjects", getAllPracticeSubjects);
router.get("/practice-subject/:id", getPracticeSubjectById);

// Protected routes (Admin / Content creators)
router.post("/practice-subject", isAuthenticated, createPracticeSubject);
router.post("/create/practice-subjects", isAuthenticated, createPracticeSubject); // backward compatibility
router.put("/practice-subject/:id", isAuthenticated, updatePracticeSubject);
router.delete("/practice-subject/:id", isAuthenticated, deletePracticeSubject);

module.exports = router;