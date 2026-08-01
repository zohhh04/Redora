import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Register from './pages/Register'
import VerifyOtp from './pages/VerifyOtp'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import DonorDashboard from './pages/DonorDashboard'
import DonorProfile from './pages/DonorProfile'
import PatientDashboard from './pages/PatientDashboard'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="page center">Loading...</p>
  if (!user) return <Navigate to="/login" replace />
  return children
}

function Dashboard() {
  const { user } = useAuth()
  if (!user) return null
  return user.role === 'patient' ? <PatientDashboard /> : <DonorDashboard />
}

export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <div className="app">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/profile"
            element={
              <Protected>
                <DonorProfile />
              </Protected>
            }
          />
          <Route
            path="/dashboard"
            element={
              <Protected>
                <Dashboard />
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  )
}
