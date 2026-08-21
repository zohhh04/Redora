const User = require("../models/User")
const BloodRequest = require("../models/BloodRequest")

const GROUPS = ["O+", "A+", "B+", "AB+", "O-", "A-", "B-", "AB-"]
const ELIGIBLE_GAP_DAYS = 60

// ---- small helpers ---------------------------------------------------------

function monthsBack(k) {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth() - k, 1)
}

function monthKey(dt) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`
}

function monthLabel(dt) {
  return dt.toLocaleDateString(undefined, { month: "short" })
}

function avg(arr) {
  const v = arr.filter((n) => Number.isFinite(n))
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0
}

function minutesBetween(a, b) {
  if (!a || !b) return null
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000))
}

// Time (minutes) a request took from being created until the donor arrived or
// it was completed — a proxy for emergency response time.
function responseMinutes(req) {
  const journey = (req.journey || []).slice().sort((a, b) => new Date(a.at) - new Date(b.at))
  const first = journey.length ? journey[0].at : req.createdAt
  const arrived = journey.find((j) => j.stage === "arrived")
  const donating = journey.find((j) => j.stage === "donating" || j.stage === "completed")
  const end = arrived ? arrived.at : donating ? donating.at : req.completedAt
  return minutesBetween(first, end || req.createdAt)
}

// Distinct patient count a donor helped across completed/accepted requests.
function patientsFor(reqByDonor) {
  return new Set(reqByDonor.map((r) => String(r.patient))).size
}

// Achievement definitions (ordered) with the milestone used to unlock them.
const ACHIEVEMENTS = [
  { key: "first", icon: "🌱", name: "First Step", desc: "1 verified donation", kind: "donations", need: 1 },
  { key: "life", icon: "❤️", name: "Life Saver", desc: "5 verified donations", kind: "donations", need: 5 },
  { key: "hero", icon: "🚨", name: "Emergency Hero", desc: "5 emergency responses", kind: "responses", need: 5 },
  { key: "fast", icon: "⚡", name: "Fast Responder", desc: "≤ 30 min average response", kind: "fast", need: 30 },
  { key: "lifeline", icon: "💎", name: "Lifeline", desc: "10 verified donations", kind: "donations", need: 10 },
  { key: "champion", icon: "👑", name: "Redora Champion", desc: "25 verified donations", kind: "donations", need: 25 },
]

function earnedAchievements(d) {
  return ACHIEVEMENTS.map((a) => {
    let earned = false
    if (a.kind === "donations") earned = d.donationCount >= a.need
    else if (a.kind === "responses") earned = d.responses >= a.need
    else if (a.kind === "fast") earned = d.responses >= 1 && d.avgResponse != null && d.avgResponse <= a.need
    return { ...a, earned, progress: Math.min(a.need, a.kind === "donations" ? d.donationCount : a.kind === "responses" ? d.responses : 1) }
  })
}

// ---- main endpoint ----------------------------------------------------------

// GET /api/impact - full Impact Leaderboard & Analytics payload for Redora.
const impact = async (req, res) => {
  try {
    const [donors, requests] = await Promise.all([
      User.find({ role: "donor" }),
      BloodRequest.find({}),
    ])

    const completed = requests.filter((r) => r.status === "completed")
    const reqByDonor = {}
    completed.forEach((r) => {
      const id = r.matchedDonor ? String(r.matchedDonor) : null
      if (id) (reqByDonor[id] = reqByDonor[id] || []).push(r)
    })

    // Only verified donors who actually gave blood are ranked.
    const qualified = donors.filter((d) => (d.donationCount || 0) > 0)

    const rows = qualified
      .map((d) => {
        const id = String(d._id)
        const myReqs = reqByDonor[id] || []
        const last = d.lastDonationDate ? new Date(d.lastDonationDate) : null
        const nextEligible = last ? new Date(last.getTime() + ELIGIBLE_GAP_DAYS * 24 * 3600 * 1000) : null
        const years = Math.max(0, (Date.now() - (d.createdAt || Date.now())) / (365.25 * 24 * 3600 * 1000))
        const responses = myReqs.length
        const avgResponse = avg(myReqs.map(responseMinutes))
        const serviceBonus = Math.min(50, Math.floor(years) * 20)
        const score = (d.donationCount || 0) * 10 + responses * 15 + serviceBonus
        return {
          userId: id,
          name: d.name,
          bloodGroup: (d.bloodGroup || "—").toUpperCase(),
          city: d.city || "—",
          area: d.area || "",
          donations: d.donationCount || 0,
          responses,
          patients: patientsFor(myReqs),
          avgResponse,
          score,
          availableForEmergencies: d.availableForEmergencies,
          readyAgain: last ? nextEligible.getTime() <= Date.now() : null,
          lastDonationDate: last ? last.toISOString() : null,
          daysSince: last ? Math.max(0, Math.floor((Date.now() - last.getTime()) / (24 * 3600 * 1000))) : null,
          verified: d.verified,
          achievements: earnedAchievements({
            donationCount: d.donationCount || 0,
            responses,
            avgResponse,
          }),
        }
      })
      .sort((a, b) => b.score - a.score || b.donations - a.donations)
      .map((r, i) => ({ ...r, rank: i + 1 }))

    // Personalized row for the logged-in donor (outside the top-N window too).
    let me = null
    if (req.user && req.user._id) {
      const found = rows.find((r) => String(r.userId) === String(req.user._id))
      if (found) me = found
    }

    // ---- Global statistics ----
    const totalDonations = rows.reduce((s, r) => s + r.donations, 0)
    const totalResponses = rows.reduce((s, r) => s + r.responses, 0)
    const activeDonors = donors.filter(
      (d) => d.availableForDonation || (d.lastDonationDate && Date.now() - new Date(d.lastDonationDate).getTime() < 120 * 86400000)
    ).length
    const allResponseTimes = completed.map(responseMinutes).filter((n) => Number.isFinite(n))
    const stats = {
      verifiedDonations: totalDonations,
      bloodUnits: completed.reduce((s, r) => s + (r.units || 1), 0),
      emergencyResponses: totalResponses,
      patientsSupported: new Set(completed.map((r) => String(r.patient))).size,
      activeDonors,
      avgResponseMinutes: avg(allResponseTimes),
      livesSaved: completed.length * 3,
    }

    // ---- Monthly verified donations (last 12 months) ----
    const monthlyDonations = []
    for (let k = 11; k >= 0; k--) {
      const dt = monthsBack(k)
      const key = monthKey(dt)
      const count = rows.reduce((s, r) => {
        if (!r.lastDonationDate) return s
        const ld = new Date(r.lastDonationDate)
        return monthKey(ld) === key ? s + r.donations : s
      }, 0)
      monthlyDonations.push({ key, label: monthLabel(dt), count })
    }

    // ---- Donations by blood group (bar) ----
    const donationsByBloodGroup = GROUPS.map((g) => ({
      group: g,
      count: rows.filter((r) => r.bloodGroup === g).reduce((s, r) => s + r.donations, 0),
    })).sort((a, b) => b.count - a.count)

    // ---- Emergency responses by month ----
    const emergencyByMonth = []
    for (let k = 11; k >= 0; k--) {
      const dt = monthsBack(k)
      const key = monthKey(dt)
      emergencyByMonth.push({
        key,
        label: monthLabel(dt),
        count: requests.filter((r) => r.urgency === "emergency" && monthKey(new Date(r.createdAt)) === key).length,
      })
    }

    // ---- Response-time trend by month ----
    const responseTrend = []
    for (let k = 11; k >= 0; k--) {
      const dt = monthsBack(k)
      const key = monthKey(dt)
      const times = completed.filter((r) => monthKey(new Date(r.createdAt)) === key).map(responseMinutes).filter((n) => Number.isFinite(n))
      responseTrend.push({ key, label: monthLabel(dt), minutes: avg(times) })
    }

    // ---- Donor blood-group distribution (donut) ----
    const donorBloodDistribution = GROUPS.map((g) => ({
      group: g,
      count: donors.filter((d) => (d.bloodGroup || "").toUpperCase() === g).length,
    })).sort((a, b) => b.count - a.count)

    // ---- Emergency request status (donut) ----
    const statusMap = {
      completed: "Completed",
      open: "Active",
      matched: "Waiting for Donor",
      accepted: "Waiting for Donor",
      traveling: "Active",
      arrived: "Active",
      donating: "Active",
      cancelled: "Expired",
    }
    const requestStatus = Object.entries(
      requests.reduce((acc, r) => {
        const label = statusMap[r.status] || "Active"
        acc[label] = (acc[label] || 0) + 1
        return acc
      }, {})
    ).map(([name, count]) => ({ name, count }))

    // ---- Demand vs donor availability by month ----
    const demandVsAvailability = []
    for (let k = 11; k >= 0; k--) {
      const dt = monthsBack(k)
      const key = monthKey(dt)
      const demand = requests.filter((r) => monthKey(new Date(r.createdAt)) === key).reduce((s, r) => s + (r.units || 1), 0)
      const availability = rows.reduce((s, r) => {
        if (!r.lastDonationDate) return s
        return monthKey(new Date(r.lastDonationDate)) === key ? s + r.donations : s
      }, 0)
      demandVsAvailability.push({ key, label: monthLabel(dt), demand, availability })
    }

    // ---- Special recognition ----
    const recognition = []
    if (rows.length) {
      const most = rows[0]
      const hero = [...rows].sort((a, b) => b.responses - a.responses)[0]
      const fast = rows.filter((r) => r.responses >= 1 && r.avgResponse != null).sort((a, b) => a.avgResponse - b.avgResponse)[0]
      const consistent = [...rows].sort((a, b) => (b.readyAgain === true ? 1 : 0) - (a.readyAgain === true ? 1 : 0) || b.donations - a.donations)[0]
      const community = [...rows].sort((a, b) => (b.availableForEmergencies === true ? 1 : 0) - (a.availableForEmergencies === true ? 1 : 0) || b.score - a.score)[0]
      const byCity = communityLeaderboard(rows, "city")
      const byArea = communityLeaderboard(rows, "area")
      recognition.push(
        { category: "Most Donations", icon: "🏆", name: most.name, detail: `${most.donations} verified donations`, userId: most.userId },
        { category: "Emergency Hero", icon: "🚨", name: hero.name, detail: `${hero.responses} emergency responses`, userId: hero.userId },
        { category: "Fast Responder", icon: "⚡", name: fast ? fast.name : most.name, detail: fast ? `${fast.avgResponse} min avg response` : "n/a", userId: fast ? fast.userId : most.userId },
        { category: "Consistent Donor", icon: "🔁", name: consistent.name, detail: "Always ready to give", userId: consistent.userId },
        { category: "Community Champion", icon: "🤝", name: community.name, detail: "On-call for emergencies", userId: community.userId },
        { category: "Top College", icon: "🎓", name: byArea[0] ? byArea[0].name : "—", detail: byArea[0] ? `${byArea[0].donations} contributions` : "n/a", userId: null },
        { category: "Top Organization", icon: "🏥", name: byCity[0] ? byCity[0].name : "—", detail: byCity[0] ? `${byCity[0].donations} contributions` : "n/a", userId: null }
      )
    }

    // ---- Community leaderboards ----
    const community = {
      colleges: communityLeaderboard(rows, "area"),
      organizations: communityLeaderboard(rows, "city"),
      cities: communityLeaderboard(rows, "city"),
    }

    // ---- Regional impact map ----
    const map = {
      donors: donors
        .filter((d) => d.location && d.location.lat != null && d.location.lng != null)
        .map((d) => ({
          lat: d.location.lat,
          lng: d.location.lng,
          intensity: (d.donationCount || 0) + 1,
          available: !!d.availableForEmergencies,
          group: (d.bloodGroup || "—").toUpperCase(),
        })),
      requests: requests
        .filter((r) => r.location && r.location.lat != null && r.location.lng != null)
        .map((r) => ({
          lat: r.location.lat,
          lng: r.location.lng,
          group: r.bloodGroup,
          units: r.units || 1,
          emergency: r.urgency === "emergency",
          status: r.status,
        })),
    }

    // ---- AURA insights ----
    const highDemand = [...donationsByBloodGroup].sort((a, b) => b.count - a.count).slice(0, 2)
    const latestMinutes = responseTrend[responseTrend.length - 1]
    const prevMinutes = responseTrend[responseTrend.length - 2]
    const improving = latestMinutes && prevMinutes && latestMinutes.minutes < prevMinutes.minutes
    const aura = {
      insights: [
        highDemand[0]
          ? `${highDemand[0].group} is currently one of the most requested blood groups in your region.`
          : "Blood demand data is still being collected.",
        improving
          ? `Redora's average emergency response time has improved by ${Math.max(1, prevMinutes.minutes - latestMinutes.minutes)} minutes this month.`
          : "Emergency response times are holding steady — every donor counts.",
        stats.verifiedDonations > 0
          ? `Your community has delivered ${stats.verifiedDonations} verified donations, supporting ${stats.patientsSupported} patients.`
          : "Be the first verified donor to start the impact board.",
      ],
    }
    if (me) {
      aura.personalized = `You're ranked #${me.rank} with ${me.donations} verified donations and ${me.responses} emergency responses.`
    } else if (req.user) {
      aura.personalized = "Make your first verified donation to appear on the impact board."
    } else {
      aura.personalized = "Sign in as a donor to see your personal impact."
    }

    // ---- 7-day blood demand forecast ----
    const forecast = GROUPS.map((g) => {
      const recent = requests.filter(
        (r) => r.bloodGroup === g && Date.now() - new Date(r.createdAt).getTime() < 30 * 86400000
      )
      const recentUnits = recent.reduce((s, r) => s + (r.units || 1), 0)
      const expected = Math.max(1, Math.round((recentUnits / 30) * 7))
      const available = donors.filter((d) => (d.bloodGroup || "").toUpperCase() === g).length
      const ratio = available / Math.max(1, expected)
      const risk = ratio >= 2 ? "Low" : ratio >= 1.2 ? "Medium" : ratio >= 0.7 ? "High" : "Critical"
      const recommendation =
        risk === "Low"
          ? "Supply is healthy. Keep donors informed."
          : risk === "Medium"
          ? "Encourage routine donations for this group."
          : risk === "High"
          ? "Launch an emergency appeal for this group."
          : "Critical shortage — activate on-call donors now."
      return { group: g, expected, available, shortageRisk: risk, recommendation }
    })

    res.json({
      stats,
      leaderboard: rows,
      me,
      achievements: ACHIEVEMENTS,
      monthlyDonations,
      donationsByBloodGroup,
      emergencyByMonth,
      responseTrend,
      donorBloodDistribution,
      requestStatus,
      demandVsAvailability,
      recognition,
      community,
      map,
      aura,
      forecast,
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Top community groups (college/organization/city) by total verified donations.
function communityLeaderboard(rows, field) {
  const map = {}
  rows.forEach((r) => {
    const name = (r[field] || "").trim() || "Unknown"
    map[name] = map[name] || { name, donations: 0, donors: 0 }
    map[name].donations += r.donations
    map[name].donors += 1
  })
  return Object.values(map).sort((a, b) => b.donations - a.donations).slice(0, 8)
}

module.exports = { impact }