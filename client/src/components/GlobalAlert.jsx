import React, { useState, useEffect } from 'react';
import { Alert, Button } from 'react-bootstrap';
import { AlertTriangle, X } from 'lucide-react';
import io from '../utils/socket-stub';

const socket = io('/', { path: '/socket.io' }); // Connect to same host

const GlobalAlert = () => {
    const [alert, setAlert] = useState(null);

    useEffect(() => {
        socket.on('emergency_broadcast', (data) => {
            setAlert(data);
            // Play sound
            const audio = new Audio('https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg'); // Placeholder sound
            audio.play().catch(e => console.log('Audio play failed', e));
        });

        return () => {
            socket.off('emergency_broadcast');
        };
    }, []);

    if (!alert) return null;

    return (
        <div className="fixed-top w-100 p-0 m-0" style={{ zIndex: 9999 }}>
            <Alert variant="danger" className="m-0 rounded-0 d-flex justify-content-between align-items-center animate-pulse border-0 text-white bg-danger">
                <div className="d-flex align-items-center gap-3">
                    <AlertTriangle size={32} className="animate-bounce" />
                    <div>
                        <h4 className="fw-bold m-0">CODE {alert.code} - {alert.location}</h4>
                        <small>{new Date(alert.timestamp).toLocaleTimeString()}</small>
                    </div>
                </div>
                <Button variant="outline-light" size="sm" onClick={() => setAlert(null)}>
                    <X size={24} /> Dismiss
                </Button>
            </Alert>
        </div>
    );
};

export default GlobalAlert;
