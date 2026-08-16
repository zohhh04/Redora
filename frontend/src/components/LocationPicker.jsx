import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import api from '../api/axios'

const pinIcon = L.divIcon({
  className: '',
  html: '<div style="width:28px;height:28px;border-radius:50%;background:#c8102e;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.5)"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

// Interactive draggable-pin map picker. Starts at the geocoded `start` point
// (from the typed address) and lets the user drop the pin on the exact spot.
export default function LocationPicker({ start, onPick, height = 320 }) {
  const mapEl = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [point, setPoint] = useState(null)
  const [busy, setBusy] = useState(false)

  const setPin = (latlng) => {
    const map = mapRef.current
    if (!map) return
    const pt = { lat: latlng.lat, lng: latlng.lng }
    setPoint(pt)
    if (!markerRef.current) {
      markerRef.current = L.marker([pt.lat, pt.lng], { icon: pinIcon, draggable: true }).addTo(map)
      markerRef.current.on('dragend', () => {
        const ll = markerRef.current.getLatLng()
        setPin({ lat: ll.lat, lng: ll.lng })
      })
    } else {
      markerRef.current.setLatLng([pt.lat, pt.lng])
    }
  }

  // Create the map once, with full cleanup so React StrictMode remounts work.
  useEffect(() => {
    const el = mapEl.current
    if (!el) return
    const map = L.map(el, { attributionControl: false })
    mapRef.current = map
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map)

    if (start && start.lat != null && start.lng != null) {
      map.setView([start.lat, start.lng], 15)
      setPin({ lat: start.lat, lng: start.lng })
    }

    map.on('click', (e) => setPin(e.latlng))
    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-center when the geocoded start point changes.
  useEffect(() => {
    if (!mapRef.current || !start || start.lat == null || start.lng == null) return
    mapRef.current.setView([start.lat, start.lng], 15)
    setPin({ lat: start.lat, lng: start.lng })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start?.lat, start?.lng])

  const confirm = async () => {
    if (!point) return
    setBusy(true)
    let label = ''
    try {
      const { data } = await api.get('/geo/reverse', {
        params: { lat: point.lat, lng: point.lng },
      })
      label = data.result?.label || label
    } catch {
      // keep empty label
    }
    setBusy(false)
    onPick?.({ lat: point.lat, lng: point.lng, label })
  }

  return (
    <div className="location-picker">
      <div ref={mapEl} className="live-map" style={{ height }} />
      <p className="hint">
        {point
          ? 'Drag the pin or click the map to fine-tune, then confirm.'
          : 'Set the pin, then confirm your exact spot.'}
      </p>
      {point && (
        <button type="button" className="btn primary" onClick={confirm} disabled={busy}>
          {busy ? 'Confirming…' : '📍 Use this exact location'}
        </button>
      )}
    </div>
  )
}
