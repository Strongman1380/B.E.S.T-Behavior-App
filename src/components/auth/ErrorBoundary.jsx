import React from 'react';
import { Button } from '../ui/button';
import { AlertTriangle, RefreshCw, Copy } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Application Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-slate-900 mb-2">
                Application Error
              </h1>
              <p className="text-slate-600 mb-4">
                Something went wrong. Try refreshing. If you’re in development, ensure the Vite dev server is running and the WebSocket/HMR connection is active.
              </p>
              <div className="text-left bg-slate-50 border border-slate-200 rounded-md p-3 mb-4 max-h-64 overflow-auto">
                <p className="text-sm font-semibold text-slate-800 mb-1">Error details</p>
                <pre className="text-xs text-slate-700 whitespace-pre-wrap break-words">{`
${this.state.error?.message ?? '(no message)'}

Stack:
${this.state.error?.stack ?? '(none)'}

Component Stack:
${this.state.errorInfo?.componentStack ?? '(none)'}
`}</pre>
              </div>
              <div className="flex gap-2 mb-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const details = [
                      `Message: ${this.state.error?.message ?? '(no message)'}`,
                      '',
                      'Stack:',
                      this.state.error?.stack ?? '(none)',
                      '',
                      'Component Stack:',
                      this.state.errorInfo?.componentStack ?? '(none)'
                    ].join('\n');
                    try { navigator.clipboard.writeText(details); } catch {}
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy details
                </Button>
                <Button 
                  onClick={() => window.location.reload()} 
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Page
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
