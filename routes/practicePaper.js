const express = require("express");
const router = express.Router();
const controller = require("../controllers/practicePaper");
const { isAuthenticated } = require("../middlewares/auth");

// Public routes (Students / Users browsing papers)
router.get("/practice-papers", controller.getPracticePapersBySubjectAndCategory);
router.get("/all/practice-papers", controller.getAllPracticePapers);
router.get("/practice-paper/:id", controller.getPracticePaperById);

// Protected routes (Admin / Content creators)
router.post("/practice-paper", isAuthenticated, controller.createPracticePaper);
router.post("/practice-papers/bulk", isAuthenticated, controller.bulkInsertPracticePapers);
router.put("/practice-paper/:id", isAuthenticated, controller.updatePracticePaper);
router.delete("/practice-paper/:id", isAuthenticated, controller.deletePracticePaper);

module.exports = router;
