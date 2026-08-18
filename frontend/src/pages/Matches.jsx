import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/axios'

export default function Matches() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const radiusParam = parseFloat(searchParams.get('radius'))
  const [request, setRequest] = useState(null)
  const [matches, setMatches] = useState([])
  const [nearby, setNearby] = useState(null)
  const [radius, setRadius] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => {
    let active = true

    ;(async () => {
      try {
        const { data: reqData } = await api.get(`/requests/${id}`)
        if (!active) return
        setRequest(reqData.request)

        const loc = reqData.request.location
        const lat = loc ? loc.lat ?? loc.latitude : null
        const lng = loc ? loc.lng ?? loc.lon ?? loc.longitude : null

        // "View All Matches" passes a radius, so list every eligible donor
        // within that radius instead of the smaller AI-ranked set.
        if (radiusParam && !isNaN(radiusParam) && lat != null && lng != null) {
          const { data } = await api.get('/geo/nearby-donors', {
            params: {
              lat,
              lng,
              bloodGroup: reqData.request.bloodGroup,
              radiusKm: radiusParam,
              requestId: id,
            },
          })
          if (!active) return
          setNearby(data.donors || [])
          setRadius(radiusParam)
          setError('')
          return
        }

        const { data } = await api.get(`/requests/${id}/donors`)
        if (!active) return
        setMatches(data.matches || [])
        setError('')
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load matches')
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [id, radiusParam])

  const assign = async (donorId) => {
    if (!window.confirm('Assign this donor to your request?')) return
    setMsg('')
    try {
      await api.patch(`/requests/${id}/donor`, { action: 'assign', donorId })
      setMsg('Donor assigned! Your request is now matched.')
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign donor')
    }
  }

  const donors = nearby || matches

  return (
    <div className="page page-wide">
      <div className="dashboard-head">
        <div>
          <h2>{nearby ? `Donors Within ${radius} km` : 'AI Matched Donors'}</h2>
          <p className="hint">
            {request
              ? `${request.bloodGroup} · ${request.units} unit${request.units > 1 ? 's' : ''}${request.city ? ` · ${request.city}` : ''} · ${request.urgency}`
              : 'Request details'}
            {nearby ? ' · sorted by distance' : ''}
          </p>
        </div>
      </div>

      {msg && <p className="success">{msg}</p>}
      {error && <p className="error">{error}</p>}

      {loading ? (
        <p className="hint">Loading donors…</p>
      ) : (
        <>
          {donors.length === 0 ? (
            <div className="card">
              <h3>No donors found</h3>
              <p className="empty-state">
                No eligible, available donors found in this area yet. Try widening the search radius.
              </p>
            </div>
          ) : (
            <div className="card">
              <h3>Ranked Donors ({donors.length})</h3>
              <div className="request-list">
                {donors.map((m, i) => {
                  const donor = nearby ? m.donor : m.donor
                  const score = nearby ? null : m.score
                  const reasons = nearby ? null : m.reasons
                  const distance = nearby ? m.distanceKm : null
                  return (
                    <div key={donor.id} className="request-card">
                      <div className="request-card-top">
                        <span className="rank-badge">#{i + 1}</span>
                        <span className="request-blood">{donor.bloodGroup}</span>
                        {score != null && (
                          <span className="request-score">
                            <span className="score-bar">
                              <span className="score-fill" style={{ width: `${score}%` }}></span>
                            </span>
                            {score}/100
                          </span>
                        )}
                        {distance != null && (
                          <span className="request-score">📍 {distance} km away</span>
                        )}
                      </div>
                      <div className="request-card-meta">
                        <span>👤 {donor.name}</span>
                        <span>📍 {donor.city || '—'}{donor.area ? `, ${donor.area}` : ''}</span>
                        <span>📱 {donor.mobile || '—'}</span>
                        <span>🏅 {donor.donationCount} donations</span>
                      </div>
                      {reasons && <p className="request-reasons">{reasons.join(' · ')}</p>}
                      <button className="btn primary btn-sm" onClick={() => assign(donor.id)}>
                        Assign Donor
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}