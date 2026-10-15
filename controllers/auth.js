const User = require("../models/user");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Helper to generate response payload with JWT token & set cookie if web client
 */
const sendAuthTokenResponse = async (user, statusCode, req, res, ipUpdated = false) => {
  const clientType = req.headers["x-client-type"];
  const isMobile = clientType === "mobile";

  const token = await user.generateToken(isMobile);

  if (isMobile) {
    return res.status(statusCode).json({
      success: true,
      user,
      token,
      ipUpdated,
    });
  }

  // Web or other clients: set secure/httpOnly cookie and return token in JSON
  const cookieOptions = {
    expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  };

  return res.status(statusCode).cookie("token", token, cookieOptions).json({
    success: true,
    user,
    token,
    ipUpdated,
  });
};

/**
 * Standard Email & Password Login
 * POST /api/v1/login
 */
exports.login = async (req, res) => {
  try {
    const inputEmail = req.body.email || req.body.email_id;
    const { password, deviceId, deviceName } = req.body;
    const clientType = req.headers["x-client-type"];
    const currentIP = req.headers.currentip || req.headers.currentIP;
    const isMobile = clientType === "mobile";

    // 1. Validation
    if (!inputEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required",
      });
    }

    // 2. Fetch user with password selected
    const user = await User.findOne({
      $or: [{ email: inputEmail }, { email_id: inputEmail }],
    }).select("+password");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "user does not exist",
      });
    }

    // 3. Match password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "incorrect password",
      });
    }

    // 4. Verify email verification status
    if (!user.isEmailVerified && !user.is_email_verified) {
      return res.status(400).json({
        success: false,
        message: "Please Verify Your Email First",
      });
    }

    // 5. Require device info for mobile regular users
    if (user.role === "user" && isMobile && (!deviceId || !deviceName)) {
      return res.status(400).json({
        success: false,
        message: "Please provide deviceId and deviceName",
      });
    }

    // 6. Update user IP if header supplied
    let ipUpdated = false;
    if (currentIP) {
      try {
        user.UserIP = currentIP.trim();
        ipUpdated = true;
      } catch (saveError) {
        console.error("Error setting user IP:", saveError);
      }
    }

    // 7. Enforce single device session for mobile users
    if (user.role === "user" && deviceId) {
      await user.logoutFromOtherDevices(deviceId, deviceName);
    }

    await user.save();

    // 8. Return response with token
    return await sendAuthTokenResponse(user, 200, req, res, ipUpdated);
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error during login",
    });
  }
};

/**
 * Google OAuth 2.0 Login / Registration
 * POST /api/v1/google/login (or /api/v1/login/google)
 */
exports.googleLogin = async (req, res) => {
  try {
    const idToken = req.body.idToken || req.body.token || req.body.credential;
    const { deviceId, deviceName } = req.body;
    const clientType = req.headers["x-client-type"];
    const currentIP = req.headers.currentip || req.headers.currentIP;
    const isMobile = clientType === "mobile";

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: "Google ID token is required",
      });
    }

    // 1. Verify Google ID token
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (verifyErr) {
      console.error("Google token verification failed:", verifyErr.message);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired Google ID token",
      });
    }

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({
        success: false,
        message: "Invalid Google token payload",
      });
    }

    const { email, sub: googleId, name, picture } = payload;

    // 2. Find or create user
    let user = await User.findOne({
      $or: [{ googleId }, { email }, { email_id: email }],
    });

    if (!user) {
      user = new User({
        email,
        email_id: email,
        name: name || email.split("@")[0],
        user_name: name || email.split("@")[0],
        googleId,
        image_url: picture,
        imageUrl: picture,
        isEmailVerified: true,
        is_email_verified: true,
        is_registered: true,
        freeTrialActive: true,
        freeTrialStart: new Date(),
        freeTrialEnd: new Date(Date.now() + 120 * 60 * 60 * 1000), // 120 hours
      });
    } else {
      if (!user.googleId) {
        user.googleId = googleId;
      }
      user.isEmailVerified = true;
      user.is_email_verified = true;
      if (!user.name && name) {
        user.name = name;
        user.user_name = name;
      }
      if (!user.imageUrl && !user.image_url && picture) {
        user.imageUrl = picture;
        user.image_url = picture;
      }
    }

    // 3. Update IP if provided
    let ipUpdated = false;
    if (currentIP) {
      user.UserIP = currentIP.trim();
      ipUpdated = true;
    }

    // 4. Device validation for mobile users
    if (user.role === "user" && isMobile && (!deviceId || !deviceName)) {
      return res.status(400).json({
        success: false,
        message: "Please provide deviceId and deviceName",
      });
    }

    if (user.role === "user" && deviceId) {
      await user.logoutFromOtherDevices(deviceId, deviceName);
    }

    await user.save();

    // 5. Generate and return token
    return await sendAuthTokenResponse(user, 200, req, res, ipUpdated);
  } catch (error) {
    console.error("Google login error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to authenticate with Google",
    });
  }
};

/**
 * Check Authentication on App launch/relaunch
 * GET /api/v1/check-auth
 */
exports.checkAuth = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }
    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("checkAuth error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Logout User
 * GET/POST /api/v1/logout
 */
exports.logout = async (req, res) => {
  try {
    res.status(200).cookie("token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    }).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("logout error:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
