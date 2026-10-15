const express = require("express");
const {
  createVideo,
  getAllVideos,
  getVideo,
  updateVideo,
  deleteVideo,
  bulkCreateVideos,
} = require("../controllers/video");
const { isAuthenticated } = require("../middlewares/auth");

const router = express.Router();

router.route("/videos").get(isAuthenticated, getAllVideos);
router.route("/video/create").post(isAuthenticated, createVideo);
router.route("/video/bulk").post(isAuthenticated, bulkCreateVideos);
router.route("/video/:id").get(isAuthenticated, getVideo);
router.route("/video/update/:id").put(isAuthenticated, updateVideo);
router.route("/video/:id/delete").delete(isAuthenticated, deleteVideo);
router
  .route("/videos/by-chapter")
  .get(require("../controllers/video").getVideosByChapterId);

module.exports = router;
