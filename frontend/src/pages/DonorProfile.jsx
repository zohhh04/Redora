import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

const MONTHS_MS = 2 * 30 * 24 * 60 * 60 * 1000

const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

function toInputDate(date) {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export default function DonorProfile() {
  const { user } = useAuth()
  const [form, setForm] = useState({
    bloodGroup: user?.bloodGroup || '',
    lastDonationDate: toInputDate(user?.lastDonationDate),
    mobile: user?.mobile || '',
    newPassword: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  if (!user) return null

  const isEligible =
    !user.lastDonationDate || Date.now() - new Date(user.lastDonationDate).getTime() >= MONTHS_MS

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

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
        newPassword: form.newPassword || undefined,
      })
      setSuccess(data.message)
      setForm({ ...form, newPassword: '' })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <h2>Donor Profile</h2>

      <form className="card" onSubmit={handleSubmit}>
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
        <label className="field">
          <span>New Password (optional, leave blank to keep current)</span>
          <input
            type="password"
            name="newPassword"
            placeholder="Enter new password"
            value={form.newPassword}
            onChange={handleChange}
          />
        </label>

        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}

        <button className="btn primary" disabled={loading}>
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
        <p className="hint">Registration details (name, email) are fixed and cannot be changed.</p>
      </form>

      <div className={`card ${isEligible ? 'card-ok' : 'card-warn'}`}>
        <h3>Eligibility</h3>
        <p>
          {isEligible
            ? '✅ Eligible to donate — last donation was at least 2 months ago.'
            : '⏳ Not eligible yet — donations are accepted only if the last donation was at least 2 months ago.'}
        </p>
      </div>
    </div>
  )
}
