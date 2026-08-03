import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api/axios'
import PasswordInput from '../components/PasswordInput'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token')

  const [form, setForm] = useState({ password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/reset-password', { token, ...form })
      setSuccess(data.message)
      setForm({ password: '', confirmPassword: '' })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="page">
        <div className="card">
          <h2>Reset Password</h2>
          <p className="error">This reset link is invalid or missing. Please request a new one.</p>
          <p className="hint">
            <Link to="/forgot-password">Request a new reset link</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <form className="card" onSubmit={handleSubmit}>
        <h2>Set a New Password</h2>
        <p className="hint">
          Enter a new password and confirm it below.
        </p>
        {error && <p className="error">{error}</p>}
        {success && (
          <p className="success">
            {success} <Link to="/login">Go to Login</Link>
          </p>
        )}
        <PasswordInput
          name="password"
          placeholder="New password (min 6 characters)"
          value={form.password}
          onChange={handleChange}
          required
          disabled={!!success}
        />
        <PasswordInput
          name="confirmPassword"
          placeholder="Confirm new password"
          value={form.confirmPassword}
          onChange={handleChange}
          required
          disabled={!!success}
        />
        <button className="btn primary" disabled={loading || !!success}>
          {loading ? 'Saving...' : 'Save Password'}
        </button>
        <p className="hint">
          Remembered your password? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  )
}
