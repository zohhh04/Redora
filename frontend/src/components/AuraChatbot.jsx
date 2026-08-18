import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

// Languages AURA can speak in. Gemini answers natively in any of these; the
// browser speech synthesizer voices the reply. 'voice' is the BCP-47 tag used
// to pick a matching TTS voice where available.
const LANGS = [
  { code: 'en', label: 'English', voice: 'en' },
  { code: 'hi', label: 'हिन्दी (Hindi)', voice: 'hi' },
  { code: 'ta', label: 'தமிழ் (Tamil)', voice: 'ta' },
  { code: 'te', label: 'తెలుగు (Telugu)', voice: 'te' },
  { code: 'bn', label: 'বাংলা (Bengali)', voice: 'bn' },
  { code: 'mr', label: 'मराठी (Marathi)', voice: 'mr' },
  { code: 'gu', label: 'ગુજરાતી (Gujarati)', voice: 'gu' },
  { code: 'kn', label: 'ಕನ್ನಡ (Kannada)', voice: 'kn' },
  { code: 'ml', label: 'മലയാളം (Malayalam)', voice: 'ml' },
]

/* ------------------------------------------------------------------ *
 *  Knowledge base — AURA answers questions about the Redora project.
 *  `role` restricts each answer to a side: 'donor', 'patient', or 'both'.
 * ------------------------------------------------------------------ */
