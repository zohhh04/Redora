import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import api from '../api/axios'

const OSRM = 'https://router.project-osrm.org/route/v1/driving'

const donorIcon = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

const destIcon = L.divIcon({
  className: '',
  html: '<div style="width:22px;height:22px;border-radius:50%;background:#c8102e;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.4)"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
})

export default function LiveMap({
  origin,
  destination,
  showRoute = true,
  height = 320,
  showNavigate = true,
}) {
  const mapRef = useRef(null)
  const mapEl = useRef(null)
  const layersRef = useRef({})
  const routeFetchRef = useRef(0)
  const [status, setStatus] = useState('')
  const [dest, setDest] = useState(null)
  const [coords, setCoords] = useState(null)
  const [etaSeconds, setEtaSeconds] = useState(null)
  const [distanceKm, setDistanceKm] = useState(null)

  useEffect(() => {
    if (!mapEl.current || mapRef.current) return
    mapRef.current = L.map(mapEl.current, { attributionControl: false }).setView([20.5937, 78.9629], 5)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapRef.current)
  }, [])

  useEffect(() => {
    if (!destination) return
    setStatus('')
    setDest(null)

    const candidates = [
      destination,
      destination.replace(/,{2,}/g, ',').replace(/^\s*,|,\s*$/g, ''),
      ...destination.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 3),
    ].filter((s, i, arr) => s && arr.indexOf(s) === i)

    const tryGeocode = async (i) => {
      if (i >= candidates.length) {
        setStatus(`Couldn't find "${destination}" on the map`)
        return
      }
      try {
        const { data } = await api.get('/geo/geocode', { params: { q: candidates[i] } })
        if (data.result) {
          setDest(data.result)
          return
        }
        tryGeocode(i + 1)
      } catch {
        tryGeocode(i + 1)
      }
    }
    tryGeocode(0)
  }, [destination])

  useEffect(() => {
    if (!mapRef.current || !dest) return
    const map = mapRef.current
    const { lat, lon } = dest
    const l = layersRef.current
    if (!l.dest) {
      l.dest = L.marker([lat, lon], { icon: destIcon }).addTo(map)
    } else {
      l.dest.setLatLng([lat, lon])
    }
    setCoords({ lat, lng: lon })
  }, [dest])

  useEffect(() => {
    if (!mapRef.current || !origin || !coords) return
    const map = mapRef.current
    const l = layersRef.current
    if (!l.origin) l.origin = L.marker([origin.lat, origin.lng], { icon: donorIcon }).addTo(map)
    else l.origin.setLatLng([origin.lat, origin.lng])

    const fitToPoints = () => {
      map.fitBounds(L.latLngBounds([[origin.lat, origin.lng], [coords.lat, coords.lng]]), { padding: [40, 40] })
    }

    if (!showRoute) {
      if (l.route) {
        map.removeLayer(l.route)
        l.route = null
      }
      setEtaSeconds(null)
      setDistanceKm(null)
      fitToPoints()
      return
    }

    const requestId = ++routeFetchRef.current
    setStatus('')
    fetch(
      `${OSRM}/${origin.lng},${origin.lat};${coords.lng},${coords.lat}?overview=full&geometries=geojson`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (!mapRef.current || routeFetchRef.current !== requestId) return
        if (data.code !== 'Ok') throw new Error('No route found')
        const route = data.routes[0]
        setEtaSeconds(Math.round(route.duration))
        setDistanceKm((route.distance / 1000).toFixed(1))

        const line = L.geoJSON(route.geometry, { color: '#2563eb', weight: 5, opacity: 0.85 })
        if (l.route) {
          map.removeLayer(l.route)
        }
        l.route = line.addTo(map)
        map.fitBounds(line.getBounds().pad(0.15))
      })
      .catch(() => {
        if (!mapRef.current || routeFetchRef.current !== requestId) return
        setEtaSeconds(null)
        setDistanceKm(null)
        if (l.route) {
          map.removeLayer(l.route)
        }
        l.route = L.polyline(
          [
            [origin.lat, origin.lng],
            [coords.lat, coords.lng],
          ],
          { color: '#2563eb', weight: 4, opacity: 0.8, dashArray: '8 8' },
        ).addTo(map)
        fitToPoints()
      })
  }, [origin, coords, showRoute])

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        layersRef.current = {}
      }
    }
  }, [])

  const directionsUrl = coords
    ? `https://www.google.com/maps/dir/?api=1&destination=${coords.lat},${coords.lng}&travelmode=driving`
    : ''

  const formatEta = (sec) => {
    if (sec == null) return ''
    const m = Math.floor(sec / 60)
    const h = Math.floor(m / 60)
    return h > 0 ? `${h}h ${m % 60}m` : `${m % 60}m`
  }

  return (
    <div className="map-wrap">
      <div ref={mapEl} className="live-map" style={{ height }} />
      {showRoute && etaSeconds != null && (
        <div className="map-eta">
          <span className="eta-time">⏱ {formatEta(etaSeconds)}</span>
          <span className="eta-dist">to reach hospital</span>
          <span className="eta-km">{distanceKm} km</span>
        </div>
      )}
      {status && <p className="map-status">{status}</p>}
      {showNavigate && directionsUrl && (
        <a href={directionsUrl} target="_blank" rel="noreferrer" className="btn primary btn-sm map-nav-btn">
          🧭 Navigate with Google Maps
        </a>
      )}
    </div>
  )
}