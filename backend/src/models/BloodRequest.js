const mongoose = require("mongoose")

const journeyEntrySchema = new mongoose.Schema(
  {
    stage: { type: String, required: true },
    label: { type: String, default: "" },
    note: { type: String, default: "" },
    location: { type: String, default: "" },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
)

const requestSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bloodGroup: { type: String, required: true },
    units: { type: Number, default: 1, min: 1 },
    hospital: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    area: { type: String, trim: true, default: "" },
    urgency: { type: String, enum: ["normal", "emergency"], default: "normal" },
    status: {
      type: String,
      enum: ["open", "matched", "accepted", "traveling", "arrived", "donating", "completed", "cancelled"],
      default: "open",
    },
    notes: { type: String, default: "" },
    matchedDonor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    declinedDonors: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    journey: [journeyEntrySchema],
    certificate: {
      code: { type: String, default: null },
      issuedAt: { type: Date, default: null },
    },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

module.exports = mongoose.model("BloodRequest", requestSchema)
