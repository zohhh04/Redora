import { io } from 'socket.io-client'

// Build the backend socket URL. In dev the frontend runs on its own port and
// proxies /api, but Socket.IO is a live connection so we point straight at the
// backend. Backend binds 0.0.0.0 and CORS is wide open, so this works both on
// localhost and from a phone on the same LAN (it reuses the page's hostname).
const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL
  const host = window.location.hostname || 'localhost'
  // In dev the frontend runs on :5174 and the backend on :5000, so point the
  // socket there. When the app is served by the backend itself (e.g. the built
  // dist behind a single tunnel), connect to the same origin — no port needed.
  const isViteDev = window.location.port === '5174'
  return isViteDev
    ? `${window.location.protocol}//${host}:5000`
    : `${window.location.protocol}//${host}`
}

const token = () => localStorage.getItem('token')

let socket = null

// Lazily create and (re)connect the socket with the latest auth token.
export function getSocket() {
  if (socket) return socket
  socket = io(getSocketUrl(), {
    auth: { token: token() },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 10,
  })
  socket.on('disconnect', () => {})
  return socket
}

// Disconnect after the user logs out so no events leak across accounts.
export function resetSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

// Subscribe a handler to a socket event. Returns an unsubscribe function.
export function onSocket(event, handler) {
  const s = getSocket()
  s.on(event, handler)
  return () => s.off(event, handler)
}

export default getSocket