const KB = [
  {
    role: 'both',
    keys: ['hi', 'hello', 'hey', 'namaste', 'good morning', 'good evening'],
    text: "Hi there! 👋 I'm AURA, your Redora AI assistant. I can answer questions about the platform and help you with your side of Redora. What would you like to know?",
    suggestions: ['What can you do?', 'How do I donate?', 'Am I eligible to donate?', 'Request blood', 'How does matching work?'],
  },
  {
    role: 'both',
    keys: ['what can you do', 'help', 'how do you work', 'features', 'options', 'capabilities'],
    text: "Here's what I can help with: 🔍 explain features and how the platform works · 🩸 guide you through donating · 🏥 create a blood request (patients) · ⚖️ answer eligibility questions · 🛞 explain live tracking, journeys & certificates · 🧠 explain the AI match scoring. Just ask away, or tap a suggestion below!",
    suggestions: ['How does matching work?', 'Request blood', 'Donor eligibility', 'What are certificates?'],
  },
  {
    role: 'donor',
    keys: ['donate', 'donor', 'become donor', 'how to donate', 'give blood', 'register as donor'],
    text: 'To become a donor on Redora: 1️⃣ Register & log in as a Donor. 2️⃣ Complete your profile (blood group, city, contact, location). 3️⃣ You\'ll see open blood requests near you, ranked by an AI match score. 4️⃣ Accept a request you\'re eligible for. 5️⃣ Track the journey live and earn a certificate. Would you like to know your eligibility?',
    suggestions: ['Am I eligible to donate?', 'How does matching work?', 'What is live tracking?'],
  },
  {
    role: 'donor',
    keys: ['eligible', 'eligibility', 'can i donate', 'am i allowed', 'criteria', 'when can i donate again'],
    text: 'Eligibility is checked against your last donation date — you need a 2-month gap between donations. Donors are also matched only if their blood group is compatible with the request. The system auto-checks this when you try to accept a request. For a personal check, open your Journey & Donations page — it shows your next eligible date. Most healthy adults aged 18–60 who weigh 45kg+ and are free of infection are eligible. ⚠️ Always confirm with a doctor.',
    suggestions: ['How does matching work?', 'Blood group compatibility'],
  },
  {
    role: 'both',
    keys: ['compatible', 'compatibility', 'blood group', 'which blood', 'can donate to', 'universal'],
    text: 'Universal donors: O- can donate to everyone, and O+ to all positives. Universal recipients: AB+ can receive from anyone. Redora only shows you requests you\'re compatible with, using the standard ABO & Rh rules. Say "request blood" to post a need for any group.',
    suggestions: ['Request blood', 'How does matching work?'],
  },
  {
    role: 'both',
    keys: ['matching', 'match score', 'ai match', 'ranked', 'score', 'algorithm', 'how are donors picked'],
    text: 'Redora uses an AI-style match score to rank donors for each request. It weighs: proximity (distance/ETA to the hospital), blood group compatibility, eligibility (2-month rule), availability, and donation history. The best-matching donors are listed first, and for emergencies the nearest eligible donor is alerted. The backend computes this score per request in real time.',
    suggestions: ['Request blood', 'What is live tracking?'],
  },
  {
    role: 'patient',
    keys: ['request blood', 'request', 'need blood', 'post request', 'create request', 'urgent'],
    text: 'Great — I can create your blood request right here! 🏥 I\'ll ask a few quick questions: patient name, contact number, blood group, units, hospital, location (type it or share your live location), urgency, and any notes. Then I\'ll fill the New Blood Request form with your answers so you can review and post. Ready? Say "yes" or tap "Start".',
    suggestions: ['Start', 'How does matching work?'],
    startWizard: true,
  },
  {
    role: 'both',
    keys: ['tracking', 'live tracking', 'track', 'journey', 'status', 'where is donor', 'map'],
    text: 'Once a donor accepts your request, both sides get a live journey. 🛞 You can watch the donor move on a real-time map, see their ETA, travel mode, and live location pings. The journey moves through stages: Matched → Ready → Traveling → Arrived → Donating → Completed. Track it from your Journey & Donations page or My Requests.',
    suggestions: ['What are certificates?', 'Request blood'],
  },
  {
    role: 'donor',
    keys: ['certificate', 'cert', 'proof', 'donation proof'],
    text: 'Every completed donation earns a unique 🏅 certificate with a verification code. It records the date, blood group, hospital, and patient. You can view or download it from your Journey & Donations page. It\'s your official proof of being a lifesaver!',
    suggestions: ['What is live tracking?', 'Request blood'],
  },
  {
    role: 'patient',
    keys: ['emergency', 'urgent', 'immediate', 'critical', 'sos'],
    text: '🚨 For emergencies, Redora flags the request as EMERGENCY and alerts the nearest compatible, eligible donor first — notifying them by in-app notification and email with an estimated arrival time. If they decline, it automatically falls through to the next fastest donor. To post an emergency need, say "request blood".',
    suggestions: ['Request blood', 'How does matching work?'],
  },
  {
    role: 'both',
    keys: ['notification', 'notify', 'alert', 'bell'],
    text: 'You\'ll get 🔔 real-time notifications for: new matching requests (donors), someone accepting your request (patients), journey stage updates, and messages. The bell in the top bar shows unread counts, and there\'s a dedicated Notifications page.',
    suggestions: ['What is live tracking?', 'Request blood'],
  },
  {
    role: 'both',
    keys: ['message', 'chat', 'contact donor', 'talk to', 'call'],
    text: 'Redora has built-in messaging and calling between the patient and the matched donor — no need to share personal chats elsewhere. You can send messages and even call within the tracking view.',
    suggestions: ['Request blood', 'What is live tracking?'],
  },
  {
    role: 'both',
    keys: ['password', 'login', 'sign in', 'sign up', 'register', 'forgot', 'reset', 'account'],
    text: 'Manage your account from the top bar: register, log in, and reset your password are all available. After login your session is restored securely, and you can update your profile anytime from the Profile page.',
  },
  {
    role: 'both',
    keys: ['search donor', 'find donor', 'nearby donor', 'search'],
    text: 'Use Search Donors to find verified donors by blood group and city, or Nearby Donors to see eligible donors around a location on a map with distances. Patients can pick the best-matched donor for their request.',
    suggestions: ['How does matching work?', 'Request blood'],
  },
  {
    role: 'both',
    keys: ['thank', 'thanks', 'great', 'nice'],
    text: "You're welcome! 💛 Every question answered and every request posted brings someone closer to the help they need. Is there anything else I can do for you?",
  },
  {
    role: 'both',
    keys: ['bye', 'goodbye', 'see you', 'exit', 'quit'],
    text: 'Take care! 👋 If you need me again, just say "AURA" or tap the chat bubble. Stay safe and keep saving lives.',
  },
  {
    role: 'both',
    keys: ['register', 'sign up', 'signup', 'create account', 'new account', 'how to register', 'become member'],
    text: 'Tap Register in the top bar to create an account. Choose whether you\u2019re a Donor or a Patient, add your name and phone number, and verify with the one-time password (OTP) we send you. After that, complete your profile with your blood group, city, and location. 🩸',
    suggestions: ['How do I donate?', 'Request blood', 'Am I eligible?'],
  },
  {
    role: 'patient',
    keys: ['hospital', 'verify hospital', 'is my hospital valid', 'hospital location'],
    text: 'When you post a request you enter the hospital name and its location. The app geocodes the location to place the pin accurately on the map — you can verify the hospital before posting. Make sure the area/city you type is correct so donors are matched to the right place. 🏥',
    suggestions: ['Request blood', 'How does matching work?'],
  },
  {
    role: 'both',
    keys: ['nearby donors', 'nearby donor', 'who is near me', 'closest donor', 'near me', 'nearest donor'],
    text: 'Use Search Donors to find verified donors by blood group and city, or Nearby Donors to see eligible donors around a location on a map with distances. The closest eligible and compatible donors are listed first, with their distance in kilometres. 📍',
    suggestions: ['How does matching work?', 'Request blood', 'Am I eligible?'],
  },
  {
    role: 'patient',
    keys: ['sos', 'emergency help', 'urgent blood', 'critical patient', 'emergency request'],
    text: 'For an emergency, mark your request as Emergency when posting. Redora alerts the nearest eligible, compatible donor first via in-app notification and email, then automatically falls through to the next fastest donor if they decline. 🚨 Say "Request blood" to start.',
    suggestions: ['Request blood', 'How does matching work?'],
  },
  {
    role: 'both',
    keys: ['community', 'feed', 'social', 'share post', 'post update', 'appreciate'],
    text: 'The Community Feed is a wall where verified members share updates — Posts, blood Needs, Success stories, and Thanks. You can react with a like. It helps spread urgent needs, celebrate lifesavers, and build a supportive network. 🤝',
    suggestions: ['How does matching work?', 'Request blood'],
  },
  {
    role: 'donor',
    keys: ['leaderboard', 'top donor', 'ranking', 'rank', 'who donated most'],
    text: 'The Leaderboard ranks donors who have actually given blood by their donation count — with a podium for the top 3 and a chart showing donations by blood group. Donate regularly to climb the ranks! 🏆',
    suggestions: ['How do I donate?', 'Am I eligible?'],
  },
  {
    role: 'both',
    keys: ['location', 'share location', 'gps', 'use my location', 'my location'],
    text: 'Your location is used only to match you with nearby requests or donors on the map. You can type an area/city, or tap "Use my live location" to share your current position from your device. 📍',
    suggestions: ['Nearby donors', 'Request blood'],
  },
  {
    role: 'both',
    keys: ['privacy', 'data', 'secure', 'safe', 'personal', 'private'],
    text: 'Your data is kept private and is only shared with the people involved in a matched donation (like the patient/donor you\u2019re paired with). Personal details are never shown publicly on the site. 🔒',
    suggestions: ['How does matching work?', 'Request blood'],
  },
  {
    role: 'donor',
    keys: ['accept', 'accept request', 'respond', 'decline', 'accept donation'],
    text: 'When you\u2019re matched to a blood request, you\u2019ll get a notification with Accept / Decline buttons. Accepting starts the live journey so the patient can track you on the way to the hospital. Only accept if you\u2019re eligible and can reach in time. ✅',
    suggestions: ['How does live tracking work?', 'Am I eligible?'],
  },
  {
    role: 'donor',
    keys: ['appointment', 'schedule', 'book', 'slot', 'blood bank'],
    text: 'You can schedule a donation appointment at a blood bank so staff are ready when you arrive. Booked appointments and the nearest blood banks are available from your dashboard and profile. 📅',
    suggestions: ['How do I donate?', 'Nearby donors'],
  },
  {
    role: 'donor',
    keys: ['blood bank', 'donation center', 'where to donate', 'donate in person'],
    text: 'Redora connects you with blood banks where you can donate in person. You can view nearby blood banks and book an appointment slot, then show up ready to give blood. 🏥',
    suggestions: ['Appointment', 'How do I donate?'],
  },
  {
    role: 'donor',
    keys: ['time', 'how long', 'how often', 'interval', 'gap', 'months'],
    text: 'The recommended gap between whole-blood donations is about 2–3 months (your next eligible date is shown on your Journey & Donations page). Each donation typically takes under an hour. 🕐',
    suggestions: ['Am I eligible?', 'How do I donate?'],
  },
  {
    role: 'donor',
    keys: ['weight', 'age', '18', '60', 'healthy', 'conditions', 'requirements'],
    text: 'General donor requirements: be 18–60 years old, weigh at least 45 kg, and be in good health with no active infection. Redora also enforces the 2-month gap and only matches compatible blood groups. ⚠️ Always confirm with a doctor.',
    suggestions: ['Am I eligible?', 'Blood group compatibility'],
  },
]

