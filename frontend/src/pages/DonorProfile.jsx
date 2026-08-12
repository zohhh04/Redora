import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import L from 'leaflet'

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const SAVE_MIN_DIST_KM = 0.1
const SAVE_MIN_INTERVAL_MS = 30000
const MAP_RENDER_INTERVAL_MS = 5000

function toInputDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

function toRad(deg) {
  return (deg * Math.PI) / 180
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

function LocationMap({ location }) {
  const mapEl = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)

  useEffect(() => {
    const { lat, lng } = location || {}
    if (!mapEl.current || lat == null || lng == null) return

    if (!mapRef.current) {
      const map = L.map(mapEl.current, { attributionControl: false }).setView([lat, lng], 14)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map)
      markerRef.current = L.marker([lat, lng]).addTo(map)
      mapRef.current = map
    } else {
      markerRef.current.setLatLng([lat, lng])
      mapRef.current.panTo([lat, lng])
    }
  }, [location?.lat, location?.lng])

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
  }, [])

  return <div ref={mapEl} className="live-map location-map-preview" />
}

export default function DonorProfile() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    bloodGroup: user?.bloodGroup || '',
    lastDonationDate: toInputDate(user?.lastDonationDate),
    mobile: user?.mobile || '',
    availableForDonation: user?.availableForDonation ?? false,
    availableForEmergencies: user?.availableForEmergencies ?? false,
    travelRadiusKm: user?.travelRadiusKm || 25,
  })
  const [location, setLocation] = useState(
    user?.location?.lat != null ? { ...user.location } : null,
  )
  const [city, setCity] = useState(user?.city || '')
  const [area, setArea] = useState(user?.area || '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [tracking, setTracking] = useState(false)
  const [lastUpdated, setLastUpdated] = useState('')

  const locationRef = useRef(location)
  const cityRef = useRef(city)
  const areaRef = useRef(area)
  const userRef = useRef(user)
  const watchIdRef = useRef(null)
  const lastSavedRef = useRef(null)
  const lastSaveTimeRef = useRef(0)
  const lastRenderTimeRef = useRef(0)
  const saveInFlightRef = useRef(false)

  useEffect(() => {
    userRef.current = user
  }, [user])

  useEffect(() => {
    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  if (!user) return null

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const persistLocation = async (coords) => {
    if (saveInFlightRef.current) return
    const now = Date.now()
    const prev = lastSavedRef.current
    const moved = prev
      ? distanceKm(prev.lat, prev.lng, coords.latitude, coords.longitude) >= SAVE_MIN_DIST_KM
      : true
    if (!moved && now - lastSaveTimeRef.current < SAVE_MIN_INTERVAL_MS) return

    saveInFlightRef.current = true
    try {
      let label = locationRef.current?.label || ''
      let c = cityRef.current
      let a = areaRef.current
      try {
        const { data } = await api.get('/geo/reverse', {
          params: { lat: coords.latitude, lng: coords.longitude },
        })
        if (data.result) {
          label = data.result.label
          c = data.result.city
          a = data.result.area
        }
      } catch {
        // keep previous label if reverse geocoding fails
      }

      const loc = { lat: coords.latitude, lng: coords.longitude, label }
      locationRef.current = loc
      cityRef.current = c
      areaRef.current = a
      setLocation(loc)
      setCity(c)
      setArea(a)

      await api.put('/auth/profile', { location: loc, city: c, area: a })
      updateUser({ ...userRef.current, location: loc, city: c, area: a })
      lastSavedRef.current = { lat: coords.latitude, lng: coords.longitude }
      lastSaveTimeRef.current = now
      setLastUpdated(new Date().toLocaleTimeString())
    } catch {
      // ignore background save errors
    } finally {
      saveInFlightRef.current = false
    }
  }

  const handlePosition = (pos) => {
    const { latitude, longitude } = pos.coords
    const now = Date.now()

    if (now - lastRenderTimeRef.current >= MAP_RENDER_INTERVAL_MS) {
      lastRenderTimeRef.current = now
      setLocation((prev) =>
        prev
          ? { ...prev, lat: latitude, lng: longitude }
          : { lat: latitude, lng: longitude, label: '' },
      )
    }

    persistLocation({ latitude, longitude })
  }

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Your browser does not support location access')
      return
    }
    setError('')
    navigator.geolocation.getCurrentPosition(
      () => {
        watchIdRef.current = navigator.geolocation.watchPosition(
          handlePosition,
          () => {
            setTracking(false)
            setError('Lost access to your location. Please allow location access and try again.')
          },
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 },
        )
        setTracking(true)
      },
      () => {
        setError('Could not access your location. Please allow location access and try again.')
      },
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }

  const stopTracking = () => {
    if (watchIdRef.current != null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setTracking(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!location || location.lat == null) {
      return setError('Please use "Start Live Tracking" to set your location')
    }
    setLoading(true)
    try {
      const { data } = await api.put('/auth/profile', {
        bloodGroup: form.bloodGroup,
        lastDonationDate: form.lastDonationDate || null,
        mobile: form.mobile,
        availableForDonation: form.availableForDonation,
        availableForEmergencies: form.availableForEmergencies,
        city,
        area,
        travelRadiusKm: form.travelRadiusKm,
        location,
      })
      setSuccess(data.message)
      updateUser(data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page profile-page">
      <form className="card profile-form" onSubmit={handleSubmit}>
        <h3>Donor Details</h3>

        <label className="field">
          <span>Name (cannot be changed)</span>
          <input value={user.name} disabled />
        </label>
        <label className="field">
          <span>Email (cannot be changed)</span>
          <input value={user.email} disabled />
        </label>
        <label className="field">
          <span>Blood Group</span>
          <select
            name="bloodGroup"
            value={form.bloodGroup}
            onChange={handleChange}
            className="select"
          >
            <option value="">Select blood group</option>
            {bloodGroups.map((bg) => (
              <option key={bg} value={bg}>
                {bg}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Last Donation Date</span>
          <input
            type="date"
            name="lastDonationDate"
            value={form.lastDonationDate}
            onChange={handleChange}
          />
        </label>
        <label className="field">
          <span>Mobile Number</span>
          <input
            name="mobile"
            placeholder="Enter mobile number"
            value={form.mobile}
            onChange={handleChange}
          />
        </label>

        <div className="field">
          <span>Live Location</span>
          <div className="location-row">
            <input
              name="locationLabel"
              placeholder="Start live tracking to capture your location"
              value={location?.label || ''}
              readOnly
            />
            {!tracking ? (
              <button type="button" className="btn primary location-track-btn" onClick={startTracking}>
                📍 Start Live Tracking
              </button>
            ) : (
              <button type="button" className="btn ghost location-track-btn" onClick={stopTracking}>
                ⏹ Stop Tracking
              </button>
            )}
          </div>
          <small className={`hint ${tracking ? 'tracking-on' : ''}`}>
            {tracking
              ? `Live tracking is on — your location updates as you move${lastUpdated ? ` · last updated ${lastUpdated}` : ''}`
              : 'Your location is used to show you as a donor inside the request’s 5 km radius.'}
          </small>
        </div>

        {location && location.lat != null && <LocationMap location={location} />}

        <label className="field">
          <span>Travel Radius (km)</span>
          <input
            type="number"
            min="1"
            max="200"
            name="travelRadiusKm"
            placeholder="How far you can travel to donate"
            value={form.travelRadiusKm}
            onChange={handleChange}
          />
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            name="availableForDonation"
            checked={form.availableForDonation}
            onChange={handleChange}
          />
          <span>
            <strong>Available for donation</strong>
            <small>Show me as a donor who can give blood when a request comes in.</small>
          </span>
        </label>
        <label className="checkbox-row">
          <input
            type="checkbox"
            name="availableForEmergencies"
            checked={form.availableForEmergencies}
            onChange={handleChange}
          />
          <span>
            <strong>Available for emergencies</strong>
            <small>Notify me first for urgent blood requests near me.</small>
          </span>
        </label>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <button className="btn primary btn-lg" disabled={loading}>
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  )
}
