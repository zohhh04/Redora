import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { useRealtimeRequest } from '../hooks/useRealtime'

const ELIGIBLE_MS = 60 * 24 * 60 * 60 * 1000
const ACTIVE_STATUSES = ['matched', 'accepted', 'traveling', 'arrived', 'donating']
const COMPLETED_STATUSES = ['completed']
const STAGE_ORDER = ['matched', 'accepted', 'traveling', 'arrived', 'donating', 'completed']

const STATUS_LABEL = {
  matched: 'Matched',
  accepted: 'Ready to start',
  traveling: 'On the way',
  arrived: 'Arrived',
  donating: 'Donating',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_ICON = {
  matched: '🤝',
  accepted: '✅',
  traveling: '🚗',
  arrived: '🏥',
  donating: '🩸',
  completed: '🎉',
  cancelled: '🚫',
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatTime(date) {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatTimeAgo(date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return formatDate(date)
}

function JourneyItem({ r, trackLink, last }) {
  const active = ACTIVE_STATUSES.includes(r.status)
  const completed = COMPLETED_STATUSES.includes(r.status)
  const declined = r.declined && !active
  const dotClass = declined ? 'declined' : completed ? 'completed' : active ? 'active' : 'done'
  const cert = r.certificate?.code
  const stageIdx = STAGE_ORDER.indexOf(r.status)
  const pct = completed ? 100 : active ? Math.max(8, Math.round((stageIdx / (STAGE_ORDER.length - 1)) * 100)) : 0
  return (
    <div className={`journey-item ${declined ? 'muted' : ''}`}>
      <div className="journey-item-track">
        <span className={`journey-item-dot ${dotClass}`}>{STATUS_ICON[r.status] || '·'}</span>
        {!last && <span className="journey-item-line" />}
      </div>
      <div className="journey-item-body">
        <div className="journey-item-top">
          <span className={`journey-status ${dotClass}`}>
            {declined ? 'Declined' : STATUS_LABEL[r.status] || r.status}
          </span>
          <span className="journey-blood">{r.bloodGroup}</span>
          <span className={`urgency-badge ${r.urgency}`}>
            {r.urgency === 'emergency' ? '🚨' : '🕐'} {r.urgency}
          </span>
          <span className="journey-time">{formatTimeAgo(r.updatedAt)}</span>
        </div>
        <div className="journey-item-title">
          <span className="journey-patient-icon">👤</span>
          {r.patientName || r.patient?.name || 'Patient'}
        </div>
        <div className="journey-item-meta">
          <span>🏥 {r.hospital || 'Hospital'}</span>
          <span>📍 {r.city || '—'}{r.area ? `, ${r.area}` : ''}</span>
          <span>🩸 {r.units} unit{r.units > 1 ? 's' : ''}</span>
          {completed && r.updatedAt && <span>🗓 {formatDate(r.updatedAt)}</span>}
        </div>
        {(active || completed) && (
          <div className="journey-progress">
            <div className="journey-progress-bar">
              <span style={{ width: `${pct}%` }} />
            </div>
            <span className="journey-progress-label">
              {completed ? '✓ Donation complete' : `${pct}% to completion`}
            </span>
          </div>
        )}
        <div className="journey-item-foot">
          {active && trackLink && (
            <Link to={trackLink} className="btn primary btn-sm">
              📍 Track Live
            </Link>
          )}
          {completed && cert && (
            <Link to={`/certificate/${r._id}`} className="btn primary btn-sm">
              🏅 View Certificate · {cert}
            </Link>
          )}
          {completed && !cert && <span className="hint">✓ Donation completed</span>}
          {r.status === 'cancelled' && <span className="hint">This journey was cancelled</span>}
          {declined && <span className="hint">You declined this request</span>}
        </div>
      </div>
    </div>
  )
}

function Section({ icon, title, count, children }) {
  return (
    <div className="journey-section">
      <div className="journey-section-head">
        <div className="journey-section-title">
          <span className="journey-section-ico">{icon}</span>
          {title}
        </div>
        <span className="journey-section-count">{count}</span>
      </div>
      {children}
    </div>
  )
}

function calcStreak(donations) {
  const months = new Set(
    donations.map((d) => {
      const dt = new Date(d.date)
      return `${dt.getFullYear()}-${dt.getMonth()}`
    }),
  )
  const sorted = [...months].sort().reverse()
  if (!sorted.length) return 0
  let streak = 1
  const [y, m] = sorted[0].split('-').map(Number)
  let curY = y
  let curM = m
  for (let i = 1; i < sorted.length; i++) {
    const [yy, mm] = sorted[i].split('-').map(Number)
    let py = curY
    let pm = curM - 1
    if (pm < 0) {
      pm = 11
      py--
    }
    if (yy === py && mm === pm) {
      streak++
      curY = yy
      curM = mm
    } else break
  }
  return streak
}

function buildBadges({ total, units, streak }) {
  return [
    { icon: '🩸', label: 'First Drop', desc: 'Make your 1st donation', earned: total >= 1 },
    { icon: '🤝', label: 'Helping Hand', desc: 'Reach 3 donations', earned: total >= 3 },
    { icon: '💛', label: 'Heart of Gold', desc: 'Reach 5 donations', earned: total >= 5 },
    { icon: '🧃', label: '5-Litre Club', desc: 'Donate 10+ units', earned: units >= 10 },
    { icon: '🦸', label: 'Hero Status', desc: 'Reach 10 donations', earned: total >= 10 },
    { icon: '🔥', label: 'On Fire', desc: 'Donate 3 months in a row', earned: streak >= 3 },
  ]
}

export default function Donations() {
  const { user, updateUser } = useAuth()
  const [journey, setJourney] = useState([])
  const [donations, setDonations] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState(null)
  const [newIds, setNewIds] = useState(new Set())
  const seenRef = useRef(new Set())
  const firstLoadRef = useRef(true)

  const load = async () => {
    try {
      const [{ data: journeyData }, { data: donData }, me] = await Promise.all([
        api.get('/donors/my-journey'),
        api.get('/donors/my-donations'),
        api.get('/auth/me'),
      ])
      setJourney(journeyData.journey || [])
      const list = donData.donations || []
      const fresh = new Set(list.map((d) => String(d.id)))
      if (firstLoadRef.current) {
        firstLoadRef.current = false
      } else {
        const newlyAdded = list.filter((d) => !seenRef.current.has(String(d.id)))
        if (newlyAdded.length > 0) {
          setNewIds(new Set(newlyAdded.map((d) => String(d.id))))
        }
      }
      seenRef.current = fresh
      setDonations(list)
      updateUser(me.data.user)
      setLastSync(new Date())
    } catch {
      // keep previous results if a refresh fails
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useRealtimeRequest(load)

  const active = journey.filter((r) => ACTIVE_STATUSES.includes(r.status))
  const completedJourneys = journey.filter((r) => COMPLETED_STATUSES.includes(r.status))
  const inactive = journey.filter(
    (r) => !ACTIVE_STATUSES.includes(r.status) && !COMPLETED_STATUSES.includes(r.status),
  )

  const livesSaved = donations.length * 3
  const totalUnits = donations.reduce((sum, d) => sum + (d.units || 1), 0)
  const certCount = donations.filter((d) => d.certificateCode).length
  const eligible = user?.isEligible
  const lastDonation = user?.lastDonationDate
  const nextEligibleDate = lastDonation
    ? new Date(new Date(lastDonation).getTime() + ELIGIBLE_MS)
    : null

  const streak = calcStreak(donations)
  const badges = buildBadges({ total: donations.length, units: totalUnits, streak })
  const earnedCount = badges.filter((b) => b.earned).length

  const hasAny = active.length > 0 || completedJourneys.length > 0 || inactive.length > 0

  return (
    <div className="page page-wide journey-page donations-page">
      <div className="journey-hero">
        <div className="journey-hero-head">
          <div>
            <h2>My Blood Journey &amp; Donations</h2>
            <p className="hint">
              Every life you've touched — live journeys, your complete donation history, and the impact of your generosity
            </p>
          </div>
          <span className="live-badge live-green">
            <span className="live-dot"></span>
            Live · synced {lastSync ? formatTimeAgo(lastSync) : '…'}
          </span>
        </div>

        <div className="journey-welcome">
          <div className="journey-welcome-body">
            <h2>Welcome, {user?.name?.split(' ')[0] || 'Hero'} 🩸</h2>
            <p>
              {donations.length === 0
                ? 'Your blood saves lives. Accept a request below and become someone\u2019s hero.'
                : `${totalUnits} unit${totalUnits > 1 ? 's' : ''} donated · ${livesSaved} lives touched. Keep the kindness going.`}
            </p>
          </div>
          <div className="journey-welcome-actions">
            <Link to="/requests" className="btn white btn-sm">
              Find a Request
            </Link>
            <Link to="/leaderboard" className="btn ghost btn-sm">
              Leaderboard
            </Link>
          </div>
        </div>

        <div className="journey-tip">
          <span className="journey-tip-ico">💡</span>
          <div className="journey-tip-body">
            <strong>Did you know?</strong>
            <p>
              One donation of a single unit can save up to three lives. A 2-month gap between
              donations keeps you healthy and your blood safe for patients.
            </p>
          </div>
        </div>
      </div>

      {livesSaved > 0 && (
        <div className="journey-thanks">
          <span className="journey-thanks-ico">🩸</span>
          <div>
            <strong>Thank you for being a lifesaver!</strong>
            <p className="hint">
              Your {totalUnits} unit{totalUnits > 1 ? 's' : ''} of blood has helped an estimated{' '}
              {livesSaved} patient{livesSaved > 1 ? 's' : ''}. Keep the kindness going.
            </p>
          </div>
        </div>
      )}

      <div className={`eligibility-banner ${eligible ? 'ok' : 'wait'}`}>
        <span className="eligibility-ico">{eligible ? '✅' : '⏳'}</span>
        <div className="eligibility-body">
          <strong>
            {eligible
              ? 'You are eligible to donate again'
              : nextEligibleDate
                ? 'Next donation window coming up'
                : 'Donation eligibility'}
          </strong>
          <span>
            {eligible
              ? 'It has been more than 2 months since your last donation — you can save another life today.'
              : nextEligibleDate
                ? `You last donated on ${formatDate(lastDonation)}. You can donate again after ${formatDate(nextEligibleDate)}.`
                : 'A 2-month gap between donations keeps you healthy and safe.'}
          </span>
        </div>
        {eligible && (
          <Link to="/requests" className="btn primary btn-sm">
            Find a Request
          </Link>
        )}
      </div>

      {!loading && donations.length > 0 && (
        <Section
          icon="🏆"
          title="Achievements"
          count={`${earnedCount}/${badges.length} earned · 🔥 ${streak}-month streak`}
        >
          <div className="badge-grid">
            {badges.map((b) => (
              <div key={b.label} className={`badge-card ${b.earned ? 'earned' : 'locked'}`}>
                <span className="badge-ico">{b.icon}</span>
                <div className="badge-body">
                  <strong>{b.label}</strong>
                  <span>{b.desc}</span>
                </div>
                {b.earned ? <span className="badge-check">✓</span> : <span className="badge-lock">🔒</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {loading && <p className="hint">Loading your journey &amp; donations…</p>}

      {!loading && !hasAny && (
        <div className="empty-request-box">
          <div className="droplet-icon">🩸</div>
          <div className="empty-copy">
            <h3>Your story starts here</h3>
            <p>
              This is your live journey and donation history. When you accept a blood request, its
              real-time status appears here — and every completed donation is logged forever.
            </p>
          </div>
          <Link to="/requests" className="btn primary">
            Browse Open Requests
          </Link>
        </div>
      )}

      <div className="journey-sections">
        {active.length > 0 && (
          <Section icon="🛞" title="Active Journeys" count={`${active.length} live`}>
            <div className="journey-list">
              {active.map((r, i) => (
                <JourneyItem
                  key={r._id}
                  r={r}
                  trackLink={`/tracking/donor/${r._id}`}
                  last={i === active.length - 1}
                />
              ))}
            </div>
          </Section>
        )}

        <Section icon="🩸" title="Donation Timeline" count={`${donations.length} record${donations.length === 1 ? '' : 's'}`}>
          {donations.length === 0 ? (
            <div className="empty-request-box">
              <div className="droplet-icon">📖</div>
              <div className="empty-copy">
                <h3>No donation records yet</h3>
                <p>
                  Once you complete a donation, it will be recorded here chronologically with its
                  certificate and details.
                </p>
              </div>
            </div>
          ) : (
            <div className="donation-timeline">
              {donations.map((d, i) => (
                <div
                  key={d.id}
                  className={`donation-item ${newIds.has(String(d.id)) ? 'donation-new' : ''}`}
                >
                  <div className="donation-item-track">
                    <span className="donation-item-dot">🩸</span>
                    {i < donations.length - 1 && <span className="donation-item-line" />}
                  </div>
                  <div className="donation-item-body">
                    <div className="donation-item-top">
                      <span className="donation-item-date">
                        <strong>{formatDate(d.date)}</strong>
                        <small>{formatTime(d.date)}</small>
                      </span>
                      <span className="donation-blood">{d.bloodGroup}</span>
                      {d.urgency && (
                        <span className={`urgency-badge ${d.urgency}`}>
                          {d.urgency === 'emergency' ? '🚨' : '🕐'} {d.urgency}
                        </span>
                      )}
                      <span className="donation-item-status">✓ Completed</span>
                    </div>
                    <div className="donation-item-meta">
                      <span>🏥 {d.hospital || 'Hospital'}</span>
                      <span>
                        📍 {d.city || '—'}
                        {d.area ? `, ${d.area}` : ''}
                      </span>
                      <span>👤 {d.patientName || 'Patient'}</span>
                      <span>
                        🩸 {d.units || 1} unit{(d.units || 1) > 1 ? 's' : ''}
                      </span>
                    </div>
                    {d.certificateCode && (
                      <div className="donation-item-foot">
                        <Link to={`/certificate/${d.id}`} className="btn ghost btn-sm">
                          🏅 View Certificate · {d.certificateCode}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {inactive.length > 0 && (
          <Section icon="📁" title="Past Requests" count={inactive.length}>
            <div className="journey-list">
              {inactive.map((r, i) => (
                <JourneyItem key={r._id} r={r} last={i === inactive.length - 1} />
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}