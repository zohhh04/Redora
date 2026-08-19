import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

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
    text: 'To create a blood request, just upload the file 📎 (a prescription, hospital note, or lab report — PDF, image, or text). I\u2019ll read it and auto-fill every field on the New Blood Request form for you to review and post. No typing needed!',
    suggestions: ['How does matching work?', 'What can you do?'],
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
    role: 'patient',
    keys: ['upload', 'upload file', 'upload a file', 'attach', 'attach file', 'auto fill', 'prefill', 'auto-fill', 'read my file', 'upload prescription'],
    text: 'Great idea — you can upload a file (PDF, image, or text) and I\u2019ll read it and auto-fill a blood request for you! 📄 Just tap the paperclip 📎 in the chat bar and pick the file (a prescription, hospital note, or lab report works best). I\u2019ll extract the patient name, blood group, units, hospital, location, urgency, and notes, then pre-fill the New Blood Request form for you to review.',
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
    role: 'both',
    keys: ['weight', 'how much should i weigh', 'minimum weight', 'kgs', 'kg', 'age', '18', '60', 'healthy', 'conditions', 'requirements', 'qualification', 'qualify', 'can i donate'],
    text: 'General donor requirements: be 18–60 years old, weigh at least 45 kg (about 99 lbs), and be in good health with no active infection. Redora also enforces the 2-month gap and only matches compatible blood groups. ⚠️ Always confirm with a doctor.',
    suggestions: ['Am I eligible?', 'Blood group compatibility'],
  },
  {
    role: 'both',
    keys: ['how much blood', 'how much do they take', 'amount of blood', 'ml', '450', 'donation amount', 'how many ml', 'blood taken'],
    text: 'A standard whole-blood donation collects about 350–450 ml (roughly one pint) — only a small fraction of your body\u2019s total blood, and your body quickly replaces it. 🩸',
    suggestions: ['Is it safe?', 'How long does it take?', 'Am I eligible?'],
  },
  {
    role: 'both',
    keys: ['is it safe', 'safe to donate', 'risks', 'dangerous', 'hurt', 'painful', 'side effects', 'will it hurt', 'harm'],
    text: 'Yes, donating blood is very safe. It uses a sterile, single-use needle and you\u2019re monitored throughout. Mild side effects like a little dizziness or a small bruise can happen, but serious problems are extremely rare. 💪',
    suggestions: ['How long does it take?', 'What should I eat before?', 'Am I eligible?'],
  },
  {
    role: 'both',
    keys: ['how long', 'how long does it take', 'time to donate', 'duration', 'how fast', 'how many minutes'],
    text: 'The actual blood draw takes about 5–10 minutes, but the whole visit (registration, health check, donation, and a short rest) usually takes around 30–45 minutes. 🕐',
    suggestions: ['What should I eat before?', 'Is it safe?'],
  },
  {
    role: 'both',
    keys: ['before donating', 'what to eat before', 'preparation', 'prepare', 'eat before', 'drink before', 'fasting', 'empty stomach', 'what should i do before'],
    text: 'Before donating: eat a light, iron-rich meal, drink plenty of water, and get a good night\u2019s sleep. Don\u2019t donate on an empty stomach, and avoid alcohol the day before. 🍎',
    suggestions: ['What should I eat after?', 'Am I eligible?'],
  },
  {
    role: 'both',
    keys: ['after donating', 'after donation', 'what to do after', 'eat after', 'recover', 'rest after', 'care after'],
    text: 'After donating, rest for about 15 minutes and have a snack and fluids. Avoid heavy exercise, alcohol, and hot showers for a few hours. Your body replaces the fluid within a day and the red cells within a few weeks. 🍪',
    suggestions: ['How often can I donate?', 'What should I eat before?'],
  },
  {
    role: 'both',
    keys: ['benefits', 'advantages', 'is donating good', 'why donate', 'benefit of donating', 'good for health', 'health benefits'],
    text: 'Donating blood helps save lives, and it may also have health benefits — it provides a free mini health check (blood pressure, haemoglobin), can help reduce iron overload, and stimulates new blood-cell production. ❤️',
    suggestions: ['Who can receive my blood?', 'How often can I donate?'],
  },
  {
    role: 'both',
    keys: ['paid', 'get paid', 'money for donating', 'payment for blood', 'sell blood', 'rewards', 'incentive'],
    text: 'Donation on Redora is voluntary and unpaid — it\u2019s a life-saving act, never a way to earn money. You do get a certificate and recognition on the leaderboard for your donations. 🏆',
    suggestions: ['How do I donate?', 'What are certificates?'],
  },
  {
    role: 'both',
    keys: ['tattoo', 'piercing', 'tattoos', 'piercings', 'acupuncture', 'needle'],
    text: 'If you\u2019ve had a tattoo, piercing, or acupuncture with a non-sterile needle recently, you may need to wait (often a few months) before donating. Redora checks your last donation date and eligibility — when in doubt, check with a doctor. ⏳',
    suggestions: ['Am I eligible?', 'When can I donate again?'],
  },
  {
    role: 'both',
    keys: ['sick', 'cold', 'flu', 'fever', 'infection', 'cough', 'ill', 'unwell', 'vomiting'],
    text: 'If you\u2019re sick with a cold, flu, fever, or any active infection, you should wait until you\u2019re fully recovered (usually about 2 weeks after symptoms clear) before donating. ⚠️',
    suggestions: ['Am I eligible?', 'When can I donate again?'],
  },
  {
    role: 'both',
    keys: ['iron', 'low iron', 'anemia', 'haemoglobin', 'hemoglobin', 'hb', 'anemic'],
    text: 'You need a minimum haemoglobin level (roughly 12.5 g/dL for women and 13 g/dL for men) to donate. If your iron is low or you\u2019re anaemic, you may be deferred — eat iron-rich food and get tested. ⚠️ Always confirm with a doctor.',
    suggestions: ['What should I eat before?', 'Am I eligible?'],
  },
  {
    role: 'both',
    keys: ['medicine', 'medication', 'drugs', 'prescription', 'on medication', 'taking medicine', 'antibiotics'],
    text: 'Some medications may affect your eligibility to donate. If you\u2019re on regular medication or antibiotics, mention it during the health check — it doesn\u2019t always disqualify you, but it must be reviewed. 💊',
    suggestions: ['Am I eligible?', 'Can I donate if I have a condition?'],
  },
  {
    role: 'both',
    keys: ['condition', 'disease', 'diabetes', 'blood pressure', 'hypertension', 'heart', 'bp', 'asthma', 'thyroid', 'cancer', 'hiv', 'hepatitis'],
    text: 'Many chronic conditions are managed and may still allow donation, but some (like recent cancer, or certain blood-borne infections) disqualify donors. Redora follows standard medical screening — always confirm with a doctor whether your condition is eligible. 🩺',
    suggestions: ['Am I eligible?', 'What are the requirements?'],
  },
  {
    role: 'both',
    keys: ['pregnant', 'pregnancy', 'breastfeeding', 'lactating', 'new mother', 'postpartum'],
    text: 'If you are pregnant, you should not donate. After giving birth you typically need to wait a few months (and after breastfeeding stops, a few more) before donating. Always check with your doctor. 🤰',
    suggestions: ['Am I eligible?', 'What are the requirements?'],
  },
  {
    role: 'both',
    keys: ['first time', 'first donation', 'first time donor', 'new donor', 'never donated'],
    text: 'Your first donation is simple: register, complete a short health questionnaire, and have a quick haemoglobin check. Then you donate and rest. The whole thing is usually under 45 minutes — and you\u2019ll feel great knowing you helped save a life! 🌟',
    suggestions: ['How do I donate?', 'Is it safe?', 'What should I eat before?'],
  },
  {
    role: 'both',
    keys: ['rare blood', 'rare blood group', 'rarest blood', 'which blood is rare', 'universal donor', 'universal recipient', 'ab negative', 'o negative', 'negative blood'],
    text: 'In blood donation: O\u2013 is the universal donor (can give to anyone) and AB+ is the universal recipient (can receive from anyone). Rh-negative groups like O\u2013 and AB\u2013 are rarer and especially valuable. 🩸',
    suggestions: ['Which blood can I receive?', 'How does matching work?'],
  },
  {
    role: 'both',
    keys: ['plasma', 'platelets', 'platelet', 'apheresis', 'whole blood', 'components', 'red cells'],
    text: 'Besides whole blood, donated blood can be separated into components — red cells, plasma, and platelets — used to treat different conditions. Apheresis lets you donate a specific component. Redora focuses on whole-blood requests. 🧪',
    suggestions: ['How does matching work?', 'How much blood is taken?'],
  },
  {
    role: 'both',
    keys: ['travel', 'travel restrictions', 'traveled', 'travelled', 'foreign travel', 'visit abroad', 'mosquito'],
    text: 'Recent travel to certain regions may affect your eligibility (for example areas with malaria risk). Mention your travel history during the health screening so the staff can advise you correctly. ✈️',
    suggestions: ['Am I eligible?', 'What are the requirements?'],
  },
  {
    role: 'both',
    keys: ['what happens to my blood', 'where does my blood go', 'who gets my blood', 'how is my blood used', 'uses of blood'],
    text: 'Your blood goes to a hospital or blood bank and may be given to accident victims, surgical patients, people with anaemia or cancer, and newborns. A single donation can help up to three people when split into components. ❤️',
    suggestions: ['How does matching work?', 'What are the benefits?'],
  },
  {
    role: 'both',
    keys: ['not eligible', 'deferred', 'rejected', 'turned away', 'temporary deferral', 'why was i deferred', 'when can i donate again', 'next eligible date'],
    text: 'If you\u2019re deferred it\u2019s usually temporary (low iron, recent illness, recent tattoo, recent travel, or not enough gap since your last donation). Redora shows your next eligible date on your Journey & Donations page. 📅',
    suggestions: ['When can I donate again?', 'Am I eligible?'],
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
  "I don\u2019t have that exact answer saved, but I\u2019m happy to help with donating on Redora — eligibility, weight & health requirements, matching requests, live tracking, certificates, appointments, and the leaderboard. Try rephrasing, or ask \u2018Am I eligible to donate?\u2019 or \u2018How do I donate?\u2019.",
  'I can answer most questions about donating, eligibility, weight, health, live tracking, certificates, and notifications. Try asking me directly \u2014 e.g. \u2018How much should I weigh?\u2019 or \u2018How often can I donate?\u2019.',
]

