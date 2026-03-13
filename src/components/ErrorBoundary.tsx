import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorCount: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info.componentStack)
    this.setState((prev) => ({ errorCount: prev.errorCount + 1 }))
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      const showRetry = this.state.errorCount < 3
      const errorMsg = this.state.error?.message ?? 'An unexpected error occurred'
      const isSupabaseError = errorMsg.includes('500') || errorMsg.includes('RLS') || errorMsg.includes('permission')

      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <div className="text-3xl mb-4">⚠️</div>
          <p className="text-sm font-semibold text-destructive mb-2">Error Loading Chat</p>
          <p className="text-xs text-muted-foreground mb-4 max-w-sm">
            {isSupabaseError
              ? 'Database access error. Make sure you ran the SQL migration in Supabase SQL Editor.'
              : errorMsg}
          </p>
          <div className="text-xs text-muted-foreground mb-4 p-3 bg-muted rounded max-w-sm text-left">
            <code className="text-[10px]">{errorMsg.slice(0, 100)}</code>
          </div>
          <div className="flex gap-2">
            {showRetry && (
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Try again
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="text-xs px-3 py-1.5 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/90"
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
