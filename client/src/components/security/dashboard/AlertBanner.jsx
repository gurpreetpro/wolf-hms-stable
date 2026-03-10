import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, X, Volume2, VolumeX, MapPin, Clock, User } from 'lucide-react';
import './AlertBanner.css';

/**
 * AlertBanner - Full-width emergency alert display with audio
 * Designed for Indian security operators with bilingual support
 */
const AlertBanner = ({ 
    alerts = [], 
    onAcknowledge, 
    onDismiss,
    soundEnabled = true,
    onToggleSound,
    translations = {}
}) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Default translations (English)
    const t = {
        sosAlert: 'SOS ALERT',
        manDown: 'MAN DOWN',
        panicButton: 'PANIC BUTTON',
        geofenceBreach: 'GEOFENCE BREACH',
        acknowledge: 'Acknowledge',
        acknowledgeHi: 'स्वीकार करें',
        location: 'Location',
        ago: 'ago',
        ...translations
    };

    // Alert type to display text mapping
    const getAlertLabel = (type) => {
        const labels = {
            'SOS_PANIC': t.sosAlert,
            'SOS': t.sosAlert,
            'MAN_DOWN': t.manDown,
            'PANIC': t.panicButton,
            'GEOFENCE_BREACH': t.geofenceBreach
        };
        return labels[type] || type;
    };

    // Get relative time string
    const getTimeAgo = (timestamp) => {
        const seconds = Math.floor((Date.now() - new Date(timestamp)) / 1000);
        if (seconds < 60) return `${seconds}s ${t.ago}`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ${t.ago}`;
        const hours = Math.floor(minutes / 60);
        return `${hours}h ${t.ago}`;
    };

    // Play alert sound
    useEffect(() => {
        if (alerts.length > 0 && soundEnabled && !isPlaying) {
            playAlertSound();
        } else if (alerts.length === 0 && isPlaying) {
            stopAlertSound();
        }
    }, [alerts, soundEnabled]);

    const playAlertSound = () => {
        if (audioRef.current) {
            audioRef.current.loop = true;
            audioRef.current.play().catch(err => {
                console.warn('[AlertBanner] Audio play failed:', err);
            });
            setIsPlaying(true);
        }
    };

    const stopAlertSound = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsPlaying(false);
        }
    };

    const handleAcknowledge = (alertId) => {
        if (onAcknowledge) {
            onAcknowledge(alertId);
        }
        // Stop sound if this was the last alert
        if (alerts.length <= 1) {
            stopAlertSound();
        }
    };

    // Don't render if no alerts
    if (!alerts || alerts.length === 0) {
        return null;
    }

    // Show latest alert prominently
    const latestAlert = alerts[0];

    return (
        <div className="alert-banner-container">
            {/* Audio element for alert sound */}
            <audio 
                ref={audioRef} 
                src="/sounds/alert-siren.mp3" 
                preload="auto"
            />

            <div className={`alert-banner alert-type-${latestAlert.type?.toLowerCase() || 'sos'}`}>
                {/* Pulsing icon */}
                <div className="alert-icon-wrapper">
                    <AlertTriangle className="alert-icon pulse" size={28} />
                </div>

                {/* Alert content */}
                <div className="alert-content">
                    <div className="alert-header">
                        <span className="alert-type-label">
                            🚨 {getAlertLabel(latestAlert.type)}
                        </span>
                        {alerts.length > 1 && (
                            <span className="alert-count">
                                +{alerts.length - 1} more
                            </span>
                        )}
                    </div>
                    
                    <div className="alert-details">
                        {/* Guard name */}
                        {latestAlert.guard_name && (
                            <span className="alert-guard">
                                <User size={14} />
                                <strong>{latestAlert.guard_name}</strong>
                            </span>
                        )}
                        
                        {/* Location */}
                        {latestAlert.location && (
                            <span className="alert-location">
                                <MapPin size={14} />
                                {typeof latestAlert.location === 'object' 
                                    ? `${latestAlert.location.lat?.toFixed(4)}, ${latestAlert.location.lng?.toFixed(4)}`
                                    : latestAlert.location
                                }
                            </span>
                        )}
                        
                        {/* Time */}
                        {latestAlert.timestamp && (
                            <span className="alert-time">
                                <Clock size={14} />
                                {getTimeAgo(latestAlert.timestamp)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="alert-actions">
                    {/* Sound toggle */}
                    <button 
                        className="alert-btn alert-btn-sound"
                        onClick={() => {
                            if (soundEnabled) stopAlertSound();
                            if (onToggleSound) onToggleSound();
                        }}
                        title={soundEnabled ? 'Mute' : 'Unmute'}
                    >
                        {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                    </button>

                    {/* Acknowledge button */}
                    <button 
                        className="alert-btn alert-btn-ack"
                        onClick={() => handleAcknowledge(latestAlert.id || latestAlert.incident_id)}
                    >
                        <span className="btn-text-en">{t.acknowledge}</span>
                        <span className="btn-text-hi">{t.acknowledgeHi}</span>
                    </button>

                    {/* Dismiss (X) */}
                    {onDismiss && (
                        <button 
                            className="alert-btn alert-btn-dismiss"
                            onClick={() => onDismiss(latestAlert.id || latestAlert.incident_id)}
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {/* Additional alerts indicator */}
            {alerts.length > 1 && (
                <div className="alert-queue">
                    {alerts.slice(1, 4).map((alert, idx) => (
                        <div key={alert.id || idx} className="alert-queue-item">
                            <AlertTriangle size={14} />
                            <span>{getAlertLabel(alert.type)}</span>
                            {alert.guard_name && <span>• {alert.guard_name}</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AlertBanner;
