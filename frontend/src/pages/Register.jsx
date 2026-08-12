import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import PasswordInput from '../components/PasswordInput'

const stats = [
  { value: '3', label: 'lives saved by a single donation' },
  { value: '2s', label: 'someone needs blood every 2 seconds' },
  { value: '38%', label: 'of people are O+ — the most needed type' },
]

const steps = [
  'Create your Redora account',
  'Verify your email with OTP',
  'Complete your profile & donate',
]

const perks = ['100% free, forever', 'Secure & private data', 'Verified donors only']

export default function Register() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const role = params.get('role') === 'patient' ? 'patient' : 'donor'

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleRole = (r) => {
    setForm((prev) => ({ ...prev, role: r }))
    localStorage.setItem('pendingRole', r)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      localStorage.setItem('pendingEmail', form.email)
      localStorage.setItem('pendingRole', form.role)
      navigate('/verify-otp')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page register-page">
      <div className="register-wrap">
        <aside className="register-info">
          <div className="register-info-top">
            <span className="register-badge">🩸 Join Redora</span>
            <h1 className="register-title">Give the Gift of Life</h1>
            <p className="register-sub">
              Every drop counts. Become part of a community that connects donors with patients
              in need — quickly, safely, and free.
            </p>
          </div>

          <div className="register-stats">
            {stats.map((s) => (
              <div className="register-stat" key={s.label}>
                <span className="register-stat-value">{s.value}</span>
                <span className="register-stat-label">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="register-steps">
            <h3>Getting started takes 2 minutes</h3>
            <ol>
              {steps.map((step, i) => (
                <li key={step}>
                  <span className="register-step-num">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="register-perks">
            {perks.map((p) => (
              <span key={p}>✓ {p}</span>
            ))}
          </div>
        </aside>

        <form className="card register-card" onSubmit={handleSubmit}>
          <h2>Create Your Redora Account</h2>
          <p className="hint">Who are you registering as?</p>

          <div className="role-selector">
            <button
              type="button"
              className={`role-option ${form.role === 'donor' ? 'active' : ''}`}
              onClick={() => handleRole('donor')}
            >
              🩸 Donor
            </button>
            <button
              type="button"
              className={`role-option ${form.role === 'patient' ? 'active' : ''}`}
              onClick={() => handleRole('patient')}
            >
              ❤️ Patient
            </button>
          </div>

          {error && <p className="error">{error}</p>}
          <input
            name="name"
            placeholder="Full name"
            value={form.name}
            onChange={handleChange}
            required
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />
          <PasswordInput
            name="password"
            placeholder="Password (min 6 characters)"
            value={form.password}
            onChange={handleChange}
            required
          />
          <button className="btn primary" disabled={loading}>
            {loading ? 'Sending OTP...' : 'Register & Get OTP'}
          </button>
          <p className="hint">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
