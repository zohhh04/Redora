import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import CallPanel from '../components/CallPanel'

const LINEAR_STAGES = [
  { stage: 'matched', icon: '🤝', label: 'Donor Matched' },
  { stage: 'accepted', icon: '✅', label: 'Donation Accepted' },
  { stage: 'traveling', icon: '🚗', label: 'Donor On The Way' },
  { stage: 'arrived', icon: '🏥', label: 'Donor Arrived' },
  { stage: 'donating', icon: '🩸', label: 'Donation In Progress' },
  { stage: 'completed', icon: '🎉', label: 'Donation Completed' },
]

const STATUS_LABEL = {
  open: 'Looking for a donor',
  matched: 'Donor matched',
  accepted: 'Donation accepted',
  traveling: 'Donor on the way',
  arrived: 'Donor arrived',
  donating: 'Donation in progress',
  completed: 'Donation completed',
  cancelled: 'Cancelled',
}

const EVENT_LABEL = {
  declined: 'Request declined',
  released: 'Donor released',
  cancelled: 'Cancelled',
}

function formatTime(date) {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Tracking() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [location, setLocation] = useState('')
  const [lastSync, setLastSync] = useState(null)

  const load = useCallback(async () => {
    try {
      const { data } = await api.get(`/requests/${id}/tracking`)
      setRequest(data.request)
      setLastSync(new Date())
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 404) {
        setError(err.response?.data?.message || 'Not authorized')
      }
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
    const timer = setInterval(load, 4000)
    return () => clearInterval(timer)
  }, [load])

  const run = async (payload) => {
    setMsg('')
    setError('')
    try {
      const { data } = await api.patch(`/requests/${id}/journey`, payload)
      setRequest(data.request)
      setMsg(data.message)
      setLocation('')
      if (payload.stage === 'completed') navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed')
    }
  }

  const cancel = async () => {
    setError('')
    try {
      await api.patch(`/requests/${id}/journey`, { stage: 'cancelled' })
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Cancel failed')
    }
  }

  if (loading) return <p className="hint">Loading live tracking…</p>

  if (error) {
    return (
      <div className="page center">
        <p className="error">{error}</p>
        <Link to="/dashboard" className="btn ghost">Back to Dashboard</Link>
      </div>
    )
  }

  if (!request) return null

  const status = request.status
  const isDonor = user.role === 'donor' && request.matchedDonor?._id === user.id
  const isPatient = request.patient?._id === user.id
  const completed = status === 'completed'
  const cancelled = status === 'cancelled'

  const linearDone = new Set(
    request.journey.filter((e) => LINEAR_STAGES.some((s) => s.stage === e.stage)).map((e) => e.stage),
  )

  const currentIndex = LINEAR_STAGES.findIndex((s) => s.stage === status)

  const events = request.journey.filter(
    (e) => !LINEAR_STAGES.some((s) => s.stage === e.stage),
  )

  const canStartTrip = isDonor && status === 'accepted'
  const canUpdateLocation = isDonor && status === 'traveling'
  const canArrive = isDonor && status === 'traveling'
  const canDonate = isDonor && status === 'arrived'
  const canComplete = (isDonor || isPatient) && status === 'donating'
  const canCancel = !completed && !cancelled

  return (
    <div className="page page-wide">
      <div className="dashboard-head">
        <div>
          <h2>Live Journey</h2>
          <p className="hint">
            {request.bloodGroup} · {request.units} unit{request.units > 1 ? 's' : ''}
            {request.hospital ? ` · 🏥 ${request.hospital}` : ''} · 🚗 {request.city || '—'}
          </p>
        </div>
        {!cancelled && (
          <span className={`live-badge ${completed ? 'live-green' : ''}`}>
            <span className="live-dot"></span>
            {completed ? 'Completed' : STATUS_LABEL[status] || status}
          </span>
        )}
      </div>

      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <div className="tracking-grid">
        <div className="card">
          <div className="live-head">
            <h3>Journey Timeline</h3>
            <span className="hint">
              Live · synced {lastSync ? `${formatTime(lastSync)}` : '…'}
            </span>
          </div>

          {status === 'open' ? (
            <p className="hint">Waiting for a donor to accept this request…</p>
          ) : (
            <div className="timeline">
              {LINEAR_STAGES.map((s, i) => {
                const done = linearDone.has(s.stage)
                const active = i === currentIndex
                const pending = !done && i > (currentIndex === -1 ? 0 : currentIndex)
                const stage_entry = request.journey.find((e) => e.stage === s.stage)
                return (
                  <div
                    key={s.stage}
                    className={`timeline-item ${done ? 'done' : ''} ${active ? 'active' : ''} ${pending ? 'pending' : ''}`}
                  >
                    <div className="timeline-marker">
                      <span className="timeline-dot">{done || active ? s.icon : ''}</span>
                      <span className="timeline-line"></span>
                    </div>
                    <div className="timeline-body">
                      <span className="timeline-label">
                        {s.label}
                        {active && <span className="timeline-now">· now</span>}
                      </span>
                      {stage_entry?.location && (
                        <span className="timeline-loc">📍 {stage_entry.location}</span>
                      )}
                      {stage_entry?.note && <span className="timeline-note">{stage_entry.note}</span>}
                      {stage_entry && (
                        <span className="timeline-time">
                          {formatDate(stage_entry.at)} {formatTime(stage_entry.at)}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {events.length > 0 && (
            <div className="timeline-events">
              {events.map((e, i) => (
                <div key={i} className="event-row">
                  <span className="event-badge">{EVENT_LABEL[e.stage] || e.label}</span>
                  <span className="event-note">{e.note}</span>
                  <span className="timeline-time">
                    {formatDate(e.at)} {formatTime(e.at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3>People</h3>
          <div className="people-panel">
            {isDonor && (
              <div className="person-row">
                <div className="person-row-top">
                  <span className="person-icon">🧑‍⚕️</span>
                  <div className="person-details">
                    <span className="person-role">Patient</span>
                    <span className="person-name">{request.patient?.name || '—'}</span>
                    <span className="person-contact">🏥 {request.hospital || '—'}</span>
                    <span className="person-contact">📍 {request.city || '—'}{request.area ? `, ${request.area}` : ''}</span>
                    <span className="person-contact">🩸 Needs {request.bloodGroup}</span>
                    <span className="person-contact">📱 {request.phone || request.patient?.mobile || '—'}</span>
                  </div>
                </div>
                <CallPanel
                  requestId={id}
                  myId={user.id}
                  otherId={request.patient?._id}
                  otherName={request.patient?.name || 'the patient'}
                />
              </div>
            )}
            {isPatient && (
              <div className="person-row">
                <div className="person-row-top">
                  <span className="person-icon">🩸</span>
                  <div className="person-details">
                    <span className="person-role">Donor</span>
                    <span className="person-name">{request.matchedDonor?.name || '—'}</span>
                    <span className="person-contact">🩸 {request.matchedDonor?.bloodGroup || '—'}</span>
                    <span className="person-contact">📍 {request.matchedDonor?.city || '—'}{request.matchedDonor?.area ? `, ${request.matchedDonor.area}` : ''}</span>
                    <span className="person-contact">📱 {request.matchedDonor?.mobile || '—'}</span>
                  </div>
                </div>
                {request.matchedDonor && (
                  <CallPanel
                    requestId={id}
                    myId={user.id}
                    otherId={request.matchedDonor?._id}
                    otherName={request.matchedDonor?.name || 'the donor'}
                  />
                )}
              </div>
            )}
          </div>

          {(isDonor || isPatient) && status !== 'open' && !cancelled && (
            <div className="journey-actions">
              {canStartTrip && (
                <button className="btn primary btn-block" onClick={() => run({ stage: 'traveling', note: 'Donor started the trip' })}>
                  🚗 Start Trip
                </button>
              )}

              {canUpdateLocation && (
                <form
                  className="location-form"
                  onSubmit={(e) => {
                    e.preventDefault()
                    run({ stage: 'traveling', location })
                  }}
                >
                  <input
                    placeholder="Share your live location…"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                  <button className="btn ghost btn-sm">📍 Update</button>
                </form>
              )}

              {canArrive && (
                <button className="btn primary btn-block" onClick={() => run({ stage: 'arrived', note: 'Donor arrived at the hospital' })}>
                  🏥 Mark Arrived
                </button>
              )}

              {canDonate && (
                <button className="btn primary btn-block" onClick={() => run({ stage: 'donating', note: 'Donation started' })}>
                  🩸 Start Donation
                </button>
              )}

              {canComplete && (
                <button className="btn primary btn-block" onClick={() => run({ stage: 'completed' })}>
                  🎉 Mark Completed
                </button>
              )}

              {canCancel && (
                <button className="btn ghost btn-sm" onClick={cancel}>
                  Cancel Request
                </button>
              )}
            </div>
          )}

          {isDonor && completed && (
            <Link to={`/certificate/${id}`} className="btn primary btn-block">
              🏅 View Donation Certificate
            </Link>
          )}

          {isDonor && cancelled && (
            <Link to="/dashboard" className="btn primary btn-block">
              ↩️ Return to Dashboard
            </Link>
          )}

          {isDonor && !completed && !cancelled && (
            <Link to="/journey" className="btn ghost btn-sm btn-block">
              All Journeys
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}