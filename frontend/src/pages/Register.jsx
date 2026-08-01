import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import api from '../api/axios'

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      localStorage.setItem('pendingEmail', form.email)
      navigate('/verify-otp')
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <form className="card" onSubmit={handleSubmit}>
        <h2>Create Your Redora Account</h2>
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
        <input
          name="password"
          type="password"
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
  )
}
