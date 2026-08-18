import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useRealtimeRequest } from '../hooks/useRealtime';

const ACTIVE_STATUSES = ['matched', 'accepted', 'traveling', 'arrived', 'donating']

const STATUS_LABEL = {
  open: 'Open',
  matched: 'Matched',
  accepted: 'Accepted',
  traveling: 'On The Way',
  arrived: 'Arrived',
  donating: 'Donating',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const STATUS_ICON = {
  open: '🔍',
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
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatTime(date) {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function RequestCard({ r, last }) {
  const active = ACTIVE_STATUSES.includes(r.status)
  const open = r.status === 'open'
  const completed = r.status === 'completed'
  const cancelled = r.status === 'cancelled'
  const donor = r.matchedDonor
  const journey = r.journey || []

  return (
    <div className={`pr-card ${cancelled ? 'muted' : ''} ${completed ? 'pr-completed' : ''}`}>
      <span className={`pr-card-accent ${r.status}`} />
      <div className="pr-card-inner">
        {completed && (
          <div className="pr-completed-banner">
            <span className="pr-completed-ico">🎉</span>
            <div>
              <strong>Donation complete</strong>
              <small>Your blood was delivered — thank you for the smooth journey.</small>
            </div>
          </div>
        )}

        <div className="pr-card-top">
          <div className="pr-card-head">
            <span className={`status-badge ${r.status}`}>
              {STATUS_ICON[r.status] || '·'} {STATUS_LABEL[r.status] || r.status}
            </span>
            <span className={`urgency-badge ${r.urgency}`}>
              {r.urgency === 'emergency' ? '🚨' : '🕐'} {r.urgency}
            </span>
          </div>
          <div className="pr-blood">
            <span className="pr-blood-group">{r.bloodGroup}</span>
            <span className="pr-blood-units">
              {r.units} unit{r.units > 1 ? 's' : ''}
            </span>
          </div>
          <span className="request-date">{formatDate(r.createdAt)}</span>
        </div>

        <div className="pr-location">
          <span className="pr-loc-item">🏥 {r.hospital || 'Hospital'}</span>
          <span className="pr-loc-item">📍 {r.city || '—'}{r.area ? `, ${r.area}` : ''}</span>
        </div>

        {donor && (
          <div className="pr-donor">
            <span className="pr-donor-avatar">👤</span>
            <div className="pr-donor-info">
              <span className="pr-donor-name">
                {donor.name} <em>{donor.bloodGroup}</em>
              </span>
              {donor.city && <span className="pr-donor-loc">📍 {donor.city}</span>}
            </div>
          </div>
        )}

        <div className="req-timeline">
          {journey.length > 0 ? (
            journey.map((e, i) => (
              <div key={i} className="req-timeline-row">
                <span className={`req-timeline-dot ${completed ? 'done' : ''} ${completed && i === journey.length - 1 ? 'finish' : ''}`} />
                <span className="req-timeline-label">{e.label || e.stage}</span>
                <span className="req-timeline-time">{formatTime(e.at)}</span>
              </div>
            ))
          ) : (
            <div className="req-timeline-row">
              <span className={`req-timeline-dot pending ${completed ? 'done' : ''}`} />
              <span className="req-timeline-label">{open ? 'Looking for a donor' : 'Journey starting soon'}</span>
              <span className="req-timeline-time">—</span>
            </div>
          )}
        </div>

        <div className="request-actions">
          {active && (
            <Link to={`/tracking/patient/${r._id}`} className="btn primary btn-sm">
              📍 Track Live
            </Link>
          )}
          {open && (
            <Link to={`/requests/${r._id}/matches`} className="btn primary btn-sm">
              👥 View Matches
            </Link>
          )}
          {completed && (
            <Link to={`/tracking/patient/${r._id}`} className="btn primary btn-sm">
              👁 View Journey
            </Link>
          )}
          {completed && r.certificate?.code && (
            <Link to={`/certificate/${r._id}`} className="btn ghost btn-sm">
              🏅 View Certificate
            </Link>
          )}
          {cancelled && <span className="hint">This request was cancelled</span>}
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

export default function PatientRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [lastSync, setLastSync] = useState(null)

  const load = async () => {
    try {
      const { data } = await api.get('/requests/my')
      setRequests(data.requests || [])
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

  const active = requests.filter((r) => ACTIVE_STATUSES.includes(r.status))
  const open = requests.filter((r) => r.status === 'open')
  const completed = requests.filter((r) => r.status === 'completed')
  const cancelled = requests.filter((r) => r.status === 'cancelled')
  const totalUnits = requests.reduce((sum, r) => sum + (r.units || 1), 0)
  const livesSaved = completed.length * 3

  return (
    <div className="page page-wide patient-requests-page">
      <div className="journey-hero">
        <div className="journey-hero-head">
          <div>
            <h2>My Requests</h2>
            <p className="hint">Track every blood request you've created, from open to completed</p>
          </div>
          <span className="live-badge live-green">
            <span className="live-dot"></span>
            Live · synced {lastSync ? formatTime(lastSync) : '…'}
          </span>
        </div>

        <div className="journey-tip">
          <span className="journey-tip-ico">💡</span>
          <div className="journey-tip-body">
            <strong>Need blood fast?</strong>
            <p>
              Mark urgent requests as <em>Emergency</em> so compatible, available donors are matched
              and notified first. Track your live donor from the &quot;Active&quot; section above.
            </p>
          </div>
        </div>
      </div>

      {completed.length > 0 && (
        <div className="journey-thanks">
          <span className="journey-thanks-ico">🩸</span>
          <div>
            <strong>You got the blood you needed!</strong>
            <p className="hint">
              {totalUnits} unit{totalUnits > 1 ? 's' : ''} of blood received across your requests, helping
              an estimated {livesSaved} patient{livesSaved > 1 ? 's' : ''}. Stay healthy.
            </p>
          </div>
        </div>
      )}

      {loading && <p className="hint">Loading your requests…</p>}

      {!loading && requests.length === 0 && (
        <div className="empty-request-box">
          <div className="droplet-icon">🩸</div>
          <p>You haven't created any blood requests yet.</p>
          <Link to="/request-blood" className="btn primary">
            Request Blood
          </Link>
        </div>
      )}

      <div className="journey-sections">
        {active.length > 0 && (
          <Section icon="🛞" title="Active Requests" count={`${active.length} live`}>
            <div className="request-list">
              {active.map((r) => (
                <RequestCard key={r._id} r={r} />
              ))}
            </div>
          </Section>
        )}

        {open.length > 0 && (
          <Section icon="🔍" title="Looking for a Donor" count={open.length}>
            <div className="request-list">
              {open.map((r) => (
                <RequestCard key={r._id} r={r} />
              ))}
            </div>
          </Section>
        )}

        {completed.length > 0 && (
          <Section icon="🎉" title="Completed" count={completed.length}>
            <div className="request-list">
              {completed.map((r) => (
                <RequestCard key={r._id} r={r} />
              ))}
            </div>
          </Section>
        )}

        {cancelled.length > 0 && (
          <Section icon="📁" title="Cancelled" count={cancelled.length}>
            <div className="request-list">
              {cancelled.map((r) => (
                <RequestCard key={r._id} r={r} />
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}