const GENERAL_ANSWERS = [
  {
    role: 'both',
    test: /(what is redora|what is this app|what do you do|who are you|what is aura)/i,
    text: 'Redora is a blood-donation platform that connects patients who need blood with verified donors nearby. It helps with blood requests, donor matching, live tracking, notifications, and donation certificates.',
    suggestions: ['How does matching work?', 'Request blood', 'Am I eligible to donate?'],
  },
  {
    role: 'patient',
    test: /(how do i request blood|how to request blood|need blood|create blood request|post a request|new blood request)/i,
    text: 'To request blood, open the New Blood Request page, enter the patient details, blood group, hospital, location, urgency, and notes, then post the request. AURA can also guide you step by step if you say "Request blood".',
    suggestions: ['Request blood', 'How does matching work?', 'What can you do?'],
  },
  {
    role: 'donor',
    test: /(who can donate|am i eligible|can i donate|eligibility|when can i donate again|donor eligibility)/i,
    text: 'Most healthy adults who meet the donor criteria can donate. Redora checks your last donation date, blood group compatibility, availability, and location before showing a request. A common rule is a 2-month gap between donations, and the app warns you if you are not eligible yet.',
    suggestions: ['How does matching work?', 'How do I donate?', 'Request blood'],
  },
  {
    role: 'both',
    test: /(how does matching work|how are donors chosen|match score|why am i matched|ai match)/i,
    text: 'Redora ranks donors by blood group compatibility, distance to the hospital, travel time, donation eligibility, and availability. The nearest eligible and compatible donor is prioritized, especially for emergency requests.',
    suggestions: ['How do I donate?', 'Request blood', 'What is live tracking?'],
  },
  {
    role: 'both',
    test: /(what is live tracking|where is the donor|track donor|journey|status)/i,
    text: 'After a donor accepts, the app shows the journey from matched to traveling to arrived and completed. You can see ETA, route updates, and live donor location on the map during the trip.',
    suggestions: ['How does matching work?', 'What are certificates?', 'Request blood'],
  },
  {
    role: 'donor',
    test: /(what are certificates|certificate|donation proof)/i,
    text: 'Once a donation is completed, the app generates a donation certificate with a verification code and the key details of the donation. It is available from your Journey & Donations page.',
    suggestions: ['How does matching work?', 'What is live tracking?'],
  },
  {
    role: 'both',
    test: /(where do i find|where can i go|dashboard|notifications|profile|my requests|my requests page)/i,
    text: 'Use the top navigation to open your dashboard, requests, notifications, profile, and donor pages. Patients can view their request list and donor journey; donors can view nearby requests and their donation status.',
    suggestions: ['Request blood', 'What can you do?', 'How do I donate?'],
  },
  {
    role: 'both',
    test: /(how can i contact|message donor|chat with donor|call donor|contact the donor)/i,
    text: 'Redora includes in-app messaging and calls between the patient and the matched donor, so important coordination can happen without sharing personal contact details outside the platform.',
    suggestions: ['Request blood', 'What is live tracking?'],
  },
  {
    role: 'donor',
    test: /(how do i donate|become donor|register as donor|i want to donate)/i,
    text: 'To donate, sign up as a donor, complete your profile with blood group and location, and wait for nearby compatible requests. If you are eligible, you can accept one and track the patient journey live.',
    suggestions: ['Am I eligible to donate?', 'How does matching work?', 'What can you do?'],
  },
  {
    role: 'both',
    test: /(which blood group|compatible with|donate to|receive from|blood group compatibility|universal donor|universal recipient)/i,
    text: 'O- is the universal donor (can give to everyone) and AB+ is the universal recipient (can receive from anyone). O+ gives to all positives. Redora only shows you requests you\u2019re compatible with using standard ABO & Rh rules.',
    suggestions: ['How does matching work?', 'Am I eligible?', 'Request blood'],
  },
  {
    role: 'both',
    test: /(get started|how to use|how do i use|what do i do first|help me)/i,
    text: 'It\u2019s simple: Donors — register, complete your profile, and accept matching requests when they appear. Patients — register, post a blood request with the hospital & location, and pick the best-matched donor. The navigation bar takes you to each page.',
    suggestions: ['How do I donate?', 'Request blood', 'How does matching work?'],
  },
  {
    role: 'patient',
    test: /(cancel|stop request|close request|delete request)/i,
    text: 'You can cancel an open request you no longer need. Once a donor has been matched and the journey has started, the request moves to tracking and can\u2019t be cancelled — it will simply complete.',
    suggestions: ['Request blood', 'My Requests'],
  },
]

