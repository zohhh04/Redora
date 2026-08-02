import useReveal from '../../hooks/useReveal'
import useCountUp from '../../hooks/useCountUp'
import Reveal from './Reveal'

const stats = [
  { target: 10000, suffix: '+', label: 'Lives Touched', icon: '❤️' },
  { target: 4800, suffix: '+', label: 'Donations Completed', icon: '🩸' },
  { target: 500, suffix: '+', label: 'Partner Hospitals', icon: '🏥' },
  { target: 2, prefix: '', suffix: ' sec', label: 'Average Match Time', icon: '⚡' },
]

function Stat({ icon, target, suffix, prefix, label, active, delay }) {
  const value = useCountUp(target, active, 1600)
  const display = target >= 1000 ? Math.round(value).toLocaleString() : Math.round(value)

  return (
    <Reveal delay={delay} className="stat-cell-wrap">
      <div className="stat-cell">
        <span className="stat-icon">{icon}</span>
        <span className="stat-value">
          {prefix}
          {display}
          {suffix}
        </span>
        <span className="stat-label">{label}</span>
      </div>
    </Reveal>
  )
}

export default function Stats() {
  const { ref, visible } = useReveal()

  return (
    <section className="section stats-section" ref={ref}>
      <div className="stats-grid">
        {stats.map((s, i) => (
          <Stat key={s.label} {...s} active={visible} delay={i * 120} />
        ))}
      </div>
    </section>
  )
}
