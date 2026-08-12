// Plays a short chime using the Web Audio API (no audio file needed).
let ctx = null

function ensureContext() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return null
    ctx = new AC()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

function note(ac, freq, start, duration, volume) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(start)
  osc.stop(start + duration + 0.05)
}

// Two ascending tones: A5 then D6 — a friendly "new alert" chime.
export function playNotifChime() {
  try {
    const ac = ensureContext()
    if (!ac) return
    const now = ac.currentTime
    note(ac, 880, now, 0.35, 0.12)
    note(ac, 1174.66, now + 0.15, 0.5, 0.12)
  } catch {
    // Audio unavailable or blocked — silently ignore.
  }
}

// Looping alert — keeps chiming until stopNotifLoop() is called, so the
// donor is nudged until they Accept or Decline/Delay the popup.
let loopTimer = null

export function startNotifLoop() {
  stopNotifLoop()
  playNotifChime()
  loopTimer = setInterval(playNotifChime, 2500)
}

export function stopNotifLoop() {
  if (loopTimer) {
    clearInterval(loopTimer)
    loopTimer = null
  }
}
