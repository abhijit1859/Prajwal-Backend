const express = require("express");
const { createOrder, paymentVerification } = require("../controllers/purchase");
const { isAuthenticated } = require("../middlewares/auth");
const router = express.Router();

// Route to create a new Razorpay order
router.route("/createOrder").post(isAuthenticated, createOrder);

// Route to verify payment and purchase courses
router.route("/purchase/courses").post(isAuthenticated, paymentVerification);

module.exports = router;
