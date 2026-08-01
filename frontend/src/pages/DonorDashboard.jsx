import { useAuth } from '../context/AuthContext'

export default function DonorDashboard() {
  const { user, logout } = useAuth()

  return (
    <div className="page">
      <div className="dashboard-head">
        <div>
          <h2>Welcome, {user?.name} ❤️</h2>
          <p className="hint">Role: Donor</p>
        </div>
        <button className="btn ghost" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="card">
        <h3>Donor Details</h3>
        <p>
          <strong>Blood Group:</strong> {user?.bloodGroup || '—'}
        </p>
        <p>
          <strong>Status:</strong> Profile pending (coming in v2) 🟡
        </p>
        <p>
          <strong>Next Eligible Donation:</strong> — (coming in v2)
        </p>
        <p>
          <strong>Total Donations:</strong> 0 (coming in v2)
        </p>
      </div>
      <div className="card">
        <h3>Emergency Requests Near You</h3>
        <p className="hint">No requests yet. Matching comes in v3. 🚀</p>
      </div>
    </div>
  )
}
