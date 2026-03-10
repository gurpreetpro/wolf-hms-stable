import React, { createContext, useContext, useState, useEffect } from 'react';
// socket.io-client import removed - not used in this file
import api from '../utils/axiosInstance';
import { Toast, ToastContainer } from 'react-bootstrap';

const SystemStatusContext = createContext();

export const useSystemStatus = () => useContext(SystemStatusContext);

export const SystemStatusProvider = ({ children }) => {
    const [systemStatus, setSystemStatus] = useState('NORMAL'); // NORMAL, LOCKDOWN, FIRE_ALARM
    const [alerts, setAlerts] = useState([]);

    // Mock Socket for now (or connect to real one if available)
    // Mock Socket for now (or connect to real one if available)
    // Real-time updates handled via socket-stub or future implementation
    useEffect(() => {
        // No polling needed currently
    }, []);

    const activateLockdown = async () => {
        try {
            await api.post('/api/security/lockdown', { enabled: true });
            setSystemStatus('LOCKDOWN');
        } catch (err) {
            console.error('Failed to activate lockdown', err);
        }
    };

    const liftLockdown = async () => {
        try {
            await api.post('/api/security/lockdown', { enabled: false });
            setSystemStatus('NORMAL');
        } catch (err) {
            console.error('Failed to lift lockdown', err);
        }
    };

    return (
        <SystemStatusContext.Provider value={{ systemStatus, activateLockdown, liftLockdown }}>
            {/* GLOBAL LOCKDOWN BANNER */}
            {systemStatus === 'LOCKDOWN' && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100vh',
                    zIndex: 9999,
                    pointerEvents: 'none', // Allow clicks strictly if needed, usually block interactions?
                    // For now, just a visual overlay
                    border: '10px solid red',
                    boxShadow: 'inset 0 0 100px rgba(255, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    paddingTop: '60px'
                }}>
                    <div style={{
                        background: 'red',
                        color: 'white',
                        padding: '10px 40px',
                        fontSize: '24px',
                        fontWeight: 'bold',
                        borderRadius: '0 0 20px 20px',
                        boxShadow: '0 5px 20px rgba(0,0,0,0.5)',
                        animation: 'flashRed 1s infinite'
                    }}>
                        🚨 LOCKDOWN IN EFFECT 🚨
                    </div>
                </div>
            )}
            
            <style>{`
                @keyframes flashRed {
                    0% { opacity: 1; }
                    50% { opacity: 0.8; }
                    100% { opacity: 1; }
                }
            `}</style>
            
            {children}
        </SystemStatusContext.Provider>
    );
};
