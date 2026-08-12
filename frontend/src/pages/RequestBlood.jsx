import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const emptyForm = {
  bloodGroup: '',
  units: 1,
  hospital: '',
  phone: '',
  location: '',
  urgency: 'emergency',
  notes: '',
}

export default function RequestBlood() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [verify, setVerify] = useState({ status: 'idle', match: null, message: '' })

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

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
          message: `✓ "${form.hospital}" confirmed at this location.`,
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
    if (verify.status !== 'verified') {
      return setError('Please verify the hospital & location first using the Verify button.')
    }
    setSubmitting(true)
    try {
      const coords = {
        lat: verify.match.lat,
        lng: verify.match.lon,
        label: verify.match.label,
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
    <div className="page page-wide">
      <div className="dashboard-head">
        <div>
          <h2>New Blood Request</h2>
          <p className="hint">Tell donors what you need — it only takes a minute.</p>
        </div>
      </div>

      <form className="card request-form" onSubmit={createRequest}>
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

        <label className="field">
          <span>Hospital</span>
          <input name="hospital" placeholder="Hospital name" value={form.hospital} onChange={handleChange} />
        </label>

        <label className="field">
          <span>Phone Number</span>
          <input
            name="phone"
            type="tel"
            placeholder="Hospital / contact number for the donor to call"
            value={form.phone}
            onChange={handleChange}
          />
        </label>

        <label className="field">
          <span>Location</span>
          <input name="location" placeholder="e.g. Hyderabad, Kukatpally" value={form.location} onChange={handleChange} />
        </label>

        <button
          type="button"
          className="btn ghost"
          onClick={verifyHospital}
          disabled={verify.status === 'checking'}
        >
          {verify.status === 'checking' ? 'Verifying…' : 'Verify Hospital & Location'}
        </button>

        {verify.status === 'verified' && <p className="success">{verify.message}</p>}
        {verify.status === 'mismatch' && <p className="error">{verify.message}</p>}
        {verify.status === 'notfound' && <p className="error">{verify.message}</p>}
        {verify.status === 'error' && <p className="error">{verify.message}</p>}

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
            placeholder="Any details for donors"
            value={form.notes}
            onChange={handleChange}
          />
        </label>

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
