import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 600 }}>
          <h1 style={{ color: "#b91c1c" }}>Something went wrong</h1>
          <pre style={{ background: "#fef2f2", padding: 16, overflow: "auto", fontSize: 12 }}>
            {this.state.error.message}
          </pre>
          <p style={{ color: "#666", fontSize: 14 }}>
            Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env if you haven’t.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
