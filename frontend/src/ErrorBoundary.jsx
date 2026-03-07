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
    console.error("UI crashed:", err, info);
  }
  render() {
    if (this.state.err) {
      return (
        <div style={{ fontFamily: "system-ui", padding: 24 }}>
          <h2>App crashed</h2>
          <pre style={{ background: "#ffecec", padding: 12 }}>
            {String(this.state.err?.message || this.state.err)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}