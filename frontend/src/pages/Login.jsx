import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import PasswordInput from '../components/PasswordInput'

const stats = [
  { value: '3', label: 'lives saved by a single donation' },
  { value: '2s', label: 'someone needs blood every 2 seconds' },
  { value: '38%', label: 'of people are O+ — the most needed type' },
]

const steps = [
  'Sign in to your account',
  'Check your donor dashboard',
  'Save lives with one tap',
]

const perks = ['100% free, forever', 'Secure & private data', 'Verified donors only']

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email: form.email, password: form.password })
      login(data.token, data.user)
      navigate(data.user.role === 'patient' ? '/dashboard' : '/profile')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page register-page">
      <div className="register-wrap">
        <aside className="register-info">
          <div className="register-info-top">
            <span className="register-badge">🩸 Welcome back</span>
            <h1 className="register-title">Good to See You Again</h1>
            <p className="register-sub">
              Sign in to track your donations, find matches, and keep saving lives — right where
              you left off.
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
            <h3>Your Redora journey</h3>
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
          <h2>Login to Redora</h2>
          {error && <p className="error">{error}</p>}
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
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <p className="hint right">
            Forgot your password? <Link to="/forgot-password">Reset it</Link>
          </p>
          <button className="btn primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          <p className="hint">
            New here? <Link to="/register">Register</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
