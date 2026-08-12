const BloodRequest = require("../models/BloodRequest")
const User = require("../models/User")
const Notification = require("../models/Notification")
const { scoreDonorForRequest, scoreRequestForDonor, canDonateTo, isEligible, haversineKm } = require("../utils/matchUtils")
const { stageLabel, TRANSITIONS, certificateCode } = require("../utils/journeyUtils")
const { sendSms } = require("../utils/sendSms")

const DELAY_MS = 30 * 60 * 1000

const pushJourney = (request, stage, user, extra = {}) => {
  request.journey.push({
    stage,
    label: extra.label || stageLabel(stage),
    note: extra.note || "",
    location: extra.location || "",
    by: user ? user._id : null,
  })
}

const markRequestNotifsRead = async (userId, requestId) => {
  await Notification.updateMany(
    { user: userId, request: requestId, read: false },
    { read: true, readAt: new Date() }
  )
}

// Notify the NEAREST eligible donor about a new open request. When that donor
// declines or delays, this is called again to fall through to the next nearest,
// so only one notification is live at a time (nearest-first dispatch).
async function dispatchNearestDonor(request) {
  try {
    const patient = await User.findById(request.patient).select("name")
    if (!patient) return

    const donors = await User.find({
      role: "donor",
      verified: true,
      availableForDonation: true,
    }).select("_id bloodGroup lastDonationDate travelRadiusKm location mobile name")

    const declined = request.declinedDonors.map(String)
    const delayed = new Set(
      request.delayedDonors
        .filter((d) => d.until > new Date())
        .map((d) => d.donor.toString())
    )

    const candidates = donors
      .filter((d) => {
        const id = d._id.toString()
        if (declined.includes(id)) return false
        if (delayed.has(id)) return false
        if (request.matchedDonor && request.matchedDonor.toString() === id) return false
        if (!canDonateTo(d.bloodGroup, request.bloodGroup)) return false
        if (!isEligible(d.lastDonationDate)) return false
        if (!d.location || d.location.lat == null || d.location.lng == null) return false
        const dist = haversineKm(
          request.location.lat,
          request.location.lng,
          d.location.lat,
          d.location.lng
        )
        return dist <= Math.max(d.travelRadiusKm || 25, 5)
      })
      .map((d) => ({
        d,
        dist: haversineKm(
          request.location.lat,
          request.location.lng,
          d.location.lat,
          d.location.lng
        ),
      }))
      .sort((a, b) => a.dist - b.dist)

    const nearest = candidates[0]
    if (!nearest) return

    const emoji = request.urgency === "emergency" ? "🚨" : "🩸"
    await Notification.create({
      user: nearest.d._id,
      request: request._id,
      type: "blood-request",
      title: `${emoji} Blood needed${request.hospital ? ` at ${request.hospital}` : ""}`,
      body: `${request.bloodGroup} · ${request.units} unit${request.units > 1 ? "s" : ""} · ${
        request.urgency === "emergency" ? "Emergency" : "Normal"
      } · Patient ${patient.name}${request.city ? ` · ${request.city}` : ""}`,
    })

    const smsText = `Redora: ${request.bloodGroup} blood needed${
      request.hospital ? ` at ${request.hospital}` : ""
    } (${request.units} unit${request.units > 1 ? "s" : ""}, ${
      request.urgency === "emergency" ? "EMERGENCY" : "normal"
    }) for patient ${patient.name}${request.city ? `, ${request.city}` : ""}. Open the Redora app to Accept or Delay.`
    if (nearest.d.mobile) sendSms({ to: nearest.d.mobile, text: smsText })
  } catch (error) {
    console.error("dispatchNearestDonor failed:", error.message)
  }
}

