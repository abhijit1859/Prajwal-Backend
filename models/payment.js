const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  razorpayOrderId: {
    type: String,
    required: true,
    unique: true,
  },
  razorpayPaymentId: {
    type: String,
    default: "",
  },
  razorpaySignature: {
    type: String,
    default: "",
  },
  amount:{
    type: Number, //!smallest currency
    required: true,
  },
  currency:{
    type: String,
    default: 'INR',
  },

  receipt: {
    type: String,
    required: true},

    status:{
      type: String,
      enum: ['created', 'paid', 'failed'],
      default: 'created',
    },


  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Payment", paymentSchema);