// AI-generated, multilingual donation certificate narratives. Uses Google
// Gemini (free tier) to write a warm, personalized paragraph for each donor.
// The certificate verification CODE is always server-generated and untouched
// by the LLM — the AI only writes the appreciation text. When no GEMINI_API_KEY
// is configured (or the call fails) the caller falls back to a template line,
// so the certificate never breaks.

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim()
const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim()
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models"

// Language names used in the prompt so Gemini writes in the right language.
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
}

function buildPrompt(data, lang) {
  const date = data.date ? new Date(data.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }) : "this date"

  return `You write a heartfelt donation certificate narrative for the Redora
blood donation platform.

Donor name: ${data.donorName || "the donor"}
Blood group donated: ${data.bloodGroup || "—"}
Units: ${data.units || 1}
Hospital: ${data.hospital || "the hospital"}
Patient helped: ${data.patientName || "a patient in need"}
Donation date: ${date}
Lifetime donations (this donor): ${data.donationCount || 0}

Write ONE warm, sincere paragraph (2-3 sentences, no markdown, no newlines) that
personally thanks the donor and highlights their generosity and lifesaving act.
Do not fabricate medical facts. Mention the hospital and blood group naturally.

Respond ONLY with a JSON object: {"narrative": "your paragraph"}

Write the narrative in ${LANG_NAMES[lang] || "English"}.`
}

// Returns { narrative } or null if unavailable (no key / failure / bad shape).
async function generateNarrative(data, lang) {
  if (!GEMINI_API_KEY) return null

  try {
    const url = `${GEMINI_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 20000)
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: "You write short, warm donation certificate narratives." }],
        },
        contents: [{ role: "user", parts: [{ text: buildPrompt(data, lang) }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 200,
          responseMimeType: "application/json",
        },
      }),
      signal: ctrl.signal,
    })
    clearTimeout(timer)

    if (!response.ok) return null
    const body = await response.json()
    const text =
      body?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || ""

    let parsed = null
    try {
      parsed = typeof text === "string" ? JSON.parse(text) : text
    } catch {
      return null
    }
    const narrative = String(parsed?.narrative || "").trim()
    return narrative ? { narrative } : null
  } catch (err) {
    console.error("[AURA certificate] narrative error:", err.message)
    return null
  }
}

module.exports = { generateNarrative }