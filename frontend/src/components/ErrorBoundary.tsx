import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-[#0a0a0f]">
          <div className="text-center max-w-md px-6">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full border-2 border-red-500/40 flex items-center justify-center">
              <span className="text-red-400 text-2xl">!</span>
            </div>
            <h1 className="text-xl font-semibold text-[#e0e0e8] mb-3">
              Something went wrong
            </h1>
            <p className="text-sm text-[#6b6b80] mb-6 leading-relaxed">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 border border-[#00f0ff]/30 bg-[#00f0ff]/10 rounded-lg text-[#00f0ff] text-sm font-mono hover:bg-[#00f0ff]/20 transition-colors"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
