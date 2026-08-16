import { useState } from 'react'
import api from '../api/axios'

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function initials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export default function SearchDonors() {
  const [filters, setFilters] = useState({ bloodGroup: '', city: '' })
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) =>
    setFilters({
      ...filters,
      [e.target.name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    })

  const clearFilters = () => {
    setFilters({ bloodGroup: '', city: '' })
    setResults([])
    setSearched(false)
    setMsg('')
  }

  const search = async (e) => {
    e.preventDefault()
    setMsg('')
    setLoading(true)
    try {
      const { data } = await api.get('/donors/search', {
        params: {
          bloodGroup: filters.bloodGroup || undefined,
          city: filters.city || undefined,
        },
      })
      setResults(data.donors || [])
      setSearched(true)
      if (!data.donors?.length) {
        setMsg('No donors found for these filters — try widening your search.')
      }
    } catch (err) {
      setMsg(err.response?.data?.message || 'Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page page-wide search-donors-page">
      <div className="donor-stats-hero search-hero">
        <div className="donor-stats-hero-head">
          <div>
            <span className="section-eyebrow">Find a lifesaver</span>
            <h2>Search Donors</h2>
            <p className="hint">
              Discover verified donors near you by blood group and city.
            </p>
          </div>
        </div>

        <div className="donor-stats-grid">
          <div className="donor-stat-card">
            <span className="donor-stat-ico">🧬</span>
            <div className="donor-stat-body">
              <strong>{bloodGroups.length}</strong>
              <span>Blood Groups</span>
            </div>
          </div>
          <div className="donor-stat-card">
            <span className="donor-stat-ico">📍</span>
            <div className="donor-stat-body">
              <strong>City-wide</strong>
              <span>Local Matches</span>
            </div>
          </div>
          <div className="donor-stat-card accent">
            <span className="donor-stat-ico">🟢</span>
            <div className="donor-stat-body">
              <strong>Available</strong>
              <span>Ready to Donate</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card search-panel">
        <div className="card-head">
          <span className="card-head-icon">🔍</span>
          <h3>Find a Donor</h3>
          <span className="card-head-live">Filter to narrow your results</span>
        </div>

        <form className="search-form" onSubmit={search}>
          <div className="search-fields">
            <label className="field">
              <span>Blood Group</span>
              <select
                name="bloodGroup"
                value={filters.bloodGroup}
                onChange={handleChange}
                className="select"
              >
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
              <input
                name="city"
                placeholder="e.g. Hyderabad"
                value={filters.city}
                onChange={handleChange}
              />
            </label>

            <div className="search-actions">
              <button className="btn primary" disabled={loading}>
                {loading ? 'Searching…' : '🔍 Search'}
              </button>
            </div>
          </div>

          <label className="avail-toggle">
            <input type="checkbox" name="available" onChange={handleChange} />
            <span className="avail-toggle-track" aria-hidden="true" />
            <span className="avail-toggle-label">Only currently available</span>
          </label>
        </form>

        {msg && <p className="hint search-msg">{msg}</p>}
      </div>

      {searched && results.length > 0 && (
        <div className="search-results-head">
          <h3>{results.length} donor{results.length === 1 ? '' : 's'} found</h3>
          <span className="hint">Tap a donor to reach out</span>
        </div>
      )}

      {results.length > 0 ? (
        <div className="donor-grid">
          {results.map((d, i) => (
            <div key={d._id} className="donor-card">
              <span className={`donor-rank ${i === 0 ? 'top' : ''}`}>{i + 1}</span>
              <div className={`donor-avatar bg-${(d.bloodGroup || 'o').replace('+', 'p').replace('-', 'n').toLowerCase()}`}>
                {initials(d.name)}
              </div>
              <div className="donor-card-body">
                <span className="donor-name">{d.name}</span>
                <div className="donor-badges">
                  <span className="blood-chip">{d.bloodGroup || '—'}</span>
                  <span className={`status-badge ${d.eligible ? 'open' : 'matched'}`}>
                    {d.eligible ? '✅ Eligible' : '⏳ Not eligible'}
                  </span>
                </div>
                <div className="donor-meta">
                  <span>📍 {d.city || '—'}{d.area ? `, ${d.area}` : ''}</span>
                  <span>📱 {d.mobile || '—'}</span>
                </div>
                <div className="donor-foot">
                  <span className="donor-count">🏅 {d.donationCount} donation{d.donationCount === 1 ? '' : 's'}</span>
                  <span className={`avail-chip ${d.availableForDonation ? 'on' : 'off'}`}>
                    {d.availableForDonation ? '🟢 Available' : '🔴 Unavailable'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : searched ? (
        <div className="empty-request-box">
          <div className="droplet-icon">🔍</div>
          <div className="empty-copy">
            <h3>No donors match your search</h3>
            <p>Try clearing a filter or searching a wider area to find more donors.</p>
          </div>
        </div>
      ) : (
        <div className="empty-request-box">
          <div className="droplet-icon">🩸</div>
          <div className="empty-copy">
            <h3>Ready to find a donor?</h3>
            <p>
              Pick a blood group or city above and hit Search to see verified donors nearby.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}