import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Reveal from './Reveal'

export default function CtaBanner() {
  const { user } = useAuth()

  return (
    <section className="section cta-section">
      <Reveal>
        <div className="cta-banner">
          <div className="cta-particles" aria-hidden="true">
            {[...Array(8)].map((_, i) => (
              <span key={i} className="cta-drop" style={{ left: `${(i * 13 + 5) % 100}%`, animationDelay: `${i * 0.8}s` }}></span>
            ))}
          </div>
          <span className="cta-badge">🫀 Join the movement</span>
          <h2>Be the reason someone smiles today</h2>
          <p>
            Whether you are ready to donate or need blood, Redora brings hope closer — faster,
            smarter, and with care.
          </p>
          {user ? (
            <Link to="/dashboard" className="btn primary btn-lg">
              Go to Dashboard →
            </Link>
          ) : (
            <Link to="/register" className="btn primary btn-lg">
              Join Redora Now
            </Link>
          )}
          <small className="cta-note">Free forever · No hidden costs · OTP verified</small>
        </div>
      </Reveal>
    </section>
  )
}
