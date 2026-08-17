import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

/* ------------------------------------------------------------------ *
 *  Knowledge base — AURA answers questions about the Redora project.
 * ------------------------------------------------------------------ */
const KB = [
  {
    keys: ['hi', 'hello', 'hey', 'namaste', 'good morning', 'good evening'],
    text: "Hi there! 👋 I'm AURA, your Redora AI assistant. I can answer questions about the platform, check donor eligibility, and even help you create a blood request by voice or text. What would you like to know?",
    suggestions: ['What can you do?', 'How do I donate?', 'Am I eligible to donate?', 'Request blood', 'How does matching work?'],
  },
  {
    keys: ['what can you do', 'help', 'how do you work', 'features', 'options', 'capabilities'],
    text: "Here's what I can help with: 🔍 explain features and how the platform works · 🩸 guide you through donating · 🏥 create a blood request by voice or text · ⚖️ answer eligibility questions · 🛞 explain live tracking, journeys & certificates · 🧠 explain the AI match scoring. Just ask away, or tap a suggestion below!",
    suggestions: ['How does matching work?', 'Request blood', 'Donor eligibility', 'What are certificates?'],
  },
  {
    keys: ['donate', 'donor', 'become donor', 'how to donate', 'give blood', 'register as donor'],
    text: 'To become a donor on Redora: 1️⃣ Register & log in as a Donor. 2️⃣ Complete your profile (blood group, city, contact, location). 3️⃣ You\'ll see open blood requests near you, ranked by an AI match score. 4️⃣ Accept a request you\'re eligible for. 5️⃣ Track the journey live and earn a certificate. Would you like to know your eligibility?',
    suggestions: ['Am I eligible to donate?', 'How does matching work?', 'What is live tracking?'],
  },
  {
    keys: ['eligible', 'eligibility', 'can i donate', 'am i allowed', 'criteria', 'when can i donate again'],
    text: 'Eligibility is checked against your last donation date — you need a 2-month gap between donations. Donors are also matched only if their blood group is compatible with the request. The system auto-checks this when you try to accept a request. For a personal check, open your Journey & Donations page — it shows your next eligible date. Most healthy adults aged 18–60 who weigh 45kg+ and are free of infection are eligible. ⚠️ Always confirm with a doctor.',
    suggestions: ['How does matching work?', 'Blood group compatibility'],
  },
  {
    keys: ['compatible', 'compatibility', 'blood group', 'which blood', 'can donate to', 'universal'],
    text: 'Universal donors: O- can donate to everyone, and O+ to all positives. Universal recipients: AB+ can receive from anyone. Redora only shows you requests you\'re compatible with, using the standard ABO & Rh rules. Say "request blood" to post a need for any group.',
    suggestions: ['Request blood', 'How does matching work?'],
  },
  {
    keys: ['matching', 'match score', 'ai match', 'ranked', 'score', 'algorithm', 'how are donors picked'],
    text: 'Redora uses an AI-style match score to rank donors for each request. It weighs: proximity (distance/ETA to the hospital), blood group compatibility, eligibility (2-month rule), availability, and donation history. The best-matching donors are listed first, and for emergencies the nearest eligible donor is alerted. The backend computes this score per request in real time.',
    suggestions: ['Request blood', 'What is live tracking?'],
  },
  {
    keys: ['request blood', 'request', 'need blood', 'post request', 'create request', 'urgent'],
    text: 'Great — I can create your blood request right here! 🏥 I\'ll ask a few quick questions: patient name, contact number, blood group, units, hospital, location (type it or share your live location), urgency, and any notes. Then I\'ll post it and take you to nearby donors. Ready? Say "yes" or tap "Start".',
    suggestions: ['Start', 'How does matching work?'],
    startWizard: true,
  },
  {
    keys: ['tracking', 'live tracking', 'track', 'journey', 'status', 'where is donor', 'map'],
    text: 'Once a donor accepts your request, both sides get a live journey. 🛞 You can watch the donor move on a real-time map, see their ETA, travel mode, and live location pings. The journey moves through stages: Matched → Ready → Traveling → Arrived → Donating → Completed. Track it from your Journey & Donations page or My Requests.',
    suggestions: ['What are certificates?', 'Request blood'],
  },
  {
    keys: ['certificate', 'cert', 'proof', 'donation proof'],
    text: 'Every completed donation earns a unique 🏅 certificate with a verification code. It records the date, blood group, hospital, and patient. You can view or download it from your Journey & Donations page. It\'s your official proof of being a lifesaver!',
    suggestions: ['What is live tracking?', 'Request blood'],
  },
  {
    keys: ['emergency', 'urgent', 'immediate', 'critical', 'sos'],
    text: '🚨 For emergencies, Redora flags the request as EMERGENCY and alerts the nearest compatible, eligible donor first — notifying them by in-app notification and email with an estimated arrival time. If they decline, it automatically falls through to the next fastest donor. To post an emergency need, say "request blood".',
    suggestions: ['Request blood', 'How does matching work?'],
  },
  {
    keys: ['notification', 'notify', 'alert', 'bell'],
    text: 'You\'ll get 🔔 real-time notifications for: new matching requests (donors), someone accepting your request (patients), journey stage updates, and messages. The bell in the top bar shows unread counts, and there\'s a dedicated Notifications page.',
    suggestions: ['What is live tracking?', 'Request blood'],
  },
  {
    keys: ['message', 'chat', 'contact donor', 'talk to', 'call'],
    text: 'Redora has built-in messaging and calling between the patient and the matched donor — no need to share personal chats elsewhere. You can send messages and even call within the tracking view.',
    suggestions: ['Request blood', 'What is live tracking?'],
  },
  {
    keys: ['password', 'login', 'sign in', 'sign up', 'register', 'forgot', 'reset', 'account'],
    text: 'Manage your account from the top bar: register, log in, and reset your password are all available. After login your session is restored securely, and you can update your profile anytime from the Profile page.',
  },
  {
    keys: ['search donor', 'find donor', 'nearby donor', 'search'],
    text: 'Use Search Donors to find verified donors by blood group and city, or Nearby Donors to see eligible donors around a location on a map with distances. Patients can pick the best-matched donor for their request.',
    suggestions: ['How does matching work?', 'Request blood'],
  },
  {
    keys: ['thank', 'thanks', 'great', 'nice'],
    text: "You're welcome! 💛 Every question answered and every request posted brings someone closer to the help they need. Is there anything else I can do for you?",
  },
  {
    keys: ['bye', 'goodbye', 'see you', 'exit', 'quit'],
    text: 'Take care! 👋 If you need me again, just say "AURA" or tap the chat bubble. Stay safe and keep saving lives.',
  },
]

