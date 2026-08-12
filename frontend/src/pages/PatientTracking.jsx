import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import CallPanel from '../components/CallPanel'
import LiveMap from '../components/LiveMap'
import MessagePanel from '../components/MessagePanel'

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

function parseGps(loc) {
  const m = typeof loc === 'string' ? loc.match(/lat:([\d.-]+),lng:([\d.-]+)/) : null
  return m ? { lat: parseFloat(m[1]), lng: parseFloat(m[2]) } : null
}

export default function PatientTracking() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
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
  const completed = status === 'completed'
  const cancelled = status === 'cancelled'

  const linearDone = new Set(
    request.journey.filter((e) => LINEAR_STAGES.some((s) => s.stage === e.stage)).map((e) => e.stage),
  )

  const currentIndex = LINEAR_STAGES.findIndex((s) => s.stage === status)

  const events = request.journey.filter(
    (e) => !LINEAR_STAGES.some((s) => s.stage === e.stage),
  )

  const canComplete = status === 'donating'
  const canCancel = !completed && !cancelled

  const destination = [request.hospital, request.city, request.area].filter(Boolean).join(', ')

  const travelingEntry = [...request.journey].reverse().find((e) => e.stage === 'traveling')
  const donorPosition = travelingEntry ? parseGps(travelingEntry.location) : null
  const donorLocation = request.matchedDonor?.location
  const homePosition =
    donorLocation && donorLocation.lat != null && donorLocation.lng != null
      ? { lat: donorLocation.lat, lng: donorLocation.lng }
      : null
  const mapOrigin = donorPosition || homePosition
  const usingHome = !donorPosition && homePosition

  const showMap = status === 'matched' || status === 'accepted' || status === 'traveling' || status === 'arrived' || status === 'donating'

  const confirmDonor = async () => {
    setMsg('')
    setError('')
    try {
      const { data } = await api.patch(`/requests/${id}/donor`, { action: 'confirm' })
      setRequest(data.request)
      setMsg(data.message)
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed')
    }
  }

  const releaseDonor = async () => {
    setMsg('')
    setError('')
    try {
      const { data } = await api.patch(`/requests/${id}/donor`, { action: 'release' })
      setRequest(data.request)
      setMsg(data.message)
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed')
    }
  }

  return (
    <div className="page page-wide tracking-page">
      <header className="tracking-header">
        <div className="tracking-title">
          <h2>Live Donor Tracking</h2>
          <p className="hint">Follow your donor in real time until they arrive</p>
        </div>
        {!cancelled && (
          <span className={`live-badge ${completed ? 'live-green' : ''}`}>
            <span className="live-dot"></span>
            {completed ? 'Completed' : STATUS_LABEL[status] || status}
          </span>
        )}
      </header>

      <div className="tracking-summary">
        <span className="summary-chip">
          <span className="chip-bg chip-blood">{request.bloodGroup}</span>
          {request.units} unit{request.units > 1 ? 's' : ''} needed
        </span>
        {request.hospital && (
          <span className="summary-chip">
            <span className="chip-bg">🏥</span>
            <span className="summary-chip-text">{request.hospital}</span>
          </span>
        )}
        <span className="summary-chip">
          <span className="chip-bg">📍</span>
          {request.city || '—'}
        </span>
      </div>

      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <div className="tracking-grid">
        <section className="tracking-card">
          <div className="card-head">
            <span className="card-head-icon">📋</span>
            <h3>Journey Timeline</h3>
            <span className="card-head-live">Live · synced {lastSync ? formatTime(lastSync) : '…'}</span>
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
                      <div className="timeline-row">
                        <div className="timeline-content">
                          <span className="timeline-label">
                            {s.label}
                            {active && <span className="timeline-now">· now</span>}
                          </span>
                          {stage_entry?.location && (
                            <span className="timeline-loc">📍 {stage_entry.location.replace(/^lat:[\d.,-]+lng:[\d.,-]+/, 'Shared GPS location')}</span>
                          )}
                          {stage_entry?.note && <span className="timeline-note">{stage_entry.note}</span>}
                        </div>
                        {stage_entry && (
                          <span className="timeline-time">
                            {formatDate(stage_entry.at)} {formatTime(stage_entry.at)}
                          </span>
                        )}
                      </div>
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
        </section>

        <section className="tracking-card tracking-side">
          {showMap && (
            <div className="card-block">
              <div className="card-head">
                <span className="card-head-icon">🗺️</span>
                <h3>Donor Live Location & Route</h3>
                {donorPosition && <span className="card-head-live">Donor 🛞 live on map</span>}
              </div>
              <LiveMap origin={mapOrigin} destination={destination} height={280} showNavigate={false} />
              {!donorPosition && status !== 'completed' && (
                <p className="map-status">
                  {usingHome
                    ? '📍 Donor home location — live tracking starts when they depart.'
                    : 'Waiting for the donor to share their live location…'}
                </p>
              )}
            </div>
          )}

          <div className="card-block">
            <div className="card-head">
              <span className="card-head-icon">🩸</span>
              <h3>Donor</h3>
            </div>
            <div className="people-panel">
              <div className="person-row">
                <div className="person-row-top">
                  <span className="person-icon">🩸</span>
                  <div className="person-details">
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
            </div>
          </div>

          <div className="card-block">
            <div className="card-head">
              <span className="card-head-icon">💬</span>
              <h3>Message Donor</h3>
            </div>
            <MessagePanel requestId={id} otherName={request.matchedDonor?.name || 'the donor'} />
          </div>

          <div className="card-block">
            <div className="card-head">
              <span className="card-head-icon">⚡</span>
              <h3>Actions</h3>
            </div>
            {status !== 'open' && !cancelled && (
              <div className="journey-actions">
                {status === 'matched' && (
                  <>
                    <button className="btn primary btn-block" onClick={confirmDonor}>
                      ✅ Accept Donor
                    </button>
                    <button className="btn ghost btn-sm btn-block" onClick={releaseDonor}>
                      Release Donor
                    </button>
                  </>
                )}

                {canComplete && (
                  <button className="btn primary btn-block" onClick={() => run({ stage: 'completed' })}>
                    🎉 Mark Donation Completed
                  </button>
                )}
                {canComplete && (
                  <p className="hint donation-confirm">
                    The donor has arrived and the donation is in progress. Confirm to complete it and issue the donor's certificate.
                  </p>
                )}

                {canCancel && (
                  <button className="btn ghost btn-sm btn-block" onClick={cancel}>
                    Cancel Request
                  </button>
                )}
              </div>
            )}

            {completed && (
              <div className="card-success">
                <p className="success">🎉 Donation completed! A certificate has been issued to {request.matchedDonor?.name || 'the donor'}.</p>
                <button className="btn primary btn-block" onClick={() => navigate('/dashboard')}>
                  ↩️ Back to Dashboard
                </button>
              </div>
            )}

            {cancelled && (
              <Link to="/dashboard" className="btn primary btn-block">
                ↩️ Back to Dashboard
              </Link>
            )}

            {!completed && !cancelled && (
              <Link to="/dashboard" className="btn ghost btn-sm btn-block">
                Back to Dashboard
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}