function findReply(text, role) {
  const t = text.toLowerCase()
  const allowed = (entry) => !role || role === 'guest' || entry.role === 'both' || entry.role === role
  // 1. Strong regex intents first (most specific answers).
  const general = GENERAL_ANSWERS.find((entry) => allowed(entry) && entry.test.test(t))
  if (general) return general

  // 2. Otherwise score every KB entry by how many of its keywords appear, so
  // multi-word questions resolve to the best-fitting answer instead of the
  // first match. Entries outside the user's role are skipped entirely.
  let best = null
  let bestScore = 0
  for (const entry of KB) {
    if (!allowed(entry)) continue
    let score = 0
    for (const k of entry.keys) {
      if (t.includes(k)) score += k.length
    }
    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  }
  return bestScore > 0 ? best : null
}

const FALLBACK_DONOR = [
  "I can help you with donating on Redora — eligibility, matching requests, live tracking, certificates, appointments, and the leaderboard. Try asking something like ‘Am I eligible to donate?’ or ‘How do I donate?’.",
  'I can answer questions about donating, eligibility, live tracking, certificates, and notifications. Ask me about the app to get started.',
]

const FALLBACK_PATIENT = [
  "I can help you get blood on Redora — creating requests, finding donors, live tracking, nearby donors, and emergency needs. Try asking something like ‘How do I request blood?’ or ‘Request blood’.",
  'I can answer questions about blood requests, matching, live tracking, nearby donors, and notifications. Ask me about the app to get started.',
]

const FALLBACK_GUEST = [
  "I can help with Redora features like blood requests, donor eligibility, matching, tracking, and certificates. Try asking something like ‘How does matching work?’ or ‘Request blood’.",
  'I can answer questions about donating, eligibility, live tracking, requests, and notifications. Ask me about the app or say "Request blood" to get started.',
]

/* ------------------------------------------------------------------ *
 *  Blood-request wizard steps (mirrors the RequestBlood form).
 * ------------------------------------------------------------------ */
const WIZARD = [
  { key: 'patientName', ask: 'Who is the patient? Please tell me the patient\u2019s full name.', validate: (v) => (v.trim() ? null : 'Please tell me the patient\u2019s name.') },
  { key: 'phone', ask: 'What\u2019s a contact phone number so the donor can reach the patient?', validate: (v) => (/[\d]{7,}/.test(v) ? null : 'Please enter a valid phone number (at least 7 digits).') },
  { key: 'bloodGroup', ask: 'Which blood group is needed? (A+, A-, B+, B-, AB+, AB-, O+, O-)', validate: (v) => (BLOOD_GROUPS.includes(v.toUpperCase()) || /(a|b|ab|o)\s*(positive|negative|plus|minus|\+|-)/i.test(v) ? null : 'Please say or type a valid blood group like O+ or A-.') },
  { key: 'units', ask: 'How many units of blood are needed? (usually 1)', validate: (v) => (/^[1-9]\d*$/.test(v.trim()) ? null : 'Please tell me a whole number of units, like 1 or 2.') },
  { key: 'hospital', ask: 'Which hospital is the patient admitted to?', validate: (v) => (v.trim() ? null : 'Please tell me the hospital name.') },
  { key: 'location', ask: 'Where is the hospital located? You can type the area & city, or tap \u201cUse my live location\u201d below to share your current position.', validate: (v) => (v && (v.trim() || v.label) ? null : 'Please type the location or use the live location button.') },
  { key: 'urgency', ask: 'How urgent is this? Say \u201cEmergency\u201d or \u201cNormal\u201d.', validate: (v) => (/emergency|urgent|normal/i.test(v) ? null : 'Please say Emergency or Normal.') },
  { key: 'notes', ask: 'Any notes for the donors? (say \u201cskip\u201d or \u201cnone\u201d if not)', validate: () => null },
]

