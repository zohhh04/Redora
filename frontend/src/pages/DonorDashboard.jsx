import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const DAY_MS = 24 * 60 * 60 * 1000
const MONTHS_MS = 2 * 30 * 24 * 60 * 60 * 1000

const JOURNEY_STATUS = {
  matched: 'Matched · awaiting patient',
  accepted: 'Accepted · ready to start',
  traveling: 'On the way',
  arrived: 'Arrived at hospital',
  donating: 'Donating',
}

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
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

function initials(name) {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function nextEligibleDays(lastDonationDate) {
  if (!lastDonationDate) return 0
  const next = new Date(lastDonationDate).getTime() + MONTHS_MS
  return Math.max(0, Math.ceil((next - Date.now()) / DAY_MS))
}

export default function DonorDashboard() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [activeJourney, setActiveJourney] = useState([])

  useEffect(() => {
    if (user?.role !== 'donor') return
    let active = true
    const syncUser = () =>
      api
        .get('/auth/me')
        .then(({ data }) => {
          if (active) updateUser(data.user)
        })
        .catch(() => {})
    syncUser()
    const timer = setInterval(syncUser, 5000)
    return () => {
      active = false
      clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role])

  useEffect(() => {
    if (user?.role !== 'donor') return
    let active = true
    api
      .get('/donors/my-journey')
      .then(({ data }) => {
        if (!active) return
        const list = data.journey || []
        setActiveJourney(
          list.filter((r) =>
            ['matched', 'accepted', 'traveling', 'arrived', 'donating'].includes(r.status),
          ),
        )
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [user?.role])

  useEffect(() => {
    if (user?.role !== 'donor') return
    let active = true
    const load = () =>
      api
        .get('/requests', { params: { urgency: 'emergency' } })
        .then(({ data }) => {
          if (active) setRequests(data.requests || [])
        })
        .catch(() => {
          if (active) setError('Could not load emergency requests')
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    load()
    const timer = setInterval(load, 5000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [user?.role])

  const matches = (requests || []).filter((r) => r.matchEligible)
  const liveCount = matches.length
  const isAvailable = user?.availableForDonation
  const eligibleDays = nextEligibleDays(user?.lastDonationDate)

  const respond = async (id, action) => {
    setMsg('')
    setError('')
    setBusyId(id)
    try {
      const { data } = await api.patch(`/requests/${id}/respond`, { action })
      if (action === 'accept') {
        navigate('/journey')
      } else {
        setMsg(data.message)
        setRequests((prev) => prev.filter((r) => r._id !== id))
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed')
    } finally {
      setBusyId(null)
    }
  }

  const details = [
    { label: 'Blood Group', value: user?.bloodGroup || '—', icon: '🩸', accent: true },
    { label: 'Emergency', value: user?.availableForEmergencies ? 'On' : 'Off', icon: '🚨' },
    { label: 'Total Donations', value: user?.donationCount ?? 0, icon: '🏅' },
    {
      label: 'Next Eligible',
      value: eligibleDays === 0 ? 'Eligible now' : `In ${eligibleDays} days`,
      icon: '⏳',
    },
    { label: 'Last Donation', value: formatDate(user?.lastDonationDate), icon: '📅' },
  ]

  return (
    <div className="page page-wide">
      <div className="dash-hero">
        <div className="dash-hero-avatar">{initials(user?.name)}</div>
        <div className="dash-hero-body">
          <h2>Welcome back, {user?.name}</h2>
          <p className="dash-hero-sub">
            Donor {user?.city ? `· ${user.city}${user.area ? `, ${user.area}` : ''}` : ''}
          </p>
          <div className="dash-hero-tags">
            <span className={`dash-chip ${isAvailable ? 'chip-green' : 'chip-red'}`}>
              <span className="chip-dot"></span>
              {isAvailable ? 'Available for donation' : 'Currently unavailable'}
            </span>
            <span className="dash-chip chip-ink">
              {eligibleDays === 0 ? 'Eligible now' : `Next eligible in ${eligibleDays} days`}
            </span>
          </div>
        </div>
        <div className="dash-hero-actions">
          <Link to="/profile" className="btn ghost btn-sm">
            Edit Profile
          </Link>
          <Link to="/requests" className="btn ghost btn-sm">
            Browse All Requests
          </Link>
        </div>
      </div>

      <div className="card">
        <h3>Donor Overview</h3>
        <div className="stat-tiles">
          {details.map((d) => (
            <div className="stat-tile" key={d.label}>
              <span className="stat-tile-icon">{d.icon}</span>
              <span className="stat-tile-label">{d.label}</span>
              <span className={`stat-tile-value ${d.accent ? 'stat-tile-accent' : ''}`}>{d.value}</span>
            </div>
          ))}
        </div>
      </div>

      {activeJourney.length > 0 && (
        <div className="card">
          <div className="live-head">
            <h3>Active Donation Journey</h3>
            <span className="live-badge">
              <span className="live-dot"></span> Live
            </span>
          </div>
          <div className="request-list">
            {activeJourney.slice(0, 3).map((r) => (
              <div key={r._id} className="request-card">
                <div className="request-card-top">
                  <span className="status-badge matched">{JOURNEY_STATUS[r.status] || r.status}</span>
                  <span className="request-blood">{r.bloodGroup}</span>
                  <span className="request-score">📍 Live</span>
                </div>
                <div className="request-card-meta">
                  <span>👤 {r.patientName || r.patient?.name || 'Patient'}</span>
                  <span>🏥 {r.hospital || 'Hospital'}</span>
                  <span>📍 {r.city || '—'}{r.area ? `, ${r.area}` : ''}</span>
                  <span>🩸 {r.units} unit{r.units > 1 ? 's' : ''}</span>
                </div>
                <div className="request-actions">
                  <Link to={`/tracking/donor/${r._id}`} className="btn primary btn-sm">
                    Open Live Tracking
                  </Link>
                  <Link to="/journey" className="btn ghost btn-sm">
                    All Journeys
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="live-head">
          <h3>Emergency Blood Requests Near You</h3>
          <span className={`live-badge ${liveCount === 0 ? 'live-green' : ''}`}>
            <span className="live-dot"></span> {liveCount} Live
          </span>
        </div>

        {loading ? (
          <p className="hint">Loading requests…</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : matches.length === 0 ? (
          <div className="empty-request-box">
            <div className="droplet-icon">🩸</div>
            <p>
              No emergency requests at the moment. You'll be notified when a request matches your
              blood group and location.
            </p>
          </div>
        ) : (
          <div className="request-list">
            {msg && <p className="success">{msg}</p>}
            {matches.slice(0, 5).map((r) => (
              <div key={r._id} className="request-card">
                <div className="request-card-top">
                  <span className={`urgency-badge ${r.urgency}`}>🚨 Emergency</span>
                  <span className="request-blood">{r.bloodGroup}</span>
                </div>
                <div className="request-card-meta">
                  <span>🏥 {r.hospital || 'Hospital'}</span>
                  <span>📍 {r.city || '—'}{r.area ? `, ${r.area}` : ''}</span>
                  <span>🩸 {r.units} unit{r.units > 1 ? 's' : ''}</span>
                  <span>⏱ {formatTimeAgo(r.createdAt)}</span>
                </div>
                <p className="request-reasons">{r.matchReasons?.join(' · ')}</p>
                <div className="request-actions">
                  <button
                    className="btn primary btn-sm"
                    disabled={busyId === r._id}
                    onClick={() => respond(r._id, 'accept')}
                  >
                    Accept
                  </button>
                  <button
                    className="btn ghost btn-sm"
                    disabled={busyId === r._id}
                    onClick={() => respond(r._id, 'decline')}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
