import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

const ServiceUnavailable = () => {
    const navigate = useNavigate();

    const handleRetry = () => {
        window.location.reload();
    };

    const handleGoHome = () => {
        navigate('/');
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-slate-200">
                <div className="flex justify-center mb-6">
                    <div className="bg-amber-100 p-4 rounded-full">
                        <AlertTriangle className="w-12 h-12 text-amber-600" />
                    </div>
                </div>
                
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                    Service Temporarily Unavailable
                </h1>
                
                <p className="text-slate-600 mb-8">
                    We're having trouble connecting to our servers. The system might be undergoing maintenance or experiencing high traffic.
                </p>

                <div className="space-y-3">
                    <button 
                        onClick={handleRetry}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                        <RefreshCcw className="w-4 h-4" />
                        Retry Connection
                    </button>
                    
                    <button 
                        onClick={handleGoHome}
                        className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
                    >
                        <Home className="w-4 h-4" />
                        Return to Dashboard
                    </button>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                        Error Code: 503_SERVICE_UNAVAILABLE <br/>
                        Reach out to support if the issue persists.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ServiceUnavailable;
