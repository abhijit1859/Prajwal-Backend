const crypto = require("crypto");

/**
 * Default configuration constants
 */
const DEFAULT_EXPIRY_MINUTES = 5;
const DEFAULT_COOLDOWN_SECONDS = 60;
const DEFAULT_MAX_ATTEMPTS = 5;

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 * @returns {string} 6-digit OTP string
 */
function generateSecureOTP() {
  // crypto.randomInt is cryptographically secure and produces uniform distribution
  const otpNumber = crypto.randomInt(100000, 1000000);
  return otpNumber.toString();
}

/**
 * Hash an OTP using SHA-256
 * @param {string} otp
 * @returns {string} hex-encoded hash
 */
function hashOTP(otp) {
  if (typeof otp !== "string" && typeof otp !== "number") {
    throw new Error("OTP must be a string or number to hash");
  }
  return crypto.createHash("sha256").update(String(otp).trim()).digest("hex");
}

/**
 * Safely compare two hashes using constant-time comparison to prevent timing attacks
 * @param {string} candidateOtp - Plain OTP entered by user
 * @param {string} storedHash - Stored hash (or plaintext fallback for backward compatibility)
 * @returns {boolean}
 */
function verifyOTPHash(candidateOtp, storedHash) {
  if (!candidateOtp || !storedHash) {
    return false;
  }

  const candidateHash = hashOTP(candidateOtp);

  // If stored value is already a 64-character SHA-256 hex string
  if (storedHash.length === 64 && /^[0-9a-fA-F]+$/.test(storedHash)) {
    const candidateBuffer = Buffer.from(candidateHash, "hex");
    const storedBuffer = Buffer.from(storedHash, "hex");
    if (candidateBuffer.length !== storedBuffer.length) {
      return false;
    }
    return crypto.timingSafeEqual(candidateBuffer, storedBuffer);
  }

  // Backward compatibility fallback in case an un-hashed OTP exists in database
  const trimmedCandidate = String(candidateOtp).trim();
  const trimmedStored = String(storedHash).trim();
  if (trimmedCandidate.length !== trimmedStored.length) {
    return false;
  }
  return crypto.timingSafeEqual(
    Buffer.from(trimmedCandidate, "utf8"),
    Buffer.from(trimmedStored, "utf8")
  );
}

/**
 * Calculate OTP expiry timestamp
 * @param {number} [expiryMinutes]
 * @returns {Date}
 */
function calculateExpiry(expiryMinutes) {
  const minutes = Number(expiryMinutes) || Number(process.env.OTP_EXPIRY_MINUTES) || DEFAULT_EXPIRY_MINUTES;
  return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * Check if a cooldown period is currently active
 * @param {Date|null} lastSentAt
 * @param {number} [cooldownSeconds]
 * @returns {{ inCooldown: boolean, secondsRemaining: number }}
 */
function checkResendCooldown(lastSentAt, cooldownSeconds) {
  if (!lastSentAt) {
    return { inCooldown: false, secondsRemaining: 0 };
  }

  const cooldown =
    Number(cooldownSeconds) ||
    Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) ||
    DEFAULT_COOLDOWN_SECONDS;

  const lastSentTime = new Date(lastSentAt).getTime();
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - lastSentTime) / 1000);

  if (elapsedSeconds < cooldown) {
    return {
      inCooldown: true,
      secondsRemaining: cooldown - elapsedSeconds,
    };
  }

  return { inCooldown: false, secondsRemaining: 0 };
}

/**
 * Get maximum allowed verification attempts
 * @returns {number}
 */
function getMaxVerificationAttempts() {
  return Number(process.env.OTP_MAX_ATTEMPTS) || DEFAULT_MAX_ATTEMPTS;
}

module.exports = {
  generateSecureOTP,
  hashOTP,
  verifyOTPHash,
  calculateExpiry,
  checkResendCooldown,
  getMaxVerificationAttempts,
  DEFAULT_EXPIRY_MINUTES,
  DEFAULT_COOLDOWN_SECONDS,
  DEFAULT_MAX_ATTEMPTS,
};
