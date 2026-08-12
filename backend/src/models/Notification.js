const mongoose = require("mongoose")

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    request: { type: mongoose.Schema.Types.ObjectId, ref: "BloodRequest", default: null },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    type: { type: String, enum: ["blood-request", "system"], default: "blood-request" },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
)

notificationSchema.index({ user: 1, read: 1, createdAt: -1 })

module.exports = mongoose.model("Notification", notificationSchema)
