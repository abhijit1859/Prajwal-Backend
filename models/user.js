const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");


const paymentInfoSchema = new mongoose.Schema(
  {
    amount_paid: { type: Number },
    paid_at: { type: Date },
    coupon_applied: { type: String },
    coupon_discount_amount: { type: Number },
  },
  { _id: false }
);

const loggedInDeviceSchema = new mongoose.Schema(
  {
    device_info: { type: String },
    last_login: { type: Date },
    active: { type: Boolean, default: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema({
  // Password reset fields
  resetPasswordToken: { type: String, select: false },
  resetPasswordExpire: { type: Date, select: false },
  user_id: { type: String, unique: true, sparse: true },
  registration_at: { type: Date, default: Date.now },

  // Profile details
  name: { type: String },
  user_name: { type: String },
  role: {
    type: String,
    default: "user",
    enum: ["user", "admin"],
  },
  mobile_number: { type: String, sparse: true },
  phoneNumber: { type: String, sparse: true },
  email_id: {
    type: String,
    sparse: true,
    match: [
      /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
      "Please enter a valid email address",
    ],
  },
  email: {
    type: String,
    sparse: true,
    match: [
      /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
      "Please enter a valid email address",
    ],
  },
  password: {
    type: String,
    minlength: [6, "Password must be at least 6 characters"],
    select: false,
  },
  googleId: { type: String, sparse: true },
  image_url: { type: String },
  imageUrl: { type: String },
  organization: { type: String },
  school: { type: String },
  district: { type: String },

  // Verification & Status flags
  is_mobile_verified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  is_email_verified: { type: Boolean, default: false },
  isEmailVerified: { type: Boolean, default: false },
  is_registered: { type: Boolean, default: false },
  is_pro: { type: Boolean, default: false },
  isPro: { type: Boolean, default: false },
  isPasswordReset: { type: Boolean, default: false },
  is_password_reset: { type: Boolean, default: false },

  // Payment & Device data
  purchaseDate: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  payment_info: paymentInfoSchema,
  logged_in_devices: [loggedInDeviceSchema],
  loggedinDevices: [
    {
      deviceInfo: {
        deviceId: String,
        lastLogin: Date,
        deviceName: { type: String, default: "Unknown" },
      },
    },
  ],

  // Bookmarks & Relations
  bookmarked_questions: [
    { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
  ],
  preferences: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Preference",
  },
  purchasedSubjects: [
    {
      subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Subject",
      },
      purchasedAt: {
        type: Date,
        required: true,
        default: Date.now,
      },
      validTill: {
        type: Date,
        required: true,
        default: function () {
          return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        },
      },
    },
  ],
  posts: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
  ],

  // OTP & Tokens
  phoneOtp: { type: String, select: false },
  phoneOtpExpire: Date,
  emailOtp: { type: String, select: false },
  emailOtpExpire: Date,
  verifyToken: { type: String, select: false },
  verifyTokenExpire: { type: Date, select: false },

  // Free trial fields
  freeTrialActive: { type: Boolean, default: true },
  freeTrialStart: { type: Date, default: Date.now },
  freeTrialEnd: { type: Date },
  UserIP: { type: String, default: null },
});

// Synchronize common alias fields before validation and save
userSchema.pre("save", function (next) {
  if (this.isModified("user_name") && !this.isModified("name")) {
    this.name = this.user_name;
  } else if (this.isModified("name") && !this.isModified("user_name")) {
    this.user_name = this.name;
  } else {
    if (!this.name && this.user_name) this.name = this.user_name;
    if (!this.user_name && this.name) this.user_name = this.name;
  }

  if (this.isModified("email_id") && !this.isModified("email")) {
    this.email = this.email_id;
  } else if (this.isModified("email") && !this.isModified("email_id")) {
    this.email_id = this.email;
  } else {
    if (!this.email && this.email_id) this.email = this.email_id;
    if (!this.email_id && this.email) this.email_id = this.email;
  }

  if (this.isModified("mobile_number") && !this.isModified("phoneNumber")) {
    this.phoneNumber = this.mobile_number;
  } else if (this.isModified("phoneNumber") && !this.isModified("mobile_number")) {
    this.mobile_number = this.phoneNumber;
  } else {
    if (!this.phoneNumber && this.mobile_number) this.phoneNumber = this.mobile_number;
    if (!this.mobile_number && this.phoneNumber) this.mobile_number = this.phoneNumber;
  }

  if (this.isModified("isEmailVerified") && !this.isModified("is_email_verified")) {
    this.is_email_verified = this.isEmailVerified;
  } else if (this.isModified("is_email_verified") && !this.isModified("isEmailVerified")) {
    this.isEmailVerified = this.is_email_verified;
  } else if (this.isEmailVerified || this.is_email_verified) {
    this.isEmailVerified = true;
    this.is_email_verified = true;
  }

  if (this.isModified("isPhoneVerified") && !this.isModified("is_mobile_verified")) {
    this.is_mobile_verified = this.isPhoneVerified;
  } else if (this.isModified("is_mobile_verified") && !this.isModified("isPhoneVerified")) {
    this.isPhoneVerified = this.is_mobile_verified;
  } else if (this.isPhoneVerified || this.is_mobile_verified) {
    this.isPhoneVerified = true;
    this.is_mobile_verified = true;
  }

  if (this.isModified("isPro") && !this.isModified("is_pro")) {
    this.is_pro = this.isPro;
  } else if (this.isModified("is_pro") && !this.isModified("isPro")) {
    this.isPro = this.is_pro;
  } else if (this.isPro || this.is_pro) {
    this.isPro = true;
    this.is_pro = true;
  }

  if (this.image_url && !this.imageUrl) this.imageUrl = this.image_url;
  if (this.imageUrl && !this.image_url) this.image_url = this.imageUrl;

  if (this.isModified("isPasswordReset") && !this.isModified("is_password_reset")) {
    this.is_password_reset = this.isPasswordReset;
  } else if (this.isModified("is_password_reset") && !this.isModified("isPasswordReset")) {
    this.isPasswordReset = this.is_password_reset;
  } else if (this.isPasswordReset || this.is_password_reset) {
    this.isPasswordReset = true;
    this.is_password_reset = true;
  }

  next();
});


// Generate user_id like 2025000001 when new user registers
userSchema.pre("save", async function (next) {
  if (this.isNew && !this.user_id) {
    const year = new Date().getFullYear().toString();
    const lastUser = await this.constructor
      .findOne({ user_id: new RegExp(`^${year}`) })
      .sort({ user_id: -1 });

    let serial = "000001";
    if (lastUser && lastUser.user_id) {
      const lastSerial = parseInt(lastUser.user_id.slice(4));
      serial = String(lastSerial + 1).padStart(6, "0");
    }
    this.user_id = year + serial;
  }
  // Set free trial start/end only if not already set
  if (this.isNew && this.freeTrialActive) {
    if (!this.freeTrialStart) {
      this.freeTrialStart = new Date();
    }
    if (!this.freeTrialEnd) {
      this.freeTrialEnd = new Date(
        this.freeTrialStart.getTime() + 120 * 60 * 60 * 1000
      ); // 120 hours from start
    }
  }
  next();
});

// Auto-expire free trial after 120 hours
userSchema.pre("save", function (next) {
  if (
    this.freeTrialActive &&
    this.freeTrialEnd &&
    Date.now() > this.freeTrialEnd.getTime()
  ) {
    this.freeTrialActive = false;
  }
  next();
});

//! Encrypt password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

//! Create preference after user is created
userSchema.post("save", async function (doc, next) {
  try {
    const Preference = require("./preference");
    const existing = await Preference.findOne({ user: doc._id });
    if (!existing) {
      const preference = await Preference.create({ user: doc._id });
      await doc.constructor.findByIdAndUpdate(doc._id, {
        preferences: preference._id,
      });
    }
    next();
  } catch (error) {
    next(error);
  }
});

//! Cascade delete subjects, posts, wishlists when a user is deleted
userSchema.pre(["deleteOne", "remove"], { document: true, query: false }, async function (next) {
  try {
    const Subject = require("./subject");
    const Post = require("./post");
    const WishList = require("./wishList");
    await Subject.deleteMany({ owner: this._id });
    await Post.deleteMany({ owner: this._id });
    await WishList.deleteMany({ owner: this._id });
    next();
  } catch (error) {
    next(error);
  }
});

//! Compare password
userSchema.methods.matchPassword = async function (password) {
  if (!this.password || !password) {
    return false;
  }
  return await bcrypt.compare(password, this.password);
};

//! Generate token
userSchema.methods.generateToken = async function (isMobile = false) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT secret is not defined");
  }
  const options = isMobile ? { expiresIn: "90d" } : { expiresIn: "30d" };
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, options);
};

