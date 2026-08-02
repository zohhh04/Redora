import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="home-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">🩸 Redora</span>
          <p>
            Where Technology Meets Life — A New Aura of Hope. Every drop counts.
          </p>
        </div>
        <div className="footer-links">
          <div className="footer-col">
            <h4>Platform</h4>
            <Link to="/register">Become a Donor</Link>
            <Link to="/login">Request Blood</Link>
            <Link to="/register">Register</Link>
            <Link to="/login">Login</Link>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <a href="#blood-types">Blood Type Guide</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#impact">Why Donate</a>
          </div>
          <div className="footer-col">
            <h4>Connect</h4>
            <a href="mailto:care@redora.app">care@redora.app</a>
            <a href="#help">Help Center</a>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Redora — A New Aura of Hope. ❤️</p>
      </div>
    </footer>
  )
}
