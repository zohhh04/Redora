const router = require("express").Router()
const { protect } = require("../middleware/authMiddleware")
const { summary, heatmap } = require("../controllers/analyticsController")

router.get("/summary", protect, summary)
router.get("/heatmap", protect, heatmap)

module.exports = router