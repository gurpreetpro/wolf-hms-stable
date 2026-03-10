/**
 * Wolf Video - Web Video Call Component
 * 
 * Pure WebRTC video call for Wolf HMS dashboard
 * 100% self-hosted, no external dependencies
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { 
    Mic, MicOff, Video, VideoOff, PhoneOff, 
    Maximize2, Minimize2, RefreshCw 
} from 'lucide-react';
import './VideoCall.css';

const VideoCall = ({ 
    token, 
    roomId, 
    userName, 
    iceServers,
    onCallEnd 
}) => {
    // Refs
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const socketRef = useRef(null);
    const peerConnectionRef = useRef(null);
    const localStreamRef = useRef(null);
    
    // State
    const [isConnecting, setIsConnecting] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [remotePeer, setRemotePeer] = useState(null);
    const [error, setError] = useState(null);
    const [callDuration, setCallDuration] = useState(0);
    
    // ICE configuration
    const rtcConfig = {
        iceServers: iceServers || [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
        ]
    };
    
    // Initialize connection
    useEffect(() => {
        const init = async () => {
            try {
                // Get local media
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 1280, height: 720 },
                    audio: true
                });
                
                localStreamRef.current = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
                
                // Connect to signaling server
                const serverUrl = process.env.REACT_APP_SOCKET_URL || window.location.origin;
                socketRef.current = io(`${serverUrl}/video`, {
                    transports: ['websocket'],
                    autoConnect: true
                });
                
                setupSocketHandlers();
                
                // Join room
                socketRef.current.emit('join-room', { roomId, token, name: userName }, (response) => {
                    if (response.error) {
                        setError(response.error);
                        setIsConnecting(false);
                        return;
                    }
                    
                    console.log('[VIDEO] Joined room with participants:', response.participants);
                    
                    // If peer already in room, initiate call
                    if (response.participants?.length > 0) {
                        const peer = response.participants[0];
                        setRemotePeer(peer);
                        createPeerConnection(peer.peerId, true);
                    }
                    
                    setIsConnecting(false);
                });
                
            } catch (err) {
                console.error('[VIDEO] Init error:', err);
                setError(err.message);
                setIsConnecting(false);
            }
        };
        
        init();
        
        return () => {
            cleanup();
        };
    }, [roomId, token]);
    
    // Call duration timer
    useEffect(() => {
        let timer;
        if (isConnected) {
            timer = setInterval(() => {
                setCallDuration(d => d + 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isConnected]);
    
    // Socket event handlers
    const setupSocketHandlers = () => {
        const socket = socketRef.current;
        
        socket.on('peer-joined', async ({ peerId, userId, role, name }) => {
            console.log('[VIDEO] Peer joined:', peerId, name);
            setRemotePeer({ peerId, userId, role, name });
            
            // Create offer as the initiator
            createPeerConnection(peerId, true);
        });
        
        socket.on('offer', async ({ peerId, offer }) => {
            console.log('[VIDEO] Received offer from:', peerId);
            await handleOffer(peerId, offer);
        });
        
        socket.on('answer', async ({ peerId, answer }) => {
            console.log('[VIDEO] Received answer from:', peerId);
            await handleAnswer(answer);
        });
        
        socket.on('ice-candidate', async ({ peerId, candidate }) => {
            await handleIceCandidate(candidate);
        });
        
        socket.on('peer-left', ({ peerId }) => {
            console.log('[VIDEO] Peer left:', peerId);
            setRemotePeer(null);
            setIsConnected(false);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = null;
            }
        });
        
        socket.on('call-ended', () => {
            cleanup();
            onCallEnd?.();
        });
        
        socket.on('peer-audio-toggle', ({ muted }) => {
            // Could show indicator
        });
        
        socket.on('peer-video-toggle', ({ disabled }) => {
            // Could show indicator
        });
    };
    
    // Create peer connection
    const createPeerConnection = async (peerId, isInitiator) => {
        const pc = new RTCPeerConnection(rtcConfig);
        peerConnectionRef.current = pc;
        
        // Add local tracks
        localStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current);
        });
        
        // Handle remote stream
        pc.ontrack = (event) => {
            console.log('[VIDEO] Remote track received');
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
            setIsConnected(true);
        };
        
        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit('ice-candidate', {
                    peerId,
                    candidate: event.candidate
                });
            }
        };
        
        pc.oniceconnectionstatechange = () => {
            console.log('[VIDEO] ICE state:', pc.iceConnectionState);
            if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                setIsConnected(false);
            }
        };
        
        // Create and send offer if initiator
        if (isInitiator) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socketRef.current.emit('offer', { peerId, offer });
        }
    };
    
    // Handle incoming offer
    const handleOffer = async (peerId, offer) => {
        if (!peerConnectionRef.current) {
            await createPeerConnection(peerId, false);
        }
        
        const pc = peerConnectionRef.current;
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        socketRef.current.emit('answer', { peerId, answer });
    };
    
    // Handle incoming answer
    const handleAnswer = async (answer) => {
        const pc = peerConnectionRef.current;
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
    };
    
    // Handle ICE candidate
    const handleIceCandidate = async (candidate) => {
        const pc = peerConnectionRef.current;
        if (pc && candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
    };
    
    // Toggle mute
    const toggleMute = () => {
        const audioTrack = localStreamRef.current?.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setIsMuted(!audioTrack.enabled);
            socketRef.current?.emit('toggle-audio', !audioTrack.enabled);
        }
    };
    
    // Toggle video
    const toggleVideo = () => {
        const videoTrack = localStreamRef.current?.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            setIsVideoOff(!videoTrack.enabled);
            socketRef.current?.emit('toggle-video', !videoTrack.enabled);
        }
    };
    
    // End call
    const endCall = () => {
        socketRef.current?.emit('end-call');
        cleanup();
        onCallEnd?.();
    };
    
    // Cleanup
    const cleanup = () => {
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        peerConnectionRef.current?.close();
        socketRef.current?.disconnect();
    };
    
    // Toggle fullscreen
    const toggleFullscreen = () => {
        setIsFullscreen(!isFullscreen);
    };
    
    // Format duration
    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    
    if (error) {
        return (
            <div className="video-call-error">
                <h3>Connection Error</h3>
                <p>{error}</p>
                <button onClick={onCallEnd}>Close</button>
            </div>
        );
    }
    
    return (
        <div className={`video-call-container ${isFullscreen ? 'fullscreen' : ''}`}>
            {/* Remote Video (Main) */}
            <div className="remote-video-wrapper">
                <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline
                    className="remote-video"
                />
                {!isConnected && (
                    <div className="waiting-overlay">
                        {isConnecting ? (
                            <div className="connecting">
                                <RefreshCw className="spin" size={48} />
                                <p>Connecting...</p>
                            </div>
                        ) : (
                            <div className="waiting">
                                <p>Waiting for {remotePeer?.role === 'doctor' ? 'doctor' : 'patient'}...</p>
                            </div>
                        )}
                    </div>
                )}
                
                {/* Call Duration */}
                {isConnected && (
                    <div className="call-duration">
                        {formatDuration(callDuration)}
                    </div>
                )}
                
                {/* Remote Peer Name */}
                {remotePeer && (
                    <div className="peer-name">
                        {remotePeer.name || remotePeer.role}
                    </div>
                )}
            </div>
            
            {/* Local Video (PIP) */}
            <div className="local-video-wrapper">
                <video 
                    ref={localVideoRef} 
                    autoPlay 
                    playsInline 
                    muted
                    className="local-video"
                />
                {isVideoOff && (
                    <div className="video-off-overlay">
                        <VideoOff size={24} />
                    </div>
                )}
            </div>
            
            {/* Controls */}
            <div className="video-controls">
                <button 
                    onClick={toggleMute}
                    className={`control-btn ${isMuted ? 'active' : ''}`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
                
                <button 
                    onClick={endCall}
                    className="control-btn end-call"
                    title="End Call"
                >
                    <PhoneOff size={28} />
                </button>
                
                <button 
                    onClick={toggleVideo}
                    className={`control-btn ${isVideoOff ? 'active' : ''}`}
                    title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                >
                    {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                </button>
                
                <button 
                    onClick={toggleFullscreen}
                    className="control-btn"
                    title="Toggle Fullscreen"
                >
                    {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
                </button>
            </div>
        </div>
    );
};

export default VideoCall;
