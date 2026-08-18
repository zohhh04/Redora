const User = require("../models/User")

const ELIGIBLE_GAP_DAYS = 60 // ~2 month rule between whole-blood donations

// Gamified badge tiers by lifetime donation count.
function badgeFor(count) {
  if (count >= 50) return { label: "Platinum", icon: "💎" }
  if (count >= 25) return { label: "Gold", icon: "🥇" }
  if (count >= 10) return { label: "Silver", icon: "🥈" }
  if (count >= 5) return { label: "Bronze", icon: "🥉" }
  if (count >= 1) return { label: "First Drop", icon: "🩸" }
  return { label: "", icon: "" }
}

// Lifesaver points = donations * 10 + emergency-availability bonus + service
// years bonus. A fun, deterministic gamification score.
function pointsFor(d) {
  const years = Math.max(0, (Date.now() - (d.createdAt || Date.now())) / (365.25 * 24 * 3600 * 1000))
  const serviceBonus = Math.min(50, Math.floor(years) * 20)
  return (d.donationCount || 0) * 10 + (d.availableForEmergencies ? 25 : 0) + serviceBonus
}

function buildRow(d, rank) {
  const last = d.lastDonationDate ? new Date(d.lastDonationDate) : null
  const daysSince = last
    ? Math.max(0, Math.floor((Date.now() - last.getTime()) / (24 * 3600 * 1000)))
    : null
  const nextEligible = last ? new Date(last.getTime() + ELIGIBLE_GAP_DAYS * 24 * 3600 * 1000) : null
  const badge = badgeFor(d.donationCount || 0)
  return {
    rank,
    userId: d._id ? String(d._id) : null,
    name: d.name,
    bloodGroup: d.bloodGroup || "—",
    city: d.city || "—",
    donationCount: d.donationCount || 0,
    availableForEmergencies: d.availableForEmergencies,
    lastDonationDate: last ? last.toISOString() : null,
    daysSince,
    nextEligibleDate: nextEligible ? nextEligible.toISOString() : null,
    readyAgain: last ? nextEligible.getTime() <= Date.now() : null,
    badge: badge.label,
    badgeIcon: badge.icon,
    points: pointsFor(d),
  }
}

// GET /api/leaderboard?limit=50 - top donors by donation count
const leaderboard = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100)
    const donors = await User.find({ role: "donor" })
      .select("name bloodGroup city donationCount availableForEmergencies lastDonationDate createdAt")
      .sort({ donationCount: -1 })

    // Only donors who have actually donated are ranked — a leaderboard is for
    // people who gave blood, not everyone who signed up.
    const qualified = donors.filter((d) => (d.donationCount || 0) > 0)

    const rows = qualified.slice(0, limit).map((d, i) => buildRow(d, i + 1))

    // Where the logged-in donor stands among ALL qualified donors, even if they
    // fall outside the returned top-N window.
    let me = null
    if (req.user && req.user._id) {
      const myIndex = qualified.findIndex((d) => String(d._id) === String(req.user._id))
      if (myIndex !== -1) {
        me = buildRow(qualified[myIndex], myIndex + 1)
      }
    }

    const totalDonations = qualified.reduce((s, d) => s + (d.donationCount || 0), 0)
    res.json({
      leaderboard: rows,
      total: rows.length,
      me,
      stats: {
        totalDonations,
        livesSaved: totalDonations * 3, // ~3 lives saved per blood unit donated
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { leaderboard }