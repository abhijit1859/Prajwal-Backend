const { sendEmail, sendEmailOTP } = require("../middlewares/sendEmail");
const User = require("../models/user");
const Question = require("../models/question");
const DeletedUserTrial = require("../models/deletedUserTrial");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { sendOTP } = require("../config/msg91");
const {
  generateSecureOTP,
  hashOTP,
  verifyOTPHash,
  calculateExpiry,
  checkResendCooldown,
  getMaxVerificationAttempts,
} = require("../services/otpService");
const { OAuth2Client } = require("google-auth-library");
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const allowedFields = [
  "name",
  "user_name",
  "email",
  "email_id",
  "mobile_number",
  "phoneNumber",
  "password",
  "role",
  "is_registered",
  "is_mobile_verified",
  "isPhoneVerified",
  "is_email_verified",
  "isEmailVerified",
  "image_url",
  "imageUrl",
  "school",
  "district",
  "is_pro",
  "isPro",
  "device_info",
];

const filterRequestBody = (body) => {
  const filteredBody = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      filteredBody[field] = body[field];
    }
  }
  return filteredBody;
};

// Register user with phone number
exports.registerWithPhone = async (req, res) => {
  try {
    const mobile_number = req.body.mobile_number || req.body.phoneNumber;

    if (!mobile_number) {
      return res.status(400).json({
        success: false,
        message: "mobile_number is required",
      });
    }

    let user = await User.findOne({
      $or: [{ mobile_number }, { phoneNumber: mobile_number }],
    });
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit OTP
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000);

    if (!user) {
      // New user: create with dummy email, but without user_name yet
      user = await User.create({
        mobile_number,
        phoneNumber: mobile_number,
        email_id: `phone${mobile_number}@placeholder.com`,
        email: `phone${mobile_number}@placeholder.com`,
        phoneOtp: otp,
        phoneOtpExpire: otpExpire,
        is_mobile_verified: false,
        isPhoneVerified: false,
        logged_in_devices: [
          {
            device_info: "first_device",
            last_login: new Date(),
            active: true,
          },
        ],
      });
      console.log("New user created, OTP generated");
    } else {
      // Existing user (even if already verified, resend OTP to re-login)
      user.phoneOtp = otp;
      user.phoneOtpExpire = otpExpire;
      console.log("Existing user found, OTP regenerated");
      await user.save();
    }

    // Send OTP via MSG91
    const msg91Response = await sendOTP(mobile_number, otp);

    if (!msg91Response.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please try again.",
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      // Don't send OTP in response for security
    });
  } catch (error) {
    console.error("Error in registerWithPhone:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Register / login with email using MSG91 Email Connections OTP
exports.registerWithEmail = async (req, res) => {
  try {
    const rawEmail = req.body.email || req.body.email_id;

    if (!rawEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const email = String(rawEmail).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    let user = await User.findOne({
      $or: [{ email }, { email_id: email }],
    }).select("+emailOtp +emailOtpExpire +emailOtpAttempts +emailOtpLastSentAt");

    // Enforce resend cooldown if user exists
    if (user && user.emailOtpLastSentAt) {
      const cooldownCheck = checkResendCooldown(user.emailOtpLastSentAt);
      if (cooldownCheck.inCooldown) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${cooldownCheck.secondsRemaining} second(s) before requesting a new OTP.`,
        });
      }
    }

    // Generate cryptographically secure 6-digit OTP
    const otp = generateSecureOTP();
    const hashedOtp = hashOTP(otp);
    const otpExpire = calculateExpiry();
    const recipientName = user ? user.name || user.user_name : email.split("@")[0];

    // Dispatch OTP via MSG91 Email Connections HTTPS API
    const sendResult = await sendEmailOTP(
      email,
      otp,
      recipientName,
      Number(process.env.OTP_EXPIRY_MINUTES) || 5
    );

    if (!sendResult.success) {
      return res.status(502).json({
        success: false,
        message: sendResult.message || "Failed to send email verification OTP. Please try again.",
      });
    }

    // Persist hashed OTP only after delivery succeeded
    if (!user) {
      user = await User.create({
        email,
        email_id: email,
        name: email.split("@")[0],
        user_name: email.split("@")[0],
        emailOtp: hashedOtp,
        emailOtpExpire: otpExpire,
        emailOtpAttempts: 0,
        emailOtpLastSentAt: new Date(),
        is_email_verified: false,
        isEmailVerified: false,
        freeTrialActive: true,
        freeTrialStart: new Date(),
        freeTrialEnd: new Date(Date.now() + 120 * 60 * 60 * 1000),
        logged_in_devices: [
          {
            device_info: "first_device",
            last_login: new Date(),
            active: true,
          },
        ],
      });
      console.log("New user created with email, OTP securely dispatched and hashed");
    } else {
      user.emailOtp = hashedOtp;
      user.emailOtpExpire = otpExpire;
      user.emailOtpAttempts = 0;
      user.emailOtpLastSentAt = new Date();
      await user.save();
      console.log("Existing user found with email, new OTP securely dispatched and hashed");
    }

    res.status(200).json({
      success: true,
      message: "Email verification OTP sent successfully",
    });
  } catch (error) {
    console.error("Error in registerWithEmail:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// register user
exports.registerUser = async (req, res) => {
  try {
    const mobile_number = req.body.mobile_number || req.body.phoneNumber;
    const email = req.body.email || req.body.email_id;
    const user_name = req.body.user_name || req.body.name;

    if ((!mobile_number && !email) || !user_name) {
      return res.status(400).json({
        success: false,
        message: "mobile_number/email and user_name are required",
      });
    }

    const query = mobile_number
      ? { $or: [{ mobile_number }, { phoneNumber: mobile_number }] }
      : { $or: [{ email }, { email_id: email }] };

    const user = await User.findOne(query);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.user_name = user_name;
    user.name = user_name; // Also set name field
    user.is_registered = true; // Mark as registered
    await user.save();

    res.status(200).json({
      success: true,
      message: "User name saved successfully",
      user,
    });
  } catch (error) {
    console.error("Error in registerUser:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Resend OTP
exports.resendOtp = async (req, res) => {
  try {
    const rawMobile = req.body.mobile_number || req.body.phoneNumber;
    const rawEmail = req.body.email || req.body.email_id;

    if (!rawMobile && !rawEmail) {
      return res.status(400).json({
        success: false,
        message: "mobile_number or email is required",
      });
    }

    const mobile_number = rawMobile ? String(rawMobile).trim() : null;
    const email = rawEmail ? String(rawEmail).trim().toLowerCase() : null;

    const query = mobile_number
      ? { $or: [{ mobile_number }, { phoneNumber: mobile_number }] }
      : { $or: [{ email }, { email_id: email }] };

    const user = await User.findOne(query).select(
      "+emailOtp +emailOtpExpire +emailOtpAttempts +emailOtpLastSentAt +phoneOtp +phoneOtpExpire"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (email && !mobile_number) {
      // Enforce resend cooldown
      const cooldownCheck = checkResendCooldown(user.emailOtpLastSentAt);
      if (cooldownCheck.inCooldown) {
        return res.status(429).json({
          success: false,
          message: `Please wait ${cooldownCheck.secondsRemaining} second(s) before requesting a new OTP.`,
        });
      }

      const otp = generateSecureOTP();
      const hashedOtp = hashOTP(otp);
      const otpExpire = calculateExpiry();

      const emailResponse = await sendEmailOTP(
        email,
        otp,
        user.name || user.user_name,
        Number(process.env.OTP_EXPIRY_MINUTES) || 5
      );

      if (!emailResponse.success) {
        return res.status(502).json({
          success: false,
          message: emailResponse.message || "Failed to send email OTP. Please try again.",
        });
      }

      user.emailOtp = hashedOtp;
      user.emailOtpExpire = otpExpire;
      user.emailOtpAttempts = 0;
      user.emailOtpLastSentAt = new Date();
      await user.save();
    } else {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      user.phoneOtp = otp;
      user.phoneOtpExpire = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      const msg91Response = await sendOTP(mobile_number, otp);
      if (!msg91Response.success) {
        return res.status(500).json({
          success: false,
          message: "Failed to send OTP. Please try again.",
        });
      }
    }

    res.status(200).json({
      success: true,
      message: "OTP resent successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Verify OTP, login, return JWT
exports.verifyOtp = async (req, res) => {
  try {
    const rawMobile = req.body.mobile_number || req.body.phoneNumber;
    const rawEmail = req.body.email || req.body.email_id;
    const rawOtp = req.body.otp;

    const mobile_number = rawMobile ? String(rawMobile).trim() : null;
    const email = rawEmail ? String(rawEmail).trim().toLowerCase() : null;
    const otp = rawOtp !== undefined && rawOtp !== null ? String(rawOtp).trim() : null;

    if ((!mobile_number && !email) || !otp) {
      return res.status(400).json({
        success: false,
        message: "Identifier (mobile_number or email) and otp are required",
      });
    }

    const query = mobile_number
      ? { $or: [{ mobile_number }, { phoneNumber: mobile_number }] }
      : {
          $or: [
            { email: new RegExp(`^${email}$`, "i") },
            { email_id: new RegExp(`^${email}$`, "i") },
          ],
        };

    // Select OTP fields even if select: false
    const user = await User.findOne(query).select(
      "+phoneOtp +phoneOtpExpire +emailOtp +emailOtpExpire +emailOtpAttempts"
    );

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const now = new Date();

    if (email && !mobile_number) {
      const otpExpireDate = user.emailOtpExpire ? new Date(user.emailOtpExpire) : null;
      const storedOtpHash = user.emailOtp;

      if (!storedOtpHash || !otpExpireDate) {
        return res.status(400).json({
          success: false,
          message: "No active OTP found. Please request a new OTP.",
        });
      }

      if (otpExpireDate < now) {
        user.emailOtp = undefined;
        user.emailOtpExpire = undefined;
        user.emailOtpAttempts = 0;
        await user.save();
        return res.status(400).json({
          success: false,
          message: "Expired OTP. Please request a new OTP.",
        });
      }

      const maxAttempts = getMaxVerificationAttempts();
      if ((user.emailOtpAttempts || 0) >= maxAttempts) {
        user.emailOtp = undefined;
        user.emailOtpExpire = undefined;
        user.emailOtpAttempts = 0;
        await user.save();
        return res.status(429).json({
          success: false,
          message:
            "Too many failed attempts. This OTP has been invalidated. Please request a new OTP.",
        });
      }

      const isMatch = verifyOTPHash(otp, storedOtpHash);
      if (!isMatch) {
        user.emailOtpAttempts = (user.emailOtpAttempts || 0) + 1;
        const remaining = Math.max(0, maxAttempts - user.emailOtpAttempts);
        if (remaining === 0) {
          user.emailOtp = undefined;
          user.emailOtpExpire = undefined;
          user.emailOtpAttempts = 0;
          await user.save();
          return res.status(429).json({
            success: false,
            message:
              "Maximum verification attempts exceeded. This OTP has been invalidated.",
          });
        }
        await user.save();
        return res.status(400).json({
          success: false,
          message: `Invalid OTP. ${remaining} attempt(s) remaining.`,
        });
      }

      // Successful verification: clear OTP and attempts to prevent reuse
      user.is_email_verified = true;
      user.isEmailVerified = true;
      user.emailOtp = undefined;
      user.emailOtpExpire = undefined;
      user.emailOtpAttempts = 0;
    } else {
      const otpExpireDate = user.phoneOtpExpire ? new Date(user.phoneOtpExpire) : null;
      const storedOtp = user.phoneOtp ? String(user.phoneOtp).trim() : null;

      if (!storedOtp || storedOtp !== otp) {
        return res.status(400).json({ success: false, message: "Invalid OTP" });
      }
      if (!otpExpireDate || otpExpireDate < now) {
        return res.status(400).json({ success: false, message: "Expired OTP" });
      }

      user.is_mobile_verified = true;
      user.isPhoneVerified = true;
      user.phoneOtp = undefined;
      user.phoneOtpExpire = undefined;
    }

    // Mark previous devices inactive, add new device
    if (!user.logged_in_devices) {
      user.logged_in_devices = [];
    }
    user.logged_in_devices.forEach((d) => (d.active = false));
    user.logged_in_devices.push({
      device_info: "new_device",
      last_login: new Date(),
      active: true,
    });

    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.status(200).json({
      success: true,
      message: "Phone verified",
      token,
      user_name: user.user_name || user.name || null, // return user_name (even if null)
      user,
    });
  } catch (error) {
    console.error("❌ Error in verifyOtp:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delegate auth methods to auth controller for backwards compatibility
const authController = require("./auth");
exports.checkAuth = authController.checkAuth;



exports.register = async (req, res) => {
  try {
    const intentName = req.headers["x-intent-name"];
    let intent = "";
    if (intentName === "medhwan-prajwal") {
      intent = "prajwal";
    } else if (intentName === "medhwan-uttam") {
      intent = "uttam";
    } else {
      intent = "";
    }

    console.log("Registration attempt with body:", req.body);

    const email = req.body.email || req.body.email_id;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const filteredBody = filterRequestBody(req.body);
    filteredBody.email = filteredBody.email || email;
    filteredBody.email_id = filteredBody.email_id || email;
    console.log("Filtered body:", filteredBody);

    let user = await User.findOne({
      $or: [{ email }, { email_id: email }],
    });

    let freeTrialActive = false; // Trial starts only after email verification
    let freeTrialStart = null;
    let freeTrialEnd = null;
    const deletedTrial = await DeletedUserTrial.findOne({
      email,
    });
    if (deletedTrial) {
      // If user had deleted account before, always expire free trial
      freeTrialActive = false;
      freeTrialEnd = new Date();
      freeTrialStart = deletedTrial.freeTrialStart || freeTrialStart;
    }
    if (!user) {
      console.log("Creating new user...");
      user = await User.create({
        ...filteredBody,
        freeTrialActive,
        freeTrialStart,
        freeTrialEnd,
      });
      console.log("New user created with ID:", user._id);
    } else if (user.isEmailVerified || user.is_email_verified) {
      return res
        .status(400)
        .json({ success: false, message: "user already exists" });
    } else {
      console.log("Updating existing user...");
      // Check if trial has expired for existing unverified user
      const trialExpired = user.freeTrialEnd && user.freeTrialEnd < new Date();
      Object.assign(user, filteredBody);
      if (trialExpired) {
        user.freeTrialActive = false;
        user.freeTrialEnd = new Date();
      }
    }

    console.log("User before save:", {
      id: user._id,
      email: user.email_id || user.email,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0,
    });

    const VerifyToken = user.getVerifyToken();
    await user.save();

    console.log("User after save:", {
      id: user._id,
      email: user.email_id || user.email,
      hasPassword: !!user.password,
      passwordLength: user.password ? user.password.length : 0,
    });

    const resetUrl =
      intent === ""
        ? `${req.protocol}://${req.get(
            "host"
          )}/api/v1/verify/email/${VerifyToken}`
        : `${req.protocol}://${req.get(
            "host"
          )}/api/v1/verify/email/${intent}/${VerifyToken}`;
    const subject = "Prajwal - Verify Your Email";
    const message = `Thank you for signing up for Prajwal!\n\nTo complete your registration and activate your account, please verify your email address by clicking the link below:\n${resetUrl}\n\nIf you didn’t sign up for Prajwal, you can safely ignore this email.\n\nWe’re excited to have you on board!\n\nBest regards,\nTeam Prajwal.`;
    const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #eee; border-radius: 8px; padding: 32px 24px; background: #fafbfc;">
              <h2 style="color: #1e88e5; text-align: center;">Verify Your Email to Get Started with Prajwal</h2>
              <p style="font-size: 16px; color: #222;">Thank you for signing up for <b>Prajwal</b>!</p>
              <p style="font-size: 16px; color: #222;">To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: #1e88e5; color: #fff; padding: 14px 36px; border-radius: 5px; font-size: 18px; text-decoration: none; font-weight: bold; transition: background 0.2s;">👉 Verify Email</a>
              </div>
              <p style="font-size: 14px; color: #888;">If you didn’t sign up for Prajwal, you can safely ignore this email.</p>
              <p style="font-size: 16px; color: #222;">We’re excited to have you on board!</p>
              <p style="font-size: 16px; color: #222;">Best regards,<br><b>Team Prajwal</b></p>
            </div>
          `;
    try {
      await sendEmail({
        email: user.email || user.email_id,
        subject,
        message, // Plain text fallback
        html: emailHtml, // HTML content
      });
      return res.status(200).json({
        success: true,
        message: "Email sent successfully",
        verifyEmailLink: resetUrl, // This adds the verification link to the response
      });
    } catch (error) {
      user.verifyToken = undefined;
      user.verifyTokenExpire = undefined;
      await user.save();
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// When deleting a user, record their trial status and remaining time
exports.deleteUser = async (req, res) => {
  try {
    const email = req.body.email || req.body.email_id;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }
    const user = await User.findOne({
      $or: [{ email }, { email_id: email }],
    });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    // Save trial status and remaining time before deleting
    await DeletedUserTrial.findOneAndUpdate(
      { email: user.email_id || user.email },
      {
        trialExpired:
          !user.freeTrialActive ||
          (user.freeTrialEnd &&
            Date.now() > new Date(user.freeTrialEnd).getTime()),
        freeTrialStart: user.freeTrialStart,
        freeTrialEnd: user.freeTrialEnd,
        freeTrialActive: user.freeTrialActive,
        deletedAt: new Date(),
      },
      { upsert: true }
    );
    await user.deleteOne();
    res.status(200).json({
      success: true,
      message: "User deleted and trial status saved",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Function to resend verification email
exports.resendVerificationEmail = async (req, res) => {
  try {
    // Retrieve intent name from headers
    const intentName = req.headers["x-intent-name"];
    let intent = "";

    // Determine the intent based on the intent name
    if (intentName === "medhwan-prajwal") {
      intent = "prajwal";
    } else if (intentName === "medhwan-uttam") {
      intent = "uttam";
    } else {
      intent = ""; // Default case if intentName doesn't match
    }

    const email = req.body.email || req.body.email_id;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      $or: [{ email }, { email_id: email }],
    });
    if (!user || user.isEmailVerified || user.is_email_verified) {
      return res.status(400).json({
        success: false,
        message: "User not found or email already verified",
      });
    }

    // Always generate a new token and expiry
    const VerifyToken = user.getVerifyToken();
    await user.save();
    const resetUrl =
      intent === ""
        ? `${req.protocol}://${req.get(
            "host"
          )}/api/v1/verify/email/${VerifyToken}`
        : `${req.protocol}://${req.get(
            "host"
          )}/api/v1/verify/email/${intent}/${VerifyToken}`;
    const subject = "Prajwal - Verify Your Email";
    const message = `Thank you for signing up for Prajwal!\n\nTo complete your registration and activate your account, please verify your email address by clicking the link below:\n${resetUrl}\n\nIf you didn’t sign up for Prajwal, you can safely ignore this email.\n\nWe’re excited to have you on board!\n\nBest regards,\nTeam Prajwal.`;
    const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #eee; border-radius: 8px; padding: 32px 24px; background: #fafbfc;">
              <h2 style="color: #1e88e5; text-align: center;">Verify Your Email to Get Started with Prajwal</h2>
              <p style="font-size: 16px; color: #222;">Thank you for signing up for <b>Prajwal</b>!</p>
              <p style="font-size: 16px; color: #222;">To complete your registration and activate your account, please verify your email address by clicking the button below:</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: #1e88e5; color: #fff; padding: 14px 36px; border-radius: 5px; font-size: 18px; text-decoration: none; font-weight: bold; transition: background 0.2s;">👉 Verify Email</a>
              </div>
              <p style="font-size: 14px; color: #888;">If you didn’t sign up for Prajwal, you can safely ignore this email.</p>
              <p style="font-size: 16px; color: #222;">We’re excited to have you on board!</p>
              <p style="font-size: 16px; color: #222;">Best regards,<br><b>Team Prajwal</b></p>
            </div>
          `;
    try {
      await sendEmail({
        email: user.email || user.email_id,
        subject,
        message, // Plain text fallback
        html: emailHtml, // HTML content
      });
      res.status(200).json({
        success: true,
        message: "Verification email sent successfully",
      });
    } catch (error) {
      user.verifyToken = undefined;
      user.verifyTokenExpire = undefined;
      await user.save();
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


exports.login = authController.login;
exports.googleLogin = authController.googleLogin;
exports.logout = authController.logout;

exports.updatePassword = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword)
      return res.status(400).json({
        success: false,
        message: "Please provide old and new password",
      });
    if (oldPassword === newPassword)
      return res.status(400).json({
        success: false,
        message: "Old and new password cannot be same",
      });
    if (newPassword.length < 6)
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    const isMatch = await user.matchPassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Old Password is Incorrect",
      });
    }
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const {
      name,
      user_name,
      email,
      email_id,
      imageUrl,
      image_url,
      organization,
      isPro,
      is_pro,
    } = req.body;
    const updatedName = user_name || name;
    if (updatedName) {
      user.name = updatedName;
      user.user_name = updatedName;
    }
    const updatedEmail = email || email_id;
    if (updatedEmail) {
      user.email = updatedEmail;
      user.email_id = updatedEmail;
    }
    const updatedImage = imageUrl || image_url;
    if (updatedImage) {
      user.imageUrl = updatedImage;
      user.image_url = updatedImage;
    }
    if (organization !== undefined) {
      user.organization = organization;
    }
    const updatedPro = isPro !== undefined ? isPro : is_pro;
    if (updatedPro !== undefined) {
      user.isPro = updatedPro;
      user.is_pro = updatedPro;
    }
    await user.save();
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.deleteMyProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    // Save trial status and remaining time before deleting
    await DeletedUserTrial.findOneAndUpdate(
      { email: user.email_id || user.email },
      {
        trialExpired:
          !user.freeTrialActive ||
          (user.freeTrialEnd &&
            Date.now() > new Date(user.freeTrialEnd).getTime()),
        freeTrialStart: user.freeTrialStart,
        freeTrialEnd: user.freeTrialEnd,
        freeTrialActive: user.freeTrialActive,
        deletedAt: new Date(),
      },
      { upsert: true }
    );
    await user.deleteOne();
    // logout User after deleting profile.
    res.cookie("token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
    });
    res.status(200).json({
      success: true,
      message: "Profile deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.myProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    res.status(200).json({
      success: true,
      user,
      token,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("posts");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    // Remove .populate("posts") since posts is not a ref in the schema or is not needed
    const users = await User.find({});
    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const email = req.body.email || req.body.email_id;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }
    const user = await User.findOne({
      $or: [{ email }, { email_id: email }],
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
    const resetPasswordToken = user.getResetPasswordToken();
    await user.save();
    const resetUrl = `${req.protocol}://${req.get(
      "host"
    )}/api/v1/password/reset/${resetPasswordToken}`;
    const message =
      "Reset Your password by clicking on the link below \n\n" +
      resetUrl +
      "\n\n" +
      "or USE this code to reset your password: " +
      "\n" +
      "0000";
    try {
      await sendEmail({
        email: user.email || user.email_id,
        subject: "Prajwal - Password Setup",
        message,
      });
      res.status(200).json({
        success: true,
        message: "Email sent successfully",
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.forgotPasswordForPrajjwal = async (req, res) => {
  try {
    const email = req.body.email || req.body.email_id;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }
    const user = await User.findOne({
      $or: [{ email }, { email_id: email }],
    });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }


    // Generate the reset password token
    const resetPasswordToken = user.getResetPasswordToken();
    await user.save();

    // Log the raw and encoded token for debugging
    console.log(
      "[forgotPasswordForPrajjwal] Raw reset token:",
      resetPasswordToken
    );
    const encodedToken = encodeURIComponent(resetPasswordToken);
    console.log(
      "[forgotPasswordForPrajjwal] Encoded reset token:",
      encodedToken
    );

    // Redirect URL to an HTML page on the server
    const redirectUrl = `${req.protocol}://${req.get(
      "host"
    )}/api/v1/password/reset/prajjwal/${encodedToken}`;

    // Plain text message for email clients that don’t support HTML
    const message = `
      Please click on the link to continue with the password reset.

      ${redirectUrl}

      If you did not request this, please ignore this email.
    `;

    // HTML content for the email
    const emailHtml = `
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 50px;
              background-color: #f7f7f7;
              margin: 0;
            }
            .container {
              max-width: 500px;
              margin: auto;
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }
            .reset-title {
              color: #007bff;
              font-size: 24px;
              margin: 10px 0;
            }
            .reset-message {
              margin-bottom: 20px;
              font-size: 16px;
              color: #333;
            }
            .reset-button {
              background-color: #28a745;
              color: white;
              padding: 10px 20px;
              border: none;
              border-radius: 5px;
              font-size: 16px;
              cursor: pointer;
              text-decoration: none;
              transition: background-color 0.3s ease;
            }
            .reset-button:hover {
              background-color: #218838;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="reset-title">Password Reset Request</h1>
            <p class="reset-message">Click the button below to reset your password:</p>
            <a href="${redirectUrl}" class="reset-button">Reset Password</a>
            <p>If you did not request this, please ignore this email.</p>
          </div>
        </body>
      </html>
    `;

    // Send the email
    try {
      await sendEmail({
        email: user.email || user.email_id,
        subject: "Prajwal - Password Setup",
        message: message, // Plain text fallback
        html: emailHtml, // HTML content
      });

      res.status(200).json({
        success: true,
        message: "Email sent successfully",
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.renderPasswordResetPageForPrajjwal = async (req, res) => {
  const token = req.params.token;
  const appLink = `medhwan-prajwal://resetpassword?token=${token}`;
  const html = `
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background-color: #f7f7f7;
            margin: 0;
          }
          .container {
            max-width: 500px;
            margin: auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .reset-title {
            color: #007bff;
            font-size: 24px;
            margin: 10px 0;
          }
          .reset-message {
            margin-bottom: 20px;
            font-size: 16px;
            color: #333;
          }
          .reset-button {
            background-color: #28a745;
            color: white;
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            cursor: pointer;
            text-decoration: none;
            transition: background-color 0.3s ease;
          }
          .reset-button:hover {
            background-color: #218838;
          }
          .manual-redirect {
            margin-top: 15px;
            font-size: 14px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="reset-title">Redirecting to the App...</h1>
          <p class="reset-message">If you are not redirected automatically, click the button below:</p>
          <a href="${appLink}" class="reset-button">Open App</a>
          <p class="manual-redirect">Alternatively, copy this token and paste it in the app manually:</p>
          <p>${token}</p>
        </div>
      </body>
    </html>
  `;

  res.send(html);
};

exports.resetPassword = async (req, res) => {
  try {
    // Log the received token for debugging
    console.log("[resetPassword] Received token:", req.params.token);
    const decodedToken = decodeURIComponent(req.params.token);
    console.log("[resetPassword] Decoded token:", decodedToken);
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(decodedToken)
      .digest("hex");
    console.log(
      "[resetPassword] Hashed token for DB lookup:",
      resetPasswordToken
    );
    // Try to find the user by the hashed token
    console.log(
      "[resetPassword] Searching for user with token:",
      resetPasswordToken
    );
    const userByToken = await User.findOne({ resetPasswordToken });
    if (userByToken) {
      console.log(
        "[resetPassword] Found user by token:",
        userByToken.email || userByToken.email_id
      );
      console.log(
        "[resetPassword] Token expiry:",
        userByToken.resetPasswordExpire,
        "Current time:",
        new Date()
      );
    } else {
      console.log("[resetPassword] No user found with this token");
    }
    let user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    }).select("+resetPasswordToken +resetPasswordExpire");
    if (!user) {
      // Extra debug: try to find user by email and print their token/expiry
      const email = req.body.email || req.body.email_id;
      if (email) {
        const userByEmail = await User.findOne({
          $or: [{ email }, { email_id: email }],
        });
        if (userByEmail) {
          console.log(
            "[resetPassword][DEBUG] User found by email:",
            userByEmail.email || userByEmail.email_id
          );
          console.log(
            "[resetPassword][DEBUG] User DB resetPasswordToken:",
            userByEmail.resetPasswordToken
          );
          console.log(
            "[resetPassword][DEBUG] User DB resetPasswordExpire:",
            userByEmail.resetPasswordExpire,
            "Current time:",
            new Date()
          );
          if (userByEmail.resetPasswordToken !== resetPasswordToken) {
            console.log(
              "[resetPassword][DEBUG] Hashed token from request does NOT match user DB token!"
            );
          } else {
            console.log(
              "[resetPassword][DEBUG] Hashed token matches user DB token."
            );
          }
        } else {
          console.log(
            "[resetPassword][DEBUG] No user found by email for debug."
          );
        }
      } else {
        console.log(
          "[resetPassword][DEBUG] No email provided in request body for debug."
        );
      }
      // Try to find the user by email to re-issue a new token
      const debugEmail = req.body.email || req.body.email_id;
      let debugUser = null;
      if (debugEmail) {
        debugUser = await User.findOne({
          $or: [{ email: debugEmail }, { email_id: debugEmail }],
        });
      }
      if (debugUser) {
        console.log("Generate New PasswordResetToken");
        // Generate and send a new reset token
        const newToken = debugUser.getResetPasswordToken();
        await debugUser.save();
        const resetUrl = `${req.protocol}://${req.get(
          "host"
        )}/api/v1/password/reset/${newToken}`;
        const message =
          "Your previous password reset link expired. Please use the new link below to reset your password:\n\n" +
          resetUrl +
          "\n\nIf you did not request this, please ignore this email.";
        await sendEmail({
          email: debugUser.email || debugUser.email_id,
          subject: "Prajwal - Password Setup",
          message,
        });
        return res.status(401).json({
          success: false,
          message:
            "Your reset link expired. A new link has been sent to your email.",
        });
      } else {
        return res.status(401).json({
          success: false,
          message: "Invalid Token or Token Expired",
        });
      }
    }

    if (!req.body.password) {
      return res.status(400).json({
        success: false,
        message: "Please provide a new password",
      });
    }
    if (req.body.password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.isPasswordReset = true;
    user.is_password_reset = true;
    await user.save();
    res.status(200).json({
      success: true,
      message: "Password Updated Successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.verifyEmail = async (req, res) => {
  try {
    const verifyToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    // Select verification token fields even if they have select: false
    const user = await User.findOne({
      verifyToken,
      verifyTokenExpire: { $gt: new Date() },
    }).select("+verifyToken +verifyTokenExpire");

    console.log("Verification attempt:", {
      token: req.params.token,
      hashedToken: verifyToken,
      userFound: !user,
    });

    if (!user) {
      // Token invalid or expired: show a page with a button to request a new verification email
      return res.status(401).send(`
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Verification Link Expired</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                text-align: center;
                padding: 50px;
                background-color: #f7f7f7;
              }
              .container {
                max-width: 500px;
                margin: auto;
                background: #ffffff;
                padding: 32px 24px;
                border-radius: 10px;
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
              }
              .btn {
                background: #1e88e5;
                color: #fff;
                padding: 14px 36px;
                border-radius: 6px;
                font-size: 18px;
                text-decoration: none;
                font-weight: bold;
                display: inline-block;
                margin-top: 24px;
              }
              .btn:hover {
                background: #1565c0;
              }
              p {
                color: #444;
                font-size: 16px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1 style="color:#d9534f;">Verification link expired</h1>
              <p>
                The verification link has expired. Please log in to the Prajwal app using your credentials to request a new verification.
              </p>
            </div>
          </body>
        </html>
      `);
    }
    user.isEmailVerified = true;
    user.is_email_verified = true;
    user.verifyToken = undefined;
    user.verifyTokenExpire = undefined;
    if (!user.freeTrialStart && !user.freeTrialEnd) {
      user.freeTrialActive = true;
      user.freeTrialStart = new Date();
      user.freeTrialEnd = new Date(Date.now() + 129600000); // 36 hours
    }
    await user.save();
    // Add meta-refresh and JS redirect for better UX
    res.status(200).send(`
      <html>
        <head>
          <meta charset="UTF-8">
          <meta http-equiv="refresh" content="2;url=medhwan-prajwal://main" />
          <script>
            setTimeout(function() {
              window.location.href = 'medhwan-prajwal://main';
            }, 2000);
          </script>
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #28a745;">Email Verified Successfully!</h1>
          <p>Your email has been verified. You can now log in to Medhwan and continue.</p>
          <a href="medhwan-prajwal://main" style="display: inline-block; background: #1e88e5; color: #fff; padding: 14px 36px; border-radius: 5px; font-size: 18px; text-decoration: none; font-weight: bold;">Go to App</a>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.verifyEmailPrajjwal = async (req, res) => {
  try {
    const verifyToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    // Select verification token fields even if they have select: false
    const user = await User.findOne({
      verifyToken,
      verifyTokenExpire: { $gt: new Date() },
    }).select("+verifyToken +verifyTokenExpire");

    if (!user) {
      return res.status(401).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #d9534f;">Invalid Token or Token Expired</h1>
            <p>Sorry, your email verification link has expired or is invalid. Please request a new verification link.</p>
          </body>
        </html>
      `);
    }

    user.isEmailVerified = true;
    user.is_email_verified = true;
    user.verifyToken = undefined;
    user.verifyTokenExpire = undefined;
    if (!user.freeTrialStart && !user.freeTrialEnd) {
      user.freeTrialActive = true;
      user.freeTrialStart = new Date();
      user.freeTrialEnd = new Date(Date.now() + 129600000); // 36 hours
    }
    await user.save();

    res.status(200).send(`
<html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        text-align: center;
        padding: 50px;
        background-color: #f7f7f7;
        margin: 0;
      }
      .container {
        max-width: 500px;
        margin: auto;
        background: white;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .success-icon {
        width: 100px;
        margin-bottom: 20px;
      }
      .success-title {
        color: #28a745;
        font-size: 24px;
        margin: 10px 0;
      }
      .success-message {
        margin-bottom: 20px;
        font-size: 16px;
        color: #333;
      }
      .go-button {
        background-color: #007bff;
        color: white;
        padding: 10px 20px;
        border: none;
        border-radius: 5px;
        font-size: 16px;
        cursor: pointer;
        text-decoration: none;
        transition: background-color 0.3s ease;
      }
      .go-button:hover {
        background-color: #0056b3;
      }
      .manual-redirect {
        margin-top: 15px;
        font-size: 14px;
        color: #666;
      }
    </meta>
  </head>
  <body>
    <div class="container">
      <img src="https://static-00.iconduck.com/assets.00/success-icon-512x512-qdg1isa0.png" alt="Success" class="success-icon">
      <h1 class="success-title">Email Verified Successfully!</h1>
      <p class="success-message">Your email has been verified. You can now log in to Medhwan and continue.</p>
      <a href="medhwan-prajwal://main" class="go-button">Go to App</a>
      <p class="manual-redirect">If this does not redirect to the app, please go manually.</p>
    </div>
  </body>
</html>
    `);
  } catch (error) {
     console.error("Registration error:", error);
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #d9534f;">Error</h1>
          <p>${error.message}</p>
        </body>
      </html>
    `);
  }
};

exports.verifyEmailUttam = async (req, res) => {
  try {
    const verifyToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    // Select verification token fields even if they have select: false
    const user = await User.findOne({
      verifyToken,
      verifyTokenExpire: { $gt: new Date() },
    }).select("+verifyToken +verifyTokenExpire");

    if (!user) {
      return res.status(401).send(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #d9534f;">Invalid Token or Token Expired</h1>
            <p>Sorry, your email verification link has expired or is invalid. Please request a new verification link.</p>
          </body>
        </html>
      `);
    }

    user.isEmailVerified = true;
    user.is_email_verified = true;
    user.verifyToken = undefined;
    user.verifyTokenExpire = undefined;
    if (!user.freeTrialStart && !user.freeTrialEnd) {
      user.freeTrialActive = true;
      user.freeTrialStart = new Date();
      user.freeTrialEnd = new Date(Date.now() + 129600000); // 36 hours
    }
    await user.save();

    res.status(200).send(`
     <html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        text-align: center;
        padding: 50px;
        background-color: #f7f7f7;
        margin: 0;
      }
      .container {
        max-width: 500px;
        margin: auto;
        background: white;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .success-icon {
        width: 100px;
        margin-bottom: 20px;
      }
      .success-title {
        color: #28a745;
        font-size: 24px;
        margin: 10px 0;
      }
      .success-message {
        margin-bottom: 20px;
        font-size: 16px;
        color: #333;
      }
      .go-button {
        background-color: #007bff;
        color: white;
        padding: 10px 20px;
        border: none;
        border-radius: 5px;
        font-size: 16px;
        cursor: pointer;
        text-decoration: none;
        transition: background-color 0.3s ease;
      }
      .go-button:hover {
        background-color: #0056b3;
      }
      .manual-redirect {
        margin-top: 15px;
        font-size: 14px;
        color: #666;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <img src="https://static-00.iconduck.com/assets.00/success-icon-512x512-qdg1isa0.png" alt="Success" class="success-icon">
      <h1 class="success-title">Email Verified Successfully!</h1>
      <p class="success-message">Your email has been verified. You can now log in to Medhwan and continue.</p>
      <a href="medhwan-uttam://main" class="go-button">Go to App</a>
      <p class="manual-redirect">If this does not redirect to the app, please go manually.</p>
    </div>
  </body>
</html>
    `);
  } catch (error) {
    res.status(500).send(`
      <html>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #d9534f;">Error</h1>
          <p>${error.message}</p>
        </body>
      </html>
    `);
  }
};

