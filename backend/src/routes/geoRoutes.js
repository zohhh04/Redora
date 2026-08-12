const express = require("express")
const { geocode, reverseGeocode, nearbyDonors, verifyHospital } = require("../controllers/geoController")

const router = express.Router()

router.get("/geocode", geocode)
router.get("/reverse", reverseGeocode)
router.get("/nearby-donors", nearbyDonors)
router.get("/verify-hospital", verifyHospital)

module.exports = router
