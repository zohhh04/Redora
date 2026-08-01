const express = require("express")
const {
  registerUser,
  verifyOtp,
  loginUser,
  getMe,
  updateProfile,
  forgotPassword,
} = require("../controllers/authController")
const { protect } = require("../middleware/authMiddleware")

const router = express.Router()

router.post("/register", registerUser)
router.post("/verify-otp", verifyOtp)
router.post("/login", loginUser)
router.post("/forgot-password", forgotPassword)
router.get("/me", protect, getMe)
router.put("/profile", protect, updateProfile)

module.exports = router
