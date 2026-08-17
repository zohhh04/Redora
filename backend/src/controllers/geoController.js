const User = require("../models/User")
const BloodRequest = require("../models/BloodRequest")
const { canDonateTo, isEligible } = require("../utils/matchUtils")

const NOMINATIM = "https://nominatim.openstreetmap.org/search"
const NOMINATIM_REVERSE = "https://nominatim.openstreetmap.org/reverse"

// GET /api/geo/geocode?q=... - geocode a free-text location to {lat, lon}
const geocode = async (req, res) => {
  try {
    const q = (req.query.q || "").trim()
    if (!q) return res.status(400).json({ message: "A location query is required" })

    const result = await geocodeLocation(q)
    if (!result) return res.json({ result: null })

    return res.json({ result })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Geocode a free-text query, trying progressively simpler variants. Returns
// { lat, lon, label } or null.
async function geocodeLocation(q) {
  const candidates = buildCandidates(q)
  const result = await tryCandidates(candidates, significantTokens(q), statesInText(q))
  if (!result) return null
  return { lat: result.lat, lon: result.lon, label: result.label }
}

// Build a list of progressively simpler location queries to try.
function buildCandidates(q) {
  const noPin = q.replace(/\d{6}/g, "").replace(/,+/g, ",").replace(/(^,|,$)/g, "").trim()
  const parts = noPin.split(",").map((s) => s.trim()).filter(Boolean)

  const list = []
  list.push(q)
  if (noPin !== q) list.push(noPin)

  // Drop the street-level detail first, then fall back to fewer segments.
  for (let i = 1; i < parts.length; i++) {
    list.push(parts.slice(i).join(", "))
  }
  list.push(parts[parts.length - 1])

  // Try each address segment alone too. A combined (locality + city) query can
  // return nothing, while the locality alone resolves to a precise point.
  for (const p of parts) {
    if (p && p.length > 1) list.push(p)
  }

  return [...new Set(list)].filter((s) => s.length > 1)
}

// Pick the most precise result instead of blindly returning the first hit, so
// a specific locality is preferred over a vague city/state administrative
// boundary (which would otherwise map to the wrong place).
function scoreResult(r, sigTokens, states) {
  const label = normalizeText(r.display_name || "")
  let score = 0
  for (const w of sigTokens) if (label.includes(w)) score += 10
  // A result in a different state than the typed address is almost certainly
  // the wrong (same-named) place — heavily penalize it.
  if (states.length && !states.some((s) => label.includes(s))) score -= 50
  if (r.type === "administrative" || r.class === "boundary" || r.type === "state") score -= 12
  score += label.split(" ").length
  return score
}

async function tryCandidates(candidates, sigTokens = [], states = []) {
  let best = null
  let bestScore = -Infinity
  for (const candidate of candidates) {
    try {
      const url = `${NOMINATIM}?format=json&limit=5&countrycodes=in&q=${encodeURIComponent(candidate)}`
      const response = await fetch(url, {
        headers: {
          "User-Agent": "RedoraBloodDonation/1.0",
          Accept: "application/json",
        },
      })
      if (!response.ok) continue

      const data = await response.json()
      if (!data.length) continue

      const hit = data.find((r) => isInIndia(r)) || data[0]
      if (!hit) continue

      const score = scoreResult(hit, sigTokens, states)
      if (score > bestScore) {
        bestScore = score
        best = hit
      }
    } catch {
      // try the next candidate
    }
  }
  if (!best) return null
  return { lat: parseFloat(best.lat), lon: parseFloat(best.lon), label: best.display_name }
}

// GET /api/geo/reverse?lat=...&lng=... - reverse geocode coordinates to a readable address
const reverseGeocode = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat)
    const lng = parseFloat(req.query.lng)
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: "Valid lat and lng are required" })
    }

    const url = `${NOMINATIM_REVERSE}?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16`
    const response = await fetch(url, {
      headers: {
        "User-Agent": "RedoraBloodDonation/1.0",
        Accept: "application/json",
      },
    })
    if (!response.ok) throw new Error("Reverse geocode service unavailable")

    const data = await response.json()
    if (!data || !data.lat) return res.json({ result: null })

    const addr = data.address || {}
    const area = addr.neighbourhood || addr.suburb || addr.road || addr.quarter || ""
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.state || ""

    return res.json({
      result: {
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon),
        label: data.display_name,
        area,
        city,
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// Normalize text for fuzzy comparison (lowercase, alphanumeric tokens only)
function normalizeText(s) {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

// True when a Nominatim result is located in India (defence against the app
// pinning an identically-named place in another country).
function isInIndia(r) {
  const label = normalizeText((r && (r.display_name || r.name)) || "")
  const addr = (r && r.address) || {}
  const country = normalizeText(addr.country || addr.country_code || "")
  return label.includes("india") || country === "india" || country === "in"
}

// Loose hospital-name match: "Apollo Hospital" matches "Apollo Hospitals", etc.
function nameMatches(typed, actual) {
  const t = normalizeText(typed)
  const a = normalizeText(actual)
  if (!t) return false
  if (a.includes(t) || t.includes(a)) return true
  const words = t.split(" ").filter((w) => w.length > 2)
  return words.length > 0 && words.every((w) => a.includes(w))
}

// Common words in addresses that don't help confirm a location match.
const GENERIC_LOCATION_WORDS = new Set([
  "road", "rd", "street", "st", "nagar", "layout", "colony", "village", "town", "city",
  "state", "telangana", "andhra", "pradesh", "pin", "india", "dist", "district", "post",
  "near", "opp", "opposite", "behind", "ward", "zone", "mandal", "corporation", "municipal", "cross",
])

// Tokens in a typed location that are specific enough to confirm a match.
function significantTokens(location) {
  return normalizeText(location)
    .split(" ")
    .filter((w) => w.length > 3 && !/^\d+$/.test(w) && !GENERIC_LOCATION_WORDS.has(w))
}

// Indian states/UTs used to keep a match in the same region as the typed
// address, so a same-named place in another state isn't chosen.
const INDIAN_STATES = new Set([
  "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "goa",
  "gujarat", "haryana", "himachal pradesh", "jharkhand", "karnataka", "kerala",
  "madhya pradesh", "maharashtra", "manipur", "meghalaya", "mizoram", "nagaland",
  "odisha", "orissa", "punjab", "rajasthan", "sikkim", "tamil nadu", "telangana",
  "tripura", "uttar pradesh", "uttarakhand", "west bengal", "delhi", "jammu",
  "kashmir", "ladakh", "andaman", "nicobar", "chandigarh", "dadra", "daman",
  "diu", "lakshadweep", "puducherry", "kerala", "tamil nadu",
])

// States explicitly named in the typed address.
function statesInText(text) {
  const n = normalizeText(text)
  return [...INDIAN_STATES].filter((s) => n.includes(s))
}

// Queries to try: hospital + full location, then hospital + progressively
// shorter location, then just the hospital name.
function buildVerifyCandidates(name, location) {
  const parts = location.split(",").map((s) => s.trim()).filter(Boolean)
  const list = []
  list.push(`${name}, ${location}`)
  for (let i = 1; i < parts.length; i++) {
    list.push(`${name}, ${parts.slice(0, parts.length - i).join(", ")}`)
  }
  list.push(name)
  return [...new Set(list)].filter((s) => s.length > 1)
}

async function nominatimSearch(q) {
  const url = `${NOMINATIM}?format=json&limit=10&countrycodes=in&q=${encodeURIComponent(q)}`
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "RedoraBloodDonation/1.0",
        Accept: "application/json",
      },
    })
    if (!response.ok) return []
    const results = await response.json()
    return results.filter(isInIndia)
  } catch {
    return []
  }
}

