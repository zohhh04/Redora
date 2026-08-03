import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

export default function VerifyOtp() {
  const navigate = useNavigate()

  const [email, setEmail] = useState(localStorage.getItem('pendingEmail') || '')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-otp', { email, otp })
      localStorage.removeItem('pendingEmail')
      localStorage.removeItem('pendingRole')
      setSuccess('Email verified successfully! Please login.')
      setTimeout(() => navigate('/login'), 1500)
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setSuccess('')
    setResending(true)
    try {
      await api.post('/auth/resend-otp', { email })
      setSuccess('A new OTP has been sent to your email.')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resend OTP')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="page">
      <form className="card" onSubmit={handleSubmit}>
        <h2>Verify Your Email</h2>
        <p className="hint">Enter the 6-digit OTP sent to your email.</p>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          placeholder="6-digit OTP"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          required
        />
        <div className="resend-row">
          <button
            type="button"
            className="link-btn resend-btn"
            onClick={handleResend}
            disabled={resending || loading}
          >
            {resending ? 'Sending...' : 'Resend OTP'}
          </button>
        </div>
        <button className="btn primary" disabled={loading}>
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>
      </form>
    </div>
  )
}
