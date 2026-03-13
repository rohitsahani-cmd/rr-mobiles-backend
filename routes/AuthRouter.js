const router = require("express").Router();

const {
  signup,
  verifySignupOtp,
  resendSignupOtp,
  login,
  googleLogin,
  forgotPassword,
  resetPassword,
} = require("../controllers/AuthController");

const {
  signupValidation,
  loginValidation,
} = require("../middlewares/AuthValidation");

router.post("/signup", signupValidation, signup);
router.post("/verify-signup-otp", verifySignupOtp);
router.post("/resend-signup-otp", resendSignupOtp);

router.post("/login", loginValidation, login);
router.post("/google-login", googleLogin);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

module.exports = router;