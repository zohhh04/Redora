import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page center">
          <div className="logout-card">
            <span className="logout-icon">🛠️</span>
            <h2>Something went wrong</h2>
            <p>An unexpected error occurred on this part of the page. Your data is safe.</p>
            {this.state.error && (
              <pre className="error-stack">
                {String(this.state.error?.message || this.state.error)}
              </pre>
            )}
            <div className="dashboard-actions">
              <button className="btn primary" onClick={this.handleReset}>
                Try Again
              </button>
              <a className="btn ghost" href="/">
                Go to Home
              </a>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}