import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import api from '../api/axios'

const OSRM = 'https://router.project-osrm.org/route/v1/driving'
const AVG_CAR_KMH = 30
const AVG_BIKE_KMH = 20
const AVG_WALK_KMH = 5

const MANEUVER_ICON = {
  depart: '🚗',
  arrive: '🏁',
  'turn left': '↰',
  'turn right': '↱',
  'turn sharp left': '⬅',
  'turn sharp right': '➡',
  'turn slight left': '↖',
  'turn slight right': '↗',
  continue: '⬆',
  straight: '⬆',
  uturn: '↩',
  merge: '⇥',
  ramp: '↗',
  fork: '⤴',
  'end of road': '❯',
  roundabout: '🔄',
  rotary: '🔄',
  'on ramp': '↗',
  'off ramp': '↱',
  'new name': '↦',
}

function stepInstruction(step) {
  const type = step.maneuver?.type
  const mod = step.maneuver?.modifier
  const road = step.name && step.name !== '-' ? step.name : ''
  switch (type) {
    case 'depart':
      return `Head ${mod || 'straight'}${road ? ` on ${road}` : ''}`
    case 'arrive':
      return 'Arrive at your destination'
    case 'continue':
      return `Continue${road ? ` onto ${road}` : ''}`
    case 'end of road':
      return `At the end of the road, turn ${mod || 'left'}${road ? ` onto ${road}` : ''}`
    case 'turn':
      return `Turn ${mod || ''}${road ? ` onto ${road}` : ''}`.replace('  ', ' ')
    case 'new name':
      return `Continue onto ${road}`
    case 'merge':
      return `Merge${road ? ` onto ${road}` : ''}`
    case 'ramp':
      return `Take the ramp ${mod ? `${mod} ` : ''}${road ? ` onto ${road}` : ''}`
    case 'fork':
      return `Keep ${mod || ''}${road ? ` onto ${road}` : ''}`.replace('  ', ' ')
    case 'roundabout':
    case 'rotary':
      return `At the ${type}, take the ${mod || 'first'} exit${road ? ` onto ${road}` : ''}`
    case 'uturn':
      return `Make a U-turn${road ? ` onto ${road}` : ''}`
    default:
      return `${(mod || type || 'Continue')[0].toUpperCase()}${(mod || type || 'Continue').slice(1)}${road ? ` onto ${road}` : ''}`
  }
}

