const express = require("express")
const cors = require("cors")
const path = require("path")
const fs = require("fs")
const authRoutes = require("./routes/authRoutes")
const requestRoutes = require("./routes/requestRoutes")
const donorRoutes = require("./routes/donorRoutes")
const geoRoutes = require("./routes/geoRoutes")
const notificationRoutes = require("./routes/notificationRoutes")
const analyticsRoutes = require("./routes/analyticsRoutes")
const communityRoutes = require("./routes/communityRoutes")
const appointmentRoutes = require("./routes/appointmentRoutes")
const sosRoutes = require("./routes/sosRoutes")
const miscRoutes = require("./routes/miscRoutes")

const app = express()

// Allow requests from any origin / IP so the API is reachable from any
// device (mobile, computer, LAN, or a deployed frontend).
app.use(
  cors({
    origin: true,
    credentials: true,
  })
)
app.use(express.json({ limit: "12mb" }))

app.use("/api/auth", authRoutes)
app.use("/api/requests", requestRoutes)
app.use("/api/donors", donorRoutes)
app.use("/api/geo", geoRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/analytics", analyticsRoutes)
app.use("/api/community", communityRoutes)
app.use("/api/appointments", appointmentRoutes)
app.use("/api/sos", sosRoutes)
app.use("/api", miscRoutes)

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }))

// Serve the built frontend (frontend/dist) from the backend so a single
// origin serves both the app and the API — this is what makes a one-tunnel
// (free ngrok) deployment work. Only active when a build exists.
const distDir = path.join(__dirname, "../../frontend/dist")
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  // SPA fallback: any non-API GET serves the frontend index.html so client-side
  // routes (e.g. /impact, /sos) work when someone hits them directly.
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(distDir, "index.html")))
}

app.get("/", (req, res) => res.json({ message: "Redora API is running" }))

module.exports = app
