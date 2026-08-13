// Real SMS via MSG91 (free trial credits: https://control.msg91.com).
// Needs MSG91_AUTH_KEY and MSG91_SENDER_ID in backend/.env.
// For Indian (+91) numbers, TRAI requires DLT approval — also set
// MSG91_DLT_TEMPLATE_ID and MSG91_PE_ID once the template is approved.

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

  // DLT IDs (TRAI requirement for Indian numbers). Optional — appended only
  // when MSG91_DLT_TEMPLATE_ID / MSG91_PE_ID are set in backend/.env.
  const templateId = process.env.MSG91_DLT_TEMPLATE_ID
  const peId = process.env.MSG91_PE_ID
  const dltParams =
    templateId && peId ? `&DLT_TE_ID=${encodeURIComponent(templateId)}&PE_ID=${encodeURIComponent(peId)}` : ""

  const url = `https://api.msg91.com/api/sendhttp.php?authkey=${encodeURIComponent(
    authkey
  )}&mobiles=${encodeURIComponent(number.replace("+", ""))}&message=${encodeURIComponent(
    text
  )}&sender=${encodeURIComponent(sender)}&route=4&country=0${dltParams}`

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
