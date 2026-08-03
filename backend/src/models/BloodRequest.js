const mongoose = require("mongoose")

const requestSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bloodGroup: { type: String, required: true },
    units: { type: Number, default: 1, min: 1 },
    hospital: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    area: { type: String, trim: true, default: "" },
    urgency: { type: String, enum: ["normal", "emergency"], default: "normal" },
    status: { type: String, enum: ["open", "matched", "fulfilled", "cancelled"], default: "open" },
    notes: { type: String, default: "" },
    matchedDonor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
)

module.exports = mongoose.model("BloodRequest", requestSchema)
