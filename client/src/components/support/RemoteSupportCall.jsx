import React, { useEffect, useRef, useState } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';

/**
 * Remote Support Screen Sharing Component
 * Uses ZEGOCLOUD for video calls and screen sharing
 */
const RemoteSupportCall = ({
    roomId,
    userId,
    userName,
    role = 'Host', // 'Host' for support staff, 'Cohost' for user requesting help
    onCallEnd,
    appId,
    serverSecret
}) => {
    const containerRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!containerRef.current || !appId || !serverSecret) {
            setError('Missing ZEGOCLOUD credentials');
            return;
        }

        const initCall = async () => {
            try {
                // Generate kit token
                const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
                    appId,
                    serverSecret,
                    roomId,
                    String(userId),
                    userName
                );

                // Create instance
                const zp = ZegoUIKitPrebuilt.create(kitToken);

                // Join room with remote support configuration
                zp.joinRoom({
                    container: containerRef.current,
                    turnOnMicrophoneWhenJoining: true,
                    turnOnCameraWhenJoining: true,
                    showMyCameraToggleButton: true,
                    showMyMicrophoneToggleButton: true,
                    showAudioVideoSettingsButton: true,
                    showScreenSharingButton: true,
                    showTextChat: true,
                    showUserList: true,
                    maxUsers: 2,
                    layout: "Auto",
                    showLayoutButton: false,
                    scenario: {
                        mode: ZegoUIKitPrebuilt.OneONoneCall,
                        config: {
                            role: role === 'Host'
                                ? ZegoUIKitPrebuilt.Host
                                : ZegoUIKitPrebuilt.Cohost,
                        },
                    },
                    onJoinRoom: () => {
                        setIsConnected(true);
                        console.log('Joined remote support session');
                    },
                    onLeaveRoom: () => {
                        setIsConnected(false);
                        if (onCallEnd) onCallEnd();
                    },
                    onUserJoin: (users) => {
                        console.log('User joined:', users);
                    },
                    onUserLeave: (users) => {
                        console.log('User left:', users);
                    },
                });
            } catch (err) {
                console.error('Failed to initialize call:', err);
                setError(err.message);
            }
        };

        initCall();

        return () => {
            // Cleanup will be handled by ZEGOCLOUD SDK
        };
    }, [roomId, userId, userName, role, appId, serverSecret]);

    if (error) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '400px',
                background: '#1a1a2e',
                borderRadius: '12px',
                color: '#fff',
                padding: '20px'
            }}>
                <h3 style={{ color: '#ef4444', marginBottom: '10px' }}>⚠️ Connection Error</h3>
                <p style={{ opacity: 0.7 }}>{error}</p>
                <p style={{ fontSize: '0.85rem', opacity: 0.5, marginTop: '10px' }}>
                    Please check ZEGOCLOUD credentials in settings.
                </p>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '500px' }}>
            {!isConnected && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#1a1a2e',
                    borderRadius: '12px',
                    color: '#fff',
                    zIndex: 1
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            border: '3px solid #3b82f6',
                            borderTopColor: 'transparent',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 15px'
                        }} />
                        <p>Connecting to support session...</p>
                    </div>
                </div>
            )}
            <div
                ref={containerRef}
                style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: '12px',
                    overflow: 'hidden'
                }}
            />
            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default RemoteSupportCall;
