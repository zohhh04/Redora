import { VOICE_LANGS } from '../hooks/useVoiceAnnounce'

// Compact toolbar: choose a language + toggle spoken journey updates. Used on
// the live tracking pages so a doctor/donor can follow hands-free.
export default function VoiceControls({ lang, setLang, voiceOn, toggleVoice }) {
  const label = VOICE_LANGS.find((l) => l.code === lang)?.label || 'English'
  return (
    <div className={`voice-controls ${voiceOn ? 'on' : ''}`}>
      <select
        className="voice-lang"
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        title={`Journey voice language: ${label}`}
        aria-label="Journey voice language"
      >
        {VOICE_LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={`voice-toggle ${voiceOn ? 'on' : ''}`}
        onClick={toggleVoice}
        title={voiceOn ? 'Turn off voice updates' : 'Turn on voice updates'}
        aria-label={voiceOn ? 'Mute voice updates' : 'Enable voice updates'}
      >
        {voiceOn ? '🔊' : '🔇'}
      </button>
    </div>
  )
}