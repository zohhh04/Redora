const router = require("express").Router()
const { protect } = require("../middleware/authMiddleware")
const { createSos, getSos, resolveSos } = require("../controllers/sosController")

router.get("/", protect, getSos)
router.post("/", protect, createSos)
router.patch("/:id/resolve", protect, resolveSos)

module.exports = router