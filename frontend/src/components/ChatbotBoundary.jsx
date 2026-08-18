import { Component } from 'react'

// Soft error boundary for the AURA chatbot. Instead of taking down the page
// with a full-screen error, it quietly remounts a fresh assistant so the chat
// keeps working. A chatbot glitch should never stop the rest of the app.
export default class ChatbotBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, tries: 0 }
    this._timer = null
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('[ChatbotBoundary]', error, info)
    // Auto-recover by remounting a fresh chatbot shortly after a crash, so the
    // assistant doesn't just silently close. The fallback stays hidden during
    // recovery so the chat never appears to collapse.
    if (this.state.tries < 5) {
      clearTimeout(this._timer)
      this._timer = setTimeout(() => this.restart(), 500)
    }
  }

  componentWillUnmount() {
    clearTimeout(this._timer)
  }

  restart = () => {
    this.setState((s) => ({ hasError: false, tries: s.tries + 1 }))
    this.props.onRestart?.()
  }

  render() {
    if (this.state.hasError) {
      // After several failed recoveries, fall back to the launcher so the user
      // can retry manually. During the first attempts we stay hidden, keeping
      // the assistant mounted and auto-reopening instead of visibly collapsing.
      if (this.state.tries >= 5) {
        return (
          <button
            type="button"
            className="aura-launcher"
            onClick={this.restart}
            aria-label="Restart AURA assistant"
            title="Restart AURA"
          >
            <span className="aura-launcher-ico">🤖</span>
          </button>
        )
      }
      return null
    }
    return this.props.children
  }
}