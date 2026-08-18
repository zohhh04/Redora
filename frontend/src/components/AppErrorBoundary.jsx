import { Component } from 'react'

// Top-level safety net: if anything in the app throws an uncaught error during
// render, show a friendly recoverable screen instead of a blank white page.
// Pressing Reload resets the whole app.
export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[AppErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            padding: 24,
            textAlign: 'center',
            background: 'var(--bg)',
            color: 'var(--ink)',
            fontFamily: 'var(--font-body)',
          }}
        >
          <span style={{ fontSize: 44 }}>🩸</span>
          <h2 style={{ margin: 0 }}>Something went wrong</h2>
          <p style={{ margin: 0, color: 'var(--muted)', maxWidth: 460 }}>
            The app hit an unexpected error. Your data is safe — reload to continue.
          </p>
          <button
            className="btn primary"
            type="button"
            onClick={() => window.location.reload()}
          >
            ↻ Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}