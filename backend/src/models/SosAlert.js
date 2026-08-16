const mongoose = require("mongoose")

const sosAlertSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    bloodGroup: { type: String, trim: true, default: "" },
    units: { type: Number, default: 1, min: 1 },
    hospital: { type: String, trim: true, default: "" },
    location: {
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      label: { type: String, default: "" },
    },
    message: { type: String, trim: true, default: "", maxlength: 300 },
    status: { type: String, enum: ["active", "resolved"], default: "active" },
    notifiedDonors: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
)

module.exports = mongoose.model("SosAlert", sosAlertSchema)