function normalizeBloodGroup(v) {
  const key = v.toUpperCase().replace(/\s+/g, ' ').trim()
  if (BLOOD_GROUPS.includes(key)) return key
  const map = {
    'A POSITIVE': 'A+', 'A PLUS': 'A+', 'A NEGATIVE': 'A-', 'A MINUS': 'A-',
    'B POSITIVE': 'B+', 'B PLUS': 'B+', 'B NEGATIVE': 'B-', 'B MINUS': 'B-',
    'AB POSITIVE': 'AB+', 'AB PLUS': 'AB+', 'AB NEGATIVE': 'AB-', 'AB MINUS': 'AB-',
    'O POSITIVE': 'O+', 'O PLUS': 'O+', 'O NEGATIVE': 'O-', 'O MINUS': 'O-',
  }
  return map[key] || key
}

function normalizeWizardValue(key, value) {
  if (key === 'bloodGroup') return normalizeBloodGroup(value)
  if (key === 'urgency') return /emergency|urgent/i.test(value) ? 'emergency' : 'normal'
  if (key === 'notes' && /^(skip|none|no|n\/a)$/i.test(value.trim())) return ''
  return value.trim()
}

// Translate the user's answer into English purely for validation/normalization,
// so speaking Hindi/Tamil/etc. still fills the form correctly. Returns the
// English version plus the raw text.
async function enForValidation(text, key, activeLang) {
  if (key === 'notes') return { en: text, raw: text } // never translate free-form notes
  const raw = text
  if (activeLang === 'en') return { en: raw, raw }
  try {
    const { data } = await api.post('/translate', { text, target: 'en' })
    return { en: data?.translatedText || raw, raw }
  } catch {
    return { en: raw, raw }
  }
}

// Detect the language of the user's typed/spoken text from its script, so AURA
// replies in the same language they used — no need to touch the dropdown.
function detectLang(text) {
  const s = String(text || '')
  const scripts = [
    { re: /[\u0B80-\u0BFF]/, code: 'ta' }, // Tamil
    { re: /[\u0C00-\u0C7F]/, code: 'te' }, // Telugu
    { re: /[\u0980-\u09FF]/, code: 'bn' }, // Bengali
    { re: /[\u0A80-\u0AFF]/, code: 'gu' }, // Gujarati
    { re: /[\u0C80-\u0CFF]/, code: 'kn' }, // Kannada
    { re: /[\u0D00-\u0D7F]/, code: 'ml' }, // Malayalam
    { re: /[\u0B00-\u0B7F]/, code: 'or' }, // Odia
    { re: /[\u0900-\u097F]/, code: 'hi' }, // Devanagari (Hindi/Marathi)
  ]
  for (const sc of scripts) if (sc.re.test(s)) return sc.code
  return null
}

function speak(text, { rate = 1, lang = 'en' } = {}) {
  if (typeof window === 'undefined') return
  const synth = window.speechSynthesis
  const ctor = window.SpeechSynthesisUtterance
  if (!synth || !ctor) return

  try {
    synth.cancel()
    const u = new ctor(text)
    u.rate = rate
    u.pitch = 1
    u.lang = lang

    const voices = typeof synth.getVoices === 'function' ? synth.getVoices() : []
    // Prefer a voice in the requested language (e.g. 'hi' matches 'hi-IN').
    const voice =
      voices.find((v) => v.lang?.toLowerCase().startsWith(lang.toLowerCase())) ||
      voices.find((v) => /en(-|_)?(US|GB|IN)/i.test(v.lang)) ||
      voices.find((v) => v.lang?.startsWith('en'))
    if (voice) u.voice = voice

    synth.speak(u)
  } catch {
    // Ignore unsupported speech setups so the chatbot remains usable without crashing.
  }
}

