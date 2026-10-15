const express = require("express");
const router = express.Router();

const mindMapController = require("../controllers/mindMap");

// POST: Create mind map
router.post("/mind-map", mindMapController.createMindMap);
router.post("/mind-map/bulk", mindMapController.bulkCreateMindMaps);

// GET: All mind maps
router.get("/mind-map", mindMapController.getAllMindMaps);

// GET: All mind maps by chapter
router.get("/mind-map/by-chapter", mindMapController.getMindMapsByChapterId);

// DELETE: Delete mind map by ID or name
router.delete("/mind-map/:id?", mindMapController.deleteMindMap);

// UPDATE: Update mind map by ID or map_id
router.put("/mind-map/:id?", mindMapController.updateMindMap);

module.exports = router;