const FALLBACK_PATIENT = [
  "I don\u2019t have that exact answer saved, but I can help you get blood on Redora — creating requests, finding donors, live tracking, nearby donors, and emergency needs. Try rephrasing, or ask \u2018How do I request blood?\u2019 or \u2018Request blood\u2019.",
  'I can answer most questions about blood requests, matching, live tracking, nearby donors, and notifications. Try asking me directly \u2014 e.g. \u2018How do I post a request?\u2019 or \u2018Who can receive my blood?\u2019.',
]

const FALLBACK_GUEST = [
  "I don\u2019t have that exact answer saved, but I can help with Redora — blood requests, donor eligibility, weight & health requirements, matching, tracking, and certificates. Try rephrasing, or ask \u2018How does matching work?\u2019 or \u2018What are the donation requirements?\u2019.",
  'I can answer most questions about donating, eligibility, weight, live tracking, requests, and notifications. Try asking me directly \u2014 e.g. \u2018How much should I weigh?\u2019 or \u2018How do I donate?\u2019.',
]

/* ------------------------------------------------------------------ *
 *  Blood-request file extract -> pre-fill (no step-by-step wizard).
 * ------------------------------------------------------------------ */

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
  const [uploading, setUploading] = useState(false)
  const [pendingUpload, setPendingUpload] = useState(null) // { fileName, fields }
  const fileRef = useRef(null)
  const messagesEndRef = useRef(null)
  const recogRef = useRef(null)
  const sessionStartedRef = useRef(false)
  const historyRef = useRef([]) // multi-turn context sent to the LLM

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  useEffect(() => {
    scrollToBottom()
  }, [messages, typing, open])

  function toggleOpen() {
    const next = !open
    setOpen(next)
    if (next && !sessionStartedRef.current) {
      sessionStartedRef.current = true
      const greeting =
        user?.role === 'patient'
          ? "Hi, I'm AURA 👋 Your Redora AI assistant. I can answer any question about the platform, and I can create a blood request for you by reading a file you upload (PDF, image, or text) — it auto-fills the request form. Just tap the paperclip 📎 to attach a prescription or hospital note. How can I help you today?"
          : "Hi, I'm AURA 👋 Your Redora AI assistant. I can answer any question about the platform, and I can help you donate, check eligibility, and track your journeys. How can I help you today?"
      pushBot(greeting, [
        'What can you do?',
        user?.role === 'donor' ? 'Am I eligible to donate?' : 'Request blood',
        user?.role === 'patient' ? 'Request blood' : 'How does matching work?',
        'Live tracking',
      ])
    }
  }

  function pushBot(text, suggestions = []) {
    const safe = String(text ?? '')
    setMessages((m) => [...m, { from: 'bot', text: safe, suggestions }])
    historyRef.current = [...historyRef.current, { from: 'bot', text: safe }].slice(-14)
    if (voiceOn) speak(safe.replace(/[^\w\s,.;:'?!@#&()%-]/g, ' '))
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
        if (last) speak(last.text.replace(/[^\w\s,.;:'?!@#&()%-]/g, ' '))
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

  /* ------------------------- file upload -> extract -------------------------- */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = String(reader.result || '')
        resolve(dataUrl.split(',')[1] || '')
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })
  }

  function summarizeFields(f) {
    const parts = []
    if (f.patientName) parts.push(`👤 ${f.patientName}`)
    if (f.phone) parts.push(`📞 ${f.phone}`)
    if (f.bloodGroup) parts.push(`🩸 ${f.bloodGroup}`)
    if (f.units) parts.push(`${f.units} unit${Number(f.units) > 1 ? 's' : ''}`)
    if (f.hospital) parts.push(`🏥 ${f.hospital}`)
    if (f.location) parts.push(`📍 ${f.location}`)
    if (f.urgency) parts.push(f.urgency === 'emergency' ? '🚨 Emergency' : '🕐 Normal')
    if (f.notes) parts.push(`📝 ${f.notes}`)
    return parts.join(' · ')
  }

  function hasAnyField(f) {
    return !!(
      f &&
      Object.keys(f).some(
        (k) => k !== 'urgency' && String(f[k] || '').trim()
      )
    )
  }

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || uploading) return
    setUploading(true)
    pushUser(`📎 ${file.name}`)
    try {
      const base64 = await fileToBase64(file)
      const { data } = await api.post('/chat/extract', {
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        base64,
      })
      const fields = data?.fields || {}
      setUploading(false)
      if (!hasAnyField(fields)) {
        pushBot(
          `I couldn\u2019t read useful request details from "${file.name}". It may be unreadable or not contain blood-request info. You can try another file (PDF, image, or text), or just type the details. 📄`,
          ['Request blood', 'What can you do?']
        )
        return
      }
      const summary = summarizeFields(fields)
      if (user?.role !== 'patient') {
        pushBot(
          `I read "${file.name}" and found: ${summary || 'nothing relevant'}. To pre-fill a blood request from this, please log in as a patient. 💛`
        )
        return
      }
      setPendingUpload({ fileName: file.name, fields })
      pushBot(
        `I read "${file.name}" and pulled out these details:\n\n${summary}\n\nSay \u201cconfirm\u201d to pre-fill the New Blood Request form with these, or \u201ccancel\u201d to ignore the file. You can correct any field on the form before posting.`,
        ['Confirm', 'Cancel']
      )
    } catch (err) {
      console.error('[AuraChatbot] file extract failed:', err)
      setUploading(false)
      pushBot('I couldn\u2019t process that file. Please try again, or type the details manually.')
    }
  }

  function confirmUpload() {
    const f = pendingUpload?.fields || {}
    setPendingUpload(null)
    navigate('/request-blood', {
      state: {
        prefill: {
          patientName: f.patientName || '',
          phone: f.phone || '',
          bloodGroup: f.bloodGroup || '',
          units: Number(f.units) || 1,
          hospital: f.hospital || '',
          location: f.location || '',
          urgency: f.urgency === 'emergency' ? 'emergency' : 'normal',
          notes: f.notes || '',
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

      setTyping(true)
      // Fast path: answer instantly from the built-in KB when it matches (just
      // like a rule-based assistant), so common questions get an immediate
      // reply instead of waiting on the network every time. Gemini (the slow
      // external call) is only used when the local KB has no match.
      const role = user?.role || 'guest'
      const instant = findReply(text, role)
      if (instant) {
        setTimeout(() => {
          try {
            pushBot(instant.text, instant.suggestions || [])
          } finally {
            setTyping(false)
          }
        }, 300)
        return
      }

      // Real conversational AI: ask the backend (Gemini free tier). It returns
      // { source: 'gemini', reply, suggestions, action } or { source: 'rule' }
      // when no API key / on failure. In that case we fall back to the local KB.
      let ai = null
      try {
        const { data } = await api.post('/chat', {
          message: text,
          history: historyRef.current,
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
            if (entry.action === 'navigate' && entry.actionValue) {
              navigate(entry.actionValue)
            }
          } else {
            // Rule-based fallback (no key / Gemini down).
            const localEntry = findReply(text, role)
            let suggestions = []
            if (localEntry) {
              suggestions = localEntry.suggestions || []
              pushBot(localEntry.text, suggestions)
            } else {
              const pool = role === 'donor' ? FALLBACK_DONOR : role === 'patient' ? FALLBACK_PATIENT : FALLBACK_GUEST
              const fb = pool[Math.floor(Math.random() * pool.length)]
              suggestions =
                role === 'donor'
                  ? ['Am I eligible to donate?', 'How do I donate?', 'What is live tracking?']
                  : role === 'patient'
                  ? ['Request blood', 'How does matching work?', 'Nearby donors']
                  : ['What can you do?', 'Request blood', 'How does matching work?']
              pushBot(fb, suggestions)
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

  /* Wrapped handleSend that also processes the pending file upload. */
  async function handleSendFinal(text) {
    const trimmed = (text ?? '').trim()
    if (!trimmed) return
    try {
      if (pendingUpload) {
        if (/confirm|yes|post|submit|go ahead|looks good|fill the form|pre-fill|prefill/i.test(trimmed)) {
          setInput('')
          confirmUpload()
          return
        }
        if (/cancel|no|stop|start over|ignore|dismiss/i.test(trimmed)) {
          setInput('')
          setPendingUpload(null)
          pushBot('Okay, I ignored the file. You can upload another file anytime with the paperclip. 📄')
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
            {user?.role === 'patient' && (
              <button
                type="button"
                className="aura-attach"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                title={uploading ? 'Reading file…' : 'Upload a file to auto-fill (any type)'}
              >
                {uploading ? '⏳' : '📎'}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              style={{ display: 'none' }}
              onChange={onFile}
            />
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
              placeholder={uploading ? 'Reading your file…' : listening ? 'Listening…' : 'Ask AURA or type…'}
            />
            <button className="aura-send" onClick={() => handleSendFinal(input)} disabled={uploading}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  )
}