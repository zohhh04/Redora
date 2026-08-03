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
      status: "completed",
    })
      .sort({ updatedAt: -1 })

    res.json({
      donations: requests.map((r) => ({
        id: r._id,
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

// GET /api/donors/my-journey - donor's journey history (accepted, active, completed, declined)
const getMyJourney = async (req, res) => {
  try {
    const requests = await BloodRequest.find({
      $or: [
        { matchedDonor: req.user._id },
        { declinedDonors: req.user._id },
      ],
    })
      .sort({ updatedAt: -1 })
      .populate("patient", "name hospital mobile")

    res.json({
      journey: requests.map((r) => ({
        _id: r._id,
        status: r.status,
        bloodGroup: r.bloodGroup,
        units: r.units,
        hospital: r.hospital,
        city: r.city,
        area: r.area,
        urgency: r.urgency,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        journey: r.journey,
        certificate: r.certificate,
        patient: r.patient,
        declined: r.declinedDonors.map(String).includes(req.user._id.toString()),
      })),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/donors/certificates - certificates issued to the logged-in donor
const getMyCertificates = async (req, res) => {
  try {
    const requests = await BloodRequest.find({
      matchedDonor: req.user._id,
      "certificate.code": { $ne: null },
    })
      .sort({ "certificate.issuedAt": -1 })
      .populate("patient", "name")

    res.json({
      certificates: requests.map((r) => ({
        requestId: r._id,
        code: r.certificate.code,
        issuedAt: r.certificate.issuedAt,
        bloodGroup: r.bloodGroup,
        hospital: r.hospital,
        patientName: r.patient?.name || "Patient",
      })),
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { searchDonors, getMyDonations, getMyJourney, getMyCertificates }
