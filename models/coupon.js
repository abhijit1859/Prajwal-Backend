const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  coupon_name: {
    type: String,
    default: "na",
    required: true,
    unique: true,
    lowercase: true,
  },
  discount_percentage: {
    type: Number,
    default: 0,
    required: true,
  },
  discount_amount: {
    type: Number,
    default: 0,
    required: true,
  },
  valid_from: {
    type: Date,
    default: () => new Date(0),
    required: true,
  },
  valid_up_to: {
    type: Date,
    default: () => new Date(0),
    required: true,
  },
  max_users: {
    type: Number,
    default: 0,
    required: true,
  },
  used_count: {
    type: Number,
    default: 0,
    required: true,
  },
  created_at: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Coupon", couponSchema);