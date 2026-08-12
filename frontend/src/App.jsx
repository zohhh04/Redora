import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Navbar from './components/Navbar'
import NotificationPopup from './components/NotificationPopup'
import Home from './pages/Home'
import Register from './pages/Register'
import VerifyOtp from './pages/VerifyOtp'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import DonorDashboard from './pages/DonorDashboard'
import DonorProfile from './pages/DonorProfile'
import Donations from './pages/Donations'
import Requests from './pages/Requests'
import Matches from './pages/Matches'
import RequestBlood from './pages/RequestBlood'
import NearbyDonors from './pages/NearbyDonors'
import Logout from './pages/Logout'
import PatientDashboard from './pages/PatientDashboard'
import Journey from './pages/Journey'
import DonorTracking from './pages/DonorTracking'
import PatientTracking from './pages/PatientTracking'
import Certificate from './pages/Certificate'
import Notifications from './pages/Notifications'

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

function DonationsRoute() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role !== 'donor') return <Navigate to="/dashboard" replace />
  return <Donations />
}

function RequestsRoute() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role !== 'donor') return <Navigate to="/dashboard" replace />
  return <Requests />
}

function RequestBloodRoute() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role !== 'patient') return <Navigate to="/dashboard" replace />
  return <RequestBlood />
}

function MatchesRoute() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role !== 'patient') return <Navigate to="/dashboard" replace />
  return <Matches />
}

function NearbyDonorsRoute() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role !== 'patient') return <Navigate to="/dashboard" replace />
  return <NearbyDonors />
}

function JourneyRoute() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role !== 'donor') return <Navigate to="/dashboard" replace />
  return <Journey />
}

function CertificateRoute() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role !== 'donor') return <Navigate to="/dashboard" replace />
  return <Certificate />
}

function NotificationsRoute() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role !== 'donor') return <Navigate to="/dashboard" replace />
  return <Notifications />
}

function TrackingRedirect() {
  const { user } = useAuth()
  const { id } = useParams()
  if (!user) return null
  return <Navigate to={user.role === 'patient' ? `/tracking/patient/${id}` : `/tracking/donor/${id}`} replace />
}

function DonorTrackingRoute() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role !== 'donor') return <Navigate to="/dashboard" replace />
  return <DonorTracking />
}

function PatientTrackingRoute() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role !== 'patient') return <Navigate to="/dashboard" replace />
  return <PatientTracking />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Navbar />
        <NotificationPopup />
        <div className="app">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/logout" element={<Logout />} />
            <Route
              path="/profile"
              element={
                <Protected>
                  <DonorProfile />
                </Protected>
              }
            />
            <Route
              path="/donations"
              element={
                <Protected>
                  <DonationsRoute />
                </Protected>
              }
            />
            <Route
              path="/request-blood"
              element={
                <Protected>
                  <RequestBloodRoute />
                </Protected>
              }
            />
            <Route
              path="/requests"
              element={
                <Protected>
                  <RequestsRoute />
                </Protected>
              }
            />
            <Route
              path="/requests/:id/matches"
              element={
                <Protected>
                  <MatchesRoute />
                </Protected>
              }
            />
            <Route
              path="/requests/:id/nearby"
              element={
                <Protected>
                  <NearbyDonorsRoute />
                </Protected>
              }
            />
            <Route
              path="/journey"
              element={
                <Protected>
                  <JourneyRoute />
                </Protected>
              }
            />
            <Route
              path="/tracking/:id"
              element={
                <Protected>
                  <TrackingRedirect />
                </Protected>
              }
            />
            <Route
              path="/tracking/donor/:id"
              element={
                <Protected>
                  <DonorTrackingRoute />
                </Protected>
              }
            />
            <Route
              path="/tracking/patient/:id"
              element={
                <Protected>
                  <PatientTrackingRoute />
                </Protected>
              }
            />
            <Route
              path="/certificate/:id"
              element={
                <Protected>
                  <CertificateRoute />
                </Protected>
              }
            />
            <Route
              path="/notifications"
              element={
                <Protected>
                  <NotificationsRoute />
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
    </ThemeProvider>
  )
}
