import { useEffect, useMemo, useState } from 'react'
import api from '../api/axios'
import useReveal from '../hooks/useReveal'

/* ------------------------------------------------------------------ */
/*  Constants & design tokens                                          */
/* ------------------------------------------------------------------ */
const GROUPS = ['O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-']
const GROUP_COLORS = {
  'O+': '#c8102e', 'A+': '#ef4444', 'B+': '#dc2626', 'AB+': '#f87171',
  'O-': '#991b1b', 'A-': '#fca5a5', 'B-': '#b91c1c', 'AB-': '#fecaca',
  '—': '#9ca3af',
}
const SCOPE_TABS = [
  { key: 'global', label: '🌍 Global' },
  { key: 'city', label: '🏙️ My City' },
  { key: 'college', label: '🎓 My College' },
  { key: 'org', label: '🏥 My Organization' },
]
const TIME_TABS = [
  { key: 'all', label: '🕐 All Time' },
  { key: 'month', label: '📅 This Month' },
  { key: 'year', label: '📆 This Year' },
]

function medal(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}
function riskClass(r) {
  const m = { Low: 'low', Medium: 'med', High: 'high', Critical: 'crit' }
  return m[r] || 'low'
}
function fmt(n) {
  return n == null ? '—' : n.toLocaleString()
}

/* ---------------------------------------------------------------- */
/*  Small building blocks                                           */
/* ---------------------------------------------------------------- */
function useCountUp(target, active = true, duration = 1200) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!active) return
    let raf
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, active, duration])
  return val
}
function CountUp({ value, suffix = '' }) {
  const { ref, visible } = useReveal()
  const v = useCountUp(value || 0, visible)
  return <span ref={ref}>{v}{suffix}</span>
}
function Section({ title, icon, sub, children, wide }) {
  const { ref, visible } = useReveal()
  return (
    <section ref={ref} className={`rdx-card ${visible ? 'on' : ''} ${wide ? 'rdx-wide' : ''}`}>
      <header className="rdx-card-head">
        <span className="rdx-card-ico">{icon}</span>
        <div>
          <h3>{title}</h3>
          {sub && <span className="rdx-card-sub">{sub}</span>}
        </div>
      </header>
      {children}
    </section>
  )
}

