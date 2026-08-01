const User = require("../models/User")
const generateToken = require("../utils/generateToken")
const sendEmail = require("../utils/sendEmail")

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString()

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
    })

    res.status(201).json({ message: "OTP sent to your email. Please verify to continue." })
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
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: user.verified,
      },
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
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        verified: user.verified,
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/auth/me (protected)
const getMe = async (req, res) => {
  const user = req.user

  const MONTHS_MS = 2 * 30 * 24 * 60 * 60 * 1000
  const isEligible =
    !user.lastDonationDate || Date.now() - new Date(user.lastDonationDate).getTime() >= MONTHS_MS

  res.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      mobile: user.mobile,
      bloodGroup: user.bloodGroup,
      lastDonationDate: user.lastDonationDate,
      verified: user.verified,
      isEligible,
    },
  })
}

// PUT /api/auth/profile (protected) - update donor profile
const updateProfile = async (req, res) => {
  try {
    const user = req.user
    const { bloodGroup, lastDonationDate, mobile, newPassword } = req.body

    if (bloodGroup !== undefined) user.bloodGroup = bloodGroup
    if (lastDonationDate !== undefined) user.lastDonationDate = lastDonationDate || null
    if (mobile !== undefined) user.mobile = mobile
    if (newPassword) {
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" })
      }
      user.password = newPassword
    }

    await user.save()

    const MONTHS_MS = 2 * 30 * 24 * 60 * 60 * 1000
    const isEligible =
      !user.lastDonationDate || Date.now() - new Date(user.lastDonationDate).getTime() >= MONTHS_MS

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        mobile: user.mobile,
        bloodGroup: user.bloodGroup,
        lastDonationDate: user.lastDonationDate,
        verified: user.verified,
        isEligible,
      },
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

    const tempPassword = Math.random().toString(36).slice(-8)
    user.password = tempPassword
    await user.save()

    await sendEmail({
      to: user.email,
      subject: "Redora - Temporary password",
      text: `Hello ${user.name},\n\nA password reset was requested for your Redora account.\n\nYour temporary password is: ${tempPassword}\n\nPlease login with it and change your password from your profile.\n\n- Redora Team`,
    })

    res.json({ message: "A temporary password has been sent to your email" })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { registerUser, verifyOtp, loginUser, getMe, updateProfile, forgotPassword }
