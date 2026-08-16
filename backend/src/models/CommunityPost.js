const mongoose = require("mongoose")

const communityPostSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true, maxlength: 1000 },
    type: {
      type: String,
      enum: ["post", "need", "success", "appreciation"],
      default: "post",
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
)

module.exports = mongoose.model("CommunityPost", communityPostSchema)