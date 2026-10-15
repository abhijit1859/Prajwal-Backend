const express = require("express");
const {
  createOrder,
  paymentVerification,
  getPaymentsByUser,
} = require("../controllers/payment.js");
const { isAuthenticated } = require("../middlewares/auth");

const router = express.Router();

router.route("/createOrder").post(isAuthenticated,createOrder);

router.route("/paymentverification").post(isAuthenticated,paymentVerification);

router.route("/getPaymentsByUser").get(isAuthenticated,getPaymentsByUser);

module.exports = router;