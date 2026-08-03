const User = require("../models/User")
const BloodRequest = require("../models/BloodRequest")
const { isEligible } = require("../utils/matchUtils")

// GET /api/donors/search?bloodGroup=&city=&available=true
const searchDonors = async (req, res) => {
  try {
    const { bloodGroup, city, available } = req.query
    const filter = { role: "donor", verified: true }
    if (bloodGroup) filter.bloodGroup = bloodGroup.toUpperCase()
    if (city) filter.city = { $regex: city, $options: "i" }
    if (available === "true") filter.availableForDonation = true

    const donors = await User.find(filter)
      .select("name bloodGroup city area mobile donationCount availableForDonation availableForEmergencies lastDonationDate")
      .sort({ donationCount: -1 })

    res.json({
      donors: donors.map((d) => ({
        ...d.toObject(),
        eligible: isEligible(d.lastDonationDate),
      })),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/donors/my-donations - logged in donor's completed donation history
const getMyDonations = async (req, res) => {
  try {
    const requests = await BloodRequest.find({
      matchedDonor: req.user._id,
      status: "fulfilled",
    })
      .sort({ updatedAt: -1 })

    res.json({
      donations: requests.map((r) => ({
        date: r.updatedAt,
        bloodGroup: r.bloodGroup,
        hospital: r.hospital,
        status: "Completed",
      })),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { searchDonors, getMyDonations }
