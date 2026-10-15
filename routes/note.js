const express = require("express");
const router = express.Router();

const noteController = require("../controllers/note");

router.post("/note", noteController.createNote);
router.post("/note/bulk", noteController.bulkCreateNotes);
router.get("/note", noteController.getNotes);
router.get("/note/by-chapter", noteController.getNotesByChapterId);
router.get("note/:id", noteController.getNoteById);
router.put("note/:id", noteController.updateNote);
router.delete("note/:id", noteController.deleteNote);

module.exports = router;
