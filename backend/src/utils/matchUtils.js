const COMPATIBILITY = {
  "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
  "O+": ["O+", "A+", "B+", "AB+"],
  "A-": ["A-", "A+", "AB-", "AB+"],
  "A+": ["A+", "AB+"],
  "B-": ["B-", "B+", "AB-", "AB+"],
  "B+": ["B+", "AB+"],
  "AB-": ["AB-", "AB+"],
  "AB+": ["AB+"],
}

const MONTHS_MS = 2 * 30 * 24 * 60 * 60 * 1000

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

function canDonateTo(donorBlood, patientBlood) {
  const list = COMPATIBILITY[donorBlood]
  return !!list && list.includes(patientBlood)
}

function isEligible(lastDonationDate) {
  return !lastDonationDate || Date.now() - new Date(lastDonationDate).getTime() >= MONTHS_MS
}

// Score a donor against a blood request.
// Returns { eligible: true, score, reasons } or { eligible: false, reason }.
function scoreDonorForRequest(donor, request) {
  if (!donor.bloodGroup) {
    return { eligible: false, reason: "Donor has not set a blood group" }
  }
  if (!canDonateTo(donor.bloodGroup, request.bloodGroup)) {
    return { eligible: false, reason: `Blood group ${donor.bloodGroup} cannot donate to ${request.bloodGroup}` }
  }
  if (!isEligible(donor.lastDonationDate)) {
    return { eligible: false, reason: "Donor donated less than 2 months ago (not eligible)" }
  }
  if (!donor.availableForDonation) {
    return { eligible: false, reason: "Donor is currently unavailable for donation" }
  }
  if (!donor.verified) {
    return { eligible: false, reason: "Donor email is not verified" }
  }

  const reasons = []
  let score = 0

  score += 35
  reasons.push("Blood group compatible")

  score += 25
  reasons.push("Available for donation")

  score += 20
  reasons.push("Eligible (last donation > 2 months ago)")

  if (request.urgency === "emergency" && donor.availableForEmergencies) {
    score += 10
    reasons.push("Open to emergency requests")
  }

  if (donor.city || donor.area) {
    score += 5
    reasons.push("Complete profile")
  }

  if (request.city && donor.city) {
    if (donor.city.toLowerCase() === request.city.toLowerCase()) {
      score += 15
      reasons.push("Same city")
      if (request.area && donor.area && donor.area.toLowerCase() === request.area.toLowerCase()) {
        score += 5
        reasons.push("Same area")
      }
    }
  }

  return { eligible: true, score: Math.min(100, score), reasons }
}

// Score a blood request against a donor (donor-side "AI match").
function scoreRequestForDonor(request, donor) {
  if (!donor.bloodGroup) {
    return { eligible: false, reason: "Complete your donor profile to see matches" }
  }
  if (!canDonateTo(donor.bloodGroup, request.bloodGroup)) {
    return { eligible: false, reason: `Request is for ${request.bloodGroup}, your ${donor.bloodGroup} does not match` }
  }
  if (!donor.availableForDonation) {
    return { eligible: false, reason: "You are marked unavailable for donation" }
  }

  const reasons = []
  let score = 0

  score += 40
  reasons.push("Your blood group can help")

  if (request.urgency === "emergency") {
    score += 20
    reasons.push("Emergency request")
    if (donor.availableForEmergencies) {
      score += 10
      reasons.push("You're available for emergencies")
    }
  }

  if (request.city && donor.city && donor.city.toLowerCase() === request.city.toLowerCase()) {
    score += 25
    reasons.push("Same city")
  }

  return { eligible: true, score: Math.min(100, score), reasons }
}

module.exports = { COMPATIBILITY, canDonateTo, isEligible, haversineKm, scoreDonorForRequest, scoreRequestForDonor }
