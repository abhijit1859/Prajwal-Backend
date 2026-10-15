// controllers/paymentController.js

const crypto = require("crypto");
const Payment = require("../models/payment");
const Subject = require("../models/subject");
const User = require("../models/user");
const Coupon = require("../models/coupon");
const razorpay = require("../config/razorpay"); // Ensure Razorpay is configured correctly

/**
 * Helper function to generate a Razorpay order
 */
const generateRazorpayOrder = async (amount, currency = "INR", receipt) => {
  try {
    const options = {
      amount: Math.round(amount * 100), // Razorpay expects amount in paisa
      currency,
      receipt,
      payment_capture: 1,
    };
    return await razorpay.orders.create(options);
  } catch (error) {
    throw new Error("Failed to create Razorpay order: " + error.message);
  }
};

/**
 * Helper function to verify Razorpay payment signature
 */
const verifyPaymentSignature = (orderId, paymentId, signature) => {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_APT_SECRET)
    .update(body)
    .digest("hex");
  return expectedSignature === signature;
};

/**
 * Create a new Razorpay order
 */
exports.createOrder = async (req, res) => {
  const { amount, currency, receipt } = req.body;

  // Validate request body
  if (!amount || !receipt) {
    return res.status(400).json({
      success: false,
      message: "Amount and Receipt are required",
    });
  }

  try {
    // Generate Razorpay order
    const response = await generateRazorpayOrder(amount, currency, receipt);

    // Create a payment record in the database
    const paymentOrder = {
      razorpayOrderId: response.id,
      amount: response.amount,
      currency: response.currency,
      receipt: response.receipt,
      owner: req.user._id,
      status: "created",
    };
    const order = await Payment.create(paymentOrder);

    res.status(200).json({
      success: true,
      order,
      razorpayKey: process.env.RAZORPAY_API_KEY, // Provide Razorpay Key for frontend
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Server Error: ${err.message}`,
    });
  }
};

/**
 * Verify payment and purchase courses
 */
exports.paymentVerification = async (req, res) => {
  const {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    subjectId,
    couponCode = "",
  } = req.body;

  if (
    !razorpayOrderId ||
    !razorpayPaymentId ||
    !razorpaySignature ||
    !subjectId
  ) {
    return res.status(400).json({
      success: false,
      message:
        "Missing required fields: razorpayOrderId, razorpayPaymentId, razorpaySignature, and subjectId are required",
    });
  }

  try {
    // Verify payment signature
    const isAuthentic = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    // Ensure payment exists in the database
    const payment = await Payment.findOne({ razorpayOrderId });
    if (!payment) {
      return res.status(400).json({
        success: false,
        message: "Payment record not found.",
      });
    }

    // Update payment status in the database
    payment.razorpayPaymentId = razorpayPaymentId;
    payment.razorpaySignature = razorpaySignature;
    payment.status = isAuthentic ? "paid" : "failed";
    await payment.save();

    if (!isAuthentic) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed.",
        order: payment,
      });
    }

    // Proceed to purchase the course(s)
    const purchaseResult = await purchaseCourse(
      req.user._id,
      subjectId,
      couponCode
    );

    if (!purchaseResult.success) {
      return res.status(400).json({
        success: false,
        message: purchaseResult.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payment successful and courses purchased.",
      order: payment,
      user: purchaseResult.user,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server Error: " + err.message,
    });
  }
};

/**
 * Function to purchase course(s) for the user
 */
const purchaseCourse = async (userId, subjectId, couponCode) => {
  try {
    const user = await User.findById(userId);
    if (!user) return { success: false, message: "User not found." };

    // Defensive: ensure purchasedSubjects is always an array
    if (!Array.isArray(user.purchasedSubjects)) {
      user.purchasedSubjects = [];
    }
    // Remove null or missing courses before processing
    user.purchasedSubjects = user.purchasedSubjects.filter(
      (p) => p && p.subject
    );

    // Prevent duplicate purchases (but still set isPro if already purchased)
    let alreadyPurchased = user.purchasedSubjects.some(
      (p) => p.subject.toString() === subjectId
    );

    let newPurchases = [];
    if (!alreadyPurchased) {
      // Check if subjectId is a valid ObjectId
      const mongoose = require("mongoose");
      let purchasedSubject = null;
      if (mongoose.Types.ObjectId.isValid(subjectId)) {
        try {
          purchasedSubject = await Subject.findById(subjectId);
        } catch (e) {
          purchasedSubject = null;
        }
      }
      // If not found or not valid ObjectId, try by subject_id string
      if (!purchasedSubject) {
        purchasedSubject = await Subject.findOne({ subject_id: subjectId });
      }
      if (!purchasedSubject)
        return { success: false, message: "Purchased subject not found." };

      const { medium, board, standard } = purchasedSubject;
      // Find all subjects matching medium, board, and standard
      const matchingSubjects = await Subject.find({ medium, board, standard });
      if (matchingSubjects.length) {
        const currentDate = new Date();
        const validTill = new Date(
          currentDate.setFullYear(currentDate.getFullYear() + 1)
        ); // 1 year validity
        // Add only new subjects
        newPurchases = matchingSubjects
          .filter(
            (subject) =>
              !user.purchasedSubjects.some(
                (p) => p.subject.toString() === subject._id.toString()
              )
          )
          .map((subject) => ({
            subject: subject._id,
            purchasedAt: new Date(),
            validTill: validTill,
          }));
        if (newPurchases.length) {
          user.purchasedSubjects.push(...newPurchases);
        }
      }
    }
    // Always set is_pro true if user has at least one purchased subject (after possible new additions)
    if (user.purchasedSubjects.length > 0) {
      user.is_pro = true;
      user.purchaseDate = new Date();
    } else {
      user.is_pro = false;
      user.purchaseDate = null;
    }
    await user.save();

    // Validate coupon if provided
    if (couponCode) {
      const couponInfo = await updateCouponInfo(couponCode);
      if (!couponInfo.success) {
        return { success: false, message: couponInfo.message };
      }
    }

    // Return updated user without password and with consistent field names
    const updatedUser = await User.findById(userId).select('-password').lean();
    return { 
      success: true, 
      user: {
        ...updatedUser,
        is_pro: updatedUser.is_pro || false // Ensure is_pro is always included in response
      }
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

/**
 * Function to update coupon information
 */
const updateCouponInfo = async (coupon_name) => {
  try {
    const coupon = await Coupon.findOne({
      coupon_name: coupon_name.toLowerCase(),
    });
    if (!coupon) return { success: false, message: "Coupon not found." };

    // Check max_users
    if (coupon.max_users > 0 && coupon.used_count >= coupon.max_users) {
      return { success: false, message: "Coupon usage limit exceeded." };
    }

    // Check validity
    const now = Date.now();
    if (
      (coupon.valid_from && coupon.valid_from.getTime() > now) ||
      (coupon.valid_up_to && coupon.valid_up_to.getTime() < now)
    ) {
      return { success: false, message: "Coupon is not valid at this time." };
    }

    // Increment used_count (add this field if not present)
    coupon.used_count = (coupon.used_count || 0) + 1;
    await coupon.save();

    return { success: true, message: "Coupon updated successfully." };
  } catch (error) {
    return { success: false, message: error.message };
  }
};
