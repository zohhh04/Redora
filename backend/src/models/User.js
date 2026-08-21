const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ["donor", "patient"] },
    mobile: { type: String, default: "" },
    alertEmail: { type: String, default: "" },
    bloodGroup: { type: String, default: "" },
    lastDonationDate: { type: Date, default: null },
    availableForDonation: { type: Boolean, default: false },
    availableForEmergencies: { type: Boolean, default: false },
    donationCount: { type: Number, default: 0 },
    city: { type: String, default: "" },
    area: { type: String, default: "" },
    travelRadiusKm: { type: Number, default: 25 },
    healthFlags: { type: [String], default: [] },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      label: { type: String, default: "" },
    },
    verified: { type: Boolean, default: false },
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null },
    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  { timestamps: true }
)

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return
  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password)
}

module.exports = mongoose.model("User", userSchema)
