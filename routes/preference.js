const express = require("express");
const {
  createPreferences,
  getPreferences,
  updatePreferences,
} = require("../controllers/preference");
const { isAuthenticated } = require("../middlewares/auth");

const router = express.Router();

//! Route for creating preferences
router.route("/preferences").post(isAuthenticated, createPreferences);

//! Route for getting preferences of the logged-in user
router.route("/preferences").get(isAuthenticated, getPreferences);

//! Route for updating preferences of the logged-in user
router.route("/preferences").put(isAuthenticated, updatePreferences);

module.exports = router;
