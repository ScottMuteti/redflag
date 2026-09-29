/* eslint-disable react/prop-types -- boundary wrapper */
import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

// App-level safety net: a render error shows a branded message instead of a blank page.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('RedFlag UI error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="grid min-h-screen place-items-center bg-page p-6">
        <div className="max-w-md rounded-card border border-line bg-card p-8 text-center shadow-card">
          <span className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-danger-bg text-danger">
            <AlertTriangle size={22} aria-hidden="true" />
          </span>
          <h1 className="text-heading font-bold text-ink">Something went wrong</h1>
          <p className="mt-2 text-body text-ink-2">
            This page hit an unexpected error. Reload to try again; your data is safe.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 h-9 rounded-control bg-brand-700 px-4 text-body font-semibold text-white hover:bg-brand-600"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
