const router = require("express").Router()
const { protect } = require("../middleware/authMiddleware")
const { listBloodBanks } = require("../controllers/bloodbankController")
const { leaderboard } = require("../controllers/leaderboardController")
const { impact } = require("../controllers/impactController")
const { chat, extract, eligibility } = require("../controllers/chatController")

router.get("/bloodbanks", protect, listBloodBanks)
router.get("/leaderboard", protect, leaderboard)
router.get("/impact", protect, impact)

// AURA conversation (works for guests too — no auth required).
router.post("/chat", chat)

// AURA file upload -> extract (works for guests too — no auth required).
router.post("/chat/extract", extract)

// Personalized "Can I donate?" — needs the logged-in donor profile.
router.post("/chat/eligibility", protect, eligibility)

module.exports = router