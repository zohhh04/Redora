const mongoose = require("mongoose")

const connectToDB = async () => {
  const uri = process.env.MONGO_URI
  if (!uri || uri === "your_mongodb_atlas_connection_string") {
    throw new Error(
      "Set MONGO_URI in backend/.env\n" +
        "  Atlas free (recommended): mongodb+srv://<user>:<password>@<cluster>.mongodb.net/<dbname>\n" +
        "  Local: mongodb://127.0.0.1:27017/redora"
    )
  }
  await mongoose.connect(uri)
  const dbName = uri.includes("mongodb+srv") ? "MongoDB Atlas (cloud)" : "MongoDB (local)"
  console.log(`MongoDB connected via ${dbName}`)
}

module.exports = connectToDB
