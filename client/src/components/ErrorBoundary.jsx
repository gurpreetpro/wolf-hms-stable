import React from 'react';
import { Container, Alert, Button } from 'react-bootstrap';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
        globalThis.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <Container className="py-5 text-center">
                    <Alert variant="danger" className="shadow-lg border-0 bg-white p-5 rounded-xl">
                        <div className="mb-4 text-center text-amber-500 flex justify-center">
                            <AlertTriangle size={64} className="text-amber-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Something went wrong</h2>
                        <p className="text-slate-600 mb-6 max-w-md mx-auto">
                            The application encountered an unexpected error. This might be due to a temporary connection issue.
                        </p>
                        
                        <div className="d-flex justify-content-center gap-3">
                             <Button variant="primary" size="lg" onClick={this.handleReload} className="d-flex align-items-center gap-2 px-4 py-2">
                                <RefreshCw size={20} />
                                Reload Application
                            </Button>
                             <Button variant="outline-secondary" size="lg" href="/" className="px-4 py-2">
                                Return Home
                            </Button>
                        </div>

                        {import.meta.env.MODE === 'development' && this.state.error && (
                            <div className="mt-5 text-start">
                                <p className="mb-1 fw-bold text-danger small">Error Details:</p>
                                <pre className="bg-light p-3 rounded small border text-danger overflow-auto" style={{maxHeight: '200px'}}>
                                    {this.state.error.toString()}
                                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                                </pre>
                            </div>
                        )}
                    </Alert>
                </Container>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
