import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(err) {
    return { err };
  }
  componentDidCatch(err, info) {
    console.error("DeepLex UI error:", err, info);
  }
  render() {
    if (this.state.err) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
          <div className="max-w-md rounded-3xl border bg-white p-8 text-center shadow-sm">
            <div className="text-3xl mb-3">😕</div>
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="mt-2 text-sm text-zinc-600">The app ran into an unexpected error.</p>
            <pre className="mt-4 overflow-auto rounded bg-red-50 p-3 text-left text-xs text-red-700">
              {String(this.state.err?.message || this.state.err)}
            </pre>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-6 rounded-2xl bg-zinc-900 px-5 py-2 text-sm text-white"
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
