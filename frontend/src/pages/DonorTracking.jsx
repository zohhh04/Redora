import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import LiveMap from '../components/LiveMap'
import MessagePanel from '../components/MessagePanel'
import { useVoiceAnnounce } from '../hooks/useVoiceAnnounce'

const LINEAR_STAGES = [
  { stage: 'matched', icon: '🤝', label: 'You Were Matched', sub: 'You were matched to this blood request' },
  { stage: 'accepted', icon: '✅', label: 'Trip Started', sub: 'The patient approved you — your trip has started' },
  { stage: 'traveling', icon: '🚗', label: "You're On The Way", sub: 'You are heading to the hospital' },
  { stage: 'arrived', icon: '🏥', label: 'You Arrived', sub: 'You reached the hospital' },
  { stage: 'donating', icon: '🩸', label: 'Donation In Progress', sub: 'The donation is happening at the hospital' },
  { stage: 'completed', icon: '🎉', label: 'Donation Completed', sub: 'Donation completed successfully' },
]

const VOICE_STATUS = {
  matched: 'You have been matched to a blood request.',
  accepted: 'The trip has started. You are on the way.',
  traveling: 'You are on the way to the hospital.',
  arrived: 'You have arrived at the hospital.',
  donating: 'The donation is in progress at the hospital.',
  completed: 'Your donation has been completed successfully.',
}

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

const MODE_META = { car: '🚗', bike: '🛵', walk: '🚶' }
const MODE_WORD = { car: 'car', bike: 'bike', walk: 'walk' }

