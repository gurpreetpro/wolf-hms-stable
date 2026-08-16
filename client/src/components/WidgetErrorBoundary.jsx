import React, { Component } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * WidgetErrorBoundary — Localized Fault Isolation Boundary
 * 
 * Prevents total page crashes by catching errors in individual
 * dashboard widgets. Each widget wrapped in <WidgetErrorBoundary>
 * fails independently, showing a fallback UI with retry capability.
 */
class WidgetErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error?.message || 'Unknown widget error' };
  }

  componentDidCatch(error, errorInfo) {
    console.error(
      `[WidgetErrorBoundary] "${this.props.name || 'unnamed'}" crashed:`,
      error,
      errorInfo
    );
    if (this.props.onError) this.props.onError(error, errorInfo);
  }

  handleRetry = () => this.setState({ hasError: false, errorMessage: '' });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.errorMessage,
          onRetry: this.handleRetry,
        });
      }

      return (
        <div className="widget-error-fallback">
          <Alert
            variant="warning"
            className="d-flex align-items-start gap-2 m-2 border-0 shadow-sm"
            style={{ background: '#fff3cd', borderRadius: 8 }}
          >
            <AlertTriangle size={22} className="flex-shrink-0 mt-1" style={{ color: '#e6a817' }} />
            <div className="flex-grow-1">
              <div className="fw-semibold mb-1" style={{ fontSize: '0.9rem' }}>
                Widget Offline — {this.props.name || 'Component'}
              </div>
              <div
                className="text-muted mb-2"
                style={{ fontSize: '0.8rem', wordBreak: 'break-word' }}
              >
                {this.state.errorMessage}
              </div>
              <Button size="sm" variant="outline-warning" onClick={this.handleRetry}>
                <RefreshCw size={14} className="me-1" />
                Retry
              </Button>
            </div>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WidgetErrorBoundary;