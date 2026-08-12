import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function formatDate(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
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

export default function PatientDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const prevStatusRef = useRef({})

  const [search, setSearch] = useState({ bloodGroup: '', city: '', available: true })
  const [searchResults, setSearchResults] = useState([])
  const [searchMsg, setSearchMsg] = useState('')
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

  useEffect(() => {
    const timer = setInterval(() => {
      api
        .get('/requests/my')
        .then(({ data }) => {
          const list = data.requests || []
          setRequests(list)
          const next = {}
          list.forEach((r) => {
            const prev = prevStatusRef.current[r._id]
            next[r._id] = r.status
            if (prev === 'open' && r.status === 'matched') {
              navigate(`/tracking/patient/${r._id}`)
            }
          })
          prevStatusRef.current = next
        })
        .catch(() => {})
    }, 4000)
    return () => clearInterval(timer)
  }, [navigate])

  const handleSearchChange = (e) =>
    setSearch({ ...search, [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const searchDonors = async (e) => {
    e.preventDefault()
    setSearchMsg('')
    try {
      const { data } = await api.get('/donors/search', {
        params: {
          bloodGroup: search.bloodGroup || undefined,
          city: search.city || undefined,
          available: search.available ? 'true' : undefined,
        },
      })
      setSearchResults(data.donors || [])
      if (!data.donors?.length) setSearchMsg('No donors found for these filters.')
    } catch (err) {
      setSearchMsg(err.response?.data?.message || 'Search failed')
    }
  }

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

  const renderRequest = (r) => (
    <div key={r._id} className="request-card">
      <div className="request-card-top">
        <span className={`status-badge ${r.status}`}>{STATUS_LABEL[r.status] || r.status}</span>
        <span className="request-blood">{r.bloodGroup}</span>
        <span className={`urgency-badge ${r.urgency}`}>
          {r.urgency === 'emergency' ? '🚨' : '🕐'} {r.urgency}
        </span>
      </div>
      <div className="request-card-meta">
        <span>🏥 {r.hospital || 'Hospital'}</span>
        <span>📍 {r.city || '—'}{r.area ? `, ${r.area}` : ''}</span>
        <span>🩸 {r.units} unit{r.units > 1 ? 's' : ''}</span>
        <span>📅 {formatDate(r.createdAt)}</span>
      </div>
      {r.matchedDonor && (
        <p className="matched-donor">
          🤝 Donor: {r.matchedDonor.name} ({r.matchedDonor.bloodGroup}) {r.matchedDonor.city ? `· ${r.matchedDonor.city}` : ''}
        </p>
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
        {['accepted', 'traveling', 'arrived', 'donating'].includes(r.status) && (
          <Link to={`/tracking/patient/${r._id}`} className="btn primary btn-sm">
            📍 Track Live
          </Link>
        )}
        {r.status === 'completed' && (
          <Link to={`/tracking/patient/${r._id}`} className="btn ghost btn-sm">
            View Journey
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <div className="page page-wide">
      <div className="dashboard-head">
        <div>
          <h2>Your Blood Requests</h2>
          <p className="hint">Welcome, {user?.name} · Patient</p>
        </div>
        <span className="live-badge live-green">
          <span className="live-dot"></span> Live
        </span>
      </div>

      {reqMsg && <p className="success">{reqMsg}</p>}
      {reqError && <p className="error">{reqError}</p>}

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
            <div className="card">
              <h3>Completed ({completed.length})</h3>
              <div className="request-list">{completed.map(renderRequest)}</div>
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

      <div className="card">
        <h3>Search Donors</h3>
        <form className="search-form" onSubmit={searchDonors}>
          <label className="field">
            <span>Blood Group</span>
            <select name="bloodGroup" value={search.bloodGroup} onChange={handleSearchChange} className="select">
              <option value="">Any</option>
              {bloodGroups.map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>City</span>
            <input name="city" placeholder="e.g. Hyderabad" value={search.city} onChange={handleSearchChange} />
          </label>
          <label className="checkbox-row search-avail">
            <input
              type="checkbox"
              name="available"
              checked={search.available}
              onChange={handleSearchChange}
            />
            <span>
              <strong>Only currently available</strong>
            </span>
          </label>
          <button className="btn primary">Search</button>
        </form>

        {searchMsg && <p className="hint">{searchMsg}</p>}

        {searchResults.length > 0 && (
          <div className="request-list donor-results">
            {searchResults.map((d) => (
              <div key={d._id} className="request-card">
                <div className="request-card-top">
                  <span className="request-blood">{d.bloodGroup}</span>
                  <span className={`status-badge ${d.eligible ? 'open' : 'matched'}`}>
                    {d.eligible ? '✅ Eligible' : '⏳ Not eligible'}
                  </span>
                  <span className="request-score">{d.donationCount} donations</span>
                </div>
                <div className="request-card-meta">
                  <span>👤 {d.name}</span>
                  <span>📍 {d.city || '—'}{d.area ? `, ${d.area}` : ''}</span>
                  <span>📱 {d.mobile || '—'}</span>
                  <span>{d.availableForDonation ? '🟢 Available' : '🔴 Unavailable'}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
