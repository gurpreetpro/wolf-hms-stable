import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Volume2, Users, Phone, Radio, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import api from '../../../utils/axiosInstance';
import './VoiceChannelBar.css';

// LiveKit Server URL (self-hosted on VPS)
const LIVEKIT_URL = 'ws://163.245.208.73:7880';

/**
 * VoiceChannelBar - Floating voice channel at bottom
 * Integrates with LiveKit for real-time voice communication (PTT)
 * 
 * WebRTC-based Push-to-Talk for Security Command Center
 */
const VoiceChannelBar = ({ 
    onClose,
    channelName = 'patrol-main',
    translations = {}
}) => {
    const [isMuted, setIsMuted] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(true);
    const [connectionError, setConnectionError] = useState(null);
    const [activeParticipants, setActiveParticipants] = useState([]);
    const [roomName, setRoomName] = useState(null);
    
    // Refs for streams and connection
    const localStreamRef = useRef(null);
    const wsRef = useRef(null);

    // Translations with Hindi support
    const t = {
        voiceChannel: 'Voice Channel',
        voiceChannelHi: 'वॉयस चैनल',
        connecting: 'Connecting...',
        connected: 'Connected',
        disconnected: 'Disconnected',
        error: 'Connection Error',
        pushToTalk: 'Hold SPACE to talk',
        pushToTalkHi: 'बोलने के लिए SPACE दबाएं',
        participants: 'Participants',
        muted: 'Muted',
        unmuted: 'TRANSMITTING',
        ...translations
    };

    // Fetch LiveKit token from backend
    const fetchToken = useCallback(async () => {
        try {
            setIsConnecting(true);
            setConnectionError(null);
            
            const response = await api.post('/security/voice/token', {
                channelName: channelName
            });
            
            if (response.data?.data) {
                const { token, room, url } = response.data.data;
                setRoomName(room);
                console.log('[VoiceChannel] Token received for room:', room);
                return { token, room, url: url || LIVEKIT_URL };
            }
        } catch (error) {
            console.error('[VoiceChannel] Failed to get token:', error);
            setConnectionError('Failed to connect to voice server');
            setIsConnecting(false);
        }
        return null;
    }, [channelName]);

    // Initialize audio and connect
    useEffect(() => {
        let mounted = true;
        
        // Connect to LiveKit server (defined inside useEffect to avoid hoisting issues)
        const connectToLiveKit = (tokenData) => {
            try {
                const ws = new WebSocket(`${tokenData.url}/rtc?access_token=${tokenData.token}`);
                wsRef.current = ws;
                
                ws.onopen = () => {
                    console.log('[VoiceChannel] Connected to LiveKit');
                    if (mounted) {
                        setIsConnected(true);
                        setIsConnecting(false);
                        
                        // Add self as participant
                        const authData = JSON.parse(localStorage.getItem('wolf_auth') || '{}');
                        const username = authData.user?.username || 'Control Room';
                        setActiveParticipants([{ 
                            id: 'self', 
                            name: username, 
                            isSelf: true,
                            isSpeaking: false 
                        }]);
                    }
                };
                
                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        // Handle participant updates
                        if (data.type === 'participant_joined' && mounted) {
                            setActiveParticipants(prev => 
                                prev.some(p => p.id === data.participant.id) ? prev : [...prev, {
                                    id: data.participant.id,
                                    name: data.participant.name || `Guard ${data.participant.id}`,
                                    isSpeaking: false
                                }]
                            );
                        } else if (data.type === 'participant_left' && mounted) {
                            setActiveParticipants(prev => 
                                prev.filter(p => p.id !== data.participant.id)
                            );
                        }
                    } catch {
                        // Binary data (audio)
                    }
                };
                
                ws.onerror = () => {
                    if (mounted) setConnectionError('Connection failed');
                };
                
                ws.onclose = () => {
                    if (mounted) setIsConnected(false);
                };
                
            } catch (error) {
                console.error('[VoiceChannel] Failed to connect:', error);
                if (mounted) {
                    setConnectionError('Failed to connect');
                    setIsConnecting(false);
                }
            }
        };
        
        const initialize = async () => {
            // Get token
            const tokenData = await fetchToken();
            if (!tokenData || !mounted) return;
            
            try {
                // Request microphone permission
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
                
                localStreamRef.current = stream;
                
                // Mute initially
                stream.getAudioTracks().forEach(track => {
                    track.enabled = false;
                });
                
                // Connect to LiveKit via WebSocket
                connectToLiveKit(tokenData);
                
            } catch (error) {
                console.error('[VoiceChannel] Microphone access denied:', error);
                if (mounted) {
                    setConnectionError('Microphone access required');
                    setIsConnecting(false);
                }
            }
        };
        
        initialize();
        
        return () => {
            mounted = false;
            // Cleanup
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
            }
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [fetchToken]);

    // Toggle microphone
    const setMicEnabled = useCallback((enabled) => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = enabled;
            });
            setIsMuted(!enabled);
            
            // Update self speaking state
            setActiveParticipants(prev => 
                prev.map(p => p.isSelf ? { ...p, isSpeaking: enabled } : p)
            );
            
            // Notify server
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                    type: 'speaking',
                    speaking: enabled
                }));
            }
        }
    }, []);

    // Push-to-talk with spacebar
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            if (e.code === 'Space' && !e.repeat && isConnected) {
                e.preventDefault();
                setMicEnabled(true);
            }
        };

        const handleKeyUp = (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                setMicEnabled(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isConnected, setMicEnabled]);

    // Render connection status icon
    const renderStatusIcon = () => {
        if (connectionError) {
            return <AlertCircle size={16} className="status-icon error" />;
        }
        if (isConnecting) {
            return <Radio size={16} className="status-icon connecting" />;
        }
        if (isConnected) {
            return <Wifi size={16} className="status-icon connected" />;
        }
        return <WifiOff size={16} className="status-icon disconnected" />;
    };

    return (
        <div className={`voice-channel-bar ${isConnected ? 'connected' : isConnecting ? 'connecting' : 'disconnected'} ${!isMuted ? 'transmitting' : ''}`}>
            {/* Channel Info */}
            <div className="channel-info">
                <div className="channel-icon">
                    <Volume2 size={20} />
                </div>
                <div className="channel-details">
                    <span className="channel-name">
                        {roomName || channelName}
                    </span>
                    <span className="channel-status">
                        {renderStatusIcon()}
                        {connectionError || (isConnecting ? t.connecting : isConnected ? t.connected : t.disconnected)}
                    </span>
                </div>
            </div>

            {/* Participants */}
            <div className="channel-participants">
                <Users size={16} />
                <span>{activeParticipants.length}</span>
                <div className="participant-avatars">
                    {activeParticipants.slice(0, 5).map(p => (
                        <div 
                            key={p.id} 
                            className={`participant-avatar ${p.isSpeaking ? 'speaking' : ''} ${p.isSelf ? 'self' : ''}`}
                            title={p.name}
                        >
                            {p.name.charAt(0).toUpperCase()}
                        </div>
                    ))}
                    {activeParticipants.length > 5 && (
                        <div className="participant-avatar more">
                            +{activeParticipants.length - 5}
                        </div>
                    )}
                </div>
            </div>

            {/* PTT Button */}
            <button 
                className={`ptt-button ${!isMuted ? 'active' : ''}`}
                onMouseDown={() => setMicEnabled(true)}
                onMouseUp={() => setMicEnabled(false)}
                onMouseLeave={() => setMicEnabled(false)}
                onTouchStart={() => setMicEnabled(true)}
                onTouchEnd={() => setMicEnabled(false)}
                disabled={!isConnected}
            >
                {isMuted ? (
                    <>
                        <MicOff size={20} />
                        <span className="ptt-hint">{t.pushToTalk}</span>
                    </>
                ) : (
                    <>
                        <Mic size={20} />
                        <span className="ptt-active">{t.unmuted}</span>
                    </>
                )}
            </button>

            {/* Disconnect Button */}
            <button className="close-button" onClick={onClose} title="Disconnect">
                <Phone size={18} style={{ transform: 'rotate(135deg)' }} />
            </button>
        </div>
    );
};

export default VoiceChannelBar;
