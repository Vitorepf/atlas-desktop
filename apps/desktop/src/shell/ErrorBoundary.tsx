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
    console.error(`[atlas-desktop] ${this.props.label} crashed:`, error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="atlas-error-boundary">
          <div className="atlas-error-boundary-label">
            {this.props.label} crashed
          </div>
          <div className="atlas-error-boundary-message">{this.state.error.message}</div>
          <pre className="atlas-error-boundary-stack">
            {this.state.error.stack?.slice(0, 500) ?? '(no stack)'}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

