const express = require("express")
const {
  registerUser,
  resendOtp,
  verifyOtp,
  loginUser,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController")
const { protect } = require("../middleware/authMiddleware")

const router = express.Router()

router.post("/register", registerUser)
router.post("/resend-otp", resendOtp)
router.post("/verify-otp", verifyOtp)
router.post("/login", loginUser)
router.post("/forgot-password", forgotPassword)
router.post("/reset-password", resetPassword)
router.get("/me", protect, getMe)
router.put("/profile", protect, updateProfile)

module.exports = router
