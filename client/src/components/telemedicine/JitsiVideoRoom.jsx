/**
 * JitsiVideoRoom - Simple Jitsi Meet integration for teleconsultation
 * 
 * Uses the free meet.jit.si public server
 * Doctor and patient join the same room via iframe/URL
 */
import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Spinner, Alert, Button } from 'react-bootstrap';

const JitsiVideoRoom = ({ 
    roomId, 
    patientId, 
    patientPhone, 
    patientName,
    appointmentId, 
    onEndCall, 
    onLeave 
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const jitsiContainerRef = useRef(null);
    const apiRef = useRef(null);

    const jitsiDomain = 'meet.jit.si';

    // Generate unique room name with useMemo to avoid regenerating on every render
    const jitsiRoomName = useMemo(() => {
        if (roomId) return roomId;
        const sanitizedName = (patientName || 'patient').replace(/[^a-zA-Z0-9]/g, '');
        const timestamp = Date.now().toString(36);
        return `WolfCare-${sanitizedName}-${timestamp}`;
    }, [roomId, patientName]);

    // Notify patient about the Jitsi room (defined before useEffect)
    const notifyPatient = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const jitsiUrl = `https://${jitsiDomain}/${jitsiRoomName}`;
            
            // Send to VPS signaling server
            await fetch('https://socket.wolfsecurity.in/notify-call', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    patientId,
                    patientPhone,
                    appointmentId,
                    jitsiRoom: jitsiRoomName,
                    jitsiUrl: jitsiUrl,
                    doctorName: localStorage.getItem('fullName') || 'Doctor',
                }),
            });

            console.log('[Jitsi] Sent notification to patient with room:', jitsiRoomName);
        } catch (err) {
            console.error('[Jitsi] Failed to notify patient:', err);
            // Don't block the call - patient can still join manually
        }
    }, [patientId, patientPhone, appointmentId, jitsiRoomName]);

    useEffect(() => {
        // CRITICAL: Send notification IMMEDIATELY when component mounts
        // Don't wait for Jitsi to connect - patient needs early notification
        console.log('[Jitsi] Component mounted, sending notification to patient');
        notifyPatient();

        // Load Jitsi Meet External API
        const loadJitsiScript = () => {
            return new Promise((resolve, reject) => {
                if (window.JitsiMeetExternalAPI) {
                    resolve();
                    return;
                }

                const script = document.createElement('script');
                script.src = 'https://meet.jit.si/external_api.js';
                script.async = true;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        };

        const initJitsi = async () => {
            try {
                await loadJitsiScript();

                const doctorName = localStorage.getItem('fullName') || 
                                   localStorage.getItem('username') || 
                                   'Doctor';

                // Initialize Jitsi Meet
                const api = new window.JitsiMeetExternalAPI(jitsiDomain, {
                    roomName: jitsiRoomName,
                    parentNode: jitsiContainerRef.current,
                    width: '100%',
                    height: '100%',
                    configOverwrite: {
                        startWithAudioMuted: false,
                        startWithVideoMuted: false,
                        prejoinPageEnabled: false,
                        disableDeepLinking: true,
                        enableClosePage: false,
                        enableWelcomePage: false,
                        // Disable lobby/moderator requirement
                        lobbyModeEnabled: false,
                        enableLobby: false,
                        hideLobbyButton: true,
                        toolbarButtons: [
                            'microphone',
                            'camera',
                            'closedcaptions',
                            'desktop',
                            'fullscreen',
                            'fodeviceselection',
                            'hangup',
                            'chat',
                            'settings',
                            'raisehand',
                            'videoquality',
                            'tileview',
                        ],
                    },
                    interfaceConfigOverwrite: {
                        SHOW_JITSI_WATERMARK: false,
                        SHOW_WATERMARK_FOR_GUESTS: false,
                        SHOW_BRAND_WATERMARK: false,
                        BRAND_WATERMARK_LINK: '',
                        SHOW_POWERED_BY: false,
                        TOOLBAR_ALWAYS_VISIBLE: true,
                        MOBILE_APP_PROMO: false,
                        HIDE_INVITE_MORE_HEADER: true,
                    },
                    userInfo: {
                        displayName: `Dr. ${doctorName}`,
                    },
                });

                apiRef.current = api;

                // Event listeners
                api.addListener('videoConferenceJoined', () => {
                    console.log('[Jitsi] Doctor joined room:', jitsiRoomName);
                    setLoading(false);
                    // Note: Notification already sent on component mount
                });

                api.addListener('videoConferenceLeft', () => {
                    console.log('[Jitsi] Left room');
                    if (onEndCall) onEndCall();
                    if (onLeave) onLeave();
                });

                api.addListener('readyToClose', () => {
                    console.log('[Jitsi] Ready to close');
                    if (onLeave) onLeave();
                });

                api.addListener('participantJoined', (participant) => {
                    console.log('[Jitsi] Participant joined:', participant);
                });

            } catch (err) {
                console.error('[Jitsi] Failed to initialize:', err);
                setError('Failed to initialize video call. Please try again.');
                setLoading(false);
            }
        };

        initJitsi();

        return () => {
            if (apiRef.current) {
                apiRef.current.dispose();
            }
        };
    }, [jitsiRoomName, notifyPatient, onEndCall, onLeave]);

    const copyRoomLink = () => {
        const url = `https://${jitsiDomain}/${jitsiRoomName}`;
        navigator.clipboard.writeText(url);
        alert(`Room link copied!\n\nShare with patient:\n${url}`);
    };

    if (error) {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center h-100 p-4">
                <Alert variant="danger">{error}</Alert>
                <Button variant="secondary" onClick={onLeave}>Close</Button>
            </div>
        );
    }

    return (
        <div className="position-relative w-100 h-100" style={{ minHeight: '500px' }}>
            {/* Loading overlay */}
            {loading && (
                <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-dark text-white" style={{ zIndex: 10 }}>
                    <Spinner animation="border" variant="primary" className="mb-3" />
                    <p>Starting video call...</p>
                    <small className="text-muted">Waiting for patient to join</small>
                </div>
            )}

            {/* Share link button */}
            <div className="position-absolute top-0 end-0 m-2" style={{ zIndex: 20 }}>
                <Button 
                    variant="outline-light" 
                    size="sm" 
                    onClick={copyRoomLink}
                    title="Copy room link to share with patient"
                >
                    📋 Copy Link
                </Button>
            </div>

            {/* Jitsi container */}
            <div 
                ref={jitsiContainerRef} 
                className="w-100 h-100"
                style={{ minHeight: '500px' }}
            />
        </div>
    );
};

export default JitsiVideoRoom;
