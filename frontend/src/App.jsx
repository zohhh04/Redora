import { useEffect, useRef, useState } from 'react'
import { Routes, Route, Navigate, Link, useParams, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import api from './api/axios'
import Navbar from './components/Navbar'
import NotificationPopup from './components/NotificationPopup'
import AuraChatbot from './components/AuraChatbot'
import ChatbotBoundary from './components/ChatbotBoundary'
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
import SearchDonors from './pages/SearchDonors'
import Logout from './pages/Logout'
import PatientDashboard from './pages/PatientDashboard'
import PatientRequests from './pages/PatientRequests'
import DonorTracking from './pages/DonorTracking'
import PatientTracking from './pages/PatientTracking'
import Certificate from './pages/Certificate'
import Notifications from './pages/Notifications'
import Leaderboard from './pages/Leaderboard'
import Community from './pages/Community'

// If we have a token but the auth check failed, don't blindly bounce to login.
// Only an actual invalid/absent token redirects to /login. Transient/network
// failures show a retry screen instead so the user keeps their session.
function Protected({ children }) {
  const { user, loading, restoreSession } = useAuth()
  const [state, setState] = useState('loading') // loading | ready | noauth | network
  const triedRef = useRef(false)
  const confirmedRef = useRef(false)

  const tryRestore = () => {
    setState('loading')
    triedRef.current = true
    restoreSession().then((res) => {
      // A stale/late failed check must never clobber an already-confirmed session.
      if (confirmedRef.current) return
      if (res.ok) {
        confirmedRef.current = true
        setState('ready')
      } else if (res.code === 'invalid' || res.code === 'none') setState('noauth')
      else setState('network')
    })
  }

  useEffect(() => {
    if (user) {
      confirmedRef.current = true
      setState('ready')
      return
    }
    if (loading) return
    if (!triedRef.current) tryRestore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading])

  if (state === 'ready') return children
  if (state === 'noauth') return <Navigate to="/login" replace />

  if (state === 'network') {
    return (
      <div className="page center">
        <div className="logout-card">
          <span className="logout-icon">📡</span>
          <h2>Connection Issue</h2>
          <p>
            We couldn't reach the server to restore your session. Your login is safe — check your
            connection and try again.
          </p>
          <div className="dashboard-actions">
            <button className="btn primary" onClick={tryRestore}>Retry</button>
            <Link to="/" className="btn ghost">Go to Home</Link>
          </div>
        </div>
      </div>
    )
  }

  return <p className="page center">Loading…</p>
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

function SearchDonorsRoute() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role !== 'donor' && user.role !== 'patient') return <Navigate to="/dashboard" replace />
  return <SearchDonors />
}

function JourneyRoute() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role !== 'donor') return <Navigate to="/dashboard" replace />
  return <Donations />
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
  if (user.role !== 'donor' && user.role !== 'patient') return <Navigate to="/dashboard" replace />
  return <Notifications />
}

function OpenRoute(Component) {
  return function RoleRoute() {
    const { user } = useAuth()
    if (!user) return null
    if (user.role !== 'donor' && user.role !== 'patient') return <Navigate to="/dashboard" replace />
    return <Component />
  }
}

const LeaderboardRoute = OpenRoute(Leaderboard)
const CommunityRoute = OpenRoute(Community)

function PatientRequestsRoute() {
  const { user } = useAuth()
  if (!user) return null
  if (user.role !== 'patient') return <Navigate to="/dashboard" replace />
  return <PatientRequests />
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

// Anywhere a patient is logged in, this polls their requests and routes them to
// the patient tracking page the moment a donor accepts a request (status matched).
function PatientJourneyWatcher() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const navigatedRef = useRef(new Set())

  useEffect(() => {
    if (!user || user.role !== 'patient') return
    let active = true
    const poll = () =>
      api
        .get('/requests/my')
        .then(({ data }) => {
          if (!active) return
          ;(data.requests || []).forEach((r) => {
            if (r.status === 'matched' && !navigatedRef.current.has(r._id)) {
              navigatedRef.current.add(r._id)
              navigate(`/tracking/patient/${r._id}`)
            } else if (r.status !== 'matched') {
              navigatedRef.current.delete(r._id)
            }
          })
        })
        .catch(() => {})
    poll()
    const timer = setInterval(poll, 4000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [user, navigate])

  return null
}

export default function App() {
  const [chatKey, setChatKey] = useState(0)
  return (
    <AuthProvider>
      <Navbar />
      <NotificationPopup />
      <ChatbotBoundary onRestart={() => setChatKey((k) => k + 1)}>
        <AuraChatbot key={chatKey} autoOpen={chatKey > 0} />
      </ChatbotBoundary>
      <PatientJourneyWatcher />
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
            path="/my-requests"
            element={
              <Protected>
                <PatientRequestsRoute />
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
            path="/search-donors"
            element={
              <Protected>
                <SearchDonorsRoute />
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
            path="/leaderboard"
            element={
              <Protected>
                <LeaderboardRoute />
              </Protected>
            }
          />
          <Route
            path="/community"
            element={
              <Protected>
                <CommunityRoute />
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
