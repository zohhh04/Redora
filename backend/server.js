require("dotenv").config()

const http = require("http")
const app = require("./src/app")
const connectToDB = require("./src/config/db")
const { initSocket } = require("./src/socket")
const os = require("os")

const PORT = process.env.PORT || 5000
const HOST = "0.0.0.0"

function lanIP() {
  const nets = os.networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) return net.address
    }
  }
  return "127.0.0.1"
}

connectToDB()
  .then(() => {
    const server = http.createServer(app)
    initSocket(server)
    server.listen(PORT, HOST, () => {
      const ip = lanIP()
      console.log(`Redora API running on port ${PORT}`)
      console.log(`  Local:    http://localhost:${PORT}/api`)
      console.log(`  Network:  http://${ip}:${PORT}/api  (other devices / any IP)`)
      console.log(`  Socket.IO: ws://${ip}:${PORT}  (real-time updates)`)
    })
  })
  .catch((e) => {
    console.log("Failed to start server:", e.message)
    process.exit(1)
  })