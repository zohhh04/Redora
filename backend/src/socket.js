const { Server } = require("socket.io")
const jwt = require("jsonwebtoken")

let io = null

// Attach a Socket.IO server to the running HTTP server. Every connected client
// joins a private room named after their user id so we can push real-time
// updates only to the people they concern (e.g. the patient + matched donor of
// a request, or the owner of a new notification).
function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  })

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token
      if (!token) return next(new Error("unauthorized"))
      const payload = jwt.verify(token, process.env.JWT_SECRET || "redora_secret_key")
      socket.userId = payload.id
      next()
    } catch (err) {
      next(new Error("unauthorized"))
    }
  })

  io.on("connection", (socket) => {
    if (socket.userId) socket.join(`user:${socket.userId}`)
  })

  return io
}

function getIO() {
  if (!io) throw new Error("Socket.IO not initialized")
  return io
}

// Push an event only to a single user's private room.
function emitToUser(userId, event, data) {
  if (!io || !userId) return
  io.to(`user:${userId}`).emit(event, data)
}

module.exports = { initSocket, getIO, emitToUser }