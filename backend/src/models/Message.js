const mongoose = require("mongoose")

const messageSchema = new mongoose.Schema(
  {
    request: { type: mongoose.Schema.Types.ObjectId, ref: "BloodRequest", required: true, index: true },
    from: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
)

module.exports = mongoose.model("Message", messageSchema)