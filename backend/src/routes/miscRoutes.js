const router = require("express").Router()
const { protect } = require("../middleware/authMiddleware")
const { listBloodBanks } = require("../controllers/bloodbankController")
const { leaderboard } = require("../controllers/leaderboardController")
const { chat, extract } = require("../controllers/chatController")

router.get("/bloodbanks", protect, listBloodBanks)
router.get("/leaderboard", protect, leaderboard)

// AURA conversation (works for guests too — no auth required).
router.post("/chat", chat)

// AURA file upload -> extract (works for guests too — no auth required).
router.post("/chat/extract", extract)

module.exports = router