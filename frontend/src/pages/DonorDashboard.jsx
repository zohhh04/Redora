import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const DAY_MS = 24 * 60 * 60 * 1000
const MONTHS_MS = 2 * 30 * 24 * 60 * 60 * 1000

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
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.role !== 'donor') return
    let active = true
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
    return () => {
      active = false
    }
  }, [user?.role])

  const matches = (requests || []).filter((r) => r.matchEligible)
  const liveCount = matches.length
  const isAvailable = user?.availableForDonation
  const eligibleDays = nextEligibleDays(user?.lastDonationDate)

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
            {matches.slice(0, 5).map((r) => (
              <div key={r._id} className="request-card">
                <div className="request-card-top">
                  <span className={`urgency-badge ${r.urgency}`}>🚨 Emergency</span>
                  <span className="request-blood">{r.bloodGroup}</span>
                  <span className="request-score">AI {r.matchScore}/100</span>
                </div>
                <div className="request-card-meta">
                  <span>🏥 {r.hospital || 'Hospital'}</span>
                  <span>📍 {r.city || '—'}{r.area ? `, ${r.area}` : ''}</span>
                  <span>🩸 {r.units} unit{r.units > 1 ? 's' : ''}</span>
                  <span>⏱ {formatTimeAgo(r.createdAt)}</span>
                </div>
                <p className="request-reasons">{r.matchReasons?.join(' · ')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
