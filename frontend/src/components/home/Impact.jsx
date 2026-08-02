import Reveal from './Reveal'

const facts = [
  { icon: '💛', title: 'Save up to 3 lives', text: 'A single donation of blood can be separated into red cells, plasma, and platelets.' },
  { icon: '⏱️', title: 'Every 2 seconds', text: 'Someone in the world needs blood. Your donation could be the one that shows up.' },
  { icon: '⏳', title: 'Just 10 minutes', text: 'The actual donation takes about 10 minutes — a small price for a lifetime of difference.' },
  { icon: '📉', title: 'Only 5% donate', text: 'Fewer than 5% of eligible people donate. The gap between need and supply is real.' },
]

function ImpactArt() {
  return (
    <div className="impact-art" aria-hidden="true">
      <div className="impact-ring">
        <svg viewBox="0 0 300 300">
          <defs>
            <linearGradient id="heartGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff5c74" />
              <stop offset="100%" stopColor="#c8102e" />
            </linearGradient>
          </defs>
          <circle cx="150" cy="150" r="144" fill="#fff" opacity="0.5" />
          <circle cx="150" cy="150" r="144" fill="none" stroke="#fde8ec" strokeWidth="10" strokeDasharray="4 8" />
          <path
            d="M150 96 C 118 60 70 88 70 132 C 70 178 150 236 150 236 C 150 236 230 178 230 132 C 230 88 182 60 150 96 Z"
            fill="url(#heartGrad)"
            className="impact-heart"
          />
          <path
            d="M112 138 h 18 l 8 -18 12 40 9 -22 h 21"
            fill="none"
            stroke="#fff"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="150" cy="238" r="18" fill="#c8102e" className="impact-bounce" />
        </svg>
      </div>
      <span className="art-chip art-chip-1">❤️ 1 donation</span>
      <span className="art-chip art-chip-2">= 3 lives</span>
    </div>
  )
}

export default function Impact() {
  return (
    <section id="impact" className="impact-section">
      <div className="impact-inner">
        <Reveal direction="left">
          <ImpactArt />
        </Reveal>
        <div className="impact-copy">
          <Reveal>
            <span className="section-eyebrow">The facts</span>
            <h2 className="section-title">Why Your Blood Matters</h2>
          </Reveal>
          <div className="fact-list">
            {facts.map((f, i) => (
              <Reveal key={f.title} delay={i * 110}>
                <div className="fact">
                  <span className="fact-icon">{f.icon}</span>
                  <div>
                    <h3>{f.title}</h3>
                    <p>{f.text}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