const GENERAL_ANSWERS = [
  {
    test: /(what is redora|what is this app|what do you do|who are you|what is aura)/i,
    text: 'Redora is a blood-donation platform that connects patients who need blood with verified donors nearby. It helps with blood requests, donor matching, live tracking, notifications, and donation certificates.',
    suggestions: ['How does matching work?', 'Request blood', 'Am I eligible to donate?'],
  },
  {
    test: /(how do i request blood|how to request blood|need blood|create blood request|post a request|new blood request)/i,
    text: 'To request blood, open the New Blood Request page, enter the patient details, blood group, hospital, location, urgency, and notes, then post the request. AURA can also guide you step by step if you say “Request blood”.',
    suggestions: ['Request blood', 'How does matching work?', 'What can you do?'],
  },
  {
    test: /(who can donate|am i eligible|can i donate|eligibility|when can i donate again|donor eligibility)/i,
    text: 'Most healthy adults who meet the donor criteria can donate. Redora checks your last donation date, blood group compatibility, availability, and location before showing a request. A common rule is a 2-month gap between donations, and the app warns you if you are not eligible yet.',
    suggestions: ['How does matching work?', 'How do I donate?', 'Request blood'],
  },
  {
    test: /(how does matching work|how are donors chosen|match score|why am i matched|ai match)/i,
    text: 'Redora ranks donors by blood group compatibility, distance to the hospital, travel time, donation eligibility, and availability. The nearest eligible and compatible donor is prioritized, especially for emergency requests.',
    suggestions: ['How do I donate?', 'Request blood', 'What is live tracking?'],
  },
  {
    test: /(what is live tracking|where is the donor|track donor|journey|status)/i,
    text: 'After a donor accepts, the app shows the journey from matched to traveling to arrived and completed. You can see ETA, route updates, and live donor location on the map during the trip.',
    suggestions: ['How does matching work?', 'What are certificates?', 'Request blood'],
  },
  {
    test: /(what are certificates|certificate|donation proof)/i,
    text: 'Once a donation is completed, the app generates a donation certificate with a verification code and the key details of the donation. It is available from your Journey & Donations page.',
    suggestions: ['How does matching work?', 'What is live tracking?'],
  },
  {
    test: /(where do i find|where can i go|dashboard|notifications|profile|my requests|my requests page)/i,
    text: 'Use the top navigation to open your dashboard, requests, notifications, profile, and donor pages. Patients can view their request list and donor journey; donors can view nearby requests and their donation status.',
    suggestions: ['Request blood', 'What can you do?', 'How do I donate?'],
  },
  {
    test: /(how can i contact|message donor|chat with donor|call donor|contact the donor)/i,
    text: 'Redora includes in-app messaging and calls between the patient and the matched donor, so important coordination can happen without sharing personal contact details outside the platform.',
    suggestions: ['Request blood', 'What is live tracking?'],
  },
  {
    test: /(how do i donate|become donor|register as donor|i want to donate)/i,
    text: 'To donate, sign up as a donor, complete your profile with blood group and location, and wait for nearby compatible requests. If you are eligible, you can accept one and track the patient journey live.',
    suggestions: ['Am I eligible to donate?', 'How does matching work?', 'What can you do?'],
  },
]

