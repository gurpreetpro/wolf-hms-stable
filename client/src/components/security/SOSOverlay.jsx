
import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { AlertTriangle, BellOff } from 'lucide-react';

const SOSOverlay = ({ activeAlert, onDismiss }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (activeAlert) {
            setVisible(true);
            // Play Siren Sound (Mock)
            // const audio = new Audio('/sounds/siren.mp3'); audio.play();
        }
    }, [activeAlert]);

    if (!visible || !activeAlert) return null;

    return (
        <div className="sos-overlay">
            <div className="sos-container">
                <AlertTriangle size={120} className="sos-icon text-danger" />
                <h1 className="sos-text">CRITICAL ALERT</h1>
                <h2 className="sos-subtext">{activeAlert.guard_name} - SOS PANIC</h2>
                <div className="sos-location">
                    LAT: {activeAlert.location.lat.toFixed(6)} | LNG: {activeAlert.location.lng.toFixed(6)}
                </div>
                
                <Button 
                    variant="danger" 
                    size="lg" 
                    className="mt-4 acknowledge-btn"
                    onClick={() => { setVisible(false); onDismiss(); }}
                >
                    <BellOff size={24} className="me-2" />
                    ACKNOWLEDGE & SILENCE
                </Button>
            </div>

            <style jsx>{`
                .sos-overlay {
                    position: fixed;
                    top: 0; left: 0;
                    width: 100vw; height: 100vh;
                    background: rgba(40, 0, 0, 0.9);
                    z-index: 9999;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: flash-red 1s infinite alternate;
                }
                .sos-container {
                    text-align: center;
                    color: #ff3333;
                    border: 4px solid #ff3333;
                    padding: 4rem;
                    background: #000;
                    box-shadow: 0 0 50px #ff0000;
                    border-radius: 20px;
                }
                .sos-text { font-size: 5rem; font-weight: 900; letter-spacing: 5px; margin: 20px 0; }
                .sos-subtext { font-size: 2.5rem; color: white; margin-bottom: 20px; }
                .sos-location { font-size: 1.5rem; color: #ffcccc; font-family: monospace; }
                .acknowledge-btn { font-size: 1.5rem; font-weight: bold; padding: 15px 40px; box-shadow: 0 0 20px rgba(255,0,0,0.5); }
                
                @keyframes flash-red {
                    0% { background: rgba(40, 0, 0, 0.85); box-shadow: inset 0 0 50px #ff0000; }
                    100% { background: rgba(80, 0, 0, 0.95); box-shadow: inset 0 0 100px #ff0000; }
                }
                .sos-icon { animation: shake 0.5s infinite; }
                @keyframes shake { 
                    0% { transform: rotate(0deg); } 
                    25% { transform: rotate(10deg); } 
                    75% { transform: rotate(-10deg); } 
                    100% { transform: rotate(0deg); } 
                }
            `}</style>
        </div>
    );
};

export default SOSOverlay;
