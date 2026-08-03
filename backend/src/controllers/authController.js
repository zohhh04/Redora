const crypto = require("crypto")
const User = require("../models/User")
const generateToken = require("../utils/generateToken")
const { sendEmail, otpTemplate, resetPasswordTemplate } = require("../utils/sendEmail")

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString()

const MONTHS_MS = 2 * 30 * 24 * 60 * 60 * 1000

function publicUser(user) {
  const isEligible =
    !user.lastDonationDate || Date.now() - new Date(user.lastDonationDate).getTime() >= MONTHS_MS
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    mobile: user.mobile,
    bloodGroup: user.bloodGroup,
    lastDonationDate: user.lastDonationDate,
    availableForDonation: user.availableForDonation,
    availableForEmergencies: user.availableForEmergencies,
    donationCount: user.donationCount,
    city: user.city,
    area: user.area,
    travelRadiusKm: user.travelRadiusKm,
    verified: user.verified,
    isEligible,
  }
}

// POST /api/auth/register
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide name, email and password" })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" })
    }

    const exists = await User.findOne({ email: email.toLowerCase() })
    if (exists) {
      return res.status(400).json({ message: "Account already exists with this email" })
    }

    const otp = generateOtp()
    const user = await User.create({
      name,
      email,
      password,
      role: role === "patient" ? "patient" : "donor",
      otp,
      otpExpires: Date.now() + 10 * 60 * 1000,
    })

    await sendEmail({
      to: user.email,
      subject: "Redora - Verify your email",
      text: `Your Redora verification OTP is: ${otp}. It is valid for 10 minutes.`,
      html: otpTemplate({ otp }),
    })

    res.status(201).json({ message: "OTP sent to your email. Please verify to continue." })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// POST /api/auth/resend-otp
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: "Please provide your email" })

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) return res.status(404).json({ message: "User not found" })
    if (user.verified) return res.status(400).json({ message: "Account already verified" })

    const otp = generateOtp()
    user.otp = otp
    user.otpExpires = Date.now() + 10 * 60 * 1000
    await user.save()

    await sendEmail({
      to: user.email,
      subject: "Redora - Your new verification OTP",
      text: `Your Redora verification OTP is: ${otp}. It is valid for 10 minutes.`,
      html: otpTemplate({ otp }),
    })

    res.json({ message: "A new OTP has been sent to your email" })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// POST /api/auth/verify-otp
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) return res.status(404).json({ message: "User not found" })
    if (user.verified) return res.status(400).json({ message: "Account already verified" })
    if (!user.otp || user.otp !== otp || user.otpExpires < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" })
    }

    user.verified = true
    user.otp = null
    user.otpExpires = null
    await user.save()

    res.json({
      message: "Email verified. You can now login.",
      token: generateToken(user._id),
      user: publicUser(user),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// POST /api/auth/login
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) return res.status(401).json({ message: "Invalid email or password" })
    if (!(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" })
    }
    if (!user.verified) {
      return res.status(403).json({ message: "Please verify your email first" })
    }

    res.json({
      message: "Login successful",
      token: generateToken(user._id),
      user: publicUser(user),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/auth/me (protected)
const getMe = async (req, res) => {
  res.json({ user: publicUser(req.user) })
}

// PUT /api/auth/profile (protected) - update donor profile
const updateProfile = async (req, res) => {
  try {
    const user = req.user
    const { bloodGroup, lastDonationDate, mobile, availableForDonation, availableForEmergencies, city, area, travelRadiusKm, newPassword } = req.body

    if (bloodGroup !== undefined) user.bloodGroup = bloodGroup
    if (lastDonationDate !== undefined) user.lastDonationDate = lastDonationDate || null
    if (mobile !== undefined) user.mobile = mobile
    if (availableForDonation !== undefined) user.availableForDonation = availableForDonation
    if (availableForEmergencies !== undefined) user.availableForEmergencies = availableForEmergencies
    if (city !== undefined) user.city = city
    if (area !== undefined) user.area = area
    if (travelRadiusKm !== undefined) user.travelRadiusKm = Number(travelRadiusKm) || 25
    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" })
      }
      user.password = newPassword
    }

    await user.save()

    res.json({
      message: "Profile updated successfully",
      user: publicUser(user),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: "Please provide your email" })

    const user = await User.findOne({ email: email.toLowerCase() })
    if (!user) return res.status(404).json({ message: "No account found with this email" })

    const rawToken = crypto.randomBytes(32).toString("hex")
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex")

    user.resetPasswordToken = hashedToken
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000 // 1 hour
    await user.save()

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173"
    const resetLink = `${clientUrl}/reset-password?token=${rawToken}`

    await sendEmail({
      to: user.email,
      subject: "Redora - Reset your password",
      text: `Hello ${user.name},\n\nA password reset was requested for your Redora account.\n\nClick the link below to set a new password (valid for 1 hour):\n${resetLink}\n\nIf you didn't request this, you can safely ignore this email.\n\n- Redora Team`,
      html: resetPasswordTemplate({ name: user.name, resetLink }),
    })

    res.json({ message: "A password reset link has been sent to your email" })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body
    if (!token) return res.status(400).json({ message: "Reset token is required" })
    if (!password || !confirmPassword) {
      return res.status(400).json({ message: "Please enter your new password and confirm it" })
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" })
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" })
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex")
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    })
    if (!user) return res.status(400).json({ message: "Invalid or expired reset link" })

    user.password = password
    user.resetPasswordToken = null
    user.resetPasswordExpires = null
    await user.save()

    res.json({ message: "Password reset successful. You can now login with your new password." })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { registerUser, resendOtp, verifyOtp, loginUser, getMe, updateProfile, forgotPassword, resetPassword }