// GET /api/geo/verify-hospital?name=..&location=..
// Confirms whether the hospital name actually exists at the given location,
// so the request page can validate the hospital before posting.
const verifyHospital = async (req, res) => {
  try {
    const name = (req.query.name || "").trim()
    const location = (req.query.location || "").trim()
    if (!name) return res.status(400).json({ message: "Hospital name is required" })
    if (!location) return res.status(400).json({ message: "Location is required" })

    // Try geocoding the full hospital address first (name + location combined)
    const fullAddress = `${name}, ${location}`
    const geo = await geocodeLocation(fullAddress)
    
    if (geo) {
      return res.json({
        verified: true,
        reason: "verified",
        match: {
          name: geo.label,
          lat: geo.lat,
          lon: geo.lon,
          label: geo.label,
        },
      })
    }

    // Fallback: if full address doesn't geocode, try just the location
    const locationGeo = await geocodeLocation(location)
    if (locationGeo) {
      return res.json({
        verified: true,
        reason: "location",
        match: {
          name: locationGeo.label,
          lat: locationGeo.lat,
          lon: locationGeo.lon,
          label: locationGeo.label,
        },
      })
    }

    return res.json({ verified: false, reason: "not-found" })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

function toRad(deg) {
  return (deg * Math.PI) / 180
}

// Distance in km between two coordinates (haversine)
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

// GET /api/geo/nearby-donors?lat=..&lng=..&bloodGroup=..&radiusKm=5
// Returns eligible donors within the radius around a location.
const nearbyDonors = async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat)
    const lng = parseFloat(req.query.lng)
    const bloodGroup = (req.query.bloodGroup || "").toUpperCase()
    const radiusKm = parseFloat(req.query.radiusKm) || 5
    const requestId = (req.query.requestId || "").trim()
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: "Valid lat and lng are required" })
    }

    // Donors who already declined (or are the matched donor) are hidden from
    // this request's map so the patient doesn't see uninterested donors.
    const excluded = new Set()
    if (requestId) {
      const request = await BloodRequest.findById(requestId)
      if (request) {
        // Keep the currently matched donor visible on the map when they are in
        // the search radius, so patients can see the real pin instead of a
        // silent notification-only flow.
        request.declinedDonors.forEach((id) => excluded.add(id.toString()))
      }
    }

    const donors = await User.find({ role: "donor", verified: true }).select(
      "name bloodGroup mobile donationCount availableForDonation availableForEmergencies city area location lastDonationDate"
    )

    const matches = donors
      .map((d) => {
        if (excluded.has(d._id.toString())) return null
        if (!d.location || d.location.lat == null || d.location.lng == null) return null
        if (!canDonateTo(d.bloodGroup, bloodGroup)) return null
        if (!isEligible(d.lastDonationDate)) return null
        if (!d.availableForDonation) return null

        const distanceKm = haversineKm(lat, lng, d.location.lat, d.location.lng)
        if (distanceKm > radiusKm) return null

        return {
          donor: {
            id: d._id,
            name: d.name,
            bloodGroup: d.bloodGroup,
            mobile: d.mobile,
            donationCount: d.donationCount,
            availableForEmergencies: d.availableForEmergencies,
            city: d.city,
            area: d.area,
            label: d.location.label,
            lat: d.location.lat,
            lng: d.location.lng,
          },
          distanceKm: Math.round(distanceKm * 10) / 10,
        }
      })
      .filter(Boolean)
      .sort((a, b) => a.distanceKm - b.distanceKm)

    res.json({ donors: matches, total: matches.length, radiusKm })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { geocode, reverseGeocode, nearbyDonors, verifyHospital }
