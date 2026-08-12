// Real SMS via MSG91 (free tier: https://control.msg91.com).
// Needs MSG91_AUTH_KEY and MSG91_SENDER_ID in backend/.env.
// Uses the transactional route (route=4). Message text is sent as-is, so no
// DLT template ID is required for testing; production India numbers may need
// a registered DLT template.

function toE164(mobile) {
  const digits = (mobile || "").replace(/[^\d+]/g, "")
  if (!digits) return ""
  if (digits.startsWith("+")) return digits
  if (digits.length === 10) return `+91${digits}`
  return `+${digits}`
}

const sendSms = async ({ to, text }) => {
  const number = toE164(to)
  if (!number) {
    console.error("sendSms failed: no mobile number")
    return { delivered: false, reason: "no-number" }
  }

  const authkey = process.env.MSG91_AUTH_KEY
  const sender = process.env.MSG91_SENDER_ID
  if (!authkey || !sender) {
    console.error(
      "[MSG91] MSG91_AUTH_KEY / MSG91_SENDER_ID not set in backend/.env — SMS not sent to " +
        number
    )
    return { delivered: false, reason: "not-configured" }
  }

  const url = `https://api.msg91.com/api/sendhttp.php?authkey=${encodeURIComponent(
    authkey
  )}&mobiles=${encodeURIComponent(number.replace("+", ""))}&message=${encodeURIComponent(
    text
  )}&sender=${encodeURIComponent(sender)}&route=4&country=0`

  try {
    const res = await fetch(url)
    const body = await res.text()
    if (!res.ok || body.startsWith("ERROR")) {
      console.error("[MSG91] SMS failed:", res.status, body)
      return { delivered: false, reason: "provider-error", detail: body }
    }
    console.log(`[MSG91] SMS sent to ${number}`)
    return { delivered: true }
  } catch (error) {
    console.error("[MSG91] SMS error:", error.message)
    return { delivered: false, reason: "network-error", detail: error.message }
  }
}

module.exports = { sendSms }
