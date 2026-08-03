import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function Matches() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [request, setRequest] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let active = true
    api
      .get(`/requests/${id}`)
      .then(({ data }) => {
        if (active) setRequest(data.request)
        return api.get(`/requests/${id}/donors`)
      })
      .then(({ data }) => {
        if (active) {
          setMatches(data.matches || [])
          setError('')
        }
      })
      .catch((err) => {
        if (active) setError(err.response?.data?.message || 'Failed to load matches')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  const assign = async (donorId) => {
    if (!window.confirm('Assign this donor to your request?')) return
    setMsg('')
    try {
      await api.patch(`/requests/${id}/status`, { status: 'matched', donorId })
      setMsg('Donor assigned! Your request is now matched.')
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign donor')
    }
  }

  return (
    <div className="page page-wide">
      <div className="dashboard-head">
        <div>
          <h2>AI Matched Donors</h2>
          <p className="hint">
            {request
              ? `${request.bloodGroup} · ${request.units} unit${request.units > 1 ? 's' : ''}${request.city ? ` · ${request.city}` : ''} · ${request.urgency}`
              : 'Request details'}
          </p>
        </div>
      </div>

      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="hint">Running AI match…</p>
      ) : (
        <>
          {matches.length === 0 ? (
            <div className="card">
              <h3>No matches yet</h3>
              <p className="empty-state">
                No eligible donors found yet. Make sure compatible, available donors have set their
                blood group and availability. New donors are matched automatically.
              </p>
            </div>
          ) : (
            <div className="card">
              <h3>Ranked Donors ({matches.length})</h3>
              <div className="request-list">
                {matches.map((m, i) => (
                  <div key={m.donor.id} className="request-card">
                    <div className="request-card-top">
                      <span className="rank-badge">#{i + 1}</span>
                      <span className="request-blood">{m.donor.bloodGroup}</span>
                      <span className="request-score">
                        <span className="score-bar">
                          <span className="score-fill" style={{ width: `${m.score}%` }}></span>
                        </span>
                        {m.score}/100
                      </span>
                    </div>
                    <div className="request-card-meta">
                      <span>👤 {m.donor.name}</span>
                      <span>📍 {m.donor.city || '—'}{m.donor.area ? `, ${m.donor.area}` : ''}</span>
                      <span>📱 {m.donor.mobile || '—'}</span>
                      <span>🏅 {m.donor.donationCount} donations</span>
                    </div>
                    <p className="request-reasons">{m.reasons.join(' · ')}</p>
                    <button className="btn primary btn-sm" onClick={() => assign(m.donor.id)}>
                      Assign Donor
                    </button>
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
