const express = require("express")
const { protect } = require("../middleware/authMiddleware")
const {
  createRequest,
  getMyRequests,
  getRequests,
  getRequestById,
  getMatchedDonors,
  respondToRequest,
  manageDonor,
  updateJourney,
  getTracking,
  getCertificate,
} = require("../controllers/requestController")
const { getMessages, createMessage } = require("../controllers/messageController")

const router = express.Router()

router.use(protect)

router.post("/", createRequest)
router.get("/my", getMyRequests)
router.get("/", getRequests)
router.get("/:id/tracking", getTracking)
router.get("/:id/certificate", getCertificate)
router.get("/:id/messages", getMessages)
router.post("/:id/messages", createMessage)
router.patch("/:id/respond", respondToRequest)
router.patch("/:id/donor", manageDonor)
router.patch("/:id/journey", updateJourney)
router.get("/:id/donors", getMatchedDonors)
router.get("/:id", getRequestById)

module.exports = router
