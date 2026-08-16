import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { useRealtimeRequest } from '../hooks/useRealtime'

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatTime(date) {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

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

export default function PatientDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const [reqMsg, setReqMsg] = useState('')
  const [reqError, setReqError] = useState('')

  const loadRequests = () =>
    api
      .get('/requests/my')
      .then(({ data }) => setRequests(data.requests || []))
      .catch(() => {})
      .finally(() => setLoading(false))

  useEffect(() => {
    loadRequests()
  }, [])

  useRealtimeRequest(loadRequests)

  const manageDonor = async (id, action, goTo) => {
    setReqMsg('')
    setReqError('')
    try {
      const { data } = await api.patch(`/requests/${id}/donor`, { action })
      setReqMsg(data.message)
      if (goTo) navigate(goTo)
      else loadRequests()
    } catch (err) {
      setReqError(err.response?.data?.message || 'Action failed')
    }
  }

  const open = requests.filter((r) => r.status === 'open')
  const active = requests.filter((r) =>
    ['matched', 'accepted', 'traveling', 'arrived', 'donating'].includes(r.status),
  )
  const completed = requests.filter((r) => r.status === 'completed')
  const cancelled = requests.filter((r) => r.status === 'cancelled')
  const totalUnits = requests.reduce((sum, r) => sum + (r.units || 1), 0)
  const livesSaved = completed.length * 3

  const renderRequest = (r) => {
    const completed = r.status === 'completed'
    const cancelled = r.status === 'cancelled'
    const active = ['accepted', 'traveling', 'arrived', 'donating'].includes(r.status)
    const journey = r.journey || []
    return (
      <div
        key={r._id}
        className={`pr-card ${cancelled ? 'muted' : ''} ${completed ? 'pr-completed' : ''}`}
      >
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
              <span className="pr-blood-units">{r.units} unit{r.units > 1 ? 's' : ''}</span>
            </div>
            <span className="request-date">{formatDate(r.createdAt)}</span>
          </div>

          <div className="pr-location">
            <span className="pr-loc-item">🏥 {r.hospital || 'Hospital'}</span>
            <span className="pr-loc-item">📍 {r.city || '—'}{r.area ? `, ${r.area}` : ''}</span>
          </div>

          {r.matchedDonor && (
            <div className="pr-donor">
              <span className="pr-donor-avatar">👤</span>
              <div className="pr-donor-info">
                <span className="pr-donor-name">
                  {r.matchedDonor.name} <em>{r.matchedDonor.bloodGroup}</em>
                </span>
                {r.matchedDonor.city && (
                  <span className="pr-donor-loc">📍 {r.matchedDonor.city}</span>
                )}
              </div>
            </div>
          )}

          {journey.length > 0 && (
            <div className="req-timeline">
              {journey.map((e, i) => (
                <div key={i} className="req-timeline-row">
                  <span
                    className={`req-timeline-dot ${completed ? 'done' : ''} ${completed && i === journey.length - 1 ? 'finish' : ''}`}
                  />
                  <span className="req-timeline-label">{e.label || e.stage}</span>
                  <span className="req-timeline-time">{formatTime(e.at)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="request-actions">
            {r.status === 'open' && (
              <Link to={`/requests/${r._id}/matches`} className="btn primary btn-sm">
                View Matched Donors
              </Link>
            )}
            {r.status === 'matched' && (
              <>
                <button
                  className="btn primary btn-sm"
                  onClick={() => manageDonor(r._id, 'confirm', `/tracking/patient/${r._id}`)}
                >
                  Accept Donor
                </button>
                <button
                  className="btn primary btn-sm"
                  onClick={() => manageDonor(r._id, 'release')}
                >
                  Release Donor
                </button>
              </>
            )}
            {active && (
              <Link to={`/tracking/patient/${r._id}`} className="btn primary btn-sm">
                📍 Track Live
              </Link>
            )}
            {completed && (
              <Link to={`/tracking/patient/${r._id}`} className="btn primary btn-sm">
                👁 View Journey
              </Link>
            )}
            {r.status === 'cancelled' && <span className="hint">This request was cancelled</span>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page page-wide">
      <div className="dashboard-head">
        <div>
          <h2>Your Blood Requests</h2>
          <p className="hint">Welcome, {user?.name} · Patient</p>
        </div>
        <div className="dashboard-head-actions">
          <span className="live-badge live-green">
            <span className="live-dot"></span> Live
          </span>
          <Link to="/request-blood" className="btn primary">
            + New Blood Request
          </Link>
        </div>
      </div>

      {reqMsg && <p className="success">{reqMsg}</p>}
      {reqError && <p className="error">{reqError}</p>}

      <div className="journey-welcome">
        <div className="journey-welcome-body">
          <h2>Welcome back, {user?.name?.split(' ')[0] || 'Patient'} 💉</h2>
          <p className="hint">
            {active.length > 0
              ? 'You have active journeys in progress — keep an eye on them below.'
              : open.length > 0
                ? 'Some requests are still looking for a donor. Check their matches below.'
                : completed.length > 0
                  ? 'Great work — your completed requests are making a real difference.'
                  : 'Create a blood request below to find a donor near you.'}
          </p>
        </div>
        <div className="journey-welcome-actions">
          <Link to="/request-blood" className="btn white btn-sm">
            + New Blood Request
          </Link>
          <Link to="/my-requests" className="btn ghost btn-sm">
            My Requests
          </Link>
        </div>
      </div>

      <div className="journey-tip">
        <span className="journey-tip-ico">💡</span>
        <div className="journey-tip-body">
          <strong>Need blood fast?</strong>
          <p>
            Say &quot;Request blood&quot; to AURA — it will post a request for you by voice.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="hint">Loading…</p>
      ) : requests.length === 0 ? (
        <div className="empty-request-box">
          <span className="droplet-icon">🩸</span>
          <p>
            No requests yet. Click &quot;New Request&quot; to create one.
          </p>
          <Link to="/request-blood" className="btn primary">
            New Request
          </Link>
        </div>
      ) : (
        <>
          {open.length > 0 && (
            <div className="card">
              <h3>Open Requests ({open.length})</h3>
              <div className="request-list">{open.map(renderRequest)}</div>
            </div>
          )}

          {active.length > 0 && (
            <div className="card">
              <h3>Active Journey ({active.length})</h3>
              <div className="request-list">{active.map(renderRequest)}</div>
            </div>
          )}

          {completed.length > 0 && (
            <div className="journey-thanks">
              <span className="journey-thanks-ico">🩸</span>
              <div>
                <strong>
                  You&apos;ve received {totalUnits} unit{totalUnits > 1 ? 's' : ''} of blood!
                </strong>
                <p className="hint">
                  Across {completed.length} completed request{completed.length > 1 ? 's' : ''} —
                  that&apos;s an estimated {livesSaved} life{livesSaved > 1 ? 's' : ''} touched. See
                  the full history on My Requests.
                </p>
              </div>
              <Link to="/my-requests" className="btn ghost btn-sm">
                My Requests
              </Link>
            </div>
          )}

          {cancelled.length > 0 && (
            <div className="card">
              <h3>Cancelled ({cancelled.length})</h3>
              <div className="request-list">{cancelled.map(renderRequest)}</div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
