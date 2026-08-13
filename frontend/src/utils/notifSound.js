// Urgent emergency alarm using the Web Audio API (no audio file needed).
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

// A quick high-pitched tone with a fast attack/decay.
function beep(ac, freq, start, duration, volume) {
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'square'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain)
  gain.connect(ac.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

// Fast two-tone siren wail (high-low-high-low) so it grabs attention immediately.
export function playNotifChime() {
  try {
    const ac = ensureContext()
    if (!ac) return
    const now = ac.currentTime
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.32
      beep(ac, 950, t, 0.16, 0.14)
      beep(ac, 1350, t + 0.16, 0.16, 0.14)
    }
  } catch {
    // Audio unavailable or blocked — silently ignore.
  }
}

// Looping siren — keeps wailing until stopNotifLoop() is called, so the
// donor is nudged until they Accept or Decline/Delay the popup.
let loopTimer = null

export function startNotifLoop() {
  stopNotifLoop()
  playNotifChime()
  loopTimer = setInterval(playNotifChime, 1300)
}

export function stopNotifLoop() {
  if (loopTimer) {
    clearInterval(loopTimer)
    loopTimer = null
  }
}