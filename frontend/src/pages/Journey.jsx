import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

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
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

export default function Journey() {
  const [journey, setJourney] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastSync, setLastSync] = useState(null)

  const load = async () => {
    try {
      const { data } = await api.get('/donors/my-journey')
      setJourney(data.journey || [])
      setLastSync(new Date())
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load your journey')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, 6000)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const active = journey.filter((r) => ACTIVE_STATUSES.includes(r.status))
  const completed = journey.filter((r) => COMPLETED_STATUSES.includes(r.status))
  const inactive = journey.filter(
    (r) => !ACTIVE_STATUSES.includes(r.status) && !COMPLETED_STATUSES.includes(r.status),
  )

  const certCount = completed.filter((r) => r.certificate?.code).length
  const livesSaved = completed.length * 3
  const totalUnits = completed.reduce((sum, r) => sum + (r.units || 1), 0)
  const dates = completed.map((r) => new Date(r.updatedAt).getTime()).filter(Boolean)
  const firstDate = dates.length ? formatDate(new Date(Math.min(...dates))) : '—'
  const lastDate = dates.length ? formatDate(new Date(Math.max(...dates))) : '—'

  return (
    <div className="page page-wide journey-page">
      <div className="journey-hero">
        <div className="journey-hero-head">
          <div>
            <h2>My Donation Journey</h2>
            <p className="hint">
              Live status of every request you've taken on — from accepting to donating and beyond
            </p>
          </div>
          <span className="live-badge live-green">
            <span className="live-dot"></span>
            Live · synced {lastSync ? formatTimeAgo(lastSync) : '…'}
          </span>
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

      <div className="journey-impact">
        <div className="journey-impact-item">
          <strong>{totalUnits}</strong>
          <span>Units Donated</span>
        </div>
        <div className="journey-impact-item">
          <strong>{firstDate}</strong>
          <span>First Donation</span>
        </div>
        <div className="journey-impact-item">
          <strong>{lastDate}</strong>
          <span>Latest Donation</span>
        </div>
        <div className="journey-impact-item">
          <strong>{journey.length}</strong>
          <span>Total Requests</span>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="hint">Loading your journey…</p>}

      {!loading && active.length === 0 && completed.length === 0 && inactive.length === 0 && (
        <div className="empty-request-box">
          <div className="droplet-icon">🧭</div>
          <div className="empty-copy">
            <h3>No active journeys</h3>
            <p>
              This is your live tracker. When you accept a blood request, its real-time status and
              progress will appear here — with a place to Track Live.
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

        {completed.length > 0 && (
          <Section icon="🎉" title="Completed Donations" count={completed.length}>
            <div className="journey-list">
              {completed.map((r, i) => (
                <JourneyItem key={r._id} r={r} last={i === completed.length - 1} />
              ))}
            </div>
          </Section>
        )}

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