//! Generate reset password token
userSchema.methods.getResetPasswordToken = function () {
  const resetToken = crypto.randomBytes(20).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
  return resetToken;
};

//! Generate verify email token
userSchema.methods.getVerifyToken = function () {
  const token = crypto.randomBytes(20).toString("hex");
  this.verifyToken = crypto.createHash("sha256").update(token).digest("hex");
  this.verifyTokenExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return token;
};

//! Helper function to generate phone OTP
userSchema.methods.generatePhoneOtp = function () {
  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.phoneOtp = otp;
  this.phoneOtpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  return otp;
};

//! Helper function to generate email OTP
userSchema.methods.generateEmailOtp = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.emailOtp = otp;
  this.emailOtpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return otp;
};

//! Logout of all other devices
userSchema.methods.logoutFromOtherDevices = async function (
  newDeviceId,
  deviceName
) {
  try {
    if (typeof newDeviceId !== "string" || newDeviceId.length === 0) {
      throw new Error("Invalid device ID format");
    }
    if (!this.loggedinDevices || !Array.isArray(this.loggedinDevices)) {
      this.loggedinDevices = [];
    }
    this.loggedinDevices = this.loggedinDevices.filter(
      (device) => device.deviceInfo && device.deviceInfo.deviceId === newDeviceId
    );
    if (this.loggedinDevices.length === 0) {
      this.loggedinDevices.push({
        deviceInfo: {
          deviceId: newDeviceId,
          lastLogin: Date.now(),
          deviceName: deviceName || "Unknown",
        },
      });
    } else {
      this.loggedinDevices[0].deviceInfo.lastLogin = Date.now();
      if (deviceName) {
        this.loggedinDevices[0].deviceInfo.deviceName = deviceName;
      }
    }
    await this.save();
  } catch (error) {
    throw error;
  }
};

