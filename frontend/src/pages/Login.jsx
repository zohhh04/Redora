import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [role, setRole] = useState('donor')
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { ...form, role })
      if (data.user.role !== role) {
        setError(`This account is registered as a ${data.user.role}. Please select the correct role.`)
        setLoading(false)
        return
      }
      login(data.token, data.user)
      navigate(data.user.role === 'patient' ? '/dashboard' : '/profile')
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <form className="card" onSubmit={handleSubmit}>
        <h2>Login to Redora</h2>
        <p className="hint">Who are you logging in as?</p>

        <div className="role-selector">
          <button
            type="button"
            className={`role-option ${role === 'donor' ? 'active' : ''}`}
            onClick={() => setRole('donor')}
          >
            🩸 Donor
          </button>
          <button
            type="button"
            className={`role-option ${role === 'patient' ? 'active' : ''}`}
            onClick={() => setRole('patient')}
          >
            ❤️ Patient
          </button>
        </div>

        {error && <p className="error">{error}</p>}
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          name="password"
          type="password"
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
          New here?{' '}
          <Link to={`/register?role=${role}`}>Register as {role}</Link>
        </p>
      </form>
    </div>
  )
}
