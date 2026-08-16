const SosAlert = require("../models/SosAlert")
const User = require("../models/User")
const Notification = require("../models/Notification")
const { canDonateTo, isEligible, haversineKm } = require("../utils/matchUtils")
const { emitToUser } = require("../socket")

// POST /api/sos - raise an emergency alert. Notifies nearby eligible donors.
const createSos = async (req, res) => {
  try {
    const { bloodGroup, units, hospital, location, message } = req.body
    const lat = location?.lat != null ? location.lat : null
    const lng = location?.lng != null ? location.lng : null
    if (!lat || !lng) return res.status(400).json({ message: "A location is required to alert donors" })

    const alert = await SosAlert.create({
      user: req.user._id,
      bloodGroup: (bloodGroup || "").toUpperCase(),
      units: units || 1,
      hospital: (hospital || "").trim(),
      location: { lat, lng, label: location?.label || "" },
      message: (message || "").trim(),
      status: "active",
    })

    const sender = await User.findById(req.user._id).select("name bloodGroup")
    const radiusKm = 20
    const donors = await User.find({
      role: "donor",
      verified: true,
      availableForDonation: true,
      "location.lat": { $ne: null },
    }).select("_id name bloodGroup lastDonationDate mobile location")

    const notified = []
    donors.forEach((d) => {
      if (!canDonateTo(d.bloodGroup, alert.bloodGroup)) return
      if (!isEligible(d.lastDonationDate)) return
      const dist = haversineKm(lat, lng, d.location.lat, d.location.lng)
      if (dist > radiusKm) return
      notified.push(d._id)
    })

    const title = `🚨 EMERGENCY blood needed${hospital ? ` at ${hospital}` : ""}`
    const body = `${sender?.name || "A patient"} needs ${units} unit${units > 1 ? "s" : ""} of ${alert.bloodGroup || "matching"} blood urgently${location?.label ? ` (${location.label})` : ""}. Every minute counts!`

    for (const id of notified) {
      await Notification.create({
        user: id,
        type: "blood-request",
        title,
        body,
      })
      emitToUser(id, "request:update", { sos: alert._id })
    }
    alert.notifiedDonors = notified
    await alert.save()

    res.status(201).json({
      message: `Emergency alert raised and sent to ${notified.length} nearby donor${notified.length === 1 ? "" : "s"}`,
      alert: { ...alert.toObject(), notifiedDonors: notified.length },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/sos - the current user's SOS alerts
const getSos = async (req, res) => {
  try {
    const alerts = await SosAlert.find({ user: req.user._id }).sort({ createdAt: -1 })
    res.json({ alerts })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PATCH /api/sos/:id/resolve - mark an alert resolved
const resolveSos = async (req, res) => {
  try {
    const alert = await SosAlert.findById(req.params.id)
    if (!alert) return res.status(404).json({ message: "Alert not found" })
    if (alert.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" })
    }
    alert.status = "resolved"
    await alert.save()
    res.json({ message: "Alert resolved", alert })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { createSos, getSos, resolveSos }