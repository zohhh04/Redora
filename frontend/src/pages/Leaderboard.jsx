import { useEffect, useMemo, useState } from 'react'
import api from '../api/axios'

const GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const GROUP_COLORS = {
  'A+': '#e11d48',
  'A-': '#f472b6',
  'B+': '#f59e0b',
  'B-': '#fbbf24',
  'AB+': '#8b5cf6',
  'AB-': '#a78bfa',
  'O+': '#ef4444',
  'O-': '#6366f1',
}

const TABS = [
  { key: 'overall', label: '🌍 Overall' },
  { key: 'month', label: '📅 This Month' },
  { key: 'city', label: '🏙️ Your City' },
]

function medal(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

function avatarClass(group) {
  const g = (group || 'o').replace('+', 'p').replace('-', 'n').toLowerCase()
  return `bg-${g}`
}

function fmtDays(n) {
  if (n == null) return '—'
  if (n === 0) return 'today'
  if (n === 1) return 'yesterday'
  return `${n}d ago`
}

// Animated count-up number.
function useCountUp(target, duration = 1400) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    let raf
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(0 + (target - 0) * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return val
}

export default function Leaderboard() {
  const [all, setAll] = useState([])
  const [me, setMe] = useState(null)
  const [stats, setStats] = useState({ totalDonations: 0, livesSaved: 0 })
  const [tab, setTab] = useState('overall')
  const [onCallOnly, setOnCallOnly] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    api
      .get('/leaderboard')
      .then(({ data }) => {
        setAll(data.leaderboard || [])
        setMe(data.me || null)
        setStats(data.stats || { totalDonations: 0, livesSaved: 0 })
      })
      .catch(() => {})
  }, [])

  // Trigger the width/entrance animations one frame after the data arrives.
  useEffect(() => {
    if (!all.length) return
    const t = requestAnimationFrame(() => requestAnimationFrame(() => setMounted(true)))
    return () => cancelAnimationFrame(t)
  }, [all])

  // Tab / on-call filtering with a fresh rank per visible set.
  const rows = useMemo(() => {
    const now = new Date()
    let list = all
    if (tab === 'month') {
      list = all.filter((r) => {
        if (!r.lastDonationDate) return false
        const d = new Date(r.lastDonationDate)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
    } else if (tab === 'city') {
      const myCity = (me?.city || '').trim()
      list = myCity ? all.filter((r) => (r.city || '').trim() === myCity) : all
    }
    if (onCallOnly) list = list.filter((r) => r.availableForEmergencies)
    return list.map((r, i) => ({ ...r, rank: i + 1 }))
  }, [all, me, tab, onCallOnly])

  const stats2 = useMemo(() => {
    const totalDonations = rows.reduce((s, r) => s + (r.donationCount || 0), 0)
    const max = Math.max(1, ...rows.map((r) => r.donationCount || 0))
    const dist = GROUPS.map((g) => ({
      group: g,
      count: rows.filter((r) => r.bloodGroup === g).reduce((s, r) => s + (r.donationCount || 0), 0),
    })).sort((a, b) => b.count - a.count)
    const chartMax = Math.max(1, ...dist.map((d) => d.count))
    const topGroup = dist[0]

    // Top cities by total donations.
    const cityMap = {}
    rows.forEach((r) => {
      const c = (r.city || 'Unknown').trim() || 'Unknown'
      cityMap[c] = (cityMap[c] || 0) + (r.donationCount || 0)
    })
    const cities = Object.entries(cityMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
    const cityMax = Math.max(1, ...cities.map((c) => c.count))

    // Histogram of how many donations each donor has given.
    const buckets = [
      { label: '1', key: 1, n: 0 },
      { label: '2–3', key: 2, n: 0 },
      { label: '4–6', key: 3, n: 0 },
      { label: '7+', key: 4, n: 0 },
    ]
    rows.forEach((r) => {
      const c = r.donationCount || 0
      if (c === 1) buckets[0].n++
      else if (c <= 3) buckets[1].n++
      else if (c <= 6) buckets[2].n++
      else buckets[3].n++
    })
    const bucketMax = Math.max(1, ...buckets.map((b) => b.n))

    // Donut geometry (start top, clockwise).
    const C = 2 * Math.PI * 80
    let acc = 0
    const donut = dist.map((d) => {
      const frac = totalDonations ? d.count / totalDonations : 0
      const start = acc
      acc += frac
      const len = Math.max(frac * C - 2, 0)
      return { ...d, frac, color: GROUP_COLORS[d.group], len, offset: -start * C }
    })

    return { totalDonations, max, dist, chartMax, topGroup, cities, cityMax, buckets, bucketMax, donut, donutC: C }
  }, [rows])

  const top3 = rows.slice(0, 3)
  const rest = rows.slice(3)
  const donorsCount = rows.length
  const totalAnim = useCountUp(stats2.totalDonations)
  const donorsAnim = useCountUp(donorsCount)
  const livesAnim = useCountUp(stats.livesSaved)
  const myRank = me && me.rank > 3 ? me : null

  return (
    <div className="page page-wide leaderboard-page">
      <div className="donor-stats-hero overview-hero">
        <div className="donor-stats-hero-head">
          <div>
            <h2>🏆 Leaderboard</h2>
            <p className="hint">
              Only verified donors who have actually given blood are ranked — every drop counts.
            </p>
          </div>
        </div>
      </div>

      {rows.length > 0 && (
        <>
          <div className="lb-stats">
            <div className="lb-stat-card lb-anim" style={{ '--d': '0ms' }}>
              <span className="lb-stat-ico">🦸</span>
              <div>
                <strong>{donorsAnim}</strong>
                <span>Donors Ranked</span>
              </div>
            </div>
            <div className="lb-stat-card lb-anim" style={{ '--d': '80ms' }}>
              <span className="lb-stat-ico">🩸</span>
              <div>
                <strong>{totalAnim}</strong>
                <span>Total Donations</span>
              </div>
            </div>
            <div className="lb-stat-card lb-anim" style={{ '--d': '160ms' }}>
              <span className="lb-stat-ico">🩺</span>
              <div>
                <strong>{livesAnim}</strong>
                <span>Lives Saved (est.)</span>
              </div>
            </div>
            <div className="lb-stat-card lb-anim" style={{ '--d': '240ms' }}>
              <span className="lb-stat-ico">🧬</span>
              <div>
                <strong>{stats2.topGroup.group}</strong>
                <span>Most Given Group</span>
              </div>
            </div>
          </div>

          {/* Filters: tabs + on-call toggle */}
          <div className="lb-tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`lb-tab ${tab === t.key ? 'active' : ''}`}
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
            <button
              className={`lb-tab oncall ${onCallOnly ? 'active' : ''}`}
              onClick={() => setOnCallOnly((v) => !v)}
              title="Only show donors available for emergencies"
            >
              🚨 On-call heroes
            </button>
          </div>

          {/* Your rank banner when outside the podium */}
          {myRank && (
            <div className="lb-me-banner lb-anim" style={{ '--d': '40ms' }}>
              <span className="lb-me-avatar">{myRank.badgeIcon || '🩸'}</span>
              <div>
                <strong>You are #{myRank.rank}</strong>
                <span>
                  {myRank.name} · {myRank.donationCount} donations · {myRank.points} pts
                  {myRank.badge ? ` · ${myRank.badgeIcon} ${myRank.badge}` : ''}
                </span>
              </div>
              {myRank.readyAgain === false && myRank.nextEligibleDate && (
                <span className="lb-me-ready">
                  next eligible{' '}
                  {new Date(myRank.nextEligibleDate).toLocaleDateString(undefined, {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              )}
            </div>
          )}

          {top3.length > 0 && (
            <div className="lb-podium">
              {top3.map((r, i) => (
                <div
                  key={r.rank}
                  className={`lb-podium-card rank-${r.rank} ${r.rank === 1 ? 'first' : ''} ${me && r.userId === me.userId ? 'is-me' : ''} lb-anim`}
                  style={{ '--d': `${i * 120}ms` }}
                >
                  {r.rank === 1 && <span className="lb-crown">👑</span>}
                  <span className="lb-podium-medal">{medal(r.rank)}</span>
                  <span className={`lb-podium-avatar ${avatarClass(r.bloodGroup)}`}>
                    {(r.name || '?').charAt(0).toUpperCase()}
                  </span>
                  <strong className="lb-podium-name">
                    {r.name} {r.badgeIcon && <span title={r.badge}>{r.badgeIcon}</span>}
                  </strong>
                  <span className="lb-podium-sub">
                    {r.city} · {r.bloodGroup}
                    {r.availableForEmergencies ? ' · 🚨 on-call' : ''}
                  </span>
                  <span className="lb-podium-count">
                    <strong>{r.donationCount}</strong> donations · {r.points} pts
                  </span>
                  <span className="lb-podium-bar">
                    <span style={{ width: mounted ? `${(r.donationCount / stats2.max) * 100}%` : '0%' }} />
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="lb-charts">
            {/* Donut: blood group share */}
            <div className="lb-chart card lb-anim" style={{ '--d': '100ms' }}>
              <div className="card-head">
                <span className="card-head-icon">🥧</span>
                <h3>Blood Group Share</h3>
                <span className="card-head-live">donations</span>
              </div>
              <div className="lb-donut-wrap">
                <div className="lb-donut">
                  <svg viewBox="0 0 180 180" className="lb-donut-svg">
                    <g transform="rotate(-90 90 90)">
                      {stats2.donut.map((d, i) =>
                        d.count > 0 ? (
                          <circle
                            key={d.group}
                            className="lb-donut-seg"
                            cx="90"
                            cy="90"
                            r="80"
                            fill="none"
                            stroke={d.color}
                            strokeWidth="30"
                            strokeDasharray={`${d.len} 1000`}
                            strokeDashoffset={d.offset}
                            style={{ '--len': d.len, animationDelay: `${i * 130}ms` }}
                          />
                        ) : null
                      )}
                    </g>
                  </svg>
                  <div className="lb-donut-center">
                    <strong>{donorsCount}</strong>
                    <span>donors</span>
                  </div>
                </div>
                <div className="lb-donut-legend">
                  {stats2.dist.map((d, i) => (
                    <div
                      className="lb-legend-row lb-anim"
                      key={d.group}
                      style={{ '--d': `${300 + i * 70}ms` }}
                    >
                      <span className="lb-legend-dot" style={{ background: GROUP_COLORS[d.group] }} />
                      <span className="lb-legend-name">{d.group}</span>
                      <span className="lb-legend-bar">
                        <span
                          style={{
                            width: mounted ? `${(d.count / stats2.chartMax) * 100}%` : '0%',
                            background: GROUP_COLORS[d.group],
                          }}
                        />
                      </span>
                      <span className="lb-legend-val">
                        {d.count} · {stats2.totalDonations ? Math.round((d.count / stats2.totalDonations) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Histogram: donation size distribution */}
            <div className="lb-chart card lb-anim" style={{ '--d': '180ms' }}>
              <div className="card-head">
                <span className="card-head-icon">📊</span>
                <h3>Donation Frequency</h3>
                <span className="card-head-live">donors</span>
              </div>
              <div className="lb-hist">
                {stats2.buckets.map((b, i) => (
                  <div className="lb-hist-col" key={b.key} style={{ '--d': `${i * 120}ms` }}>
                    <div className="lb-hist-track">
                      <div
                        className="lb-hist-fill"
                        style={{ height: mounted ? `${(b.n / stats2.bucketMax) * 100}%` : '0%' }}
                      >
                        <span>{b.n}</span>
                      </div>
                    </div>
                    <span className="lb-hist-label">{b.label}</span>
                  </div>
                ))}
              </div>
              <p className="hint lb-hist-caption">Donations given by a donor</p>
            </div>
          </div>

          {/* City distribution bars */}
          {stats2.cities.length > 0 && (
            <div className="lb-chart card lb-anim" style={{ '--d': '240ms' }}>
              <div className="card-head">
                <span className="card-head-icon">🏙️</span>
                <h3>Top Cities</h3>
                <span className="card-head-live">by donations</span>
              </div>
              <div className="lb-chart-bars">
                {stats2.cities.map((c, i) => (
                  <div className="lb-chart-row" key={c.name}>
                    <span className="lb-chart-group" title={c.name}>
                      {c.name}
                    </span>
                    <div className="lb-chart-track">
                      <span
                        className="lb-chart-fill"
                        style={{ width: mounted ? `${(c.count / stats2.cityMax) * 100}%` : '0%', transitionDelay: `${i * 60}ms` }}
                      />
                    </div>
                    <span className="lb-chart-value">{c.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="lb-chart lb-anim" style={{ '--d': '300ms' }}>
            <div className="card-head">
              <span className="card-head-icon">🏆</span>
              <h3>All Rankings</h3>
              <span className="card-head-live">{rows.length} ranked</span>
            </div>
            <div className="lb-list">
              {rest.map((r, i) => (
                <div
                  className={`lb-row ${r.rank <= 3 ? 'podium' : ''} ${me && r.userId === me.userId ? 'is-me' : ''} lb-anim`}
                  key={r.rank}
                  style={{ '--d': `${i * 45}ms` }}
                >
                  <span className="lb-rank">{medal(r.rank)}</span>
                  <div className={`lb-avatar ${avatarClass(r.bloodGroup)}`}>
                    {(r.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="lb-info">
                    <strong className="lb-name">
                      {r.name} {r.badgeIcon && <span title={r.badge}>{r.badgeIcon}</span>}{' '}
                      {me && r.userId === me.userId && <span className="lb-you">you</span>}
                    </strong>
                    <span className="lb-sub">
                      {r.city} · {r.bloodGroup}
                      {r.availableForEmergencies ? ' · 🚨 on-call' : ''}
                    </span>
                    <span className="lb-meta">
                      {r.daysSince != null ? `last ${fmtDays(r.daysSince)}` : 'no record'}
                      {r.nextEligibleDate
                        ? r.readyAgain
                          ? ' · ✅ ready to help'
                          : ` · next ${new Date(r.nextEligibleDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`
                        : ''}
                    </span>
                  </div>
                  <div className="lb-bar-wrap">
                    <div className="lb-bar">
                      <span style={{ width: mounted ? `${(r.donationCount / stats2.max) * 100}%` : '0%' }} />
                    </div>
                  </div>
                  <div className="lb-count">
                    <strong>{r.donationCount}</strong> <span>donations</span>
                    <span className="lb-pts">· {r.points} pts</span>
                  </div>
                </div>
              ))}
              {rest.length === 0 && rows.length <= 3 && (
                <p className="hint">That's the whole podium so far — donate to join!</p>
              )}
            </div>
          </div>
        </>
      )}

      {all.length === 0 && (
        <p className="hint">No donations recorded yet — be the first to donate.</p>
      )}
    </div>
  )
}