const User = require("../models/user");
const jwt = require("jsonwebtoken");

// Helper to extract JWT token from request headers or cookies
const getTokenFromRequest = (req) => {
  if (req.headers && req.headers.authorization) {
    const authHeader = req.headers.authorization.trim();
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      return authHeader.slice(7).trim();
    }
    return authHeader;
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
};

exports.isLoggedIn = async (req, res, next) => {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { ...decoded, _id: decoded.id || decoded._id };
    next();
  } catch (err) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired token" });
  }
};

exports.isAuthenticated = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Please Log in first",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Add timeout to the database query
    req.user = await User.findById(decoded.id || decoded._id).maxTimeMS(5000);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please Log in first",
      });
    }

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    // Handle JWT specific errors with 401 instead of 500
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token. Please log in again.",
      });
    }

    // Handle specific timeout errors
    if (error.name === "MongooseError" && error.message.includes("timed out")) {
      return res.status(408).json({
        success: false,
        message: "Authentication timed out. Please try again.",
      });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

exports.isAdmin = async (req, res, next) => {
  try {
    // If req.user is already loaded by preceding isAuthenticated middleware
    if (!req.user || !req.user.role) {
      const token = getTokenFromRequest(req);

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "Please Log in first",
        });
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id || decoded._id).maxTimeMS(5000);
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Please Log in first",
        });
      }
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to access this route",
      });
    }

    next();
  } catch (error) {
    console.error("Admin authorization error:", error);

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token. Please log in again.",
      });
    }

    if (error.name === "MongooseError" && error.message.includes("timed out")) {
      return res.status(408).json({
        success: false,
        message: "Authentication timed out. Please try again.",
      });
    }

    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: normalize IP and return first three dot-separated parts (or whole value if not IPv4)
function firstThreeParts(ip) {
  if (!ip) return "";
  let v = String(ip).trim();

  // handle IPv4-mapped IPv6 like ::ffff:127.0.0.1
  if (v.includes("::ffff:")) v = v.split("::ffff:").pop();

  // remove port if present (e.g., "127.0.0.1:3000")
  if (v.includes(":") && v.includes(".")) {
    // keep IPv4 part before any colon (rare cases)
    v = v.split(":").shift();
  }

  const parts = v.split(".");
  if (parts.length >= 3) {
    return parts.slice(0, 3).join("."); // compare first three octets
  }
  // fallback for non-IPv4 addresses
  return v;
}

exports.isSameIP = async (req, res, next) => {
  try {
    // Get the current IP from request headers
    const currentIP = req.headers.currentip || req.headers.currentIP; // Handle case sensitivity

    // If currentIP is not provided, skip IP verification and proceed
    if (!currentIP) {
      return next();
    }

    // Get user from request (assuming isAuthenticated middleware runs first)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
    }

    const userId = req.user._id || req.user.id;

    // Find the user with their stored IP - select only the UserIP field for efficiency
    const user = await User.findById(userId).select("UserIP");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Handle case where user has no stored IP (first login)
    if (!user.UserIP) {
      // Store current IP using findByIdAndUpdate to avoid validating unselected fields
      await User.findByIdAndUpdate(userId, { UserIP: currentIP.trim() });
      return next();
    }

    // Check if IP addresses match (trim and normalize for consistency)
    const storedPrefix = firstThreeParts(user.UserIP);
    const currentPrefix = firstThreeParts(currentIP);

    if (storedPrefix !== currentPrefix) {
      return res.status(403).json({
        success: false,
        message: "New IP detected. Please verify your identity.",
        detectedIP: currentPrefix,
      });
    }

    // IP addresses match, proceed to next middleware
    next();
  } catch (error) {
    console.error("IP verification error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during IP verification",
    });
  }
};