function findReply(text) {
  const t = text.toLowerCase()
  const general = GENERAL_ANSWERS.find((entry) => entry.test.test(t))
  if (general) return general

  for (const entry of KB) {
    if (entry.keys.some((k) => t.includes(k))) return entry
  }
  return null
}

const FALLBACK = [
  "I can help with Redora features like blood requests, donor eligibility, matching, tracking, and certificates. Try asking something like ‘How does matching work?’ or ‘Request blood’.",
  'I can answer questions about donating, eligibility, live tracking, requests, and notifications. Ask me about the app or say “Request blood” to get started.',
]

/* ------------------------------------------------------------------ *
 *  Blood-request wizard steps (mirrors the RequestBlood form).
 * ------------------------------------------------------------------ */
const WIZARD = [
  { key: 'patientName', ask: 'Who is the patient? Please tell me the patient\u2019s full name.', validate: (v) => (v.trim() ? null : 'Please tell me the patient\u2019s name.') },
  { key: 'phone', ask: 'What\u2019s a contact phone number so the donor can reach the patient?', validate: (v) => (/[\d]{7,}/.test(v) ? null : 'Please enter a valid phone number (at least 7 digits).') },
  { key: 'bloodGroup', ask: 'Which blood group is needed? (A+, A-, B+, B-, AB+, AB-, O+, O-)', validate: (v) => (BLOOD_GROUPS.includes(v.toUpperCase()) ? null : 'Please say or type a valid blood group like O+ or A-.') },
  { key: 'units', ask: 'How many units of blood are needed? (usually 1)', validate: (v) => (/^[1-9]\d*$/.test(v.trim()) ? null : 'Please tell me a whole number of units, like 1 or 2.') },
  { key: 'hospital', ask: 'Which hospital is the patient admitted to?', validate: (v) => (v.trim() ? null : 'Please tell me the hospital name.') },
  { key: 'location', ask: 'Where is the hospital located? You can type the area & city, or tap \u201cUse my live location\u201d below to share your current position.', validate: (v) => (v && (v.trim() || v.label) ? null : 'Please type the location or use the live location button.') },
  { key: 'urgency', ask: 'How urgent is this? Say \u201cEmergency\u201d or \u201cNormal\u201d.', validate: (v) => (/emergency|urgent|normal/i.test(v) ? null : 'Please say Emergency or Normal.') },
  { key: 'notes', ask: 'Any notes for the donors? (say \u201cskip\u201d or \u201cnone\u201d if not)', validate: () => null },
]

function normalizeWizardValue(key, value) {
  if (key === 'bloodGroup') return value.toUpperCase().trim()
  if (key === 'urgency') return /emergency|urgent/i.test(value) ? 'emergency' : 'normal'
  if (key === 'notes' && /^(skip|none|no|n\/a)$/i.test(value.trim())) return ''
  return value.trim()
}

function speak(text, { rate = 1 } = {}) {
  if (typeof window === 'undefined') return
  const synth = window.speechSynthesis
  const ctor = window.SpeechSynthesisUtterance
  if (!synth || !ctor) return

  try {
    synth.cancel()
    const u = new ctor(text)
    u.rate = rate
    u.pitch = 1

    const voices = typeof synth.getVoices === 'function' ? synth.getVoices() : []
    const voice = voices.find((v) => /en(-|_)?(US|GB|IN)/i.test(v.lang)) || voices.find((v) => v.lang?.startsWith('en'))
    if (voice) u.voice = voice

    synth.speak(u)
  } catch {
    // Ignore unsupported speech setups so the chatbot remains usable without crashing.
  }
}

