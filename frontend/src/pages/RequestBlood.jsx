import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api/axios';

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const emptyForm = {
  bloodGroup: '',
  units: 1,
  hospital: '',
  phone: '',
  location: '',
  urgency: 'emergency',
  notes: '',
  patientName: '',
}

export default function RequestBlood() {
  const navigate = useNavigate()
  const location = useLocation()
  // AURA chatbot collects the details and passes them here as prefill state so
  // the fields below are already filled in for the patient to review.
  const prefill = location.state?.prefill || null
  const [form, setForm] = useState(() =>
    prefill
      ? {
          bloodGroup: prefill.bloodGroup || '',
          units: prefill.units || 1,
          hospital: prefill.hospital || '',
          phone: prefill.phone || '',
          location: prefill.location || '',
          urgency: prefill.urgency || 'emergency',
          notes: prefill.notes || '',
          patientName: prefill.patientName || '',
        }
      : emptyForm
  )
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [verify, setVerify] = useState({ status: 'idle', match: null, message: '' })
  const [auto, setAuto] = useState({ status: 'idle', match: null })
  const [picked, setPicked] = useState(prefill?.liveCoords?.lat ? prefill.liveCoords : null)
  const [locBusy, setLocBusy] = useState(false)

  // When the chatbot pre-filled live coordinates, show that spot was captured.
  useEffect(() => {
    if (prefill?.liveCoords?.lat != null && !picked) {
      setPicked(prefill.liveCoords)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (e.target.name === 'location') {
      setVerify({ status: 'idle', match: null, message: '' })
      setAuto({ status: 'idle', match: null })
      setPicked(null)
    }
  }

  // Device GPS is the most accurate, free location source — far more precise than
  // map pinning or typed addresses. It returns sub-meter coordinates from the
  // phone's receiver, then we reverse-geocode them into a readable label.
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Location isn\u2019t supported in this browser. Please type the hospital location.')
      return
    }
    setError('')
    setLocBusy(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords
        let label = ''
        try {
          const { data } = await api.get('/geo/reverse', { params: { lat, lng } })
          label = data.result?.label || ''
        } catch {
          // keep label empty
        }
        const meters = Math.round(accuracy ?? 0)
        setPicked({
          lat,
          lng,
          label,
          accuracy: meters ? `±${meters}m` : '',
        })
        if (label) setForm((f) => ({ ...f, location: label }))
        setLocBusy(false)
      },
      () => {
        setLocBusy(false)
        setError('Could not get your location. Check that location permission is allowed, then try again.')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    )
  }

  // Auto-map the typed location as the user types, so the pin appears without
  // having to run hospital verification first.
  useEffect(() => {
    const location = form.location.trim()
    if (!location) {
      setAuto({ status: 'idle', match: null })
      return
    }
    let active = true
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get('/geo/geocode', { params: { q: location } })
        if (!active) return
        if (data.result) setAuto({ status: 'ok', match: data.result })
        else setAuto({ status: 'notfound', match: null })
      } catch {
        if (active) setAuto({ status: 'error', match: null })
      }
    }, 500)
    return () => {
      active = false
      clearTimeout(t)
    }
  }, [form.location])

  const verifyHospital = async () => {
    setError('')
    if (!form.hospital.trim()) return setError('Enter the hospital name to verify')
    if (!form.location.trim()) return setError('Enter the location to verify')
    setVerify({ status: 'checking', match: null, message: '' })
    try {
      const { data } = await api.get('/geo/verify-hospital', {
        params: { name: form.hospital, location: form.location },
      })
      if (data.verified) {
        setVerify({
          status: 'verified',
          match: data.match,
          message:
            data.reason === 'location'
              ? `✓ Using your provided location (${data.match.label}).`
              : `✓ "${form.hospital}" confirmed at this location.`,
        })
      } else if (data.reason === 'location-mismatch') {
        setVerify({
          status: 'mismatch',
          match: data.match,
          message: `✗ Found "${form.hospital}" but at a different location (${data.match.label}). Please correct the location.`,
        })
      } else {
        setVerify({
          status: 'notfound',
          match: null,
          message: `✗ No hospital named "${form.hospital}" found at "${form.location}".`,
        })
      }
    } catch (err) {
      setVerify({
        status: 'error',
        match: null,
        message: err.response?.data?.message || 'Verification failed. Please try again.',
      })
    }
  }

  const createRequest = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.bloodGroup) return setError('Please select a blood group')
    if (!form.location.trim()) return setError('Please enter the location of the patient')
    const source = picked || auto.match || verify.match
    if (!source || source.lat == null || (source.lng == null && source.lon == null)) {
      return setError('Please verify the hospital and location before posting the request.')
    }
    setSubmitting(true)
    try {
      const coords = {
        lat: source.lat,
        lng: source.lng ?? source.lon,
        label: source.label,
      }

      const { data } = await api.post('/requests', { ...form, location: coords })
      navigate(`/requests/${data.request._id}/nearby`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page page-wide request-blood-page">
      <div className="request-hero">
        <span className="request-hero-badge">🩸</span>
        <div>
          <h2>New Blood Request</h2>
          <p className="hint">Post what you need & find a donor</p>
        </div>
      </div>

      <form className="card request-form" onSubmit={createRequest}>
        <div className="req-section">
          <div className="req-section-head">
            <span className="req-section-ico">👤</span>
            <h3>Who Needs Blood</h3>
          </div>
          <div className="form-grid-2">
            <label className="field">
              <span>Patient Name</span>
              <input
                name="patientName"
                placeholder="Name"
                value={form.patientName}
                onChange={handleChange}
              />
            </label>
            <label className="field">
              <span>Phone Number</span>
              <input
                name="phone"
                type="tel"
                placeholder="Donor's contact"
                value={form.phone}
                onChange={handleChange}
              />
            </label>
          </div>
          <div className="form-grid-2">
            <label className="field">
              <span>Blood Group</span>
              <select name="bloodGroup" value={form.bloodGroup} onChange={handleChange} className="select">
                <option value="">Select</option>
                {bloodGroups.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Units</span>
              <input type="number" min="1" name="units" value={form.units} onChange={handleChange} />
            </label>
          </div>
        </div>

        <div className="req-section">
          <div className="req-section-head">
            <span className="req-section-ico">🏥</span>
            <h3>Hospital &amp; Location</h3>
          </div>
          <label className="field">
            <span>Hospital</span>
            <input name="hospital" placeholder="Hospital name" value={form.hospital} onChange={handleChange} />
          </label>
          <label className="field">
            <span>Location</span>
            <input
              name="location"
              placeholder="e.g. Shilpa Enclave Main Road, Chandanagar, Hyderabad, 500050, Telangana"
              value={form.location}
              onChange={handleChange}
            />
          </label>
          <p className="hint location-format-hint">
            📍 Use <strong>Road/Colony, Area, City, PIN code, State</strong>. Include the PIN code —
            it anchors the spot precisely. Avoid leading landmarks (temples, shops) — they can pull
            the pin to that building. Or tap below to use your device&rsquo;s GPS for the most
            accurate spot.
          </p>
          <div className="req-loc-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={verifyHospital}
              disabled={verify.status === 'checking'}
            >
              {verify.status === 'checking' ? 'Verifying…' : 'Verify Hospital & Location'}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={useMyLocation}
              disabled={locBusy}
            >
              {locBusy ? 'Getting location…' : '📍 Use my exact location (GPS)'}
            </button>
          </div>
          {verify.status === 'verified' && <p className="success">{verify.message}</p>}
          {verify.status === 'mismatch' && <p className="error">{verify.message}</p>}
          {verify.status === 'notfound' && <p className="error">{verify.message}</p>}
          {verify.status === 'error' && <p className="error">{verify.message}</p>}
          {!verify.match && auto.status === 'notfound' && (
            <p className="error">We couldn't verify "{form.location}". Try a broader area, e.g. city or locality.</p>
          )}
          {!verify.match && auto.status === 'error' && (
            <p className="error">The location verification service couldn't be reached. Check your connection and try again.</p>
          )}
          {picked && (
            <p className="success">
              ✓ Exact spot captured via GPS{picked.accuracy ? ` (accuracy ${picked.accuracy})` : ''}
              {picked.label ? `: ${picked.label}` : ''}
            </p>
          )}
        </div>

        <div className="req-section">
          <div className="req-section-head">
            <span className="req-section-ico">⚡</span>
            <h3>Donation Details</h3>
          </div>
          <label className="field">
            <span>Urgency</span>
            <select name="urgency" value={form.urgency} onChange={handleChange} className="select">
              <option value="emergency">🚨 Emergency</option>
              <option value="normal">🕐 Normal</option>
            </select>
          </label>
          <label className="field">
            <span>Notes</span>
            <textarea
              name="notes"
              rows="3"
              placeholder="Any details (optional)"
              value={form.notes}
              onChange={handleChange}
            />
          </label>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="dashboard-actions">
          <button className="btn primary" disabled={submitting}>
            {submitting ? 'Posting…' : 'Post Request'}
          </button>
          <button type="button" className="btn ghost" onClick={() => navigate('/dashboard')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
