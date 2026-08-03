const express = require("express")
const cors = require("cors")
const authRoutes = require("./routes/authRoutes")
const requestRoutes = require("./routes/requestRoutes")
const donorRoutes = require("./routes/donorRoutes")

const app = express()

app.use(cors())
app.use(express.json())

app.use("/api/auth", authRoutes)
app.use("/api/requests", requestRoutes)
app.use("/api/donors", donorRoutes)

app.get("/", (req, res) => res.json({ message: "Redora API is running" }))

module.exports = app