exports.contactUs = async (req, res) => {
  try {
    const { name, email, mobileNumber, message } = req.body;
    const messageToSend = `Name: ${name} \nEmail: ${email} \nMobile Number: ${mobileNumber} \nMessage: ${message}`;
    await sendEmail({
      email: "contact247.prajwal@gmail.com",
      subject: "Prajwal - Contact Us Form Submission",
      message: messageToSend,
    });
    res.status(200).json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//! function to add/remove a questionModle to the user's bookmarkedQuestions array

exports.addRemoveBookmarkQuestion = async (req, res) => {
  try {
    // Add timeout to the database query
    const user = await User.findById(req.user._id).maxTimeMS(5000);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const questionId = req.params.id;

    // Check if questionId is not empty
    if (!questionId || questionId.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Question ID is required",
      });
    }

    // Add timeout to the question query - use question_id field instead of _id
    const question = await Question.findOne({
      question_id: questionId,
    }).maxTimeMS(5000);
    if (!question) {
      return res.status(404).json({
        success: false,
        message: "Question not found",
      });
    }

    const isBookmarked = user.bookmarked_questions.some(
      (b) => b.toString() === question._id.toString()
    );

    if (isBookmarked) {
      user.bookmarked_questions = user.bookmarked_questions.filter(
        (b) => b.toString() !== question._id.toString()
      );
      await user.save(); // Save user after removing
      return res.status(200).json({
        success: true,
        message: "Question removed from bookmarks successfully",
        user: user,
      });
    } else {
      user.bookmarked_questions.push(question._id);
      await user.save(); // Save user after adding
      return res.status(200).json({
        success: true,
        message: "Question bookmarked successfully",
        user: user,
      });
    }
  } catch (error) {
    console.error("Bookmark error:", error);

    // Handle specific timeout errors
    if (error.name === "MongooseError" && error.message.includes("timed out")) {
      return res.status(408).json({
        success: false,
        message: "Request timed out. Please try again.",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
