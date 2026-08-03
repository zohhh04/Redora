const express = require("express")
const { protect } = require("../middleware/authMiddleware")
const {
  searchDonors,
  getMyDonations,
  getMyJourney,
  getMyCertificates,
} = require("../controllers/donorController")

const router = express.Router()

router.use(protect)
router.get("/search", searchDonors)
router.get("/my-donations", getMyDonations)
router.get("/my-journey", getMyJourney)
router.get("/certificates", getMyCertificates)

module.exports = router
