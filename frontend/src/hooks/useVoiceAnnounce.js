import { useCallback, useRef, useState } from 'react'
import api from '../api/axios'

// 9+ Indian languages supported by browser speech recognition (Chrome/Edge)
// and speech synthesis. `bcp47` drives STT, `voice` is the TTS voice prefix.
export const VOICE_LANGS = [
  { code: 'en', label: 'English', bcp47: 'en-IN', voice: 'en' },
  { code: 'hi', label: 'हिन्दी', bcp47: 'hi-IN', voice: 'hi' },
  { code: 'ta', label: 'தமிழ்', bcp47: 'ta-IN', voice: 'ta' },
  { code: 'te', label: 'తెలుగు', bcp47: 'te-IN', voice: 'te' },
  { code: 'bn', label: 'বাংলা', bcp47: 'bn-IN', voice: 'bn' },
  { code: 'mr', label: 'मराठी', bcp47: 'mr-IN', voice: 'mr' },
  { code: 'gu', label: 'ગુજરાતી', bcp47: 'gu-IN', voice: 'gu' },
  { code: 'kn', label: 'ಕನ್ನಡ', bcp47: 'kn-IN', voice: 'kn' },
  { code: 'ml', label: 'മലയാളം', bcp47: 'ml-IN', voice: 'ml' },
  { code: 'or', label: 'ଓଡ଼ିଆ', bcp47: 'or-IN', voice: 'or' },
]

const langByCode = (code) => VOICE_LANGS.find((l) => l.code === code) || VOICE_LANGS[0]

function speakRaw(text, { lang, rate = 1, pitch = 1 } = {}) {
  const synth = window.speechSynthesis
  const Ctor = window.SpeechSynthesisUtterance
  if (!synth || !Ctor || typeof window === 'undefined') return
  try {
    synth.cancel()
    const u = new Ctor(text)
    const meta = langByCode(lang)
    u.lang = meta.bcp47
    u.rate = rate
    u.pitch = pitch
    const voices = typeof synth.getVoices === 'function' ? synth.getVoices() : []
    const voice =
      voices.find((v) => v.lang?.toLowerCase().startsWith(meta.voice.toLowerCase())) ||
      voices.find((v) => /en(-|_)?(US|GB|IN)/i.test(v.lang))
    if (voice) u.voice = voice
    synth.speak(u)
  } catch {
    // Ignore unsupported speech setups.
  }
}

// Cross-lingual voice guide used on the live tracking pages. Lets a busy doctor
// or donor follow the journey hands-free, announced in their chosen language.
export function useVoiceAnnounce(initialLang = 'en') {
  const [lang, setLang] = useState(initialLang)
  const [voiceOn, setVoiceOn] = useState(false)
  const langRef = useRef(lang)
  langRef.current = lang
  const voiceRef = useRef(voiceOn)
  voiceRef.current = voiceOn

  const speak = useCallback((text, opts = {}) => {
    if (!(opts.force ?? voiceRef.current)) return
    speakRaw(text, { lang: opts.lang || langRef.current, rate: opts.rate, pitch: opts.pitch })
  }, [])

  // Translate text into the active language, then speak it. Returns the
  // translated text so callers can mirror it on screen if they want.
  const announce = useCallback(
    async (text, opts = {}) => {
      const target = opts.lang || langRef.current
      let out = text
      if (target !== 'en') {
        try {
          const { data } = await api.post('/translate', { text, target })
          out = data?.translatedText || text
        } catch {
          // keep original
        }
      }
      speak(out, { ...opts, lang: target })
      return out
    },
    [speak],
  )

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

  return { lang, setLang, voiceOn, setVoiceOn, toggleVoice, speak, announce }
}

export { speakRaw }