//! Logout from a particular device
userSchema.methods.logoutFromDevice = async function (deviceId) {
  try {
    if (!this.loggedinDevices || !Array.isArray(this.loggedinDevices)) {
      this.loggedinDevices = [];
      return;
    }
    this.loggedinDevices = this.loggedinDevices.filter(
      (device) => device.deviceInfo && device.deviceInfo.deviceId !== deviceId
    );
    await this.save();
  } catch (error) {
    throw error;
  }
};

//! isCurrentDeviceLoggedIn
userSchema.methods.isCurrentDeviceLoggedIn = function (deviceId) {
  if (!this.loggedinDevices || !Array.isArray(this.loggedinDevices)) {
    return false;
  }
  const currentDevice = this.loggedinDevices.some(
    (device) => device.deviceInfo && device.deviceInfo.deviceId === deviceId
  );
  return Boolean(currentDevice);
};

//! Add purchasedSubject
userSchema.methods.addPurchasedSubject = async function (subjectId, validTill) {
  try {
    if (!this.purchasedSubjects || !Array.isArray(this.purchasedSubjects)) {
      this.purchasedSubjects = [];
    }
    this.purchasedSubjects.push({ subject: subjectId, validTill });
    await this.save();
  } catch (error) {
    throw error;
  }
};

//! isSubjectValid
userSchema.methods.isSubjectValid = function (subjectId) {
  if (!this.purchasedSubjects || !Array.isArray(this.purchasedSubjects)) {
    return false;
  }
  const subject = this.purchasedSubjects.find(
    (purchasedSubject) =>
      purchasedSubject.subject &&
      purchasedSubject.subject.toString() === subjectId.toString()
  );
  if (!subject) {
    return false;
  }
  return subject.validTill > Date.now();
};

//! isSubjectPurchased
userSchema.methods.isSubjectPurchased = function (subjectId) {
  if (!this.purchasedSubjects || !Array.isArray(this.purchasedSubjects)) {
    return false;
  }
  return this.purchasedSubjects.some(
    (purchasedSubject) =>
      purchasedSubject.subject &&
      purchasedSubject.subject.toString() === subjectId.toString()
  );
};

//! removePurchasedSubject
userSchema.methods.removePurchasedSubject = async function (subjectId) {
  try {
    if (!this.purchasedSubjects || !Array.isArray(this.purchasedSubjects)) {
      this.purchasedSubjects = [];
      return;
    }
    this.purchasedSubjects = this.purchasedSubjects.filter(
      (purchasedSubject) =>
        purchasedSubject.subject &&
        purchasedSubject.subject.toString() !== subjectId.toString()
    );
    await this.save();
  } catch (error) {
    throw error;
  }
};

// Create indexes for better query performance
userSchema.index({ _id: 1 }); // Primary key index
userSchema.index({ user_id: 1 }); // User ID index
userSchema.index({ mobile_number: 1 }); // Mobile number index
userSchema.index({ email_id: 1 }); // Email index
userSchema.index({ bookmarked_questions: 1 }); // Bookmarked questions index
userSchema.index({ UserIP: 1 });

module.exports = mongoose.model("User", userSchema);

