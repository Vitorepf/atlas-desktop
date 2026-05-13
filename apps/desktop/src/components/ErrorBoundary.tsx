import { Component, type ReactNode } from 'react'

interface Props {
  label: string
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Surfaces React errors visibly so we can debug what's blowing up the cockpit.
 * Atlas DNA: cream background, bronze label, ink details.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // Surfaced for headless preview eval debugging
    console.error(`[atlas-desktop] ${this.props.label} crashed:`, error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 16,
            background: 'rgba(138,48,37,.06)',
            border: '1px solid rgba(138,48,37,.30)',
            borderLeft: '3px solid #8a3025',
            borderRadius: 2,
            margin: 8,
            fontFamily: 'var(--mono)',
            fontSize: 11,
            color: '#1a1714',
            overflowY: 'auto',
            maxHeight: '100%',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 9,
              letterSpacing: 1.6,
              color: '#8a3025',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            {this.props.label} crashed
          </div>
          <div style={{ marginBottom: 8 }}>{this.state.error.message}</div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 10, color: '#4a4138' }}>
            {this.state.error.stack?.slice(0, 500) ?? '(no stack)'}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}
