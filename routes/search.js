// routes/search.js
const express = require("express");
const router = express.Router();
const {
  initializeModel,
  searchQuestions,
  generateEmbeddingsForSubject,
} = require("../controllers/aiSearch");
const Question = require("../models/question");
const { isAuthenticated } = require("../middlewares/auth");
initializeModel().catch((err) => console.error("Model init failed:", err));

// ✅ Search endpoint
router.route("/search").get(isAuthenticated, searchQuestions);

// ✅ Admin embedding generation endpoint
// router.post("/admin/generate-embeddings", async (req, res) => {
//   try {
//     const secret = req.headers["x-admin-secret"] || req.body.secret;
//     if (!secret || secret !== process.env.ADMIN_SECRET)
//       return res.status(403).json({ error: "forbidden" });

//     const { subject, batchSize = 50, force = false } = req.body;
//     if (!subject) return res.status(400).json({ error: "subject required" });

//     const result = await generateEmbeddingsForSubject(subject, {
//       batchSize: Number(batchSize),
//       force: Boolean(force),
//     });
//     res.json({ success: true, result });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// });

router.route("/generate-embeddings").post( async (req, res) => {
  try {
    const { subject_id } = req.body;
    if (!subject_id) return res.status(400).json({ error: "subject_id required" });

    const result = await generateEmbeddingsForSubject(subject_id, { force: true });
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


router.route("/generate-embeddings/all").post(  async (req, res) => {
  
    const force = true ;
res.json({
    success: true,
    message: "Embedding generation started in background",
  });

  // Start background job
  setImmediate(async () => {
    try {
      const subjects = await Question.distinct("subject_id");
      let totalProcessed = 0;
      let totalQuestions = 0;

      for (const subject of subjects) {
        const { processed, total } = await generateEmbeddingsForSubject(subject, { batchSize: 50, force: true });
        totalProcessed += processed;
        totalQuestions += total;
      }

      console.log("🎉 EMBEDDING JOB FINISHED", {
        totalSubjects: subjects.length,
        totalQuestions,
        totalProcessed,
      });

    } catch (err) {
      console.error("❌ Background embedding job failed:", err);
       res.status(500).json({ success: false, message: error.message });
    }
  });
});
 


module.exports = router;
