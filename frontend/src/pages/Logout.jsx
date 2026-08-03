import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Logout() {
  const { logout } = useAuth()

  useEffect(() => {
    logout()
  }, [logout])

  return (
    <div className="page center">
      <div className="logout-card">
        <span className="logout-icon">👋</span>
        <h2>Logged Out Successfully</h2>
        <p>
          You have been securely logged out of your Redora account. We hope to see you back soon —
          every drop counts! ❤️
        </p>
        <div className="dashboard-actions">
          <Link to="/" className="btn primary">
            Go to Home
          </Link>
          <Link to="/login" className="btn ghost">
            Login Again
          </Link>
          <Link to="/register" className="btn ghost">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  )
}
