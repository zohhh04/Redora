// AURA conversation endpoint. Uses Google Gemini (free tier) for real
// conversational Q&A, multi-turn context and multilingual replies. When no
// GEMINI_API_KEY is configured (or the call fails) it returns a "rule"
// fallback so the frontend can use its built-in knowledge base — the app
// never breaks without a key.

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim()
const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim()
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models"

// Language names used in the system prompt so Gemini answers in the right one.
const LANG_NAMES = {
  en: "English",
  hi: "Hindi",
  ta: "Tamil",
  te: "Telugu",
  bn: "Bengali",
  mr: "Marathi",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  or: "Odia",
  pa: "Punjabi",
  ur: "Urdu",
}

// Facts about Redora that ground the assistant so it never invents features.
const APP_KNOWLEDGE = `
Redora is a real-time blood donation platform connecting donors, patients,
hospitals and blood banks.

Features:
- Register/login as Donor or Patient with email OTP verification.
- Patients post blood requests with blood group, units, hospital, and location.
- Donors see matching requests ranked by an AI match score (blood compatibility,
  distance/ETA, eligibility, availability, donation history).
- Live journey tracking: Matched -> Ready -> Traveling -> Arrived -> Donating ->
  Completed, with a real-time map of the donor's location.
- Donation certificates with a unique verification code after completion.
- SOS emergency alerts notify the nearest eligible, compatible donor.
- In-app messaging and calls between matched patient and donor.
- Search / nearby donors by blood group and location.
- Community feed, leaderboard, blood bank appointments, notifications.
- Eligibility rule: ~2 month gap between donations; must be 18-60, 45kg+, healthy.
- Blood compatibility: O- is universal donor, AB+ is universal recipient.
`.trim()

const SYSTEM_PROMPT = (lang, role) => {
  const roleLabel =
    role === "patient"
      ? "a PATIENT (someone who needs blood and posts requests to find donors)"
      : role === "donor"
      ? "a DONOR (someone who gives blood and responds to patient requests)"
      : "a guest (not logged in)"

  const roleFocus =
    role === "patient"
      ? `Focus on the PATIENT experience: creating blood requests, finding and
matching with donors, tracking the donor's live journey, nearby donors, SOS /
emergency alerts, and requests. Do NOT answer donor-only topics such as donation
eligibility checks, donation certificates, donor leaderboards, or donor
appointments — those are for the donor side.`
      : role === "donor"
      ? `Focus on the DONOR experience: how to donate, eligibility, blood group
compatibility, accepting matching requests, live tracking, certificates,
appointments, blood banks, and the leaderboard. Do NOT answer patient-only
topics such as creating blood requests or SOS requests — those are for the
patient side.`
      : `Answer general questions about the platform. If the user wants to create
a blood request, let them know they must log in as a patient first.`

  return `
You are AURA, the helpful AI assistant for the Redora blood donation platform.

The current user is logged in as: ${roleLabel}.

You must ALWAYS reply in ${LANG_NAMES[lang] || "English"} (the user's chosen
language). Keep answers clear, warm and concise (2-5 short sentences).

${roleFocus}

${APP_KNOWLEDGE}

Only the patient side can create a blood request. If the user is a PATIENT and
clearly wants to create/post a new blood request, set the "action" field to
"start-wizard" so the app can guide them through the steps. If the user is a
donor or guest and asks to create a blood request, do NOT start the wizard;
instead tell them blood requests are created on the patient side.

Return a JSON object with exactly these keys:
{
  "reply": "your answer text in the user's language",
  "suggestions": ["up to 3 short follow-up suggestions in the user's language"],
  "action": "" | "start-wizard" | "navigate",
  "actionValue": ""
}
Leave action and actionValue empty strings unless you must trigger the request
wizard or navigate. Keep suggestions short and natural.
`.trim()
}

// Map an existing chat message (from: 'user'|'bot') to a Gemini content role.
function toGeminiMessage(m) {
  const role = m && m.from === "bot" ? "model" : "user"
  return { role, parts: [{ text: String(m.text ?? "") }] }
}

// Build the request body for Gemini. `history` is an array of the last N
// messages so the model has multi-turn context.
function buildBody(message, history, lang, profile) {
  const historyContents = (history || []).slice(-14).map(toGeminiMessage)
  const userParts = []
  if (profile) {
    userParts.push({
      text: `User context: role=${profile.role || "guest"}, bloodGroup=${profile.bloodGroup || "unknown"}. `,
    })
  }
  userParts.push({ text: message })

  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT(lang, profile?.role) }] },
    contents: [...historyContents, { role: "user", parts: userParts }],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 700,
      responseMimeType: "application/json",
    },
  }
}

// Parse Gemini's JSON reply defensively. Returns { reply, suggestions, action,
// actionValue } or null if the shape is unusable.
function parseGeminiReply(raw) {
  let parsed = null
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== "object") return null
  const reply = String(parsed.reply || "").trim()
  if (!reply) return null
  const suggestions = Array.isArray(parsed.suggestions)
    ? parsed.suggestions.map((s) => String(s).trim()).filter(Boolean).slice(0, 3)
    : []
  return {
    reply,
    suggestions,
    action: String(parsed.action || "").trim(),
    actionValue: String(parsed.actionValue || "").trim(),
  }
}

// POST /api/chat - get an AURA reply.
// Body: { message, history, lang, profile }
async function chat(req, res) {
  try {
    const message = String(req.body?.message || "").trim()
    if (!message) return res.status(400).json({ message: "A message is required" })

    const lang = String(req.body?.lang || "en").slice(0, 2)
    const history = Array.isArray(req.body?.history) ? req.body.history : []
    const profile = req.body?.profile || null

    // No API key -> signal the frontend to use its built-in rule-based KB.
    if (!GEMINI_API_KEY) {
      return res.json({ source: "rule", reply: null })
    }

    try {
      const url = `${GEMINI_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 20000)
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(message, history, lang, profile)),
        signal: ctrl.signal,
      })
      clearTimeout(timer)

      if (!response.ok) {
        const detail = await response.text().catch(() => "")
        console.error("[AURA Gemini] HTTP", response.status, detail.slice(0, 200))
        return res.json({ source: "rule", reply: null })
      }

      const data = await response.json()
      const text =
        data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ||
        ""
      const parsed = parseGeminiReply(text)
      if (!parsed) return res.json({ source: "rule", reply: null })

      return res.json({ source: "gemini", ...parsed })
    } catch (err) {
      console.error("[AURA Gemini] network error:", err.message)
      return res.json({ source: "rule", reply: null })
    }
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { chat }
