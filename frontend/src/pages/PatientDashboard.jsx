import { useAuth } from '../context/AuthContext'

export default function PatientDashboard() {
  const { user, logout } = useAuth()

  return (
    <div className="page">
      <div className="dashboard-head">
        <div>
          <h2>Welcome, {user?.name} ❤️</h2>
          <p className="hint">Role: Patient</p>
        </div>
        <button className="btn ghost" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="grid">
        <div className="card">
          <h3>Create a Blood Request</h3>
          <p className="hint">
            Blood type, units, hospital & location form — coming in v2. 🩸
          </p>
        </div>
        <div className="card">
          <h3>My Requests & Tracking</h3>
          <p className="hint">No requests yet. Live journey tracking comes in v3. 🚗</p>
        </div>
      </div>
    </div>
  )
}