/* ---- Donut chart (pure SVG) ---- */
function Donut({ data, labelKey = 'group' }) {
  const [hover, setHover] = useState(null)
  const total = useMemo(() => data.reduce((s, d) => s + (d.count || 0), 0), [data])
  const C = 2 * Math.PI * 80
  let acc = 0
  const segs = data.map((d) => {
    const frac = total ? (d.count || 0) / total : 0
    const start = acc
    acc += frac
    const len = Math.max(frac * C - 2, 0)
    return { ...d, frac, len, offset: -start * C }
  })
  const active = hover != null ? segs[hover] : null
  return (
    <div className="rdx-donut-wrap">
      <div className="rdx-donut" onMouseLeave={() => setHover(null)}>
        <svg viewBox="0 0 180 180">
          <g transform="rotate(-90 90 90)">
            {segs.map((d, i) =>
              d.count > 0 ? (
                <circle
                  key={i}
                  cx="90" cy="90" r="80" fill="none"
                  stroke={GROUP_COLORS[d[labelKey]] || '#6366f1'}
                  strokeWidth={hover === i ? 36 : 28}
                  strokeDasharray={`${d.len} 1000`}
                  strokeDashoffset={d.offset}
                  className="rdx-donut-seg"
                  style={{ '--len': d.len, transitionDelay: `${i * 90}ms` }}
                  onMouseEnter={() => setHover(i)}
                />
              ) : null
            )}
          </g>
        </svg>
        <div className="rdx-donut-center">
          {active ? (
            <>
              <strong>{active[labelKey]}</strong>
              <span>{fmt(active.count)} · {Math.round(active.frac * 100)}%</span>
            </>
          ) : (
            <>
              <strong><CountUp value={total} /></strong>
              <span>total</span>
            </>
          )}
        </div>
      </div>
      <div className="rdx-legend">
        {segs.map((d, i) => (
          <div key={i} className={`rdx-legend-row ${hover === i ? 'hot' : ''}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span className="rdx-legend-dot" style={{ background: GROUP_COLORS[d[labelKey]] || '#6366f1' }} />
            <span className="rdx-legend-name">{d[labelKey]}</span>
            <span className="rdx-legend-val">{fmt(d.count)} · {total ? Math.round(d.frac * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---- Line chart (pure SVG), multi-series optional ---- */
function LineChart({ series, labels, height = 200 }) {
  const { ref, visible } = useReveal()
  const W = 520, H = height, PAD = 26
  const max = Math.max(1, ...series.flatMap((s) => s.values).map(Number))
  const n = Math.max(2, labels.length)
  const step = (W - PAD * 2) / (n - 1)
  const x = (i) => PAD + i * step
  const y = (v) => H - PAD - (Number(v) / max) * (H - PAD * 2)
  return (
    <div className="rdx-line" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} className="rdx-chart-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="rdxLineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c8102e" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#c8102e" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={H - PAD - (H - PAD * 2) * f} y2={H - PAD - (H - PAD * 2) * f} className="rdx-grid" />
        ))}
        {series.map((s, si) => {
          const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
          return (
            <g key={si}>
              {si === 0 && <polygon points={`${x(0)},${H - PAD} ${pts} ${x(n - 1)},${H - PAD}`} fill="url(#rdxLineFill)" className={visible ? 'on' : ''} />}
              <polyline points={pts} fill="none" className={`rdx-line-path ${visible ? 'on' : ''}`} style={{ stroke: s.color, '--len': 900, transitionDelay: `${si * 150}ms` }} />
              {visible && pts.length && s.values.map((v, i) => (
                <circle key={i} cx={x(i)} cy={y(v)} r="3.5" fill={s.color} style={{ opacity: 0, animation: `rdxFade .3s ease ${0.4 + si * 0.15 + i * 0.05}s forwards` }} />
              ))}
            </g>
          )
        })}
      </svg>
      <div className="rdx-axis">
        {labels.map((l, i) => <span key={i} className={i % 2 === 0 ? '' : 'dim'}>{l}</span>)}
      </div>
      <div className="rdx-legend-row-line">
        {series.map((s) => (
          <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>
        ))}
      </div>
    </div>
  )
}

/* ---- Vertical bar chart (pure SVG) ---- */
function BarChart({ data, color, valueKey = 'count', height = 190 }) {
  const { ref, visible } = useReveal()
  const max = Math.max(1, ...data.map((d) => Number(d[valueKey] || 0)))
  const W = 520, H = height, PAD = 22
  const bw = Math.min(46, (W - PAD * 2) / data.length * 0.62)
  return (
    <div className="rdx-bars" ref={ref}>
      <svg viewBox={`0 0 ${W} ${H}`} className="rdx-chart-svg" preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={H - PAD - (H - PAD * 2) * f} y2={H - PAD - (H - PAD * 2) * f} className="rdx-grid" />
        ))}
        {data.map((d, i) => {
          const bh = (Number(d[valueKey] || 0) / max) * (H - PAD * 2)
          const cx = PAD + (W - PAD * 2) * ((i + 0.5) / data.length)
          const c = typeof color === 'function' ? color(d) : color
          return (
            <g key={i}>
              <rect
                x={cx - bw / 2} y={H - PAD - bh} width={bw} height={Math.max(bh, 0)}
                rx="6" fill={c} className={`rdx-bar ${visible ? 'on' : ''}`}
                style={{ transitionDelay: `${i * 60}ms` }}
              />
              <text x={cx} y={H - PAD - bh - 7} textAnchor="middle" className="rdx-bar-val">
                {Number(d[valueKey] || 0) > 0 ? fmt(Number(d[valueKey])) : ''}
              </text>
            </g>
          )
        })}
      </svg>
      <div className="rdx-axis">
        {data.map((d, i) => <span key={i} className="rdx-axis-label">{d.label != null ? d.label : d.group}</span>)}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */
export default function Leaderboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [scope, setScope] = useState('global')
  const [time, setTime] = useState('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('score')
  const [commTab, setCommTab] = useState('colleges')

  useEffect(() => {
    setLoading(true)
    api
      .get('/impact')
      .then(({ data }) => setData(data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  // ---- Filtering (scope + time) ----
  const rows = useMemo(() => {
    if (!data) return []
    let list = data.leaderboard || []
    const me = data.me
    const now = new Date()
    if (scope === 'city' || scope === 'org') {
      const c = (me?.city || '').trim()
      if (c) list = list.filter((r) => (r.city || '').trim() === c)
    } else if (scope === 'college') {
      const a = (me?.area || '').trim()
      if (a) list = list.filter((r) => (r.area || '').trim() === a)
    }
    if (time === 'month') {
      list = list.filter((r) => r.lastDonationDate && (() => { const d = new Date(r.lastDonationDate); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() })())
    } else if (time === 'year') {
      list = list.filter((r) => r.lastDonationDate && new Date(r.lastDonationDate).getFullYear() === now.getFullYear())
    }
    return list.map((r, i) => ({ ...r, rank: i + 1 }))
  }, [data, scope, time])

  // ---- Sort + search ----
  const sorted = useMemo(() => {
    let list = [...rows]
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((r) => `${r.name || ''} ${r.city || ''} ${r.bloodGroup || ''}`.toLowerCase().includes(q))
    }
    const by = { score: (a, b) => b.score - a.score, donations: (a, b) => b.donations - a.donations, responses: (a, b) => b.responses - a.responses, name: (a, b) => (a.name || '').localeCompare(b.name || '') }
    return list.sort(by[sort] || by.score)
  }, [rows, search, sort])

  const top3 = sorted.slice(0, 3)
  const rest = sorted.slice(3)

  const agg = useMemo(() => {
    const d = {
      donations: rows.reduce((s, r) => s + r.donations, 0),
      responses: rows.reduce((s, r) => s + r.responses, 0),
      patients: rows.reduce((s, r) => s + r.patients, 0),
    }
    const byGroup = GROUPS.map((g) => ({ group: g, count: rows.filter((r) => r.bloodGroup === g).reduce((s, r) => s + r.donations, 0) })).sort((a, b) => b.count - a.count)
    return { ...d, byGroup, topGroup: byGroup[0] || null, count: rows.length }
  }, [rows])

  const stats = data?.stats || {}
  const me = data?.me || null
  const monthLabels = (data?.monthlyDonations || []).map((m) => m.label)
  const monthVals = (data?.monthlyDonations || []).map((m) => m.count)

  const scopes = useMemo(() => [
    { key: 'global', label: 'Global', value: agg.count },
    { key: 'city', label: 'My City', value: agg.count },
    { key: 'college', label: 'My College', value: agg.count },
    { key: 'org', label: 'My Organization', value: agg.count },
  ], [agg])

  const currentMe = useMemo(() => {
    if (!me) return null
    return rows.find((r) => r.userId === me.userId) || null
  }, [rows, me])

  if (loading) {
    return <div className="page page-wide rdx-page"><div className="rdx-loader"><span /><span /><span /><p>AURA is compiling impact data…</p></div></div>
  }
  if (!data) {
    return <div className="page page-wide rdx-page"><div className="rdx-empty">Unable to load impact data. Please try again.</div></div>
  }

  return (
    <div className="page page-wide rdx-page">
      {/* ============ Header ============ */}
      <header className="rdx-hero">
        <div className="rdx-hero-glow" />
        <div className="rdx-hero-inner">
          <div>
            <span className="rdx-hero-badge">🤖 AURA · Impact Intelligence</span>
            <h1>Redora Impact</h1>
            <p className="rdx-hero-sub">"Every contribution creates hope."</p>
          </div>
          <div className="rdx-hero-stats">
            <div><span>Verified donations</span><strong><CountUp value={stats.verifiedDonations} /></strong></div>
            <div><span>Patients supported</span><strong><CountUp value={stats.patientsSupported} /></strong></div>
            <div><span>Active donors</span><strong><CountUp value={stats.activeDonors} /></strong></div>
          </div>
        </div>
        {/* Scope + time filters */}
        <div className="rdx-filters">
          {SCOPE_TABS.map((t) => (
            <button key={t.key} className={`rdx-filter ${scope === t.key ? 'active' : ''}`} onClick={() => setScope(t.key)}>{t.label}</button>
          ))}
          <span className="rdx-filter-sep" />
          {TIME_TABS.map((t) => (
            <button key={t.key} className={`rdx-filter ${time === t.key ? 'active' : ''}`} onClick={() => setTime(t.key)}>{t.label}</button>
          ))}
        </div>
      </header>

      {/* ============ Impact statistics ============ */}
      <div className="rdx-stats">
        {[
          { icon: '🩸', label: 'Total Verified Donations', value: agg.donations },
          { icon: '🧪', label: 'Blood Units Donated', value: stats.bloodUnits },
          { icon: '🚨', label: 'Emergency Responses', value: agg.responses },
          { icon: '🤝', label: 'Patients Supported', value: agg.patients },
          { icon: '🦸', label: 'Active Donors', value: stats.activeDonors },
          { icon: '⚡', label: 'Avg Emergency Response', value: `${stats.avgResponseMinutes || '—'} min` },
        ].map((s, i) => (
          <div key={i} className="rdx-stat" style={{ '--i': i }}>
            <span className="rdx-stat-ico">{s.icon}</span>
            <div>
              <strong>{s.label === 'Avg Emergency Response' ? s.value : <CountUp value={s.value} />}</strong>
              <span>{s.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ============ AURA AI Insights ============ */}
      <Section title="AURA — Redora AI Assistant" icon="🤖" sub="Personalized insights from your impact data" wide>
        <div className="rdx-aura">
          <div className="rdx-aura-orbit"><span>✦</span></div>
          <div className="rdx-aura-body">
            <div className="rdx-aura-insights">
              {(data.aura?.insights || []).map((t, i) => <p key={i} className="rdx-aura-line"><span>▸</span>{t}</p>)}
            </div>
            <div className="rdx-aura-me">{data.aura?.personalized}</div>
          </div>
        </div>
      </Section>

      {/* ============ Top 3 podium ============ */}
      <Section title="Top Donors" icon="🏆" sub={scopes.find((s) => s.key === scope)?.label + ' · ' + (time === 'all' ? 'All time' : time === 'month' ? 'This month' : 'This year')}>
        {top3.length === 0 && <p className="rdx-hint">No verified donors yet in this view — be the first.</p>}
        {top3.length > 0 && (
          <div className="rdx-podium">
            {top3.map((r) => (
              <div key={r.rank} className={`rdx-podium-card rank-${r.rank} ${me && r.userId === me.userId ? 'is-me' : ''}`} style={{ '--i': r.rank }}>
                <span className="rdx-medal">{medal(r.rank)}</span>
                <span className={`rdx-pod-avatar g-${(r.bloodGroup || 'o').replace('+', 'p').replace('-', 'n').toLowerCase()}`}>
                  {(r.name || '?').charAt(0).toUpperCase()}
                </span>
                <strong className="rdx-pod-name">{r.name}</strong>
                <span className="rdx-pod-sub">{r.city} · {r.bloodGroup}</span>
                <div className="rdx-pod-stats">
                  <div><strong>{fmt(r.donations)}</strong><span>donations</span></div>
                  <div><strong>{fmt(r.responses)}</strong><span>responses</span></div>
                </div>
                <span className="rdx-pod-score">{fmt(r.score)} <small>impact pts</small></span>
                <span className="rdx-pod-badge">{r.achievements?.find((a) => a.earned)?.icon || '🩸'} {r.achievements?.find((a) => a.earned)?.name || 'First Drop'}</span>
                <div className="rdx-pod-bar"><span style={{ width: top3[0].score ? `${(r.score / top3[0].score) * 100}%` : '0%' }} /></div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ============ Main leaderboard ============ */}
      <Section title="Main Leaderboard" icon="📊" sub={`${sorted.length} verified donors`} wide>
        <div className="rdx-board-controls">
          <input className="rdx-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search donor, city, or blood group…" />
          <select className="rdx-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="score">Sort by Impact Score</option>
            <option value="donations">Sort by Donations</option>
            <option value="responses">Sort by Responses</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
        <div className="rdx-table">
          <div className="rdx-tr rdx-th">
            <span>Rank</span><span>Donor</span><span>Donations</span><span>Responses</span><span>Impact</span><span>Badge</span><span>Status</span>
          </div>
          {rest.map((r) => (
            <div key={r.rank} className={`rdx-tr ${me && r.userId === me.userId ? 'is-me' : ''}`}>
              <span className="rdx-rank">{medal(r.rank)}</span>
              <span className="rdx-cell-donor">
                <span className={`rdx-avatar g-${(r.bloodGroup || 'o').replace('+', 'p').replace('-', 'n').toLowerCase()}`}>{(r.name || '?').charAt(0).toUpperCase()}</span>
                <span className="rdx-cell-id">
                  <strong>{r.name}{me && r.userId === me.userId && <em className="rdx-you">you</em>}</strong>
                  <small>{r.city} · {r.bloodGroup}</small>
                </span>
              </span>
              <span className="rdx-num"><strong>{fmt(r.donations)}</strong><small>donations</small></span>
              <span className="rdx-num"><strong>{fmt(r.responses)}</strong><small>responses</small></span>
              <span className="rdx-score"><strong>{fmt(r.score)}</strong><small>pts</small></span>
              <span className="rdx-badge-cell">{r.achievements?.filter((a) => a.earned).slice(-1)[0]?.icon || '🩸'} <small>{r.achievements?.filter((a) => a.earned).slice(-1)[0]?.name || 'First Drop'}</small></span>
              <span className="rdx-status">{r.availableForEmergencies ? <em className="ok">🚨 on-call</em> : r.readyAgain ? <em className="ok">✅ ready</em> : <em className="off">⏳ resting</em>}</span>
            </div>
          ))}
          {rest.length === 0 && sorted.length > 0 && <div className="rdx-hint">All in the podium — donate to join!</div>}
          {sorted.length === 0 && <div className="rdx-hint">No donors match this view.</div>}
        </div>
      </Section>

      {/* ============ Charts & analytics ============ */}
      <div className="rdx-charts">
        <Section title="Monthly Verified Donations" icon="📈" sub="Trend over the last 12 months">
          <LineChart series={[{ name: 'Donations', color: '#c8102e', values: monthVals }]} labels={monthLabels} />
        </Section>
        <Section title="Donations by Blood Group" icon="🧬" sub="Verified donations">
          <BarChart data={data.donationsByBloodGroup} color={(d) => GROUP_COLORS[d.group] || '#c8102e'} />
        </Section>
        <Section title="Emergency Responses" icon="🚨" sub="By month">
          <BarChart data={(data.emergencyByMonth || []).map((m) => ({ label: m.label, count: m.count }))} color="#ef4444" />
        </Section>
        <Section title="Avg Emergency Response Time" icon="⚡" sub="Improvement over time (minutes)">
          <LineChart series={[{ name: 'Minutes', color: '#c8102e', values: (data.responseTrend || []).map((m) => m.minutes) }]} labels={(data.responseTrend || []).map((m) => m.label)} />
        </Section>
        <Section title="Blood Group Distribution" icon="🎯" sub="Active donors by blood group">
          <Donut data={data.donorBloodDistribution || []} />
        </Section>
        <Section title="Emergency Request Status" icon="📋" sub="Live request pipeline">
          <Donut data={data.requestStatus || []} labelKey="name" />
        </Section>
        <Section title="Demand vs Donor Availability" icon="⚖️" sub="Requests vs donations by month">
          <LineChart
            series={[
              { name: 'Demand', color: '#ef4444', values: (data.demandVsAvailability || []).map((m) => m.demand) },
              { name: 'Availability', color: '#16a34a', values: (data.demandVsAvailability || []).map((m) => m.availability) },
            ]}
            labels={(data.demandVsAvailability || []).map((m) => m.label)}
          />
        </Section>
      </div>

      {/* ============ My Redora Impact ============ */}
      <Section title="My Redora Impact" icon="🧑‍🚀" sub="Your personal contribution" wide>
        {!me ? (
          <p className="rdx-hint">Make your first verified donation to unlock your personal impact dashboard.</p>
        ) : (
          <>
            <div className="rdx-mystats">
              <div className="rdx-myhero">
                <span className={`rdx-avatar big g-${(me.bloodGroup || 'o').replace('+', 'p').replace('-', 'n').toLowerCase()}`}>{(me.name || '?').charAt(0).toUpperCase()}</span>
                <div>
                  <strong>{me.name}</strong>
                  <span>{me.city} · {me.bloodGroup}</span>
                </div>
                <span className="rdx-myrank">Rank <b>#{currentMe ? currentMe.rank : me.rank}</b></span>
              </div>
              <div className="rdx-mymetrics">
                {[
                  ['🩸', 'Verified donations', currentMe ? currentMe.donations : me.donations],
                  ['🚨', 'Emergency responses', currentMe ? currentMe.responses : me.responses],
                  ['🤝', 'Patients supported', currentMe ? currentMe.patients : me.patients],
                  ['⚡', 'Avg response', `${me.avgResponse != null ? me.avgResponse : '—'} min`],
                  ['✨', 'Impact score', currentMe ? currentMe.score : me.score],
                ].map(([ico, l, v]) => (
                  <div key={l} className="rdx-mymetric"><span>{ico}</span><strong>{typeof v === 'number' ? <CountUp value={v} /> : v}</strong><small>{l}</small></div>
                ))}
              </div>
            </div>
            <div className="rdx-badge-progress">
              {me.achievements.map((a) => (
                <div key={a.key} className="rdx-bp-item">
                  <span className="rdx-bp-ico">{a.earned ? a.icon : '🔒'}</span>
                  <div className="rdx-bp-body">
                    <strong>{a.name} {a.earned && '· earned'}</strong>
                    <div className="rdx-bp-bar"><span style={{ width: `${(a.progress / a.need) * 100}%` }} /></div>
                    <small>{a.progress}/{a.need} {a.desc}</small>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      {/* ============ Achievements ============ */}
      <Section title="Achievements" icon="🏅" sub="Unlock recognition as you give">
        <div className="rdx-achievements">
          {data.achievements.map((a) => {
            const earned = me?.achievements?.find((x) => x.key === a.key)?.earned
            return (
              <div key={a.key} className={`rdx-achievement ${earned ? 'earned' : 'locked'}`}>
                <span className="rdx-ach-ico">{a.icon}</span>
                <div>
                  <strong>{a.name}</strong>
                  <span>{a.desc}</span>
                  <em>{earned ? 'Unlocked' : 'Locked'}</em>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* ============ Special recognition ============ */}
      <Section title="Special Recognition" icon="🌟" sub="Standout contributions">
        <div className="rdx-recog">
          {(data.recognition || []).map((r, i) => (
            <div key={i} className="rdx-recog-item">
              <span className="rdx-recog-ico">{r.icon}</span>
              <div><strong>{r.category}</strong><span className="rdx-recog-name">{r.name}</span><small>{r.detail}</small></div>
            </div>
          ))}
        </div>
      </Section>

      {/* ============ Community leaderboards ============ */}
      <Section title="Community Leaderboards" icon="🏙️" sub="Verified contributions by group" wide>
        <div className="rdx-comm-tabs">
          {[['colleges', '🎓 College'], ['organizations', '🏥 Organization'], ['cities', '🏙️ City']].map(([k, l]) => (
            <button key={k} className={`rdx-comm-tab ${commTab === k ? 'active' : ''}`} onClick={() => setCommTab(k)}>{l}</button>
          ))}
        </div>
        <div className="rdx-comm-list">
          {(data.community?.[commTab] || []).map((c, i) => (
            <div key={i} className="rdx-comm-row">
              <span className="rdx-rank">{medal(i + 1)}</span>
              <strong>{c.name}</strong>
              <span className="rdx-comm-donors">{c.donors} donor{c.donors === 1 ? '' : 's'}</span>
              <span className="rdx-comm-bar"><span style={{ width: `${(c.donations / (data.community?.[commTab]?.[0]?.donations || 1)) * 100}%` }} /></span>
              <span className="rdx-comm-val">{fmt(c.donations)}</span>
            </div>
          ))}
          {(data.community?.[commTab] || []).length === 0 && <p className="rdx-hint">No contributions yet.</p>}
        </div>
      </Section>

      {/* ============ Regional impact map ============ */}
      <Section title="Regional Impact" icon="🗺️" sub="Donor availability, emergencies & blood banks (privacy-safe)" wide>
        <ImpactMap data={data.map || { donors: [], requests: [] }} />
      </Section>

      {/* ============ AI blood demand forecast ============ */}
      <Section title="AI Blood Demand Forecast" icon="🔮" sub="Predicted demand for the next 7 days" wide>
        <div className="rdx-forecast">
          {data.forecast.map((f) => (
            <div key={f.group} className="rdx-fc-item">
              <div className="rdx-fc-head">
                <span className="rdx-fc-group" style={{ background: GROUP_COLORS[f.group] }}>{f.group}</span>
                <span className={`rdx-risk ${riskClass(f.shortageRisk)}`}>{f.shortageRisk}</span>
              </div>
              <div className="rdx-fc-rows">
                <span><small>Expected demand</small><strong>{f.expected} units</strong></span>
                <span><small>Availability</small><strong>{f.available} donors</strong></span>
              </div>
              <p className="rdx-fc-reco">🤖 {f.recommendation}</p>
            </div>
          ))}
        </div>
      </Section>

      <p className="rdx-footnote">Only verified donations and emergency responses contribute to rankings. Donor privacy is protected — exact locations and personal details are never exposed.</p>
    </div>
  )
}

/* ---- Privacy-safe regional map (pure SVG scatter) ---- */
function ImpactMap({ data }) {
  const { ref, visible } = useReveal()
  const markers = useMemo(() => {
    const donors = (data.donors || []).map((d) => ({ ...d, type: 'donor' }))
    const requests = (data.requests || []).map((r) => ({ ...r, type: 'request' }))
    return [...donors, ...requests]
  }, [data])
  const norm = useMemo(() => {
    const lats = markers.map((m) => m.lat).filter((v) => v != null)
    const lngs = markers.map((m) => m.lng).filter((v) => v != null)
    if (!lats.length) return []
    const minLat = Math.min(...lats), maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
    const W = 520, H = 240, PAD = 26
    const span = Math.max(maxLat - minLat, maxLng - minLng, 0.01)
    return markers.map((m) => ({
      ...m,
      x: PAD + ((m.lng - minLng) / span) * (W - PAD * 2),
      y: H - PAD - ((m.lat - minLat) / span) * (H - PAD * 2),
    }))
  }, [markers])
  return (
    <div className="rdx-map" ref={ref}>
      <svg viewBox="0 0 520 260" className="rdx-map-svg">
        <rect x="14" y="14" width="492" height="232" rx="16" className="rdx-map-grid" />
        {[0.2, 0.4, 0.6, 0.8].map((f) => (
          <line key={'h' + f} x1="14" x2="506" y1={14 + 232 * f} y2={14 + 232 * f} className="rdx-map-lines" />
        ))}
        {[0.2, 0.4, 0.6, 0.8].map((f) => (
          <line key={'v' + f} y1="14" y2="246" x1={14 + 492 * f} x2={14 + 492 * f} className="rdx-map-lines" />
        ))}
        {norm.map((m, i) => {
          if (m.type === 'donor') {
            return <circle key={i} cx={m.x} cy={m.y} r="5" fill={m.available ? '#16a34a' : '#c8102e'} className={visible ? 'rdx-map-dot on' : 'rdx-map-dot'} style={{ transitionDelay: `${i * 15}ms` }} />
          }
          return (
            <g key={i} className={visible ? 'rdx-map-dot on' : 'rdx-map-dot'} style={{ transitionDelay: `${i * 15}ms` }}>
              <circle cx={m.x} cy={m.y} r={m.emergency ? 9 : 6} fill={m.emergency ? '#ef4444' : '#fbbf24'} />
              <title>{m.emergency ? 'Emergency' : 'Blood request'} · {m.group} · {m.units} unit{m.units > 1 ? 's' : ''}</title>
            </g>
          )
        })}
      </svg>
      <div className="rdx-map-legend">
        <span><i className="donor" />Donor available</span>
        <span><i className="donor idle" />Donor registered</span>
        <span><i className="req" />Blood request</span>
        <span><i className="emer" />Emergency</span>
      </div>
      <p className="rdx-map-note">Aggregated and anonymized — marker positions are approximate for privacy.</p>
    </div>
  )
}