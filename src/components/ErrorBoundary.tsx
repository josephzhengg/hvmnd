import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error boundary caught an error:', error, info);
  }

  private reset = () => {
    window.location.hash = '';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50">Something went wrong</h1>
          <p className="text-slate-500 dark:text-slate-400">
            The app hit an unexpected error. Reloading usually fixes it.
          </p>
          <button
            type="button"
            onClick={this.reset}
            className="h-12 rounded-xl bg-indigo-600 px-6 font-bold text-white"
          >
            Back to start
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
