const express = require("express")
const { protect } = require("../middleware/authMiddleware")
const {
  getNotifications,
  markRead,
  markAllRead,
} = require("../controllers/notificationController")

const router = express.Router()

router.use(protect)
router.get("/", getNotifications)
router.patch("/read-all", markAllRead)
router.patch("/:id/read", markRead)

module.exports = router
