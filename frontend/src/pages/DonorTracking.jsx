import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import CallPanel from '../components/CallPanel'
import LiveMap from '../components/LiveMap'
import MessagePanel from '../components/MessagePanel'

const LINEAR_STAGES = [
  { stage: 'matched', icon: '🤝', label: 'Donor Matched' },
  { stage: 'accepted', icon: '✅', label: 'Donation Accepted' },
  { stage: 'traveling', icon: '🚗', label: 'You On The Way' },
  { stage: 'arrived', icon: '🏥', label: 'You Arrived' },
  { stage: 'donating', icon: '🩸', label: 'Donation In Progress' },
  { stage: 'completed', icon: '🎉', label: 'Donation Completed' },
]

const STATUS_LABEL = {
  open: 'Looking for a donor',
  matched: 'Donor matched',
  accepted: 'Donation accepted',
  traveling: 'You are on the way',
  arrived: 'You arrived',
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

export default function DonorTracking() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [location, setLocation] = useState('')
  const [lastSync, setLastSync] = useState(null)
  const [myPosition, setMyPosition] = useState(null)
  const [gpsError, setGpsError] = useState('')
  const [geolocating, setGeolocating] = useState(false)
  const watcherRef = useRef(null)

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

  const stopWatch = () => {
    if (watcherRef.current != null) {
      navigator.geolocation.clearWatch(watcherRef.current)
      watcherRef.current = null
    }
  }

  const lastPushRef = useRef(0)

  const pushLiveLocation = (pos) => {
    const now = Date.now()
    if (now - lastPushRef.current < 4000) return
    lastPushRef.current = now
    const { lat, lng } = pos.coords
    api
      .patch(`/requests/${id}/journey`, {
        stage: 'traveling',
        location: `lat:${lat},lng:${lng}`,
      })
      .then(({ data }) => setRequest(data.request))
      .catch(() => {})
  }

  const startWatch = () => {
    if (!navigator.geolocation) {
      setGpsError('GPS is not available on this device')
      return
    }
    setGeolocating(true)
    setGpsError('')
    watcherRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setMyPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeolocating(false)
        pushLiveLocation(pos)
      },
      () => {
        setGpsError("Couldn't get your location. Please allow location access.")
        setGeolocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    )
  }

  const locate = () => {
    if (watcherRef.current != null) {
      stopWatch()
      setMyPosition(null)
    } else {
      startWatch()
    }
  }

  useEffect(() => {
    return () => stopWatch()
  }, [])

  const autoStartedRef = useRef(false)
  useEffect(() => {
    if (["matched", "accepted", "traveling"].includes(status) && !autoStartedRef.current) {
      autoStartedRef.current = true
      startWatch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

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

  const startTrip = async () => {
    if (myPosition) {
      await run({
        stage: 'traveling',
        note: 'Donor started the trip',
        location: `lat:${myPosition.lat},lng:${myPosition.lng}`,
      })
    } else {
      await run({ stage: 'traveling', note: 'Donor started the trip' })
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

  const markArrived = async () => {
    setError('')
    try {
      await api.patch(`/requests/${id}/journey`, {
        stage: 'arrived',
        note: 'Donor arrived at the hospital',
      })
      const driving = await api.patch(`/requests/${id}/journey`, {
        stage: 'donating',
        note: 'Donation in progress',
      })
      setRequest(driving.data.request)
      setMsg('Donation is in progress. The patient will mark it complete.')
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed')
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

  const canStartTrip = status === 'accepted'
  const canUpdateLocation = status === 'traveling'
  const canArrive = status === 'traveling'
  const canDonate = status === 'arrived'
  const canCancel = !completed && !cancelled

  const destination = [request.hospital, request.city, request.area].filter(Boolean).join(', ')
  const showMap = status === 'matched' || status === 'accepted' || status === 'traveling' || status === 'arrived' || status === 'donating'
  const hospitalNumber = request.hospitalPhone || request.phone || ''

  return (
    <div className="page page-wide tracking-page">
      <header className="tracking-header">
        <div className="tracking-title">
          <h2>Live Donation Journey</h2>
          <p className="hint">Follow your blood donation trip in real time</p>
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
            <p className="hint">Waiting for the patient to confirm you…</p>
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
                <h3>Route to Hospital</h3>
                {canUpdateLocation && (
                  <button className="btn ghost btn-sm card-head-btn" onClick={locate} disabled={geolocating}>
                    {geolocating ? '📍 Locating…' : myPosition ? '📍 Refresh' : '📍 Share Location'}
                  </button>
                )}
              </div>
              {gpsError && <p className="map-status">{gpsError}</p>}
              <LiveMap origin={myPosition} destination={destination} height={280} showNavigate={false} />
            </div>
          )}

          <div className="card-block">
            <div className="card-head">
              <span className="card-head-icon">🏥</span>
              <h3>Hospital</h3>
            </div>
            <div className="people-panel">
              <div className="person-row">
                <div className="person-row-top">
                  <span className="person-icon">🏥</span>
                  <div className="person-details">
                    <span className="person-name">{request.hospital || '—'}</span>
                    <span className="person-contact">📞 {hospitalNumber || 'Phone not shared'}</span>
                    <span className="person-contact">📍 {request.city || '—'}{request.area ? `, ${request.area}` : ''}</span>
                    <span className="person-contact">🩸 Needs {request.bloodGroup} · {request.units} unit{request.units > 1 ? 's' : ''}</span>
                  </div>
                </div>
                {hospitalNumber && (
                  <a className="call-btn" href={`tel:${hospitalNumber}`}>
                    📞 Call Hospital · {hospitalNumber}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="card-block">
            <div className="card-head">
              <span className="card-head-icon">💬</span>
              <h3>Message Hospital</h3>
            </div>
            <MessagePanel requestId={id} otherName={request.patient?.name || 'the hospital'} />
          </div>

          <div className="card-block">
            <div className="card-head">
              <span className="card-head-icon">🧑‍⚕️</span>
              <h3>Patient</h3>
            </div>
            <div className="people-panel">
              <div className="person-row">
                <div className="person-row-top">
                  <span className="person-icon">🧑‍⚕️</span>
                  <div className="person-details">
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
            </div>
          </div>

          <div className="card-block">
            <div className="card-head">
              <span className="card-head-icon">⚡</span>
              <h3>Actions</h3>
            </div>
            {status !== 'open' && !cancelled && (
              <div className="journey-actions">
                {canStartTrip && (
                  <button className="btn primary btn-block" onClick={startTrip}>
                    🚗 Start Trip
                  </button>
                )}

                {canUpdateLocation && (
                  <form
                    className="location-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (myPosition) {
                        run({
                          stage: 'traveling',
                          location: `lat:${myPosition.lat},lng:${myPosition.lng}`,
                          note: location || undefined,
                        })
                      } else {
                        run({ stage: 'traveling', note: location || undefined })
                      }
                    }}
                  >
                    <input
                      placeholder="Add a note for the patient…"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                    <button className="btn ghost btn-sm">📤 Send</button>
                  </form>
                )}

                {canArrive && (
                  <button className="btn primary btn-block" onClick={markArrived}>
                    🏥 Mark Arrived
                  </button>
                )}

                {canDonate && (
                  <p className="hint donation-progress">
                    🩸 Donation in progress — waiting for the patient to confirm completion.
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
              <Link to={`/certificate/${id}`} className="btn primary btn-block">
                🏅 View Donation Certificate
              </Link>
            )}

            {cancelled && (
              <Link to="/dashboard" className="btn primary btn-block">
                ↩️ Return to Dashboard
              </Link>
            )}

            {!completed && !cancelled && (
              <Link to="/journey" className="btn ghost btn-sm btn-block">
                All Journeys
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}