const express = require("express")
const { protect } = require("../middleware/authMiddleware")
const { searchDonors, getMyDonations } = require("../controllers/donorController")

const router = express.Router()

router.use(protect)
router.get("/search", searchDonors)
router.get("/my-donations", getMyDonations)

module.exports = router
