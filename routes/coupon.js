const express = require("express");

const {
  createCoupon,
  getAllCoupons,
  getCouponByName,
  deleteCouponById,
} = require("../controllers/coupon.js");
const { isAuthenticated, isAdmin } = require("../middlewares/auth");
const router = express.Router();

//define routes
router.route("/createCoupon").post(isAuthenticated, createCoupon);
router.route("/getAllCoupons").get(isAuthenticated, getAllCoupons);
router
  .route("/getCouponByName/:coupon_name")
  .get(isAuthenticated, getCouponByName);
router
  .route("/coupon/delete/:id")
  .delete(isAuthenticated, isAdmin, deleteCouponById);

module.exports = router;
