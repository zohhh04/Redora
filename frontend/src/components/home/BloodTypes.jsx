import Reveal from './Reveal'

const bloodTypes = [
  { type: 'O-', can: 'Universal Donor', color: '#10b981', pct: '9%', note: 'Can give to all' },
  { type: 'O+', can: 'Most Needed', color: '#f59e0b', pct: '38%', note: 'Gives to all Rh+' },
  { type: 'A-', can: 'Rare Donor', color: '#3b82f6', pct: '6%', note: 'Gives to A±, AB±' },
  { type: 'A+', can: 'Common Donor', color: '#8b5cf6', pct: '34%', note: 'Gives to A+, AB+' },
  { type: 'B-', can: 'Rare Donor', color: '#ec4899', pct: '2%', note: 'Gives to B±, AB±' },
  { type: 'B+', can: 'Common Donor', color: '#14b8a6', pct: '8%', note: 'Gives to B+, AB+' },
  { type: 'AB-', can: 'Plasma Donor', color: '#6366f1', pct: '1%', note: 'Gives to AB±' },
  { type: 'AB+', can: 'Universal Plasma', color: '#ef4444', pct: '2%', note: 'Receives from all' },
]

export default function BloodTypes() {
  return (
    <section id="blood-types" className="section blood-section">
      <Reveal className="section-head">
        <span className="section-eyebrow">Know your type</span>
        <h2 className="section-title">Every Type Saves a Life</h2>
        <p className="section-sub">
          Your blood type determines who you can help. Find yours, understand your power, and
          register as a donor today.
        </p>
      </Reveal>

      <div className="blood-grid">
        {bloodTypes.map((b, i) => (
          <Reveal key={b.type} delay={(i % 4) * 90}>
            <div className="blood-card">
              <div className="blood-top">
                <span className="blood-type" style={{ background: b.color }}>
                  {b.type}
                </span>
                <span className="blood-pct">{b.pct} of donors</span>
              </div>
              <div className="blood-role" style={{ color: b.color }}>
                {b.can}
              </div>
              <div className="blood-note">{b.note}</div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
