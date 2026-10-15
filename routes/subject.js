const express = require("express");
const {
  createSubject,
  getAllSubjects,
  getSubject,
  getSubjectsByUser,
  getSubjectsByFilters,
  updateSubject,
  deleteSubject,
} = require("../controllers/subject");
const { isAuthenticated, isSameIP  } = require("../middlewares/auth");

const router = express.Router();

router.route("/subjects").get(isAuthenticated, isSameIP, getAllSubjects);
router.route("/subject/create").post(isAuthenticated, createSubject);
router.route("/subject/user/:userId").get(isAuthenticated, getSubjectsByUser);
router.route("/subject/filters").get(isAuthenticated, getSubjectsByFilters);
router.route("/subject/:id").get(isAuthenticated, getSubject);
router.route("/subject/:id/delete").delete(isAuthenticated, deleteSubject);
router.route("/subject/update/:id").put(isAuthenticated, updateSubject);

module.exports = router;
