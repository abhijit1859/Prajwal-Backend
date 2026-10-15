const express = require("express");
const {
  register,
  registerUser,
  updatePassword,
  updateProfile,
  deleteMyProfile,
  myProfile,
  getUserProfile,
  getAllUsers,
  forgotPassword,
  forgotPasswordForPrajjwal,
  renderPasswordResetPageForPrajjwal,
  resetPassword,
  verifyEmail,
  verifyEmailPrajjwal,
  verifyEmailUttam,
  contactUs,
  resendVerificationEmail,
  addRemoveBookmarkQuestion,
  registerWithPhone,
  registerWithEmail,
  resendOtp,
  verifyOtp,
} = require("../controllers/user");

const {
  login,
  googleLogin,
  logout,
  checkAuth,
} = require("../controllers/auth");

const { isAuthenticated, isLoggedIn } = require("../middlewares/auth");

const router = express.Router();

router.get("/check-auth", isLoggedIn, checkAuth);

router.route("/register").post(register);

router.route("/register/phone").post(registerWithPhone);
router.route("/register/email").post(registerWithEmail);
router.route("/send/email/otp").post(registerWithEmail);

router.post("/register/user", registerUser);

router.route("/resend/otp").post(resendOtp);

router.route("/verify/otp").post(verifyOtp);

router.route("/login").post(login);
router.route("/google/login").post(googleLogin);
router.route("/login/google").post(googleLogin);

router.route("/logout").get(isAuthenticated, logout).post(isAuthenticated, logout);

router.route("/update/password").post(isAuthenticated, updatePassword);

router.route("/update/profile").post(isAuthenticated, updateProfile);

router.route("/delete/me").delete(isAuthenticated, deleteMyProfile);

router.route("/me").get(isAuthenticated, myProfile);

router.route("/user/:id").get(isAuthenticated, getUserProfile);

router.route("/users").get(isAuthenticated, getAllUsers);

router.route("/password/forgot").post(forgotPassword);

router.route("/password/forgot/prajjwal").post(forgotPasswordForPrajjwal);

router
  .route("/password/reset/prajjwal/:token")
  .get(renderPasswordResetPageForPrajjwal);

router.route("/password/reset/:token").post(resetPassword);

router.route("/verify/email/:token").get(verifyEmail);

router.route("/verify/email/prajjwal/:token").get(verifyEmailPrajjwal);

router.route("/verify/email/uttam/:token").get(verifyEmailUttam);

router.route("/contactUs").get(contactUs);

router.route("/resend/verification/email").post(resendVerificationEmail);
router.route("/resend/verification-email").post(resendVerificationEmail);

router.route("/bookmark/:id").post(isAuthenticated, addRemoveBookmarkQuestion);

module.exports = router;