function formatTime(date) {
  if (!date) return ''
  return new Date(date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatEta(sec) {
  if (sec == null) return ''
  const m = Math.round(sec / 60)
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

const ARRIVAL_RADIUS_KM = 0.15

export default function DonorTracking() {
  const { id } = useParams()
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
  const [eta, setEta] = useState(null)
  const [mode, setMode] = useState('car')
  const modePickedRef = useRef(false)
  const watcherRef = useRef(null)
  const routeRef = useRef(null)

  const { voiceOn, toggleVoice, announce } = useVoiceAnnounce()
  const lastSpokenRef = useRef(null)

  // Speak each journey stage in the chosen language when it changes (or when
  // voice is switched on), so the donor can stay aware hands-free.
  useEffect(() => {
    if (!request) return
    const s = request.status
    if (voiceOn && VOICE_STATUS[s] && s !== lastSpokenRef.current) {
      lastSpokenRef.current = s
      announce(VOICE_STATUS[s])
    }
  }, [request, voiceOn, announce])

  const onRoute = useCallback((info) => {
    routeRef.current = info
    setEta(info)
  }, [])

  const selectMode = async (m) => {
    modePickedRef.current = true
    setMode(m)
    try {
      await api.patch(`/requests/${id}/journey`, { travelMode: m })
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update travel mode')
    }
  }

  useEffect(() => {
    if (request?.travelMode && !modePickedRef.current) setMode(request.travelMode)
  }, [request])

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
    const payload = {
      stage: 'traveling',
      location: `lat:${lat},lng:${lng}`,
    }
    if (routeRef.current?.geometry) payload.route = routeRef.current
    api
      .patch(`/requests/${id}/journey`, payload)
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
    if (["matched", "accepted", "traveling"].includes(request?.status) && !autoStartedRef.current) {
      autoStartedRef.current = true
      startWatch()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.status])

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
    const etaSec = eta?.etas?.[mode]
    const parts = ['Started trip']
    if (etaSec != null) parts.push(`${MODE_META[mode]} by ${MODE_WORD[mode]} · ~${formatEta(etaSec)}`)
    if (eta?.distanceKm) parts.push(`${eta.distanceKm} km away`)
    const payload = { stage: 'traveling', note: parts.join(' · '), start: true }
    if (myPosition) {
      payload.location = `lat:${myPosition.lat},lng:${myPosition.lng}`
    }
    if (routeRef.current?.geometry) payload.route = routeRef.current
    await run(payload)
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

  // When the donor's live position reaches the hospital, mark them arrived
  // automatically so no manual "Mark Arrived" tap is needed.
  const autoArrivedRef = useRef(false)
  useEffect(() => {
    if (autoArrivedRef.current) return
    const hosp = request?.location
    if (
      request?.status === 'traveling' &&
      myPosition &&
      hosp &&
      hosp.lat != null &&
      hosp.lng != null
    ) {
      const d = distanceKm(myPosition.lat, myPosition.lng, hosp.lat, hosp.lng)
      if (d <= ARRIVAL_RADIUS_KM) {
        autoArrivedRef.current = true
        markArrived()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request?.status, myPosition?.lat, myPosition?.lng, request?.location?.lat, request?.location?.lng])

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

  const linearStages = LINEAR_STAGES.map((s) =>
    s.stage === 'traveling' ? { ...s, icon: MODE_META[mode] } : s,
  )

  const events = request.journey.filter(
    (e) => !LINEAR_STAGES.some((s) => s.stage === e.stage),
  )

  const canStartTrip = status === 'accepted'
  const canUpdateLocation = status === 'traveling'
  const canArrive = status === 'traveling'
  const canAutoArrive =
    request?.location && request.location.lat != null && request.location.lng != null
  const canDonate = status === 'arrived'
  const canCancel = !completed && !cancelled

  const destination = [request.hospital, request.city, request.area].filter(Boolean).join(', ')
  const hospitalNumber = request.hospitalPhone || request.phone || ''
  const cityName = (request.city || '').toLowerCase().trim()
  const hospName = (request.hospital || '').toLowerCase().trim()
  const cityDuplicatesHospital = cityName !== '' && cityName === hospName

  let tripMain = 'Waiting to share location…'
  let tripSub = 'Turn on live tracking so the hospital can follow your route'
  const MODE_LABEL = { car: 'by car', bike: 'by bike', walk: 'walking' }
  if (eta?.etas) {
    tripMain = `~${formatEta(eta.etas[mode])}`
    tripSub = `${MODE_LABEL[mode]} to ${request.hospital || 'the hospital'} · ${eta.distanceKm} km away`
  }
  if (status === 'arrived') { tripMain = 'Arrived 🏥'; tripSub = `You're at ${request.hospital || 'the hospital'} — check in at reception` }
  if (status === 'donating') { tripMain = 'Donating 🩸'; tripSub = 'The donation is in progress with the hospital team' }
  if (completed) { tripMain = 'Completed 🎉'; tripSub = 'The donation was completed successfully' }

  return (
    <div className="page page-wide tracking-page donor-tracking">
      <header className="tracking-header">
        <div className="tracking-title">
          <h2>My Donation Journey</h2>
          <p className="hint">Your blood donation trip to the hospital, step by step</p>
        </div>
        <button
          type="button"
          className={`voice-toggle ${voiceOn ? 'on' : ''}`}
          onClick={toggleVoice}
          title={voiceOn ? 'Turn off voice updates' : 'Turn on voice updates'}
          aria-label={voiceOn ? 'Mute voice updates' : 'Enable voice updates'}
        >
          {voiceOn ? '🔊' : '🔇'}
        </button>
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
        {!cityDuplicatesHospital && request.city && (
          <span className="summary-chip">
            <span className="chip-bg">📍</span>
            {request.city}
          </span>
        )}
        {!cityDuplicatesHospital && request.hospital && (
          <span className="summary-chip">
            <span className="chip-bg">🏥</span>
            <span className="summary-chip-text">{request.hospital}</span>
          </span>
        )}
      </div>

      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      <section className="arrival-panel donor-hero">
        <div className="arrival-panel-top">
          <div className="arrival-dest">
            <span className="arrival-ico arrival-hosp">🏥</span>
            <div>
              <span className="arrival-name">{request.hospital || 'Hospital'}</span>
              <span className="arrival-sub">
                {request.city}{request.area ? `, ${request.area}` : ''} · Needs {request.bloodGroup} · {request.units} unit{request.units > 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="donor-hero-actions">
            {canUpdateLocation && (
              <button className="btn ghost btn-sm" onClick={locate} disabled={geolocating}>
                {geolocating ? '📍 Locating…' : myPosition ? '📍 Refresh GPS' : '📍 Share Location'}
              </button>
            )}
            {hospitalNumber && (
              <a className="btn primary btn-sm" href={`tel:${hospitalNumber}`}>
                📞 Call Hospital
              </a>
            )}
          </div>
        </div>

        <LiveMap origin={myPosition} destination={destination} destinationCoords={request.location} height={460} showNavigate={true} onRoute={onRoute} />
        {gpsError && <p className="map-status">{gpsError}</p>}

        <div className="eta-banner trip-banner">
          <span className="eta-banner-ico">{status === 'arrived' ? '🏥' : status === 'donating' ? '🩸' : completed ? '🎉' : MODE_META[mode]}</span>
          <div className="eta-banner-info">
            <span className="eta-main">{tripMain}</span>
            <span className="eta-secondary">{tripSub}</span>
            {eta?.etas && (
              <div className="mode-etas">
                <span className="mode-eta-label">How are you traveling?</span>
                {['car', 'bike', 'walk'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`mode-eta mode-pick ${mode === m ? 'active' : ''}`}
                    onClick={() => selectMode(m)}
                  >
                    {m === 'car' ? '🚗' : m === 'bike' ? '🛵' : '🚶'} {formatEta(eta.etas[m])}
                  </button>
                ))}
                {canStartTrip && (
                  <button className="btn primary start-trip-btn" onClick={startTrip}>
                    {MODE_META[mode]} Start Trip
                  </button>
                )}
              </div>
            )}
          </div>
          <span className="card-head-live">Live · synced {lastSync ? formatTime(lastSync) : '…'}</span>
        </div>
      </section>

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
            <div className="stepper">
              {linearStages.map((s, i) => {
                const done = linearDone.has(s.stage)
                const active = i === currentIndex
                const nextDone =
                  i + 1 < LINEAR_STAGES.length && linearDone.has(LINEAR_STAGES[i + 1].stage)
                const stage_entry = request.journey.find((e) => e.stage === s.stage)
                return (
                  <div
                    key={s.stage}
                    className={`stepper-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}
                  >
                    <div className="stepper-track">
                      <span className={`stepper-line left${done ? ' filled' : ''}`} />
                      <span className="stepper-dot">{s.icon}</span>
                      <span className={`stepper-line right${nextDone ? ' filled' : ''}`} />
                    </div>
                    <div className="stepper-info">
                      <span className="stepper-name">
                        {s.label}
                        {active && <span className="timeline-now"> · now</span>}
                      </span>
                      <span className="stepper-meta">
                        {stage_entry
                          ? `${formatDate(stage_entry.at)} ${formatTime(stage_entry.at)}${s.stage === 'traveling' && stage_entry.note ? ` · ${stage_entry.note}` : ''}`
                          : s.sub}
                      </span>
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
          <div className="card-block">
            <div className="card-head">
              <span className="card-head-icon">🏥</span>
              <h3>Hospital Details</h3>
            </div>
            <div className="people-panel">
              <div className="person-row">
                <div className="person-row-top">
                  <span className="person-icon">🏥</span>
                  <div className="person-details">
                    <span className="person-name">{request.hospital || '—'}</span>
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
            <MessagePanel requestId={id} otherName={request.hospital || 'the hospital'} />
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
                    {MODE_META[mode]} Start Trip
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
                      placeholder="Add a note for the hospital…"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                    <button className="btn ghost btn-sm">📤 Send</button>
                  </form>
                )}

                {canArrive && (
                  <>
                    {canAutoArrive ? (
                      <p className="hint auto-arrive-hint">
                        📍 Auto-detecting arrival — you'll be marked arrived as soon as you reach the
                        hospital.
                      </p>
                    ) : (
                      <button className="btn primary btn-block" onClick={markArrived}>
                        🏥 Mark Arrived
                      </button>
                    )}
                  </>
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