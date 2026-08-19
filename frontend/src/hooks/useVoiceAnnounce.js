import { useCallback, useRef, useState } from 'react'

function speakRaw(text, { rate = 1, pitch = 1 } = {}) {
  const synth = window.speechSynthesis
  const Ctor = window.SpeechSynthesisUtterance
  if (!synth || !Ctor || typeof window === 'undefined') return
  try {
    synth.cancel()
    const u = new Ctor(text)
    u.lang = 'en-IN'
    u.rate = rate
    u.pitch = pitch
    const voices = typeof synth.getVoices === 'function' ? synth.getVoices() : []
    const voice = voices.find((v) => /en(-|_)?(US|GB|IN)/i.test(v.lang)) || voices.find((v) => v.lang?.startsWith('en'))
    if (voice) u.voice = voice
    synth.speak(u)
  } catch {
    // Ignore unsupported speech setups.
  }
}

// Voice guide for the live tracking pages. Speaks each journey stage in English
// so a busy doctor or donor can follow hands-free.
export function useVoiceAnnounce() {
  const [voiceOn, setVoiceOn] = useState(false)
  const voiceRef = useRef(voiceOn)
  voiceRef.current = voiceOn

  const speak = useCallback((text, opts = {}) => {
    if (!(opts.force ?? voiceRef.current)) return
    speakRaw(text, { rate: opts.rate, pitch: opts.pitch })
  }, [])

  const announce = useCallback((text, opts = {}) => {
    speak(text, opts)
  }, [speak])

  const toggleVoice = useCallback(() => {
    setVoiceOn((v) => {
      if (v) {
        try {
          window.speechSynthesis?.cancel()
        } catch {}
      }
      return !v
    })
  }, [])

  return { voiceOn, setVoiceOn, toggleVoice, speak, announce }
}

export { speakRaw }