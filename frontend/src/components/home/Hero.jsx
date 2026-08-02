import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Reveal from './Reveal'

function HeroIllustration() {
  return (
    <div className="hero-art" aria-hidden="true">
      <div className="hero-glow"></div>
      <svg viewBox="0 0 340 360" className="hero-drop" role="img">
        <defs>
          <linearGradient id="dropGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff5c74" />
            <stop offset="100%" stopColor="#c8102e" />
          </linearGradient>
          <linearGradient id="dropSheen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d="M170 18 C 196 74 252 118 252 176 C 252 222 215 258 170 258 C 125 258 88 222 88 176 C 88 118 144 74 170 18 Z"
          fill="url(#dropGrad)"
        />
        <path
          d="M170 18 C 196 74 252 118 252 176 C 252 222 215 258 170 258 C 125 258 88 222 88 176 C 88 118 144 74 170 18 Z"
          fill="url(#dropSheen)"
          opacity="0.35"
        />
        <path
          d="M170 18 C 196 74 252 118 252 176 C 252 222 215 258 170 258"
          fill="none"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />
        <path
          d="M118 178 h 24 l 12 -26 14 42 12 -26 8 10 h 34"
          fill="none"
          stroke="#ffffff"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="214" cy="106" r="20" fill="#ffffff" opacity="0.18" />
      </svg>

      <span className="art-chip art-chip-1">🩸 O+</span>
      <span className="art-chip art-chip-2">❤️ 2s match</span>
      <span className="art-chip art-chip-3">🏥 Verified</span>
    </div>
  )
}

export default function Hero() {
  const { user } = useAuth()

  return (
    <section className="hero">
      <div className="hero-bg" aria-hidden="true">
        <span className="blob blob-1"></span>
        <span className="blob blob-2"></span>
        <span className="blob blob-3"></span>
        {[...Array(10)].map((_, i) => (
          <span key={i} className="float-drop" style={{ left: `${(i * 9.5 + 4) % 100}%`, animationDelay: `${i * 0.9}s` }}></span>
        ))}
      </div>

      <div className="hero-inner">
        <div className="hero-copy">
          <Reveal>
            <span className="hero-badge">🩸 Every drop counts</span>
          </Reveal>
          <Reveal delay={100}>
            <h1 className="hero-title">
              Where <span className="grad-text">Technology</span>
              <br />
              Meets <span className="grad-text">Life</span>
            </h1>
          </Reveal>
          <Reveal delay={200}>
            <p className="hero-sub">
              Redora connects donors, patients, hospitals, and blood banks in real time — powered
              by AI-based donor matching, so the right donor is <strong>minutes away</strong>.
            </p>
          </Reveal>
          <Reveal delay={300}>
            <div className="actions">
              {user ? (
                <Link to="/dashboard" className="btn primary btn-lg">
                  Go to Dashboard →
                </Link>
              ) : (
                <>
                  <Link to="/register" className="btn primary btn-lg">
                    Get Started — It's Free
                  </Link>
                  <Link to="/login" className="btn ghost btn-lg">
                    Login
                  </Link>
                </>
              )}
            </div>
          </Reveal>
          <Reveal delay={400}>
            <div className="hero-proof">
              <div className="avatars">
                {['#c8102e', '#ff5c74', '#f59e0b', '#2563eb', '#7c3aed'].map((c, i) => (
                  <span key={c} className="avatar" style={{ background: c, animationDelay: `${i * 0.6}s` }}>
                    {['🧑‍⚕️', '🧑', '👩', '👨‍🦱', '👵'][i]}
                  </span>
                ))}
              </div>
              <p>
                Trusted by <strong>10,000+</strong> donors &amp; <strong>500+</strong> hospitals
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={200} direction="left">
          <HeroIllustration />
        </Reveal>
      </div>

      <div className="hero-wave" aria-hidden="true">
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path
            d="M0,64 C360,110 720,0 1080,32 C1260,48 1380,72 1440,64 L1440,120 L0,120 Z"
            fill="#ffffff"
          />
        </svg>
      </div>
    </section>
  )
}
