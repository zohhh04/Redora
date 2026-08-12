import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import L from 'leaflet'
import api from '../api/axios'

const INITIAL_RADIUS_KM = 5
const EXPAND_STEP_KM = 5
const INTERVAL_SECONDS = 5 * 60

const reqIcon = L.divIcon({
  className: '',
  html: '<div style="width:26px;height:26px;border-radius:50%;background:#c8102e;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.45)"></div>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
})

const donorIcon = L.divIcon({
  className: '',
  html: '<div style="width:20px;height:20px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
})

function formatCountdown(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}

export default function NearbyDonors() {
  const { id } = useParams()
  const mapEl = useRef(null)
  const mapRef = useRef(null)
  const [request, setRequest] = useState(null)
  const [bloodGroup, setBloodGroup] = useState('')
  const [donors, setDonors] = useState([])
  const [total, setTotal] = useState(0)
  const [center, setCenter] = useState(null)
  const [radiusKm, setRadiusKm] = useState(INITIAL_RADIUS_KM)
  const [countdown, setCountdown] = useState(INTERVAL_SECONDS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    ;(async () => {
      try {
        const { data } = await api.get(`/requests/${id}`)
        if (!active) return
        setRequest(data.request)
        setBloodGroup(data.request.bloodGroup)

        const loc = data.request.location
        if (!loc || loc.lat == null || loc.lng == null) {
          setError('This request does not have a map location.')
          return
        }
        setCenter({ lat: loc.lat, lng: loc.lng })
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load nearby donors')
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [id])

  // Fetch / re-fetch donors whenever the search radius changes.
  useEffect(() => {
    if (!center || !bloodGroup) return
    let active = true

    ;(async () => {
      try {
        const { data: nearby } = await api.get('/geo/nearby-donors', {
          params: {
            lat: center.lat,
            lng: center.lng,
            bloodGroup,
            radiusKm,
            requestId: id,
          },
        })
        if (!active) return
        setDonors(nearby.donors)
        setTotal(nearby.total)
      } catch {
        // keep previous results if a refresh fails
      }
    })()

    return () => {
      active = false
    }
  }, [center, bloodGroup, radiusKm, id])

  // Expand the search radius every 5 minutes.
  useEffect(() => {
    if (!center) return
    const timer = setTimeout(() => {
      setRadiusKm((r) => r + EXPAND_STEP_KM)
      setCountdown(INTERVAL_SECONDS)
    }, countdown * 1000)
    return () => clearTimeout(timer)
  }, [center, countdown])

  // Render the map once, showing the request location and donor markers.
  useEffect(() => {
    if (loading || !center || !mapEl.current || mapRef.current) return

    const map = L.map(mapEl.current, { attributionControl: false }).setView([center.lat, center.lng], 13)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)

    L.marker([center.lat, center.lng], { icon: reqIcon })
      .addTo(map)
      .bindPopup(`📍 ${request?.hospital || 'Request location'}<br/><small>${request?.location?.label || ''}</small>`)

    mapRef.current = map
  }, [loading, center, request?.hospital, request?.location?.label])

  // Draw donor markers whenever the donor list updates.
  useEffect(() => {
    if (!mapRef.current) return
    const markerLayer = mapRef.current._donorMarkers
    if (markerLayer) {
      mapRef.current.removeLayer(markerLayer)
    }
    const layer = L.layerGroup().addTo(mapRef.current)
    donors.forEach((d) => {
      L.marker([d.donor.lat, d.donor.lng], { icon: donorIcon })
        .addTo(layer)
        .bindPopup(`${d.donor.name} · ${d.donor.bloodGroup} · ${d.distanceKm} km away`)
    })
    mapRef.current._donorMarkers = layer
  }, [donors])

  if (loading) return <p className="page center">Loading nearby donors...</p>

  const locationLine = request?.location?.label || [request?.city, request?.area].filter(Boolean).join(', ')

  return (
    <div className="page page-wide nearby-page">
      <div className="dashboard-head">
        <div>
          <h2>{request ? `${request.bloodGroup} Donors Nearby` : 'Nearby Donors'}</h2>
          <p className="hint">
            {request
              ? `Matching donors around ${locationLine ? `"${locationLine.split(',')[0]}"` : 'the request location'}`
              : 'Finding donors near the request location'}
          </p>
        </div>
        {request && (
          <div className="nearby-head-chips">
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
            <span className={`urgency-badge ${request.urgency}`}>
              {request.urgency === 'emergency' ? '🚨' : '🕐'} {request.urgency}
            </span>
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {!error && (
        <>
          <div className="nearby-stats">
            <div className="nearby-stat">
              <span className="nearby-stat-icon">🩸</span>
              <div className="nearby-stat-body">
                <strong>{total} Donor{total !== 1 ? 's' : ''}</strong>
                <span>found nearby</span>
              </div>
            </div>
            <div className="nearby-stat">
              <span className="nearby-stat-icon">🎯</span>
              <div className="nearby-stat-body">
                <strong>{radiusKm} km</strong>
                <span>current search radius</span>
              </div>
            </div>
            <div className="nearby-stat">
              <span className="nearby-stat-icon">⏳</span>
              <div className="nearby-stat-body">
                <strong>{formatCountdown(countdown)}</strong>
                <span>widening to {radiusKm + EXPAND_STEP_KM} km</span>
              </div>
            </div>
          </div>

          <div className="card nearby-map-card">
            <div className="card-head">
              <span className="card-head-icon">🗺️</span>
              <h3>Donor Locations</h3>
              <span className="card-head-live">Search auto-widens over time</span>
            </div>
            <div className="map-wrap">
              <div ref={mapEl} className="live-map" style={{ height: 400 }} />
            </div>
            <p className="map-location-caption">
              <strong>🏥 {request?.hospital || 'Hospital not specified'}</strong>
              <br />
              📍 Mapped to: <strong>{locationLine || '—'}</strong>
            </p>
          </div>

          {donors.length > 0 ? (
            <div className="card">
              <div className="live-head">
                <h3>Donors Near Your Hospital</h3>
                <span className="live-badge live-green">
                  <span className="live-dot"></span> {donors.length} available
                </span>
              </div>
              <div className="nearby-list">
                {donors.map((d) => (
                  <div className="nearby-card" key={d.donor.id}>
                    <div className="nearby-avatar">{d.donor.name.charAt(0)}</div>
                    <div className="nearby-info">
                      <strong>{d.donor.name}</strong>
                      <span>
                        {d.donor.label || [d.donor.city, d.donor.area].filter(Boolean).join(', ') || 'Location not set'}
                      </span>
                      <span className="nearby-meta">
                        <span className="nearby-blood">{d.donor.bloodGroup}</span>
                        {d.donor.donationCount > 0 && (
                          <span className="nearby-donations">
                            🏅 {d.donor.donationCount} donation{d.donor.donationCount > 1 ? 's' : ''}
                          </span>
                        )}
                      </span>
                    </div>
                    <span className="nearby-distance">{d.distanceKm} km</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card nearby-empty-card">
              <span className="droplet-icon">🔍</span>
              <div>
                <h4>No donors found yet</h4>
                <p>
                  We're automatically widening the search to {radiusKm} km. Hang tight — a compatible donor may
                  be on the way.
                </p>
              </div>
            </div>
          )}

          <div className="dashboard-actions">
            <Link to={`/requests/${id}/matches`} className="btn primary">
              View All Matches
            </Link>
            <Link to="/dashboard" className="btn ghost">
              Back to Dashboard
            </Link>
          </div>
        </>
      )}
    </div>
  )
}