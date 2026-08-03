const BloodRequest = require("../models/BloodRequest")
const User = require("../models/User")
const { scoreDonorForRequest, scoreRequestForDonor } = require("../utils/matchUtils")
// POST /api/requests - create a blood request (patient)
const createRequest = async (req, res) => {
  try {
    const { bloodGroup, units, hospital, city, area, urgency, notes } = req.body
    if (!bloodGroup) return res.status(400).json({ message: "Please select a blood group" })

    const request = await BloodRequest.create({
      patient: req.user._id,
      bloodGroup: bloodGroup.toUpperCase(),
      units: units || 1,
      hospital: hospital || "",
      city: city || "",
      area: area || "",
      urgency: urgency === "emergency" ? "emergency" : "normal",
      notes: notes || "",
    })
    res.status(201).json({ message: "Blood request created", request })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/requests/my - patient's requests
const getMyRequests = async (req, res) => {
  try {
    const requests = await BloodRequest.find({ patient: req.user._id })
      .sort({ createdAt: -1 })
      .populate("matchedDonor", "name bloodGroup city mobile")
    res.json({ requests })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/requests - browse requests (donors get AI match scores)
const getRequests = async (req, res) => {
  try {
    const { bloodGroup, city, urgency, status } = req.query
    const filter = { status: status || "open" }
    if (bloodGroup) filter.bloodGroup = bloodGroup.toUpperCase()
    if (city) filter.city = { $regex: city, $options: "i" }
    if (urgency) filter.urgency = urgency

    let requests = await BloodRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("patient", "name")

    if (req.user.role === "donor") {
      requests = requests
        .map((r) => {
          const m = scoreRequestForDonor(r, req.user)
          return {
            ...r.toObject(),
            matchEligible: !!m.eligible,
            matchScore: m.eligible ? m.score : 0,
            matchReasons: m.eligible ? m.reasons : [m.reason],
          }
        })
        .sort((a, b) => b.matchEligible - a.matchEligible || b.matchScore - a.matchScore)
    }

    res.json({ requests })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/requests/:id - request detail
const getRequestById = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .populate("patient", "name hospital")
      .populate("matchedDonor", "name bloodGroup city mobile")
    if (!request) return res.status(404).json({ message: "Request not found" })
    res.json({ request })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/requests/:id/donors - AI matched donors for a request (patient)
const getMatchedDonors = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ message: "Request not found" })
    if (request.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" })
    }

    const donors = await User.find({ role: "donor", verified: true }).select(
      "name bloodGroup city area mobile donationCount availableForEmergencies"
    )
    const matches = donors
      .map((d) => {
        const m = scoreDonorForRequest(d, request)
        if (!m.eligible) return null
        return {
          donor: {
            id: d._id,
            name: d.name,
            bloodGroup: d.bloodGroup,
            city: d.city,
            area: d.area,
            mobile: d.mobile,
            donationCount: d.donationCount,
            availableForEmergencies: d.availableForEmergencies,
          },
          score: m.score,
          reasons: m.reasons,
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)

    res.json({ matches, total: matches.length })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PATCH /api/requests/:id/status - update status / assign donor
const updateRequestStatus = async (req, res) => {
  try {
    const { status, donorId } = req.body
    const request = await BloodRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ message: "Request not found" })

    const isOwner = request.patient.toString() === req.user._id.toString()
    const isDonor = req.user.role === "donor"
    if (!isOwner && !isDonor) return res.status(403).json({ message: "Not authorized" })

    if (donorId && (isOwner || (isDonor && status === "matched"))) {
      if (isDonor) {
        const check = scoreRequestForDonor(request, req.user)
        if (!check.eligible) {
          return res.status(400).json({ message: `You cannot accept this request: ${check.reason}` })
        }
      }
      request.matchedDonor = donorId
    }

    if (status && ["open", "matched", "fulfilled", "cancelled"].includes(status)) {
      request.status = status
      if (status === "fulfilled") {
        const donorId = request.matchedDonor
        if (donorId) {
          const donor = await User.findById(donorId)
          if (donor) {
            donor.donationCount = (donor.donationCount || 0) + 1
            donor.lastDonationDate = new Date()
            await donor.save()
          }
        }
      }
    }

    await request.save()
    res.json({ message: "Request updated", request })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = {
  createRequest,
  getMyRequests,
  getRequests,
  getRequestById,
  getMatchedDonors,
  updateRequestStatus,
}
