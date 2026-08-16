const mongoose = require("mongoose")

const appointmentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["donation", "reception"],
      default: "donation",
    },
    centerName: { type: String, trim: true, default: "" },
    centerCity: { type: String, trim: true, default: "" },
    date: { type: Date, required: true },
    time: { type: String, default: "" },
    notes: { type: String, trim: true, default: "", maxlength: 300 },
    status: {
      type: String,
      enum: ["upcoming", "done", "cancelled"],
      default: "upcoming",
    },
  },
  { timestamps: true }
)

module.exports = mongoose.model("Appointment", appointmentSchema)