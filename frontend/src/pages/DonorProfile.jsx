import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function toInputDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
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
    city: user?.city || '',
    area: user?.area || '',
    travelRadiusKm: user?.travelRadiusKm || 25,
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  if (!user) return null

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const { data } = await api.put('/auth/profile', {
        bloodGroup: form.bloodGroup,
        lastDonationDate: form.lastDonationDate || null,
        mobile: form.mobile,
        availableForDonation: form.availableForDonation,
        availableForEmergencies: form.availableForEmergencies,
        city: form.city,
        area: form.area,
        travelRadiusKm: form.travelRadiusKm,
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

        <div className="form-grid-2">
          <label className="field">
            <span>City</span>
            <input
              name="city"
              placeholder="e.g. Hyderabad"
              value={form.city}
              onChange={handleChange}
            />
          </label>
          <label className="field">
            <span>Area / Locality</span>
            <input
              name="area"
              placeholder="e.g. Kukatpally"
              value={form.area}
              onChange={handleChange}
            />
          </label>
        </div>

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
