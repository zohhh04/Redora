const express = require("express")
const { protect } = require("../middleware/authMiddleware")
const {
  createRequest,
  getMyRequests,
  getRequests,
  getRequestById,
  getMatchedDonors,
  updateRequestStatus,
} = require("../controllers/requestController")

const router = express.Router()

router.use(protect)

router.post("/", createRequest)
router.get("/my", getMyRequests)
router.get("/", getRequests)
router.get("/:id/donors", getMatchedDonors)
router.get("/:id", getRequestById)
router.patch("/:id/status", updateRequestStatus)

module.exports = router
