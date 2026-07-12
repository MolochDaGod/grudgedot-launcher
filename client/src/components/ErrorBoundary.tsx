import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global ErrorBoundary — catches React render errors so a single
 * crashing page doesn't take down the entire app.
 *
 * Styled with the WCS dark-fantasy theme (Cinzel font, gold accents).
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full min-h-[300px] bg-background text-foreground p-8">
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <div
              className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center"
              aria-hidden="true"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-destructive"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2
              className="text-xl font-bold uppercase tracking-wide"
              style={{ fontFamily: 'Cinzel, serif' }}
            >
              {this.props.fallbackTitle || 'Something Went Wrong'}
            </h2>
            <p className="text-sm text-muted-foreground">
              This page encountered an error. You can retry or return to the home screen.
            </p>
            {this.state.error && (
              <pre className="text-xs text-destructive/80 bg-destructive/5 border border-destructive/20 rounded p-3 max-w-full overflow-auto max-h-24">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex gap-3">
              <button
                onClick={this.handleRetry}
                className="px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={this.handleGoHome}
                className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted transition-colors"
              >
                Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
