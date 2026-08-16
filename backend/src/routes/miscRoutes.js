const router = require("express").Router()
const { protect } = require("../middleware/authMiddleware")
const { listBloodBanks } = require("../controllers/bloodbankController")
const { leaderboard } = require("../controllers/leaderboardController")

router.get("/bloodbanks", protect, listBloodBanks)
router.get("/leaderboard", protect, leaderboard)

module.exports = router