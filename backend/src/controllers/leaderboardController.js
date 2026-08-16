const User = require("../models/User")

// GET /api/leaderboard?limit=50 - top donors by donation count
const leaderboard = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 100)
    const donors = await User.find({ role: "donor" })
      .select("name bloodGroup city donationCount availableForEmergencies lastDonationDate")
      .sort({ donationCount: -1 })
      .limit(limit)

    const rows = donors
      .map((d, i) => ({
        rank: i + 1,
        name: d.name,
        bloodGroup: d.bloodGroup || "—",
        city: d.city || "—",
        donationCount: d.donationCount || 0,
        availableForEmergencies: d.availableForEmergencies,
      }))
      .filter((d) => d.donationCount > 0 || d.rank <= 10)

    res.json({ leaderboard: rows, total: rows.length })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { leaderboard }