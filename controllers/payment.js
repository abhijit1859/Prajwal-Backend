const crypto = require("crypto");
const Payment = require("../models/payment");
const User = require("../models/user");
const razorpay = require('../config/razorpay');

exports.createOrder = async (req, res) => {
  const { amount, currency, receipt } = req.body;
  if (!amount || !receipt) {
    return res.status(400).json({
      success: false,
      message: 'Amount and Receipt are required'
    })
  }
  try {
    const options = {
      amount: Number(amount * 100),
      currency: currency || "INR",
      receipt: receipt,
      payment_capture: 1
    };
    const response = await razorpay.orders.create(options);
    const paymentOrder = {
      razorpayOrderId: response.id,
      amount: response.amount,
      currency: response.currency,
      receipt: response.receipt,
      owner: req.user._id,
      status: 'created',
    };
    const order = await Payment.create(paymentOrder);
    res.status(200).json({
      success: true,
      order,
    });
  }
  catch (err) {
    res.status(500).json({
      success: false,
      message: `Server Error: ${err.message}`
    });
  };
}

exports.paymentVerification = async (req, res) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } =
    req.body;
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return res.status(400).json({
      success: false,
      message: 'razorpayOrderId, razorpayPaymentId and razorpaySignature are required'
    })
  }
  const body = razorpayOrderId + "|" + razorpayPaymentId;
  try {
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_APT_SECRET)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpaySignature;

    const updateData = {
      razorpayPaymentId,
      razorpaySignature,
      status: isAuthentic ? "paid" : "failed",
    };

    const updatedPayment = await Payment.findOneAndUpdate(
      { razorpayOrderId },
      updateData,
      { new: true }
    );

    if (!updatedPayment) {
      return res.status(400).json({
        success: false,
        message: "Payment order not found.",
      });
    }

    if (isAuthentic) {
      // Update user's is_pro status after successful payment
      if (updatedPayment.owner) {
        const user = await User.findById(updatedPayment.owner);
        if (user) {
          user.is_pro = true;
          await user.save();
        }
      }

      return res.status(200).json({
        success: true,
        message: "Payment successful.",
        order: updatedPayment,
        is_pro: true
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed.",
        order: updatedPayment,
      });
    }
  }
  catch (err) {
    res.status(500).json({
      success: false,
      message: `Server Error: ${err.message}`
    });
  }
};

exports.getPaymentsByUser = async (req, res) => {
  const userId = req.user._id;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID is required',
    });
  }

  try {
    const payments = await Payment.find({ owner: userId });
    res.status(200).json({
      success: true,
      payments: payments,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Server Error: ${err.message}`,
    });
  }
};