import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'

const ACTIVE_STATUSES = ['matched', 'accepted', 'traveling', 'arrived', 'donating']
const COMPLETED_STATUSES = ['completed']

const STATUS_LABEL = {
  matched: 'Matched · awaiting patient',
  accepted: 'Accepted · ready to start',
  traveling: 'On the way',
  arrived: 'Arrived at hospital',
  donating: 'Donating',
  completed: 'Completed',
  cancelled: 'Cancelled',
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

function RequestCard({ r, trackLink }) {
  const active = ACTIVE_STATUSES.includes(r.status)
  const completed = COMPLETED_STATUSES.includes(r.status)
  return (
    <div className={`request-card ${r.declined && !active ? 'muted' : ''}`}>
      <div className="request-card-top">
        <span className={`status-badge ${active ? 'matched' : ''} ${completed ? 'completed' : ''}`}>
          {r.declined && !active ? 'Declined' : STATUS_LABEL[r.status] || r.status}
        </span>
        <span className="request-blood">{r.bloodGroup}</span>
        <span className={`urgency-badge ${r.urgency}`}>
          {r.urgency === 'emergency' ? '🚨' : '🕐'} {r.urgency}
        </span>
      </div>
      <div className="request-card-meta">
        <span>👤 {r.patientName || r.patient?.name || 'Patient'}</span>
        <span>🏥 {r.hospital || 'Hospital'}</span>
        <span>📍 {r.city || '—'}{r.area ? `, ${r.area}` : ''}</span>
        <span>🩸 {r.units} unit{r.units > 1 ? 's' : ''}</span>
        <span>⏱ {formatTimeAgo(r.updatedAt)}</span>
      </div>
      <div className="request-actions">
        {trackLink && active && (
          <Link to={trackLink} className="btn primary btn-sm">
            📍 Track Live
          </Link>
        )}
        {completed && (
          <Link to={`/certificate/${r._id}`} className="btn primary btn-sm">
            🏅 View Certificate
          </Link>
        )}
        {r.status === 'cancelled' && (
          <span className="hint">This journey was cancelled</span>
        )}
      </div>
    </div>
  )
}

export default function Journey() {
  const [journey, setJourney] = useState([])
  const [certificates, setCertificates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([api.get('/donors/my-journey'), api.get('/donors/certificates')])
      .then(([j, c]) => {
        if (!active) return
        setJourney(j.data.journey || [])
        setCertificates(c.data.certificates || [])
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Failed to load your journey')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const active = journey.filter((r) => ACTIVE_STATUSES.includes(r.status))
  const completed = journey.filter((r) => COMPLETED_STATUSES.includes(r.status))
  const inactive = journey.filter((r) => !ACTIVE_STATUSES.includes(r.status) && !COMPLETED_STATUSES.includes(r.status))

  return (
    <div className="page page-wide">
      <div className="dashboard-head">
        <div>
          <h2>Your Journey</h2>
          <p className="hint">Every request you accepted, tracked live, and completed</p>
        </div>
        <span className={`live-badge ${active.length === 0 ? 'live-green' : ''}`}>
          <span className="live-dot"></span> {active.length} Active
        </span>
      </div>

      {error && <p className="error">{error}</p>}
      {loading && <p className="hint">Loading your journey…</p>}

      {!loading && active.length === 0 && completed.length === 0 && inactive.length === 0 && (
        <div className="empty-request-box">
          <div className="droplet-icon">🩸</div>
          <p>
            No journey yet. Browse open blood requests and accept one to start your donation
            journey.
          </p>
          <Link to="/requests" className="btn primary">
            Browse Requests
          </Link>
        </div>
      )}

      {active.length > 0 && (
        <div className="card">
          <h3>Active Journeys ({active.length})</h3>
          <div className="request-list">
            {active.map((r) => (
              <RequestCard key={r._id} r={r} trackLink={`/tracking/donor/${r._id}`} />
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div className="card">
          <h3>Completed ({completed.length})</h3>
          <div className="request-list">
            {completed.map((r) => (
              <RequestCard key={r._id} r={r} />
            ))}
          </div>
        </div>
      )}

      {certificates.length > 0 && (
        <div className="card">
          <h3>Donation Certificates ({certificates.length})</h3>
          <div className="certificate-list">
            {certificates.map((c) => (
              <div key={c.requestId} className="certificate-row">
                <span className="donation-blood">{c.bloodGroup}</span>
                <span className="certificate-hosp">{c.hospital || 'Hospital'}</span>
                <span className="certificate-patient">For {c.patientName}</span>
                <span className="certificate-code">{c.code}</span>
                <span className="donation-date">{formatDate(c.issuedAt)}</span>
                <Link to={`/certificate/${c.requestId}`} className="btn ghost btn-sm">
                  View
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {inactive.length > 0 && (
        <div className="card">
          <h3>Past ({inactive.length})</h3>
          <div className="request-list">
            {inactive.map((r) => (
              <RequestCard key={r._id} r={r} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}