const express = require("express");
const router = express.Router();
const chapterController = require("../controllers/chapter");

// Create a chapter
router.post("/chapter", chapterController.createChapter);

// Get all chapters
router.get("/chapter", chapterController.getAllChapters);

// Get chapters by subjectId
router.get('/chapter/by-subject', chapterController.getChaptersBySubjectId);

// Delete a chapter by ID
router.delete("/chapter/:id?", chapterController.deleteChapter);


// Update chapter (partial update)
router.put("/chapter/:id?", chapterController.updateChapter);

module.exports = router;