function haversineKm(a, b) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// Car uses the real driving duration when available; bike/walk are estimated
// from the route distance using typical average speeds.
function estimateModes(distKm, carSeconds) {
  return {
    car: carSeconds != null ? carSeconds : Math.round((distKm / AVG_CAR_KMH) * 3600),
    bike: Math.round((distKm / AVG_BIKE_KMH) * 3600),
    walk: Math.round((distKm / AVG_WALK_KMH) * 3600),
  }
}

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
  onRoute,
  onDirections,
  storedRoute = null,
}) {
  const mapRef = useRef(null)
  const mapEl = useRef(null)
  const layersRef = useRef({})
  const routeFetchRef = useRef(0)
  const [status, setStatus] = useState('')
  const [dest, setDest] = useState(null)
  const [coords, setCoords] = useState(null)
  const [directions, setDirections] = useState([])

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

  const originKey = origin ? `${origin.lat},${origin.lng}` : ''
  const destKey = coords ? `${coords.lat},${coords.lng}` : ''

  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current
    const l = layersRef.current

    if (origin) {
      if (!l.origin) l.origin = L.marker([origin.lat, origin.lng], { icon: donorIcon }).addTo(map)
      else l.origin.setLatLng([origin.lat, origin.lng])
    } else if (l.origin) {
      map.removeLayer(l.origin)
      l.origin = null
    }

    if (!origin || !coords) {
      if (origin) map.setView([origin.lat, origin.lng], 13)
      else if (coords) map.setView([coords.lat, coords.lng], 13)
      return
    }
  }, [originKey, destKey])

  useEffect(() => {
    if (!mapRef.current || !origin || !coords) return
    const map = mapRef.current
    const l = layersRef.current

    const fitToPoints = () => {
      map.fitBounds(L.latLngBounds([[origin.lat, origin.lng], [coords.lat, coords.lng]]), { padding: [40, 40] })
    }

    // When the donor's shared optimized route exists, draw exactly that so both
    // the donor and patient see the same path.
    if (storedRoute?.geometry) {
      if (l.route) map.removeLayer(l.route)
      l.route = L.geoJSON(storedRoute.geometry, { color: '#2563eb', weight: 5, opacity: 0.85 }).addTo(map)
      map.fitBounds(l.route.getBounds().pad(0.15))
      onRoute?.({
        etas: storedRoute.etas || storedRoute.eta || null,
        distanceKm: storedRoute.distanceKm ?? null,
        geometry: storedRoute.geometry,
      })
      return
    }

    if (!showRoute) {
      if (l.route) {
        map.removeLayer(l.route)
        l.route = null
      }
      onRoute?.({ etas: null, distanceKm: null, geometry: null })
      fitToPoints()
      return
    }

    const requestId = ++routeFetchRef.current
    setStatus('')
    setDirections([])
    fetch(
      `${OSRM}/${origin.lng},${origin.lat};${coords.lng},${coords.lat}?overview=full&geometries=geojson&steps=true`,
    )
      .then((r) => r.json())
      .then((data) => {
        if (!mapRef.current || routeFetchRef.current !== requestId) return
        if (data.code !== 'Ok') throw new Error('No route found')
        const route = data.routes[0]
        const distKm = route.distance / 1000
        const modes = estimateModes(distKm, Math.round(route.duration))
        onRoute?.({ etas: modes, distanceKm: distKm.toFixed(1), geometry: route.geometry })

        const steps = route.legs?.[0]?.steps || []
        const dirs = steps
          .filter((st) => st.distance > 0 || st.maneuver?.type === 'arrive')
          .map((st) => ({
            text: stepInstruction(st),
            dist:
              st.distance >= 1000
                ? `${(st.distance / 1000).toFixed(1)} km`
                : `${Math.round(st.distance)} m`,
            icon: MANEUVER_ICON[st.maneuver?.type] || '▸',
          }))
        setDirections(dirs)
        onDirections?.(dirs)

        const line = L.geoJSON(route.geometry, { color: '#2563eb', weight: 5, opacity: 0.85 })
        if (l.route) {
          map.removeLayer(l.route)
        }
        l.route = line.addTo(map)
        map.fitBounds(line.getBounds().pad(0.15))
      })
      .catch(() => {
        if (!mapRef.current || routeFetchRef.current !== requestId) return
        const distKm = haversineKm(origin, coords)
        const modes = estimateModes(distKm, null)
        onRoute?.({ etas: modes, distanceKm: distKm.toFixed(1), geometry: null })
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
  }, [originKey, destKey, showRoute, onRoute, storedRoute])

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        layersRef.current = {}
      }
    }
  }, [])

  return (
    <div className="map-wrap">
      <div ref={mapEl} className="live-map" style={{ height }} />
      {status && <p className="map-status">{status}</p>}
      {showNavigate && directions.length > 0 && (
        <details className="directions-box" open={directions.length <= 3}>
          <summary>
            🧭 Turn-by-turn directions
            <span className="directions-count">{directions.length} steps</span>
          </summary>
          <ol className="directions-list">
            {directions.map((d, i) => (
              <li key={i} className="directions-item">
                <span className="dir-icon">{d.icon}</span>
                <span className="dir-text">{d.text}</span>
                <span className="dir-dist">{d.dist}</span>
              </li>
            ))}
          </ol>
        </details>
      )}
    </div>
  )
}