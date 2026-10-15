const express = require("express");
const router = express.Router();

const { isAuthenticated, isAdmin } = require("../middlewares/auth");
const hotLineController = require("../controllers/hotLine");

// POST: Create mind map
router.route("/hot-line").post(hotLineController.createHotLine);
router.route("/hot-line/bulk").post(hotLineController.bulkCreateHotLines);

// GET: All mind maps
router.route("/hot-lines").get(hotLineController.getAllHotLines);

// GET: All mind maps by chapter
router.route("/hot-line/by-chapter").get(hotLineController.getHotLinesByChapterId);

// DELETE: Delete mind map by ID or name
router.route("/hot-line/:id?").delete(isAuthenticated, isAdmin, hotLineController.deleteHotLine);

// UPDATE: Update mind map by ID or map_id
router.route("/hot-line/:id?").put( hotLineController.updateHotLine);

module.exports = router;
