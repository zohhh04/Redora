import Reveal from './Reveal'

const steps = [
  { icon: '🗒️', title: 'Create your account', text: 'Sign up in under a minute with email OTP verification.' },
  { icon: '📡', title: 'Post or receive a request', text: 'Patients request blood, donors get smart alerts near them.' },
  { icon: '🤖', title: 'Smart match & accept', text: 'AI picks the best donor. Donors accept and start their journey.' },
  { icon: '🏅', title: 'Donate & save a life', text: 'Donation is completed at the hospital and certified.' },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section how-section">
      <Reveal className="section-head">
        <span className="section-eyebrow">Simple by design</span>
        <h2 className="section-title">How Redora Works</h2>
        <p className="section-sub">
          From request to life saved — four steps, no paperwork, zero delays.
        </p>
      </Reveal>

      <div className="steps">
        {steps.map((st, i) => (
          <Reveal key={st.title} delay={i * 130} className="step-wrap">
            <div className="step">
              <span className="step-icon">{st.icon}</span>
              <span className="step-num">{String(i + 1).padStart(2, '0')}</span>
              <h3>{st.title}</h3>
              <p>{st.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
