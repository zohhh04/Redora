import { Link } from 'react-router-dom'
import Reveal from './Reveal'

export default function Roles() {
  return (
    <section className="section roles-section">
      <Reveal className="section-head">
        <span className="section-eyebrow">Who is Redora for?</span>
        <h2 className="section-title">Two Sides, One Mission</h2>
      </Reveal>

      <div className="roles-grid">
        <Reveal delay={100}>
          <div className="role-card role-donor">
            <div className="role-bg" aria-hidden="true"></div>
            <span className="role-emoji">🩸</span>
            <span className="role-tag">I want to donate</span>
            <h3>Become a Donor</h3>
            <ul>
              <li>Build your verified donor profile</li>
              <li>Get matched by AI when you're needed most</li>
              <li>Track your journey and earn certificates</li>
            </ul>
            <Link to="/register" className="btn primary btn-block">
              Register as Donor
            </Link>
          </div>
        </Reveal>

        <Reveal delay={220}>
          <div className="role-card role-patient">
            <div className="role-bg" aria-hidden="true"></div>
            <span className="role-emoji">🏥</span>
            <span className="role-tag">I need blood</span>
            <h3>Request Blood</h3>
            <ul>
              <li>Post a request in seconds with one form</li>
              <li>Get verified by hospitals &amp; admins</li>
              <li>Track donor arrival in real time</li>
            </ul>
            <Link to="/register" className="btn ghost btn-block">
              Request Blood
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
