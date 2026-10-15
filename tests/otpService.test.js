const test = require("node:test");
const assert = require("node:assert/strict");
const {
  generateSecureOTP,
  hashOTP,
  verifyOTPHash,
  calculateExpiry,
  checkResendCooldown,
  getMaxVerificationAttempts,
  DEFAULT_EXPIRY_MINUTES,
  DEFAULT_COOLDOWN_SECONDS,
} = require("../services/otpService");

test("generateSecureOTP generates valid 6-digit numeric OTPs", () => {
  const generated = new Set();
  for (let i = 0; i < 50; i++) {
    const otp = generateSecureOTP();
    assert.equal(typeof otp, "string");
    assert.equal(otp.length, 6);
    assert.match(otp, /^\d{6}$/);
    const num = Number(otp);
    assert.ok(num >= 100000 && num <= 999999);
    generated.add(otp);
  }
  // With crypto.randomInt, collisions across 50 6-digit numbers should be virtually non-existent
  assert.ok(generated.size > 40);
});

test("hashOTP produces standard 64-character SHA-256 hex string", () => {
  const otp = "123456";
  const hash1 = hashOTP(otp);
  const hash2 = hashOTP(otp);

  assert.equal(hash1.length, 64);
  assert.match(hash1, /^[0-9a-f]{64}$/);
  assert.equal(hash1, hash2, "Identical inputs must yield identical hashes");

  const diffHash = hashOTP("654321");
  assert.notEqual(hash1, diffHash, "Different inputs must yield different hashes");
});

test("hashOTP throws on invalid input types", () => {
  assert.throws(() => hashOTP(null), /OTP must be a string or number/);
  assert.throws(() => hashOTP(undefined), /OTP must be a string or number/);
});

test("verifyOTPHash validates correctly against SHA-256 hash", () => {
  const correctOtp = "584920";
  const storedHash = hashOTP(correctOtp);

  assert.equal(verifyOTPHash(correctOtp, storedHash), true);
  assert.equal(verifyOTPHash("000000", storedHash), false);
  assert.equal(verifyOTPHash("584921", storedHash), false);
  assert.equal(verifyOTPHash("", storedHash), false);
  assert.equal(verifyOTPHash(null, storedHash), false);
  assert.equal(verifyOTPHash(correctOtp, null), false);
});

test("verifyOTPHash supports backward compatibility with legacy plaintext stored OTP", () => {
  const legacyOtp = "849201";
  assert.equal(verifyOTPHash(legacyOtp, legacyOtp), true);
  assert.equal(verifyOTPHash("111111", legacyOtp), false);
  assert.equal(verifyOTPHash("84920", legacyOtp), false);
});

test("calculateExpiry returns future date based on configured minutes", () => {
  const before = Date.now();
  const expiry = calculateExpiry(5);
  const after = Date.now();

  const diffMs = expiry.getTime() - before;
  const expectedMs = 5 * 60 * 1000;

  // Should be ~5 minutes in the future (allowing ±50ms)
  assert.ok(diffMs >= expectedMs - 50 && diffMs <= expectedMs + (after - before) + 50);
});

test("checkResendCooldown accurately tracks cooldown time remaining", () => {
  // Case 1: No previous sent timestamp
  const noPrev = checkResendCooldown(null, 60);
  assert.equal(noPrev.inCooldown, false);
  assert.equal(noPrev.secondsRemaining, 0);

  // Case 2: Sent 10 seconds ago with 60 second cooldown
  const sentJustNow = new Date(Date.now() - 10 * 1000);
  const activeCooldown = checkResendCooldown(sentJustNow, 60);
  assert.equal(activeCooldown.inCooldown, true);
  assert.ok(activeCooldown.secondsRemaining >= 48 && activeCooldown.secondsRemaining <= 51);

  // Case 3: Sent 65 seconds ago with 60 second cooldown
  const sentOld = new Date(Date.now() - 65 * 1000);
  const expiredCooldown = checkResendCooldown(sentOld, 60);
  assert.equal(expiredCooldown.inCooldown, false);
  assert.equal(expiredCooldown.secondsRemaining, 0);
});

test("getMaxVerificationAttempts retrieves defaults or environment variable", () => {
  const attempts = getMaxVerificationAttempts();
  assert.equal(typeof attempts, "number");
  assert.ok(attempts > 0);
});
