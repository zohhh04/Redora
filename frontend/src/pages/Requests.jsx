import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function formatTimeAgo(date) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function Requests() {
  const { user } = useAuth()
  const [filters, setFilters] = useState({ bloodGroup: '', city: '', urgency: '' })
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    api
      .get('/requests', {
        params: {
          bloodGroup: filters.bloodGroup || undefined,
          city: filters.city || undefined,
          urgency: filters.urgency || undefined,
        },
      })
      .then(({ data }) => setRequests(data.requests || []))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load requests'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value })

  const accept = async (id) => {
    if (!window.confirm('Accept this request? It will be marked as matched to you.')) return
    setMsg('')
    try {
      await api.patch(`/requests/${id}/status`, { status: 'matched', donorId: user.id })
      setMsg('You accepted the request. The patient will be notified.')
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to accept request')
    }
  }

  const matched = requests.filter((r) => r.matchEligible)
  const notMatched = requests.filter((r) => !r.matchEligible)

  return (
    <div className="page page-wide">
      <div className="dashboard-head">
        <div>
          <h2>Open Blood Requests</h2>
          <p className="hint">
            Sorted by AI match to your profile ({user?.bloodGroup || 'set your blood group'} donor)
          </p>
        </div>
      </div>

      <form className="search-form" onSubmit={(e) => { e.preventDefault(); load() }}>
        <label className="field">
          <span>Blood Group</span>
          <select name="bloodGroup" value={filters.bloodGroup} onChange={handleFilterChange} className="select">
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
          <input name="city" placeholder="e.g. Hyderabad" value={filters.city} onChange={handleFilterChange} />
        </label>
        <label className="field">
          <span>Urgency</span>
          <select name="urgency" value={filters.urgency} onChange={handleFilterChange} className="select">
            <option value="">Any</option>
            <option value="emergency">🚨 Emergency</option>
            <option value="normal">Normal</option>
          </select>
        </label>
        <button className="btn primary">Apply Filters</button>
      </form>

      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="hint">Loading requests…</p>
      ) : requests.length === 0 ? (
        <p className="empty-state">No open requests match your filters right now.</p>
      ) : (
        <>
          {matched.length > 0 && (
            <div className="card">
              <h3>Best Matches For You ({matched.length})</h3>
              <div className="request-list">
                {matched.map((r) => (
                  <div key={r._id} className="request-card">
                    <div className="request-card-top">
                      <span className={`urgency-badge ${r.urgency}`}>
                        {r.urgency === 'emergency' ? '🚨' : '🕐'} {r.urgency}
                      </span>
                      <span className="request-blood">{r.bloodGroup}</span>
                      <span className="request-score">AI {r.matchScore}/100</span>
                    </div>
                    <div className="request-card-meta">
                      <span>👤 {r.patient?.name || 'Patient'}</span>
                      <span>🏥 {r.hospital || 'Hospital'}</span>
                      <span>📍 {r.city || '—'}{r.area ? `, ${r.area}` : ''}</span>
                      <span>🩸 {r.units} unit{r.units > 1 ? 's' : ''}</span>
                      <span>⏱ {formatTimeAgo(r.createdAt)}</span>
                    </div>
                    {r.notes && <p className="request-notes">📝 {r.notes}</p>}
                    <p className="request-reasons">{r.matchReasons?.join(' · ')}</p>
                    <button className="btn primary btn-sm" onClick={() => accept(r._id)}>
                      Accept Request
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {notMatched.length > 0 && (
            <div className="card">
              <h3>Other Requests ({notMatched.length})</h3>
              <div className="request-list">
                {notMatched.map((r) => (
                  <div key={r._id} className="request-card muted">
                    <div className="request-card-top">
                      <span className={`urgency-badge ${r.urgency}`}>{r.urgency}</span>
                      <span className="request-blood">{r.bloodGroup}</span>
                    </div>
                    <div className="request-card-meta">
                      <span>🏥 {r.hospital || 'Hospital'}</span>
                      <span>📍 {r.city || '—'}</span>
                      <span>🩸 {r.units} unit{r.units > 1 ? 's' : ''}</span>
                      <span>⏱ {formatTimeAgo(r.createdAt)}</span>
                    </div>
                    <p className="request-reasons">{r.matchReasons?.[0]}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
