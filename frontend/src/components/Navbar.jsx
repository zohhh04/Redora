import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">
        🩸 Redora
      </Link>
      <div className="nav-actions">
        {user ? (
          <>
            <Link to="/profile" className="btn">
              Profile
            </Link>
            <Link to="/dashboard" className="btn">
              Dashboard
            </Link>
            <button className="btn" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className="btn">
              Login
            </Link>
            <Link to="/register" className="btn">
              Register
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
