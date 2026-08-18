const router = require("express").Router()
const { protect } = require("../middleware/authMiddleware")
const { listBloodBanks } = require("../controllers/bloodbankController")
const { leaderboard } = require("../controllers/leaderboardController")
const { chat } = require("../controllers/chatController")
const { translateText } = require("../utils/translate")

router.get("/bloodbanks", protect, listBloodBanks)
router.get("/leaderboard", protect, leaderboard)

// AURA conversation (works for guests too — no auth required).
router.post("/chat", chat)

// Lightweight free text translation used when AURA falls back to the local KB
// but the user's language isn't English.
router.post("/translate", async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim()
    const target = String(req.body?.target || "en").slice(0, 2)
    if (!text) return res.status(400).json({ message: "A message is required" })
    const result = await translateText(text, target)
    res.json(result)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router