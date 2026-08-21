// AURA conversation endpoint. Uses Google Gemini (free tier) for real
// conversational Q&A, multi-turn context and multilingual replies. When no
// GEMINI_API_KEY is configured (or the call fails) it returns a "rule"
// fallback so the frontend can use its built-in knowledge base — the app
// never breaks without a key.

const zlib = require("zlib")
const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.js")

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || "").trim()
const GEMINI_MODEL = (process.env.GEMINI_MODEL || "gemini-2.5-flash-lite").trim()
// File extraction must use a multimodal-capable model (can read PDFs/images/OCR).
// flash-lite is text-only, so it cannot read an uploaded PDF or image. Defaults
// to the main GEMINI_MODEL (the one your key actually supports) unless
// GEMINI_EXTRACT_MODEL is explicitly set.
const GEMINI_EXTRACT_MODEL = (
  process.env.GEMINI_EXTRACT_MODEL || GEMINI_MODEL
).trim()
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models"

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

const SYSTEM_PROMPT = (role) => {
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

Always reply in clear, warm and concise English (2-5 short sentences).

${roleFocus}

${APP_KNOWLEDGE}

Only the patient side can create a blood request. A blood request is created by
uploading a file (a prescription, hospital note, or lab report — PDF, image, or
text) which is automatically read to pre-fill the New Blood Request form. There
is no step-by-step form wizard in the chat. If the user is a PATIENT and wants
to create/post a blood request, tell them to upload the file using the
paperclip button, and set "action" to "navigate" with "actionValue" set to
"/request-blood". If the user is a donor or guest and asks to create a blood
request, do NOT navigate or start any wizard; instead tell them blood requests
are created on the patient side.

Return a JSON object with exactly these keys:
{
  "reply": "your answer text in English",
  "suggestions": ["up to 3 short follow-up suggestions in English"],
  "action": "" | "navigate",
  "actionValue": ""
}
Leave action and actionValue empty strings unless you must navigate. Keep
suggestions short and natural.
`.trim()
}

// Map an existing chat message (from: 'user'|'bot') to a Gemini content role.
function toGeminiMessage(m) {
  const role = m && m.from === "bot" ? "model" : "user"
  return { role, parts: [{ text: String(m.text ?? "") }] }
}

// Build the request body for Gemini. `history` is an array of the last N
// messages so the model has multi-turn context.
function buildBody(message, history, profile) {
  const historyContents = (history || []).slice(-14).map(toGeminiMessage)
  const userParts = []
  if (profile) {
    userParts.push({
      text: `User context: role=${profile.role || "guest"}, bloodGroup=${profile.bloodGroup || "unknown"}. `,
    })
  }
  userParts.push({ text: message })

  return {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT(profile?.role) }] },
    contents: [...historyContents, { role: "user", parts: userParts }],
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 700,
      responseMimeType: "application/json",
    },
  }
}

/* ------------------------------------------------------------------ *
 *  File upload -> extract -> pre-fill
 *  Accepts ANY file type (PDF, image, text, docx, csv, …). When a Gemini
 *  key is present the file bytes are sent inline to Gemini (which can read
 *  PDFs, images/OCR and text). Otherwise we fall back to a local text
 *  extraction heuristic so the feature still works without a key.
 * ------------------------------------------------------------------ */

const EXTRACT_SYSTEM = `
You are a medical intake data extractor for a blood donation platform. Read the
attached file (a blood request, prescription, hospital note, lab report,
discharge summary, email, or similar) and extract these fields:

- patientName: the patient's full name
- phone: a contact phone number (keep digits and a leading +)
- bloodGroup: like O+, A-, B+, AB+ (normalize to this exact format)
- units: the number of units of blood needed (an integer)
- hospital: the hospital / clinic name
- location: the hospital address, area & city
- urgency: exactly "emergency" or "normal"
- notes: any extra relevant detail (diagnosis, reason for transfusion, instructions)

Return ONLY a JSON object with exactly these keys: patientName, phone,
bloodGroup, units, hospital, location, urgency, notes.
Use an empty string "" for any field you cannot determine. urgency must be
exactly "emergency" or "normal" (default "normal"). units must be a number
(default 1). If the file is unreadable or irrelevant, return all fields empty.
`.trim()

const BLOOD_GROUP_RE = /(A|B|AB|O)\s*([+\u2212\-]|positive|negative|plus|minus)/i

function detectBloodGroup(text) {
  const m = String(text || "").match(BLOOD_GROUP_RE)
  if (!m) return ""
  const letter = m[1].toUpperCase()
  const sign = /(positive|plus)|\u2212/i.test(m[2])
    ? "+"
    : /(negative|minus)/i.test(m[2])
    ? "-"
    : m[2] === "+"
    ? "+"
    : m[2] === "-" || m[2] === "\u2212"
    ? "-"
    : ""
  return `${letter}${sign}`
}

// A .docx file is a ZIP archive whose visible text lives in
// `word/document.xml`. Gemini's inline_data cannot read DOCX, so we decompress
// that entry locally and return its plain text. Minimal ZIP reader using only
// the built-in zlib (no external dependency). Returns "" if it cannot parse.
function extractDocxText(base64) {
  try {
    const buf = Buffer.from(String(base64 || ""), "base64")

    // Locate the End Of Central Directory record (signature 0x06054b50).
    let eocd = -1
    for (let i = buf.length - 22; i >= 0; i--) {
      if (buf.readUInt32LE(i) === 0x06054b50) {
        eocd = i
        break
      }
    }
    if (eocd < 0) return ""

    const cdOffset = buf.readUInt32LE(eocd + 16)
    const cdSize = buf.readUInt32LE(eocd + 12)
    let ptr = cdOffset
    const end = cdOffset + cdSize
    let xml = null

    while (ptr < end && ptr + 46 <= buf.length) {
      if (buf.readUInt32LE(ptr) !== 0x02014b50) break // central directory header
      const method = buf.readUInt16LE(ptr + 10)
      const compSize = buf.readUInt32LE(ptr + 20)
      const nameLen = buf.readUInt16LE(ptr + 28)
      const extraLen = buf.readUInt16LE(ptr + 30)
      const commentLen = buf.readUInt16LE(ptr + 32)
      const localOffset = buf.readUInt32LE(ptr + 42)
      const name = buf.slice(ptr + 46, ptr + 46 + nameLen).toString("utf8")

      if (name === "word/document.xml") {
        const lNameLen = buf.readUInt16LE(localOffset + 26)
        const lExtraLen = buf.readUInt16LE(localOffset + 28)
        const dataStart = localOffset + 30 + lNameLen + lExtraLen
        const comp = buf.slice(dataStart, dataStart + compSize)
        let data = comp
        if (method !== 0) {
          try {
            data = zlib.inflateRawSync(comp)
          } catch {
            data = null
          }
        }
        xml = data ? data.toString("utf8") : ""
        break
      }
      ptr += 46 + nameLen + extraLen + commentLen
    }

    if (!xml) return ""

    // Turn paragraph/table-cell/tab/break markup into readable text, strip the
    // remaining XML tags, then unescape the common entities.
    return xml
      .replace(/<w:tab[^>]*\/>/g, "\t")
      .replace(/<w:br[^>]*\/>/g, "\n")
      .replace(/<\/w:p[^>]*>/g, "\n")
      .replace(/<\/w:tc[^>]*>/g, "\t")
      .replace(/<[^>]+>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  } catch (err) {
    console.error("[AURA docx] parse error:", err.message)
    return ""
  }
}

// Extract readable text from a PDF so the rules/Gemini get real words instead
// of binary garbage (PDFs can't be decoded as UTF-8). Uses pdfjs-dist directly
// with a fresh document per call (disableWorker) so parsing is stateless —
// pdf-parse@1.1.1 leaks shared parser state and silently fails after other
// work runs, which is why PDFs intermittently fell back to garbage.
//
// Unlike DOCX (which always stores spaces/newlines in its XML), PDFs frequently
// split text into many tiny glyph/word fragments, and pdf.js's getTextContent
// concatenates them verbatim — words like "City Care Medical Center" collapse
// into "CityCareMedicalCenter" so the extraction regexes can't match. We keep
// pdf.js's reliable `hasEOL` line markers and reinsert spaces from horizontal
// gaps between fragments, which makes normal PDFs extract as accurately as
// DOCX files.
function extractPdfText(base64) {
  return (async () => {
    try {
      const buf = Buffer.from(String(base64 || ""), "base64")
      const doc = await pdfjsLib
        .getDocument({ data: new Uint8Array(buf), disableWorker: true })
        .promise
      let text = ""
      for (let i = 1; i <= doc.numPages; i++) {
        try {
          const page = await doc.getPage(i)
          const content = await page.getTextContent()
          text += rebuildPageText(content.items)
          page.cleanup()
        } catch (err) {
          // A single bad page shouldn't discard text extracted from the rest.
          console.error("[AURA pdf] page", i, "parse error:", err.message)
        }
      }
      await doc.destroy()
      return text.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim()
    } catch (err) {
      console.error("[AURA pdf] parse error:", err.message)
      return ""
    }
  })()
}

// Reconstruct readable text from pdf.js text items. pdf.js marks the end of
// each line with `hasEOL`, but it drops the literal spaces between words, so
// words like "City Care Medical Center" can collapse into "CityCareMedicalCenter".
// We keep `hasEOL` for line breaks (reliable) and additionally inject a space
// whenever two fragments on the same line are separated by a horizontal gap
// (i.e. the current X starts past where the previous fragment ended). Fragments
// that already carry a space are preserved as-is and never doubled up.
function rebuildPageText(items) {
  let out = ""
  let lastX = null
  let lastWidth = 0
  let lastWasSpace = false

  for (const item of items) {
    const str = String(item.str || "")
    const isSpace = !str || /^\s+$/.test(str)
    const x = item.transform ? item.transform[4] : lastX
    const width = typeof item.width === "number" ? item.width : 0

    if (isSpace) {
      if (!lastWasSpace) out += " "
    } else if (lastX != null && !lastWasSpace && x > lastX + lastWidth + 0.5) {
      // Horizontal gap between words that the PDF encoded without a space char.
      out += " " + str
    } else {
      out += str
    }

    lastWasSpace = isSpace
    if (!isSpace) {
      lastX = x + width
      lastWidth = width
    } else {
      lastX = (typeof x === "number" ? x : lastX) + width
      lastWidth = width
    }

    if (item.hasEOL) {
      out = out.replace(/[ \t]+$/, "") + "\n"
      lastX = null
      lastWidth = 0
      lastWasSpace = false
    }
  }
  return out + "\n"
}

// Heuristic extraction used when no Gemini key is configured. Works best on
// plain-text files but can also grab common fields out of raw OCR/text dumps.
// `textOverride` lets callers pass already-decoded text (e.g. from a docx) so
// the rules run against real words instead of binary garbage.
function extractByRules(base64, textOverride) {
  const buf = Buffer.from(String(base64 || ""), "base64")
  // Strip null bytes / common binary garbage so text regexes stay useful.
  const raw = buf.toString("utf8").replace(/\\0/g, "")
  const text =
    textOverride && textOverride.trim() ? textOverride.replace(/\0/g, "") : raw

  const fields = {
    patientName: "",
    phone: "",
    bloodGroup: "",
    units: "",
    hospital: "",
    location: "",
    urgency: "",
    notes: "",
  }

  const grab = (patterns) => {
    for (const p of patterns) {
      const m = text.match(p)
      if (m && m[1] && m[1].trim()) return m[1].trim()
    }
    return ""
  }

  fields.phone =
    grab([
      /(?:phone|tel|mobile|contact|call|contact no)[:\-\s]*([+\d][\d \-()]{6,}\d)/i,
      /([+]?\d[\d \-()]{7,}\d)/,
    ]) || ""
  // Strip spaces/dashes so it looks like a phone number.
  fields.phone = fields.phone.replace(/[ \-()]/g, "")

  fields.bloodGroup = detectBloodGroup(text)

  // Units: "2 units", "units of blood needed: 2", "units: 2", "2 bags/pints",
  // "transfuse 2 units". Prefer an explicit label first, then any "N units".
  fields.units =
    grab([
      /(?:units? of blood needed|units? needed|units? of blood|blood units?|units?|bags|pints)[:\-\s]*([\d]+)/i,
      /(?:transfuse|required|need)[:\-\s]*([\d]+)\s*units?/i,
      /([\d]+)\s*(?:units?|bags|pints)\b/i,
      /([\d]+)\s*units?\b/i,
    ]) || ""

  // Patient name — via an explicit label (with or without a colon/space, e.g.
  // "Patient Name: Rahul" or the table-layout "Patient NameRahul Sharma"), or
  // an honorific. Kept label-scoped so it never snatches a random capitalized
  // word from mid-sentence.
  fields.patientName =
    grab([
      /patient['\u2019s]*\s*name\s*[:=\-\s]*([A-Z][A-Za-z .'\-]{2,})/i,
      /(?:name\s*of\s*patient|patient)\s*[:=\-\s]*([A-Za-z][A-Za-z .'\-]{2,})/im,
      /\b(?:Mr|Mrs|Ms|Miss|Dr)\.?\s+([A-Z][A-Za-z.'\-]+(?: [A-Z][A-Za-z.'\-]+){0,3})/i,
    ]) || ""

  // Hospital — explicit label (colon or table-layout "HospitalCity Care…" but
  // NOT "Hospital Address"), then capitalized words that precede a trailing
  // "Hospital"/"Hospitals" (e.g. "City Care Medical Center Hospital").
  fields.hospital =
    grab([
      /\b(?:hospital|clinic|medical center|medical centre|nursing home)\s*[:=\-]\s*([A-Za-z0-9][A-Za-z0-9 .&\'\-]{2,})/i,
      /\bHospital\s*(?![Aa]ddress|Note\b)([A-Z][A-Za-z0-9 .&\'\-]+(?: [A-Z][A-Za-z0-9 .&\'\-]+)+)/i,
      /\bClinic\s*(?![Aa]ddress)([A-Z][A-Za-z0-9 .&\'\-]{2,})/i,
      /([A-Z][A-Za-z0-9.'&\-]+(?: [A-Z][A-Za-z0-9.'&\-]+){0,4})\s+Hospitals?\b/i,
      /\bHospital:\s*([A-Za-z0-9][A-Za-z0-9 .&\'\-]{2,})/i,
    ]) || ""

  // Location — label-based, else an address containing a 6-digit PIN, else any
  // address-ish span (commas + digits).
  fields.location = grab([
    /(?:location|address|hospital address|address of hospital)\s*[:=\-]?\s*([A-Za-z0-9][A-Za-z0-9 ,.\-]{6,})/i,
    /([A-Za-z0-9][A-Za-z0-9 ,.\-]{4,}\s*\b\d{6}\b[A-Za-z0-9 ,.\-]{0,30})/i,
    /\bAddress:\s*([A-Za-z0-9][A-Za-z0-9 ,.\-]{6,})/i,
  ])

  // Urgency — emergency keywords override, else if the file clearly describes a
  // need mark it normal so the prefill defaults sensibly.
  fields.urgency = /emergency|urgent|critical|sos|immediate|asap/i.test(text)
    ? "emergency"
    : /request|transfuse|need|required|blood/i.test(text)
    ? "normal"
    : ""

  fields.notes = grab([
    /(?:\bnotes?\s*:|\breason\s*:|\bdiagnosis\s*:|\bindication\s*:|\binstructions\s*:)\s*([A-Za-z0-9][\s\S]{0,200}?)(?:\n\s*\n|$)/i,
    /\bnotes?\s*\n\s*([A-Za-z0-9][\s\S]{0,600})/i,
  ])

  return { source: "rule", fields, text: text.slice(0, 4000) }
}

// POST /api/chat/extract - read an uploaded file and pull out request fields.
// Body: { fileName, mimeType, base64 }
async function extract(req, res) {
  try {
    const fileName = String(req.body?.fileName || "").trim()
    const mimeType = String(req.body?.mimeType || "application/octet-stream").trim()
    const base64 = String(req.body?.base64 || "").trim()

    if (!base64) {
      return res.status(400).json({ message: "A file is required" })
    }

    // Text-ish types are cheap to decode and are the most reliable when Gemini
    // is unavailable. Everything else (PDF, images, …) is passed to Gemini as
    // inline base64 so its multimodal model can read it (OCR, etc.). DOCX is a
    // ZIP that Gemini can't read inline, so we decompress its text locally and
    // treat it as plain text.
    let isText =
      mimeType.startsWith("text/") ||
      /json|csv|xml|yaml|markdown/i.test(mimeType)

    let plainText = null
    if (/wordprocessingml/i.test(mimeType) || /\.docx$/i.test(fileName)) {
      plainText = extractDocxText(base64)
      if (plainText) isText = true
    } else if (/pdf/i.test(mimeType) || /\.pdf$/i.test(fileName)) {
      plainText = await extractPdfText(base64)
      if (plainText) isText = true
    }

    if (!GEMINI_API_KEY) {
      return res.json(extractByRules(base64, plainText))
    }

    try {
      const url = `${GEMINI_URL}/${GEMINI_EXTRACT_MODEL}:generateContent?key=${GEMINI_API_KEY}`

      let userParts
      if (isText) {
        const decoded = plainText || Buffer.from(base64, "base64").toString("utf8")
        userParts = [
          {
            text:
              "Attached file: " +
              (fileName || "uploaded document") +
              "\n\n" +
              decoded.slice(0, 50000),
          },
        ]
      } else {
        userParts = [
          {
            inline_data: {
              mime_type: mimeType,
              data: base64,
            },
          },
        ]
      }

      const response = await geminiFetch(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: EXTRACT_SYSTEM }] },
            contents: [{ role: "user", parts: userParts }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 700,
              responseMimeType: "application/json",
            },
          }),
        },
        30000
      )

      if (!response.ok) {
        const detail = await response.text().catch(() => "")
        console.error("[AURA Extract] HTTP", response.status, detail.slice(0, 200))
        return res.json(extractByRules(base64, plainText))
      }

      const data = await response.json()
      const text =
        data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") ||
        ""
      let parsed = null
      try {
        parsed = JSON.parse(text)
      } catch {
        const m = text.match(/\{[\s\S]*?\}/)
        if (m) {
          try {
            parsed = JSON.parse(m[0])
          } catch {}
        }
      }
      if (!parsed || typeof parsed !== "object") {
        return res.json(extractByRules(base64, plainText))
      }

      const ruleFields = extractByRules(base64, plainText).fields
      const fields = {
        patientName:
          String(parsed.patientName || "").trim() || ruleFields.patientName,
        phone: String(parsed.phone || "").trim() || ruleFields.phone,
        bloodGroup:
          detectBloodGroup(parsed.bloodGroup || "") ||
          String(parsed.bloodGroup || "").trim() ||
          ruleFields.bloodGroup,
        units:
          (Number(parsed.units) > 0 ? String(Number(parsed.units)) : "") ||
          ruleFields.units,
        hospital:
          String(parsed.hospital || "").trim() || ruleFields.hospital,
        location:
          String(parsed.location || "").trim() || ruleFields.location,
        urgency: /emergency|urgent|critical/i.test(parsed.urgency || "")
          ? "emergency"
          : "normal",
        notes: String(parsed.notes || "").trim() || ruleFields.notes,
      }
      return res.json({ source: "gemini", fields, text: text.slice(0, 4000) })
    } catch (err) {
      console.error("[AURA Extract] network error:", err.message)
      return res.json(extractByRules(base64, plainText))
    }
  } catch (err) {
    res.status(500).json({ message: err.message })
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

// Fetch from Gemini, retrying once on rate-limit (429) or server errors so
// free-tier throttling doesn't silently drop the reply into the rule fallback.
async function geminiFetch(url, options, timeoutMs = 8000) {
  let lastResponse = null
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const response = await fetch(url, { ...options, signal: ctrl.signal })
      if (response.ok) return response
      lastResponse = response
      const retriable = response.status === 429 || response.status >= 500
      if (!retriable || attempt === 1) return response
      await new Promise((r) => setTimeout(r, 1500))
    } catch (err) {
      if (attempt === 1) throw err
      await new Promise((r) => setTimeout(r, 1000))
    } finally {
      clearTimeout(timer)
    }
  }
  return lastResponse
}

// POST /api/chat - get an AURA reply.
// Body: { message, history, profile }
async function chat(req, res) {
  try {
    const message = String(req.body?.message || "").trim()
    if (!message) return res.status(400).json({ message: "A message is required" })

    const history = Array.isArray(req.body?.history) ? req.body.history : []
    const profile = req.body?.profile || null

    // No API key -> signal the frontend to use its built-in rule-based KB.
    if (!GEMINI_API_KEY) {
      return res.json({ source: "rule", reply: null })
    }

    try {
      const url = `${GEMINI_URL}/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`
      const response = await geminiFetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(message, history, profile)),
      })

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

// POST /api/chat/eligibility - personalized "Can I donate?" using the logged-in
// donor's own profile (blood group, last donation date, availability, health
// flags) and the 2-month rule. Returns a clear yes/no with reasons.
async function eligibility(req, res) {
  try {
    const user = req.user
    if (!user) return res.status(401).json({ message: "Not authorized" })

    const now = Date.now()
    const TWO_MONTHS = 2 * 30 * 24 * 60 * 60 * 1000
    const nextEligible = user.lastDonationDate
      ? new Date(new Date(user.lastDonationDate).getTime() + TWO_MONTHS)
      : null
    const eligibleByGap = !user.lastDonationDate || now >= nextEligible.getTime()
    const daysUntil = nextEligible
      ? Math.ceil((nextEligible.getTime() - now) / (24 * 60 * 60 * 1000))
      : 0

    const blockers = []
    const notes = []

    if (user.role !== "donor") {
      blockers.push("You are registered as a patient, not a donor.")
    }
    if (!user.verified) {
      blockers.push("Your account is not verified yet.")
    }
    if (!user.bloodGroup) {
      blockers.push("You have not set your blood group. Complete your donor profile.")
    }
    if (!eligibleByGap) {
      blockers.push(
        `You donated on ${new Date(user.lastDonationDate).toLocaleDateString()} — you can donate again after ${nextEligible.toLocaleDateString()} (${daysUntil} day${
          daysUntil === 1 ? "" : "s"
        } remaining).`
      )
    }
    if (!user.availableForDonation) {
      notes.push("You are currently marked unavailable for donation.")
    }

    const flags = Array.isArray(user.healthFlags) ? user.healthFlags.filter(Boolean) : []
    if (flags.length) {
      blockers.push(
        `Health flag(s) on record: ${flags.join(", ")}. Please consult a doctor to confirm you can donate.`
      )
    }

    const canDonate = blockers.length === 0

    return res.json({
      canDonate,
      donorName: user.name || "Donor",
      bloodGroup: user.bloodGroup || "",
      lastDonationDate: user.lastDonationDate || null,
      nextEligibleDate: nextEligible ? nextEligible.toISOString() : null,
      verified: !!user.verified,
      availableForDonation: !!user.availableForDonation,
      availableForEmergencies: !!user.availableForEmergencies,
      healthFlags: flags,
      blockers,
      notes,
      summary: canDonate
        ? "Great news — you are eligible to donate right now! "
        : "You are not currently eligible to donate.",
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = { chat, extract, eligibility }