// POST /api/requests - create a blood request (patient)
const createRequest = async (req, res) => {
  try {
    const { bloodGroup, units, hospital, phone, hospitalPhone, city, area, location, urgency, notes } = req.body
    if (!bloodGroup) return res.status(400).json({ message: "Please select a blood group" })

    const request = await BloodRequest.create({
      patient: req.user._id,
      bloodGroup: bloodGroup.toUpperCase(),
      units: units || 1,
      hospital: hospital || "",
      phone: phone || "",
      hospitalPhone: hospitalPhone || "",
      city: location?.label ? location.label.split(",")[0] : location || city || "",
      area: area || "",
      location: {
        lat: location?.lat != null ? location.lat : null,
        lng: location?.lng != null ? location.lng : null,
        label: location?.label || "",
      },
      urgency: urgency === "emergency" ? "emergency" : "normal",
      notes: notes || "",
    })

    if (request.location.lat != null && request.location.lng != null) {
      dispatchNearestDonor(request)
    }

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
      .populate("matchedDonor", "name bloodGroup city area mobile")
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
    if (req.user.role === "donor") {
      filter.declinedDonors = { $ne: req.user._id }
      filter.delayedDonors = {
        $not: { $elemMatch: { donor: req.user._id, until: { $gt: new Date() } } },
      }
    }

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

// PATCH /api/requests/:id/respond - donor accepts, declines or delays an open request
const respondToRequest = async (req, res) => {
  try {
    const { action } = req.body
    if (!["accept", "decline", "delay"].includes(action)) {
      return res.status(400).json({ message: "Action must be accept, decline or delay" })
    }
    if (req.user.role !== "donor") {
      return res.status(403).json({ message: "Only donors can accept or decline requests" })
    }

    const request = await BloodRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ message: "Request not found" })
    if (request.status !== "open") {
      return res.status(400).json({ message: "This request is no longer open" })
    }
    if (request.matchedDonor && request.matchedDonor.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You are already matched to this request" })
    }
    if (request.declinedDonors.map(String).includes(req.user._id.toString())) {
      return res.status(400).json({ message: "You already declined this request" })
    }

    if (action === "delay") {
      const existing = request.delayedDonors.find(
        (d) => d.donor.toString() === req.user._id.toString()
      )
      if (existing) existing.until = new Date(Date.now() + DELAY_MS)
      else request.delayedDonors.push({ donor: req.user._id, until: new Date(Date.now() + DELAY_MS) })
      pushJourney(request, "delayed", req.user, {
        label: "Remind Later",
        note: `${req.user.name} asked to be reminded later`,
      })
      await request.save()
      await markRequestNotifsRead(req.user._id, request._id)
      dispatchNearestDonor(request)
      return res.json({ message: "Got it — we'll remind you again in 30 minutes.", request })
    }

    if (action === "decline") {
      request.declinedDonors.push(req.user._id)
      pushJourney(request, "declined", req.user, {
        label: "Request Declined",
        note: `${req.user.name} declined this request`,
      })
      await request.save()
      await markRequestNotifsRead(req.user._id, request._id)
      dispatchNearestDonor(request)
      return res.json({ message: "Request declined", request })
    }

    const check = scoreRequestForDonor(request, req.user)
    if (!check.eligible) {
      return res.status(400).json({ message: `You cannot accept this request: ${check.reason}` })
    }

    request.matchedDonor = req.user._id
    request.status = "matched"
    pushJourney(request, "matched", req.user, {
      note: `${req.user.name} accepted this request`,
    })
    await request.save()
    await markRequestNotifsRead(req.user._id, request._id)
    res.json({ message: "Request accepted. Waiting for the patient to confirm you.", request })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PATCH /api/requests/:id/donor - patient assigns, confirms or releases a donor
const manageDonor = async (req, res) => {
  try {
    const { action, donorId } = req.body
    const request = await BloodRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ message: "Request not found" })
    if (request.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" })
    }

    if (action === "assign") {
      if (!donorId) return res.status(400).json({ message: "Donor id is required" })
      if (!["open", "matched"].includes(request.status)) {
        return res.status(400).json({ message: "A donor cannot be assigned at this stage" })
      }
      if (request.matchedDonor) {
        request.declinedDonors.push(request.matchedDonor)
      }
      request.matchedDonor = donorId
      request.status = "matched"
      pushJourney(request, "matched", req.user, { note: "Patient assigned a donor" })
      await request.save()
      return res.json({ message: "Donor assigned", request })
    }

    if (action === "confirm") {
      if (request.status !== "matched") {
        return res.status(400).json({ message: "Request must be matched to confirm the donor" })
      }
      request.status = "accepted"
      pushJourney(request, "accepted", req.user, { note: "Patient confirmed the donor" })
      await request.save()
      return res.json({ message: "Donor confirmed. The journey has begun!", request })
    }

    if (action === "release") {
      if (!request.matchedDonor) return res.status(400).json({ message: "No matched donor to release" })
      request.declinedDonors.push(request.matchedDonor)
      pushJourney(request, "released", req.user, { note: "Patient released the matched donor" })
      request.matchedDonor = null
      request.status = "open"
      await request.save()
      return res.json({ message: "Donor released. Request is open again.", request })
    }

    res.status(400).json({ message: "Action must be assign, confirm or release" })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PATCH /api/requests/:id/journey - advance the journey stage (patient or matched donor)
const updateJourney = async (req, res) => {
  try {
    const { stage, note, location } = req.body
    const request = await BloodRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ message: "Request not found" })

    const isPatient = request.patient.toString() === req.user._id.toString()
    const isDonor =
      request.matchedDonor && request.matchedDonor.toString() === req.user._id.toString()
    if (!isPatient && !isDonor) return res.status(403).json({ message: "Not authorized" })

    const current = request.status

    // Live location/note update while the donor is traveling (no stage change).
    if (stage === current && current === "traveling") {
      const last = request.journey[request.journey.length - 1]
      if (last && last.stage === "traveling") {
        if (location !== undefined) last.location = location
        if (note !== undefined) last.note = note
      }
      await request.save()
      return res.json({ message: "Location updated", request })
    }

    if (stage === "cancelled") {
      if (!isPatient && !(isDonor && ["matched", "accepted", "traveling"].includes(current))) {
        return res.status(403).json({ message: "You cannot cancel at this stage" })
      }
      request.status = "cancelled"
      pushJourney(request, "cancelled", req.user, {
        note: note || (isPatient ? "Patient cancelled the request" : "Donor cancelled"),
      })
      await request.save()
      return res.json({ message: "Request cancelled", request })
    }

    if (request.status === "cancelled") {
      return res.status(400).json({ message: "This request is cancelled" })
    }

    const allowed = TRANSITIONS[current] || []
    if (!allowed.includes(stage)) {
      return res.status(400).json({ message: `Cannot move from ${current} to ${stage}` })
    }

    if (stage === "accepted" && !isPatient) {
      return res.status(403).json({ message: "Only the patient can confirm the donor" })
    }
    if ((stage === "traveling" || stage === "arrived") && !isDonor) {
      return res.status(403).json({ message: "Only the matched donor can update travel status" })
    }

    request.status = stage
    pushJourney(request, stage, req.user, { note: note || "", location: location || "" })

    if (stage === "completed") {
      request.completedAt = new Date()
      request.certificate = { code: certificateCode(), issuedAt: new Date() }
      const donor = await User.findById(request.matchedDonor)
      if (donor) {
        donor.donationCount = (donor.donationCount || 0) + 1
        donor.lastDonationDate = new Date()
        await donor.save()
      }
    }

    await request.save()
    res.json({ message: "Journey updated", request })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/requests/:id/tracking - live journey detail for the patient or matched donor
const getTracking = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .populate("patient", "name mobile")
      .populate("matchedDonor", "name bloodGroup city area mobile location")
    if (!request) return res.status(404).json({ message: "Request not found" })

    const isPatient =
      request.patient && request.patient._id.toString() === req.user._id.toString()
    const isDonor =
      request.matchedDonor && request.matchedDonor._id.toString() === req.user._id.toString()
    if (!isPatient && !isDonor) return res.status(403).json({ message: "Not authorized" })

    res.json({ request })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/requests/:id/certificate - donation certificate (issued to the donating donor)
const getCertificate = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .populate("patient", "name")
      .populate("matchedDonor", "name bloodGroup")
    if (!request) return res.status(404).json({ message: "Request not found" })
    if (!request.certificate || !request.certificate.code) {
      return res.status(400).json({ message: "No certificate has been issued for this request" })
    }

    const isDonor =
      request.matchedDonor && request.matchedDonor._id.toString() === req.user._id.toString()
    if (!isDonor) {
      return res.status(403).json({ message: "Certificates are issued to the donating donor" })
    }

    res.json({ certificate: request.certificate, request })
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
  respondToRequest,
  manageDonor,
  updateJourney,
  getTracking,
  getCertificate,
}