export default function AuraChatbot({ autoOpen = false }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(autoOpen)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [voiceOn, setVoiceOn] = useState(false)
  const [listening, setListening] = useState(false)
  const [lang, setLang] = useState('en')
  const langRef = useRef('en') // mirror of `lang` that's always current (no render lag)
  langRef.current = lang
  const [wizard, setWizard] = useState(null) // { step, collected, locationText, liveCoords }
  const [liveLoading, setLiveLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const recogRef = useRef(null)
  const sessionStartedRef = useRef(false)
  const historyRef = useRef([]) // multi-turn context sent to the LLM

  const currentLang = LANGS.find((l) => l.code === lang)?.voice || lang
  const langLabel = LANGS.find((l) => l.code === lang)?.label || 'English'

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => {
    scrollToBottom()
  }, [messages, typing, open])

  function changeLang(code) {
    setLang(code)
    // Greet in the newly chosen language so the switch is obvious.
    if (voiceOn) window.speechSynthesis?.cancel()
    const hello =
      code === 'en'
        ? `I'll now answer in English. How can I help you today?`
        : `I'll now answer in ${LANGS.find((l) => l.code === code)?.label?.split(' ')[0] || 'your language'}. How can I help you today?`
    pushBot(hello, ['What can you do?', 'How does matching work?', 'Request blood'], code)
  }

  function toggleOpen() {
    const next = !open
    setOpen(next)
    if (next && !sessionStartedRef.current) {
      sessionStartedRef.current = true
      const greeting =
        "Hi, I'm AURA 👋 Your Redora AI assistant. I can answer any question about the platform, and I can even create a blood request for you by voice or text. How can I help you today?"
      pushBot(greeting, [
        'What can you do?',
        user?.role === 'donor' ? 'Am I eligible to donate?' : 'Request blood',
        user?.role === 'patient' ? 'Request blood' : 'How does matching work?',
        'Live tracking',
      ])
    }
  }

  function pushBot(text, suggestions = [], langOverride = null) {
    const safe = String(text ?? '')
    setMessages((m) => [...m, { from: 'bot', text: safe, suggestions }])
    historyRef.current = [...historyRef.current, { from: 'bot', text: safe }].slice(-14)
    if (voiceOn) speak(safe.replace(/[^\w\s,.;:'?!@#&()%-\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0B00-\u0B7F\u0A80-\u0AFF\u0C80-\u0CFF\u0D00-\u0D7F\u0960-\u09FF]/g, ' '), { lang: langOverride || currentLang })
  }

  function pushUser(text) {
    setMessages((m) => [...m, { from: 'user', text }])
    historyRef.current = [...historyRef.current, { from: 'user', text }].slice(-14)
  }

  /* ---------------------------- voice TTS toggle ---------------------------- */
  function toggleVoice() {
    setVoiceOn((prev) => {
      const next = !prev
      if (next) {
        const last = [...messages].reverse().find((m) => m.from === 'bot')
        if (last) speak(last.text.replace(/[^\w\s,.;:'?!@#&()%-\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0B00-\u0B7F\u0A80-\u0AFF\u0C80-\u0CFF\u0D00-\u0D7F\u0960-\u09FF]/g, ' '), { lang: currentLang })
      } else {
        window.speechSynthesis?.cancel()
      }
      return next
    })
  }

  /* ------------------------------- speech STT ------------------------------- */
  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      pushBot('Voice input isn\u2019t supported on this connection. 🔒 The microphone needs HTTPS (a secure link) or a localhost address — it doesn\u2019t work over a plain http:// LAN address. Please use the keyboard to type.')
      return
    }
    if (listening) {
      stopListening()
      return
    }
    /* Stop any ongoing bot speech before capturing the user's voice. */
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    const recog = new SR()
    recog.lang = `${currentLang}-IN`
    recog.interimResults = true
    recog.continuous = false
    recog.maxAlternatives = 3
    recog.onstart = () => setListening(true)
    recog.onend = () => setListening(false)
    recog.onerror = (e) => {
      // 'aborted' and 'no-speech' are normal — don't surface them as failures.
      if (e.error !== 'aborted' && e.error !== 'no-speech') setListening(false)
    }
    recog.onresult = (e) => {
      let interim = ''
      let final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        const alt = res[0]?.transcript ?? ''
        if (res.isFinal) {
          if (alt.length > final.length) final = alt
        } else if (alt.length > interim.length) {
          interim = alt
        }
      }
      // Live-update the box while speaking, send only once a final result lands.
      const text = final || interim
      setInput(text)
      if (final) {
        setListening(false)
        handleSendFinal(final)
      }
    }
    recogRef.current = recog
    try {
      recog.start()
      setListening(true)
    } catch {
      setListening(false)
    }
  }

  function stopListening() {
    try {
      recogRef.current?.stop()
    } catch {}
    setListening(false)
  }

  /* ------------------------------- live location ------------------------------ */
  async function useLiveLocation() {
    if (!navigator.geolocation) {
      pushBot('Live location isn\u2019t supported in this browser. Please type the hospital location instead. 📍')
      return
    }
    setLiveLoading(true)
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej))
      const { latitude, longitude } = pos.coords
      const { data } = await api.get('/geo/reverse', { params: { lat: latitude, lng: longitude } })
      const label = data.result?.label || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      setWizard((w) => ({ ...w, locationText: label, liveCoords: { lat: latitude, lng: longitude, label } }))
      pushUser('📍 Using my live location')
      pushBot(`Got it — your location: ${label}. Is that the right area? If not, just type the correct hospital location.`, [
        'Yes, that\u2019s right',
        'No, let me type it',
      ])
    } catch {
      pushBot('I couldn\u2019t access your location. Please type the hospital area & city instead. 📍')
    } finally {
      setLiveLoading(false)
    }
  }

  /* --------------------------- wizard submission ----------------------------- */
  async function confirmWizard() {
    const w = wizard
    const { patientName, phone, bloodGroup, units, hospital, urgency, notes } = w.collected
    const locationText = w.locationText || w.collected.location || ''
    setWizard(null)
    // Pre-fill the New Blood Request form with everything AURA collected so the
    // patient can review, correct any field, and post from there. The actual
    // request is created on the form page (patient side only).
    navigate('/request-blood', {
      state: {
        prefill: {
          patientName,
          phone,
          bloodGroup,
          units: Number(units) || 1,
          hospital,
          location: locationText,
          urgency,
          notes: notes || '',
          liveCoords: w.liveCoords || null,
        },
      },
    })
  }

  /* ------------------------------ intent router ------------------------------ */
  async function handleSend(raw) {
    const text = (raw ?? '').trim()
    if (!text) return

    try {
      setInput('')
      pushUser(text)

      /* If a wizard is active, treat this as the answer to the current question. */
      if (wizard) {
        const current = WIZARD[wizard.step]
        const isAffirmativeLocation = current.key === 'location' && /yes|that'?s right|correct/i.test(text)
        if (isAffirmativeLocation && wizard.liveCoords) {
          await proceedWizard()
          return
        }
        if (/^yes$/i.test(text.trim()) && wizard.step === 0) {
          await proceedWizard()
          return
        }
        const err = current.validate(text)
        if (err) {
          pushBot(err)
          return
        }
        const value = normalizeWizardValue(current.key, text)
        setWizard((w) => ({
          ...w,
          collected: { ...w.collected, [current.key]: value },
          locationText: current.key === 'location' ? value : w.locationText,
        }))
        await proceedWizard()
        return
      }

      setTyping(true)
      /* Auto-detect the language the user typed/spoke and switch to it, so AURA
         always answers in the same language. `langRef` is updated immediately
         so the fallback translators don't lag behind the render. */
      const detected = detectLang(text)
      if (detected && detected !== lang) {
        setLang(detected)
        langRef.current = detected
      }
      const replyLang = langRef.current

      /* Allow re-entering the wizard from any message (patient side only). */
      if (user?.role === 'patient' && /request blood|need blood|post request|start a new request|start$|yes$|create request/i.test(text)) {
        startWizard()
        setTyping(false)
        return
      }

      // Real conversational AI: ask the backend (Gemini free tier). It returns
      // { source: 'gemini', reply, suggestions, action } or { source: 'rule' }
      // when no API key / on failure. In that case we fall back to the local KB
      // and translate it if the user picked a non-English language.
      let ai = null
      try {
        const { data } = await api.post('/chat', {
          message: text,
          history: historyRef.current,
          lang: replyLang,
          profile: user
            ? { role: user.role, bloodGroup: user.bloodGroup || '' }
            : null,
        })
        ai = data || null
      } catch {
        ai = null
      }

      const entry = ai?.source === 'gemini' && ai.reply ? ai : null
      setTimeout(() => {
        try {
          if (entry) {
            const suggestions = entry.suggestions || []
            pushBot(entry.reply, suggestions)
            if (entry.action === 'start-wizard') {
              setTimeout(() => startWizard(), 400)
            } else if (entry.action === 'navigate' && entry.actionValue) {
              navigate(entry.actionValue)
            }
          } else {
            // Rule-based fallback (no key / Gemini down).
            const role = user?.role || 'guest'
            const localEntry = findReply(text, role)
            let suggestions = []
            if (localEntry) {
              suggestions = localEntry.suggestions || []
              deliverReply(localEntry.text, suggestions)
              if (localEntry.startWizard) {
                setTimeout(() => startWizard(), 400)
              }
            } else {
              const pool = role === 'donor' ? FALLBACK_DONOR : role === 'patient' ? FALLBACK_PATIENT : FALLBACK_GUEST
              const fb = pool[Math.floor(Math.random() * pool.length)]
              suggestions =
                role === 'donor'
                  ? ['Am I eligible to donate?', 'How do I donate?', 'What is live tracking?']
                  : role === 'patient'
                  ? ['Request blood', 'How does matching work?', 'Nearby donors']
                  : ['What can you do?', 'Request blood', 'How does matching work?']
              deliverReply(fb, suggestions)
            }
          }
        } finally {
          setTyping(false)
        }
      }, 350)
    } catch (error) {
      console.error('[AuraChatbot] send failed:', error)
      setTyping(false)
      pushBot('I hit a temporary issue while answering. Please try again — the app is still fine and I can help with donor requests, eligibility, matching, and live tracking.')
    }
  }

  // Show a rule-based reply, translating it into the active language when the
  // LLM isn't available so AURA stays multilingual even without a key.
  async function deliverReply(text, suggestions) {
    const target = langRef.current
    if (target === 'en') {
      pushBot(text, suggestions)
      return
    }
    setTyping(true)
    try {
      const { data } = await api.post('/translate', { text, target })
      const translated = data?.translatedText || text
      pushBot(translated, suggestions)
    } catch {
      pushBot(text, suggestions)
    } finally {
      setTyping(false)
    }
  }

  // Push a bot message, translating it into the active language when it isn't
  // English. Used for wizard questions and greetings so AURA speaks the chosen
  // language end-to-end (voice and text).
  async function pushLocal(text, suggestions = [], code = null) {
    const target = code || langRef.current
    if (target === 'en') {
      pushBot(text, suggestions, code)
      return
    }
    try {
      const { data } = await api.post('/translate', { text, target })
      pushBot(data?.translatedText || text, suggestions, code)
    } catch {
      pushBot(text, suggestions, code)
    }
  }

  function startWizard() {
    if (!user) {
      pushBot('To create a blood request you need to be logged in as a patient. Please log in first, then say \u201cRequest blood\u201d again. 🔒')
      return
    }
    // Blood requests are created on the patient side only — donors never see
    // the request wizard.
    if (user.role !== 'patient') {
      pushBot('Blood requests are created on the patient side. As a donor you accept matching requests, so I can help with your eligibility, donations, certificates, and appointments instead. 💛', [
        'Am I eligible to donate?',
        'How do I donate?',
      ])
      return
    }
    setWizard({ step: 0, collected: {}, locationText: '', liveCoords: null })
    const first = WIZARD[0]
    pushLocal(first.ask)
  }

  async function proceedWizard() {
    const w = wizard
    const nextStep = w.step + 1
    if (nextStep >= WIZARD.length) {
      const { patientName, phone, bloodGroup, units, hospital, urgency, notes } = w.collected
      const locationText = w.locationText || (w.collected.hospital ? '' : '')
      pushLocal(
        `Let\u2019s confirm the request: 👤 Patient: ${patientName} · 📞 ${phone} · 🩸 ${bloodGroup}, ${units} unit${Number(units) > 1 ? 's' : ''} · 🏥 ${hospital} · 📍 ${locationText || 'your location'} · ⚡ ${urgency === 'emergency' ? '🚨 Emergency' : '🕐 Normal'}${notes ? ` · 📝 ${notes}` : ''}\n\nSay \u201cconfirm\u201d to post it, or \u201ccancel\u201d to start over.`,
        ['Confirm', 'Cancel']
      )
      setWizard({ ...w, step: nextStep })
      return
    }
    const next = WIZARD[nextStep]
    setWizard({ ...w, step: nextStep })
    pushLocal(next.ask)
  }

  /* Let confirm/cancel work when the wizard is on its final step. */
  async function handleWizardFinal(text) {
    if (/confirm|yes|post|submit|go ahead/i.test(text)) {
      await confirmWizard()
      return true
    }
    if (/cancel|no|stop|start over/i.test(text)) {
      setWizard(null)
      pushBot('Okay, I\u2019ve cancelled the request. Say \u201cRequest blood\u201d whenever you\u2019re ready. 💛', ['Request blood'])
      return true
    }
    return false
  }

  /* Wrapped handleSend that also processes the final wizard step. */
  async function handleSendFinal(text) {
    const trimmed = (text ?? '').trim()
    if (!trimmed) return
    try {
      if (wizard && wizard.step >= WIZARD.length) {
        const handled = await handleWizardFinal(trimmed)
        if (handled) {
          setInput('')
          return
        }
      }
      await handleSend(trimmed)
    } catch (error) {
      console.error('[AuraChatbot] send final failed:', error)
      setTyping(false)
      pushBot('I hit a temporary issue while answering. Please try again — the app is still fine and I can help with donor requests, eligibility, matching, and live tracking.')
    }
  }

  /* --- suggested chip click --- */
  function onChip(text) {
    handleSendFinal(text)
  }

  return (
    <>
      {/* Floating launcher */}
      <button
        className={`aura-launcher ${open ? 'open' : ''}`}
        onClick={toggleOpen}
        aria-label="Toggle AURA assistant"
      >
        <span className="aura-launcher-ico">{open ? '✕' : '🤖'}</span>
        {!open && <span className="aura-launcher-pulse" />}
      </button>

      {open && (
        <div className="aura-window">
          <div className="aura-header">
            <div className="aura-header-avatar">🤖</div>
            <div className="aura-header-info">
              <strong>AURA</strong>
              <span>Redora AI Assistant</span>
            </div>
            <div className="aura-header-actions">
              <select
                className="aura-lang"
                value={lang}
                onChange={(e) => changeLang(e.target.value)}
                title={`Language: ${langLabel}`}
                aria-label="Select language"
              >
                {LANGS.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
              <button
                className={`aura-voice-toggle ${voiceOn ? 'on' : ''}`}
                onClick={toggleVoice}
                title={voiceOn ? 'Mute voice' : 'Enable voice replies'}
              >
                {voiceOn ? '🔊' : '🔇'}
              </button>
            </div>
          </div>

          <div className="aura-body">
            {messages.map((m, i) =>
              m.from === 'bot' ? (
                <div key={i} className="aura-msg bot">
                  <div className="aura-msg-avatar">🤖</div>
                  <div className="aura-bubble">
                    <p>{m.text}</p>
                    <button
                      className="aura-say"
                      onClick={() => speak(m.text.replace(/[^\w\s,.;:'?!@#&()%-]/g, ''), { lang: currentLang })}
                      title="Hear this reply"
                    >
                      🔊
                    </button>
                    {m.suggestions?.length > 0 && (
                      <div className="aura-chips">
                        {m.suggestions.map((s, j) => (
                          <button key={j} className="aura-chip" onClick={() => onChip(s)}>
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div key={i} className="aura-msg user">
                  <div className="aura-bubble user">{m.text}</div>
                </div>
              ),
            )}

            {/* Live location button shown during the location step */}
            {wizard && wizard.step === 5 && !wizard.locationText && (
              <div className="aura-msg bot">
                <div className="aura-msg-avatar">🤖</div>
                <div className="aura-bubble">
                  <button
                    className="aura-chip live"
                    onClick={useLiveLocation}
                    disabled={liveLoading}
                  >
                    {liveLoading ? 'Locating…' : '📍 Use my live location'}
                  </button>
                </div>
              </div>
            )}

            {typing && (
              <div className="aura-msg bot">
                <div className="aura-msg-avatar">🤖</div>
                <div className="aura-bubble typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="aura-input-row">
            <button
              className={`aura-mic ${listening ? 'on' : ''}`}
              onClick={startListening}
              title={listening ? 'Stop listening' : 'Speak'}
            >
              {listening ? '⏹' : '🎙️'}
            </button>
            <input
              className="aura-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendFinal(input)}
              placeholder={listening ? 'Listening…' : 'Ask AURA or type…'}
            />
            <button className="aura-send" onClick={() => handleSendFinal(input)}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  )
}