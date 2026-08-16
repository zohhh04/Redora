const User = require("../models/User")
const BloodRequest = require("../models/BloodRequest")

// GET /api/analytics/summary - platform-wide analytics (donors, requests,
// blood-group distribution, cities, and a 7-day request trend).
const summary = async (req, res) => {
  try {
    const [donors, requests] = await Promise.all([
      User.find({ role: "donor" }),
      BloodRequest.find({}),
    ])

    const donorsByBloodGroup = {}
    donors.forEach((d) => {
      const g = (d.bloodGroup || "Unknown").toUpperCase()
      donorsByBloodGroup[g] = (donorsByBloodGroup[g] || 0) + 1
    })

    const requestsByBloodGroup = {}
    const requestsByCity = {}
    const openByCity = {}
    let open = 0
    let completed = 0
    let cancelled = 0
    let totalUnitsRequested = 0
    let totalUnitsDelivered = 0
    let emergencies = 0

    requests.forEach((r) => {
      const g = (r.bloodGroup || "Unknown").toUpperCase()
      requestsByBloodGroup[g] = (requestsByBloodGroup[g] || 0) + 1
      totalUnitsRequested += r.units || 1

      const city = (r.city || "Unknown").trim()
      requestsByCity[city] = (requestsByCity[city] || 0) + 1

      if (r.status === "completed") {
        completed += 1
        totalUnitsDelivered += r.units || 1
      } else if (r.status === "cancelled") {
        cancelled += 1
      } else {
        open += 1
        openByCity[city] = (openByCity[city] || 0) + 1
      }
      if (r.urgency === "emergency") emergencies += 1
    })

    const livesSaved = completed * 3

    // Requests created per day over the last 7 days.
    const trend = []
    const now = Date.now()
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now - i * 86400000)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(dayStart.getTime() + 86400000)
      const count = requests.filter((r) => {
        const at = new Date(r.createdAt).getTime()
        return at >= dayStart.getTime() && at < dayEnd.getTime()
      }).length
      trend.push({ date: dayStart.toISOString().slice(0, 10), count })
    }

    const top = (obj, n = 8) =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([name, value]) => ({ name, value }))

    res.json({
      donors: donors.length,
      patients: await User.countDocuments({ role: "patient" }),
      requests: requests.length,
      open,
      completed,
      cancelled,
      totalUnitsRequested,
      totalUnitsDelivered,
      emergencies,
      livesSaved,
      donorsByBloodGroup,
      requestsByBloodGroup,
      requestsByCity: top(requestsByCity),
      openByCity: top(openByCity),
      trend,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// GET /api/analytics/heatmap?type=donors|requests
// Returns points [{ lat, lng, intensity }] so the frontend can render a
// Leaflet.heat overlay. donors -> intensity = donation count + 1,
// requests -> intensity = units requested.
const heatmap = async (req, res) => {
  try {
    const type = req.query.type === "requests" ? "requests" : "donors"
    const points = []

    if (type === "donors") {
      const donors = await User.find({ role: "donor", "location.lat": { $ne: null } }).select(
        "location donationCount"
      )
      donors.forEach((d) => {
        if (d.location.lat != null && d.location.lng != null) {
          points.push({ lat: d.location.lat, lng: d.location.lng, intensity: (d.donationCount || 0) + 1 })
        }
      })
    } else {
      const requests = await BloodRequest.find({ "location.lat": { $ne: null } }).select(
        "location units status"
      )
      requests.forEach((r) => {
        if (r.location.lat != null && r.location.lng != null) {
          points.push({ lat: r.location.lat, lng: r.location.lng, intensity: r.units || 1 })
        }
      })
    }

    res.json({ type, points, count: points.length })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { summary, heatmap }