// Tiny free translation helper using MyMemory (no API key needed for the
// anonymous tier). Results are cached in memory so a 4s polling chat doesn't
// re-call the service for the same text + target language over and over.
const CACHE = new Map()
const CACHE_MAX = 500

function remember(key, value) {
  if (CACHE.size >= CACHE_MAX) CACHE.clear()
  CACHE.set(key, value)
}

// Translates `text` into `targetLang` (ISO 639-1, e.g. "es", "hi", "fr").
// Returns { translatedText, detectedLang, isTranslated }. Falls back to the
// original text if the request fails so the chat never breaks.
async function translateText(text, targetLang) {
  const clean = (text || "").trim()
  if (!clean || !targetLang) return { translatedText: clean, detectedLang: "en", isTranslated: false }

  const key = `${targetLang}|${clean}`
  if (CACHE.has(key)) {
    const hit = CACHE.get(key)
    return { ...hit, isTranslated: hit.detectedLang !== targetLang }
  }

  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      clean.slice(0, 480)
    )}&langpair=autodetect|${encodeURIComponent(targetLang)}`
    const res = await fetch(url, { signal: ctrl.signal })
    clearTimeout(timer)
    const data = await res.json()
    const translatedText = data?.responseData?.translatedText || ""
    const detectedLang = (data?.responseData?.detectedLanguage || "en").toLowerCase()

    if (translatedText && translatedText !== clean) {
      const value = { translatedText, detectedLang }
      remember(key, value)
      return { translatedText, detectedLang, isTranslated: detectedLang !== targetLang }
    }
    // Nothing to translate (already in the target language) — remember to skip.
    const same = { translatedText: clean, detectedLang: targetLang }
    remember(key, same)
    return { translatedText: clean, detectedLang: targetLang, isTranslated: false }
  } catch {
    return { translatedText: clean, detectedLang: "en", isTranslated: false }
  }
}

module.exports = { translateText }