const mongoose = require("mongoose")

const connectToDB = async () => {
  const uri = process.env.MONGO_URI
  if (!uri || uri === "your_mongodb_atlas_connection_string") {
    throw new Error("Set MONGO_URI in backend/.env (MongoDB Atlas free tier or local MongoDB)")
  }
  await mongoose.connect(uri)
  console.log("MongoDB connected")
}

module.exports = connectToDB
