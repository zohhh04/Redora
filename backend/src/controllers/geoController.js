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
  const result = await tryCandidates(candidates)
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

  return [...new Set(list)].filter((s) => s.length > 1)
}

async function tryCandidates(candidates) {
  for (const candidate of candidates) {
    try {
      const url = `${NOMINATIM}?format=json&limit=1&q=${encodeURIComponent(candidate)}`
      const response = await fetch(url, {
        headers: {
          "User-Agent": "RedoraBloodDonation/1.0",
          Accept: "application/json",
        },
      })
      if (!response.ok) continue

      const data = await response.json()
      if (data.length) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), label: data[0].display_name }
      }
    } catch {
      // try the next candidate
    }
  }
  return null
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
  const url = `${NOMINATIM}?format=json&limit=10&q=${encodeURIComponent(q)}`
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "RedoraBloodDonation/1.0",
        Accept: "application/json",
      },
    })
    if (!response.ok) return []
    return await response.json()
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

    // Find the hospital by name, retrying with shorter location variants.
    // A long, exact address often returns nothing from Nominatim.
    let found = null
    for (const q of buildVerifyCandidates(name, location)) {
      const results = await nominatimSearch(q)
      const hit =
        results.find((r) => r.type === "hospital") ||
        results.find((r) => r.class === "amenity" && r.type === "hospital") ||
        results.find((r) => nameMatches(name, r.display_name || ""))
      if (hit) {
        found = { lat: parseFloat(hit.lat), lon: parseFloat(hit.lon), label: hit.display_name }
        break
      }
    }

    if (!found) return res.json({ verified: false, reason: "not-found" })

    // Confirm the location: any significant locality token in the typed
    // address appearing in the hospital's mapped address.
    const label = normalizeText(found.label)
    const sig = significantTokens(location)
    const tokenMatch = sig.some((w) => label.includes(w))

    // Fallback: geocode the typed location and measure distance to the hospital.
    let distanceKm = null
    if (!tokenMatch) {
      const geo = await geocodeLocation(location)
      if (geo) distanceKm = Math.round(haversineKm(found.lat, found.lon, geo.lat, geo.lon) * 10) / 10
    }

    const verified = tokenMatch || (distanceKm != null && distanceKm <= 35)
    return res.json({
      verified,
      reason: verified ? "verified" : "location-mismatch",
      distanceKm,
      match: {
        name: found.label,
        lat: found.lat,
        lon: found.lon,
        label: found.label,
      },
    })
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
        if (request.matchedDonor) excluded.add(request.matchedDonor.toString())
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
