import React from "react";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  error?: any;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 30, color: "red" }}>
          <h2>⚠️ UI Crash Detected</h2>
          <pre>
            {String(this.state.error)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