export default function AuraChatbot() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [voiceOn, setVoiceOn] = useState(false)
  const [listening, setListening] = useState(false)
  const [wizard, setWizard] = useState(null) // { step, collected, locationText, liveCoords }
  const [liveLoading, setLiveLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const recogRef = useRef(null)
  const sessionStartedRef = useRef(false)

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => scrollToBottom(), [messages, typing, open])

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

  function pushBot(text, suggestions = []) {
    setMessages((m) => [...m, { from: 'bot', text, suggestions }])
    if (voiceOn) speak(text.replace(/[^\w\s,.;:'?!@#&()%-]/g, ''))
  }

  function pushUser(text) {
    setMessages((m) => [...m, { from: 'user', text }])
  }

  /* ---------------------------- voice TTS toggle ---------------------------- */
  function toggleVoice() {
    setVoiceOn((prev) => {
      const next = !prev
      if (next) {
        const last = [...messages].reverse().find((m) => m.from === 'bot')
        if (last) speak(last.text.replace(/[^\w\s,.;:'?!@#&()%-]/g, ''))
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
    recog.lang = 'en-IN'
    recog.interimResults = false
    recog.maxAlternatives = 1
    recog.onstart = () => setListening(true)
    recog.onend = () => setListening(false)
    recog.onerror = () => setListening(false)
    recog.onresult = (e) => {
      const text = e.results[0][0].transcript
      setInput(text)
      handleSendFinal(text)
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
    setTyping(true)
    try {
      const locationQuery = w.locationText || w.collected.location || ''
      let coords = w.liveCoords
      if (!coords && hospital && locationQuery) {
        const { data } = await api.get('/geo/verify-hospital', {
          params: { name: hospital, location: locationQuery },
        })
        if (data.verified && data.match) {
          coords = { lat: data.match.lat, lng: data.match.lon, label: data.match.label }
        }
      }
      if (!coords && hospital && locationQuery) {
        try {
          const { data } = await api.get('/geo/geocode', { params: { q: locationQuery } })
          if (data.result) {
            coords = { lat: data.result.lat, lng: data.result.lon, label: data.result.label }
          }
        } catch {
          // ignore and keep the validation error below
        }
      }
      if (!coords || coords.lat == null) {
        setWizard(null)
        pushBot('I couldn\u2019t verify the hospital location, so I didn\u2019t post the request. Please double-check the hospital and try again, or post it from the New Blood Request page.', [
          'Start a new request',
        ])
        return
      }
      const payload = {
        patientName,
        phone,
        bloodGroup,
        units: Number(units),
        hospital,
        location: coords,
        urgency,
        notes: notes || '',
      }
      const { data } = await api.post('/requests', payload)
      pushBot(`🎉 Your blood request has been posted! I\u2019m taking you to nearby donors now so you can get help fast.`)
      setWizard(null)
      navigate(`/requests/${data.request._id}/nearby`)
    } catch (err) {
      setWizard(null)
      pushBot(`Sorry, I couldn\u2019t post the request: ${err.response?.data?.message || 'please try again'}. You can also use the New Blood Request page.`)
    } finally {
      setTyping(false)
    }
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
      /* Allow re-entering the wizard from any message. */
      if (/request blood|need blood|post request|start a new request|start$|yes$|create request/i.test(text)) {
        startWizard()
        setTyping(false)
        return
      }

      const entry = findReply(text)
      setTimeout(() => {
        try {
          let suggestions = []
          if (entry) {
            suggestions = entry.suggestions || []
            pushBot(entry.text, suggestions)
            if (entry.startWizard) {
              setTimeout(() => startWizard(), 400)
            }
          } else {
            const fb = FALLBACK[Math.floor(Math.random() * FALLBACK.length)]
            suggestions = ['What can you do?', 'Request blood', 'How does matching work?']
            pushBot(fb, suggestions)
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

  function startWizard() {
    if (!user) {
      pushBot('To create a blood request you need to be logged in as a patient. Please log in first, then say \u201cRequest blood\u201d again. 🔒')
      return
    }
    setWizard({ step: 0, collected: {}, locationText: '', liveCoords: null })
    const first = WIZARD[0]
    pushBot(first.ask)
  }

  async function proceedWizard() {
    const w = wizard
    const nextStep = w.step + 1
    if (nextStep >= WIZARD.length) {
      const { patientName, phone, bloodGroup, units, hospital, urgency, notes } = w.collected
      const locationText = w.locationText || (w.collected.hospital ? '' : '')
      pushBot(
        `Let\u2019s confirm the request: 👤 Patient: ${patientName} · 📞 ${phone} · 🩸 ${bloodGroup}, ${units} unit${Number(units) > 1 ? 's' : ''} · 🏥 ${hospital} · 📍 ${locationText || 'your location'} · ⚡ ${urgency === 'emergency' ? '🚨 Emergency' : '🕐 Normal'}${notes ? ` · 📝 ${notes}` : ''}\n\nSay \u201cconfirm\u201d to post it, or \u201ccancel\u201d to start over.`,
        ['Confirm', 'Cancel']
      )
      setWizard({ ...w, step: nextStep })
      return
    }
    const next = WIZARD[nextStep]
    setWizard({ ...w, step: nextStep })
    pushBot(next.ask)
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
                      onClick={() => speak(m.text.replace(/[^\w\s,.;:'?!@#&()%-]/g, ''))}
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