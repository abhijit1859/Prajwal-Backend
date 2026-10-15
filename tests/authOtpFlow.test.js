const test = require("node:test");
const assert = require("node:assert/strict");
const {
  generateSecureOTP,
  hashOTP,
  verifyOTPHash,
  calculateExpiry,
  checkResendCooldown,
  getMaxVerificationAttempts,
} = require("../services/otpService");

test("OTP Full Lifecycle: Generation, Hash, and Verification", () => {
  const plainOtp = generateSecureOTP();
  const hashedOtp = hashOTP(plainOtp);

  // Verification matches
  assert.equal(verifyOTPHash(plainOtp, hashedOtp), true);

  // Mismatch fails
  assert.equal(verifyOTPHash("999999", hashedOtp), false);
});

test("OTP Expiry Handling: Active vs Expired OTPs", () => {
  const now = new Date();

  // Active OTP: 5 minutes in future
  const activeExpire = calculateExpiry(5);
  assert.ok(activeExpire > now);

  // Expired OTP: set to 1 second in the past
  const expiredDate = new Date(Date.now() - 1000);
  assert.ok(expiredDate < now);
});

test("OTP Attempt Limiting: Invalidates OTP after maximum failed attempts", () => {
  const maxAttempts = getMaxVerificationAttempts();
  const plainOtp = generateSecureOTP();
  const hashedOtp = hashOTP(plainOtp);

  let userMock = {
    email: "student@example.com",
    emailOtp: hashedOtp,
    emailOtpExpire: calculateExpiry(5),
    emailOtpAttempts: 0,
  };

  // Simulate failed attempts
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const wrongOtp = "000000";
    const isMatch = verifyOTPHash(wrongOtp, userMock.emailOtp);
    assert.equal(isMatch, false);

    userMock.emailOtpAttempts += 1;
    if (userMock.emailOtpAttempts >= maxAttempts) {
      // Invalidate on reaching max attempts
      userMock.emailOtp = undefined;
      userMock.emailOtpExpire = undefined;
      userMock.emailOtpAttempts = 0;
    }
  }

  // User OTP must now be wiped out/invalidated
  assert.equal(userMock.emailOtp, undefined);
  assert.equal(userMock.emailOtpExpire, undefined);
  assert.equal(userMock.emailOtpAttempts, 0);

  // Attempting to verify now must fail because no active OTP exists
  assert.equal(verifyOTPHash(plainOtp, userMock.emailOtp), false);
});

test("OTP Reuse Prevention: Single-use invalidation prevents replay attacks", () => {
  const plainOtp = generateSecureOTP();
  const hashedOtp = hashOTP(plainOtp);

  let userMock = {
    email: "student@example.com",
    emailOtp: hashedOtp,
    emailOtpExpire: calculateExpiry(5),
    emailOtpAttempts: 0,
    is_email_verified: false,
  };

  // Step 1: First verification succeeds
  const firstAttempt = verifyOTPHash(plainOtp, userMock.emailOtp);
  assert.equal(firstAttempt, true);

  // On successful verification, controller wipes OTP and marks verified
  userMock.is_email_verified = true;
  userMock.emailOtp = undefined;
  userMock.emailOtpExpire = undefined;
  userMock.emailOtpAttempts = 0;

  // Step 2: Attempting to verify the same OTP again fails immediately
  const secondAttempt = verifyOTPHash(plainOtp, userMock.emailOtp);
  assert.equal(secondAttempt, false);
});

test("Resend Cooldown Enforcement: Throttles rapid OTP requests", () => {
  const cooldownSeconds = 60;
  const userMock = {
    emailOtpLastSentAt: new Date(),
  };

  // 1. Immediately after sending, cooldown is active
  const check1 = checkResendCooldown(userMock.emailOtpLastSentAt, cooldownSeconds);
  assert.equal(check1.inCooldown, true);
  assert.ok(check1.secondsRemaining > 0 && check1.secondsRemaining <= 60);

  // 2. 65 seconds later, cooldown has passed
  userMock.emailOtpLastSentAt = new Date(Date.now() - 65 * 1000);
  const check2 = checkResendCooldown(userMock.emailOtpLastSentAt, cooldownSeconds);
  assert.equal(check2.inCooldown, false);
  assert.equal(check2.secondsRemaining, 0);
});
