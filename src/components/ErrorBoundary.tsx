import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <div className="ss-card w-full max-w-md">
            <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-destructive/25 bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Something went wrong</h3>
                <p className="text-sm text-muted-foreground">{this.state.message || "An unexpected error occurred."}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => window.location.reload()}>Reload</Button>
                <Button onClick={this.handleReset}>Try again</Button>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
