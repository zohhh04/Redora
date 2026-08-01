import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/forgot-password', { email })
      setSuccess(data.message)
      setEmail('')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <form className="card" onSubmit={handleSubmit}>
        <h2>Forgot Password</h2>
        <p className="hint">
          Enter the email you registered with. A temporary password will be sent to your email.
        </p>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <div className="resend-row">
          <button
            type="button"
            className="link-btn"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Resending...' : 'Resend password'}
          </button>
        </div>
        <button className="btn primary" disabled={loading}>
          {loading ? 'Sending...' : 'Send Temporary Password'}
        </button>
        <p className="hint">
          Remembered your password? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  )
}
