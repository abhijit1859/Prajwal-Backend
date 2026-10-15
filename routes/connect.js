const express = require("express");
const multer = require("multer");
const { hiringForm } = require("../controllers/connect");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.route("/connect").post(upload.single("resume"), hiringForm);

module.exports = router;
