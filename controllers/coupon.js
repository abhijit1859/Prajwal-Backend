const Coupon = require("../models/coupon");

const allowedFields = [
  "coupon_name",
  "discount_percentage",
  "discount_amount",
  "valid_from",
  "valid_up_to",
  "max_users"
];

// Function to filter request body based on allowed fields
const filterRequestBody = (body) => {
  const filteredBody = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      filteredBody[field] = body[field];
    }
  }
  return filteredBody;
};

//! Create Coupon
exports.createCoupon = async (req, res) => {
  try {
    const filteredBody = filterRequestBody(req.body); // Filter the request body

    // Convert valid_from and valid_up_to if they're in string format
    ["valid_from", "valid_up_to"].forEach((field) => {
      if (filteredBody[field]) {
        filteredBody[field] = new Date(filteredBody[field]);
        if (isNaN(filteredBody[field].getTime())) {
          return res.status(400).json({
            success: false,
            message: `Invalid date format for ${field}. Use ISO string or timestamp.`,
          });
        }
      }
    });

    // Ensure coupon_name is lowercase and snake_case
    if (filteredBody.coupon_name) {
      filteredBody.coupon_name = filteredBody.coupon_name.toLowerCase();
    }

    const coupon = new Coupon(filteredBody);
    await coupon.save();

    res.status(201).json({
      success: true,
      data: coupon,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

//! Get all coupons in db
exports.getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.find({}); // Retrieve all coupons
    res.status(200).json({
      success: true,
      data: coupons,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

//! Get coupon by Name
exports.getCouponByName = async (req, res) => {
  try {
    const coupon = await Coupon.findOne({ coupon_name: req.params.coupon_name.toLowerCase() });
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }
    res.status(200).json({
      success: true,
      data: coupon,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

//! Delete Coupon by ID
exports.deleteCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "Coupon not found",
      });
    }
    res.status(200).json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
