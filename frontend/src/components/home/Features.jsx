import Reveal from './Reveal'

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
    icon: '📲',
    title: 'Real-Time Updates',
    text: 'Request created, donor notified, accepted, on the way, arrived, fulfilled — every step visible live.',
  },
]

export default function Features() {
  return (
    <section className="section features-section">
      <Reveal className="section-head">
        <span className="section-eyebrow">Why Redora</span>
        <h2 className="section-title">Built to Save Time &amp; Lives</h2>
        <p className="section-sub">
          Everything a modern blood platform needs — in one seamless experience.
        </p>
      </Reveal>

      <div className="feature-grid">
        {features.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 110}>
            <div className="feature-card">
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
