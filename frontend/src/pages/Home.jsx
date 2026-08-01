import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const stats = [
  { value: '2', label: 'Seconds to find a match' },
  { value: '100%', label: 'Verified donors' },
  { value: '24/7', label: 'Emergency support' },
  { value: '0', label: 'Cost to save a life' },
]

const features = [
  {
    icon: '🩸',
    title: 'Verified Donor Network',
    text: 'OTP-verified donors with eligibility tracking, so every call for blood reaches someone truly able to give.',
  },
  {
    icon: '🎯',
    title: 'Smart AI Matching',
    text: 'Donors are scored on compatibility, availability, distance, and travel time — the right donor is chosen automatically.',
  },
  {
    icon: '🚗',
    title: 'Live Journey Tracking',
    text: 'Follow your donor from acceptance to arrival with real-time ETA and step-by-step confirmation.',
  },
  {
    icon: '🏥',
    title: 'Hospital Coordination',
    text: 'Requests are verified by hospitals and admins, and the actual donation happens under medical supervision.',
  },
  {
    icon: '🎖️',
    title: 'Life Saver Certificates',
    text: 'Every completed donation is logged and rewarded with a Redora Life Saver Certificate.',
  },
  {
    icon: '❤️',
    title: 'Real-Time Updates',
    text: 'Request created, donor notified, accepted, on the way, arrived, fulfilled — every step visible live.',
  },
]

const steps = [
  { title: 'Create your account', text: 'Sign up in under a minute with email OTP verification.' },
  { title: 'Post or receive a request', text: 'Patients request blood, donors get smart alerts near them.' },
  { title: 'Smart match & accept', text: 'AI picks the best donor. Donors accept and start their journey.' },
  { title: 'Donate & save a life', text: 'Donation is completed at the hospital and certified.' },
]

export default function Home() {
  const { user } = useAuth()

  return (
    <div className="home">
      <header className="hero">
        <h1 className="brand">🩸 Redora</h1>
        <p className="tagline">Where Technology Meets Life — A New Aura of Hope</p>
        <p className="hero-text">
          Every drop counts. Redora connects donors, patients, hospitals, and blood banks in
          real time — so that when someone needs blood, the right donor is just minutes away.
        </p>

        <div className="actions">
          {user ? (
            <Link to="/dashboard" className="btn primary">
              Go to Dashboard
            </Link>
          ) : (
            <Link to="/register" className="btn primary">
              Get Started — It's Free
            </Link>
          )}
        </div>
      </header>

      <section className="section stats">
        {stats.map((s) => (
          <div key={s.label} className="stat">
            <span className="stat-value">{s.value}</span>
            <span className="stat-label">{s.label}</span>
          </div>
        ))}
      </section>

      <section className="section">
        <h2 className="section-title">How Redora Works</h2>
        <div className="steps">
          {steps.map((st) => (
            <div key={st.title} className="step">
              <h3>{st.title}</h3>
              <p>{st.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Why Redora?</h2>
        <div className="feature-grid">
          {features.map((f) => (
            <div key={f.title} className="feature-card">
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="cta-banner">
          <h2>Be the reason someone smiles today ❤️</h2>
          <p>
            Whether you are ready to donate or need blood, Redora brings hope closer — faster,
            smarter, and with care.
          </p>
          {user ? (
            <Link to="/dashboard" className="btn primary">
              Go to Dashboard
            </Link>
          ) : (
            <Link to="/register" className="btn primary">
              Join Redora Now
            </Link>
          )}
        </div>
      </section>

      <footer className="home-footer">
        <p className="hint">Redora — A New Aura of Hope. ❤️</p>
      </footer>
    </div>
  )
}
