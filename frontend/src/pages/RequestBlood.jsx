import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

const emptyForm = {
  bloodGroup: '',
  units: 1,
  hospital: '',
  city: '',
  area: '',
  urgency: 'emergency',
  notes: '',
}

export default function RequestBlood() {
  const navigate = useNavigate()
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const createRequest = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.bloodGroup) return setError('Please select a blood group')
    setSubmitting(true)
    try {
      await api.post('/requests', form)
      navigate('/dashboard')
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

        <div className="form-grid-2">
          <label className="field">
            <span>City</span>
            <input name="city" placeholder="e.g. Hyderabad" value={form.city} onChange={handleChange} />
          </label>
          <label className="field">
            <span>Area / Locality</span>
            <input name="area" placeholder="e.g. Kukatpally" value={form.area} onChange={handleChange} />
          </label>
        </div>

        <label className="field">
          <span>Urgency</span>
          <select name="urgency" value={form.urgency} onChange={handleChange} className="select">
            <option value="emergency">🚨 Emergency</option>
            <option value="normal">Normal</option>
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
