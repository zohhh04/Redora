const router = require("express").Router()
const { protect } = require("../middleware/authMiddleware")
const {
  getAppointments,
  createAppointment,
  updateAppointment,
} = require("../controllers/appointmentController")

router.get("/", protect, getAppointments)
router.post("/", protect, createAppointment)
router.patch("/:id", protect, updateAppointment)

module.exports = router