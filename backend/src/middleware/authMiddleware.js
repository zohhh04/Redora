const jwt = require("jsonwebtoken")
const User = require("../models/User")

const protect = async (req, res, next) => {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.split(" ")[1]
    : null

  if (!token) return res.status(401).json({ message: "Not authorized, no token" })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(decoded.id).select("-password -otp -otpExpires")
    if (!user) return res.status(401).json({ message: "Not authorized" })
    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token failed" })
  }
}

module.exports = { protect }
