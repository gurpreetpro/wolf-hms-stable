/**
 * WebRTC Video Room - Doctor Dashboard
 * 
 * P2P video call using WebRTC. Connects directly to patient's phone
 * through VPS signaling server.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Spinner, Alert, Button } from 'react-bootstrap';
import { Video, Mic, MicOff, VideoOff, Phone } from 'lucide-react';
import { io } from 'socket.io-client';

const SIGNAL_SERVER = 'https://socket.wolfsecurity.in';

// ICE Server Configuration
const ICE_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        {
            urls: 'turn:163.245.208.73:3478',
            username: 'wolfadmin',
            credential: 'WolfSecure2026'
        }
    ],
};

const WebRTCVideoRoom = ({
    patientId,
    patientName,
    patientPhone,
    appointmentId,
    onClose,
    doctorName: propDoctorName,
}) => {
    const [loading, setLoading] = useState(true);
    const [callStatus, setCallStatus] = useState('Initializing...');
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOff, setIsCameraOff] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    
    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const pcRef = useRef(null);
    const socketRef = useRef(null);
    const localStreamRef = useRef(null);
    // ICE candidate queue to fix race condition
    const candidateQueue = useRef([]);
    const isRemoteSet = useRef(false);
    // Track patient's socket ID for end-call notification
    const patientSocketIdRef = useRef(null);

    const doctorName = propDoctorName || localStorage.getItem('fullName') || 'Doctor';

    // Notify patient that call is starting
    const notifyPatient = useCallback(async () => {
        try {
            await fetch(`${SIGNAL_SERVER}/notify-call`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    patientId,
                    patientPhone,
                    appointmentId,
                    doctorName,
                    type: 'webrtc',
                }),
            });
            console.log('[WebRTC] Notified patient of incoming call');
        } catch (err) {
            console.error('[WebRTC] Failed to notify patient:', err);
        }
    }, [patientId, patientPhone, appointmentId, doctorName]);

    useEffect(() => {
        initializeCall();
        
        return () => {
            cleanup();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Set local video srcObject after video element renders (when loading becomes false)
    useEffect(() => {
        if (!loading && localStreamRef.current && localVideoRef.current) {
            console.log('[WebRTC] Setting local video srcObject');
            localVideoRef.current.srcObject = localStreamRef.current;
        }
    }, [loading]);

    const initializeCall = async () => {
        try {
            setCallStatus('Getting camera access...');
            
            // Get local media stream
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                }
            });
            
            localStreamRef.current = stream;
            console.log('[WebRTC] Got local media stream');
            
            // Set loading false so video elements render
            setLoading(false);
            
            // Note: We'll set srcObject in useEffect after element renders
            
            setCallStatus('Connecting to signaling server...');
            
            // Connect to signaling server
            socketRef.current = io(`${SIGNAL_SERVER}/video`, {
                transports: ['websocket', 'polling'],
                reconnection: true,
            });

            socketRef.current.on('connect', () => {
                console.log('[WebRTC] Connected to signaling server:', socketRef.current.id);
                setCallStatus('Notifying patient...');
                
                // Notify patient to join - they will emit patient-ready when connected
                notifyPatient();
            });

            // Wait for patient to be ready before sending offer
            socketRef.current.on('patient-ready', (data) => {
                console.log('[WebRTC] Patient is ready:', data);
                if (data.patientPhone === patientPhone || data.patientId === patientId) {
                    // Save patient socket ID for end-call notification
                    patientSocketIdRef.current = data.socketId;
                    setCallStatus('Patient connected! Creating call...');
                    createPeerConnection();
                }
            });

            socketRef.current.on('disconnect', () => {
                console.log('[WebRTC] Disconnected from signaling server');
                setCallStatus('Disconnected');
            });

            // Handle call ended by patient
            socketRef.current.on('call-ended', (data) => {
                console.log('[WebRTC] Call ended by patient:', data.reason);
                setCallStatus('Call ended by patient');
                setIsConnected(false);
                setTimeout(() => {
                    cleanup();
                    onClose?.();
                }, 2000);
            });

            // Handle call rejected by patient
            socketRef.current.on('call-rejected', (data) => {
                console.log('[WebRTC] Call rejected by patient');
                setCallStatus('Call rejected');
                setIsConnected(false);
                setTimeout(() => {
                    cleanup();
                    onClose?.();
                }, 2000);
            });

            // Handle answer from patient
            socketRef.current.on('call-answered', async (data) => {
                console.log('[WebRTC] 📩 Received answer from patient');
                console.log('[WebRTC] Answer SDP preview:', data.signal?.sdp?.substring(0, 200));
                try {
                    // FIX 1: SANITIZE - React Native sends dirty SDP; keep only type & sdp
                    const cleanSignal = {
                        type: data.signal.type, // Must be "answer"
                        sdp: data.signal.sdp
                    };
                    console.log('[WebRTC] Clean signal type:', cleanSignal.type);
                    
                    await pcRef.current.setRemoteDescription(new RTCSessionDescription(cleanSignal));
                    isRemoteSet.current = true; // Mark connection as ready
                    console.log('[WebRTC] ✅ Remote description set successfully');
                    
                    // Process any queued ICE candidates
                    console.log(`[WebRTC] Processing ${candidateQueue.current.length} queued candidates`);
                    for (const cand of candidateQueue.current) {
                        try {
                            await pcRef.current.addIceCandidate(new RTCIceCandidate(cand));
                        } catch (e) {
                            console.error('[WebRTC] Error adding queued candidate:', e);
                        }
                    }
                    candidateQueue.current = []; // Clear queue
                    
                    // Force UI update
                    setCallStatus('Connected');
                    setIsConnected(true);
                } catch (err) {
                    console.error('[WebRTC] ❌ CRITICAL: Handshake Failed:', err);
                }
            });

            // Handle ICE candidates from patient (with queuing)
            socketRef.current.on('ice-candidate', async (data) => {
                if (!data.candidate) return;
                
                if (isRemoteSet.current) {
                    // Remote description set - add immediately
                    try {
                        await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
                        console.log('[WebRTC] Added ICE candidate');
                    } catch (err) {
                        console.error('[WebRTC] Error adding ICE candidate:', err);
                    }
                } else {
                    // Remote not set yet - queue the candidate
                    console.log('[WebRTC] Queueing early ICE candidate');
                    candidateQueue.current.push(data.candidate);
                }
            });

            setLoading(false);
        } catch (err) {
            console.error('[WebRTC] Error initializing call:', err);
            setCallStatus('Failed to access camera');
            setLoading(false);
        }
    };

    const createPeerConnection = async () => {
        try {
            pcRef.current = new RTCPeerConnection(ICE_CONFIG);

            // Add local tracks
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => {
                    pcRef.current.addTrack(track, localStreamRef.current);
                });
            }

            // Handle incoming tracks (remote stream)
            // FIX 4: Add fallback MediaStream creation and explicit play()
            pcRef.current.ontrack = (event) => {
                console.log('[WebRTC] 🎥 ONTRACK EVENT FIRED!');
                console.log('[WebRTC] Track kind:', event.track?.kind);
                console.log('[WebRTC] Track readyState:', event.track?.readyState);
                console.log('[WebRTC] Number of streams:', event.streams?.length);
                
                if (remoteVideoRef.current) {
                    // Fallback: If event.streams[0] is missing, build it manually
                    const stream = event.streams[0] || new MediaStream([event.track]);
                    remoteVideoRef.current.srcObject = stream;
                    console.log('[WebRTC] ✅ Remote stream attached, stream ID:', stream.id);
                    
                    // Ensure it plays (required for autoplay policy)
                    remoteVideoRef.current.play().catch(e => {
                        console.error('[WebRTC] Play Error:', e);
                    });
                    
                    setCallStatus('In Call');
                    setIsConnected(true);
                } else {
                    console.error('[WebRTC] ❌ remoteVideoRef is null!');
                }
            };

            // Handle ICE candidates
            pcRef.current.onicecandidate = (event) => {
                if (event.candidate && socketRef.current) {
                    console.log('[WebRTC] Sending ICE candidate');
                    socketRef.current.emit('ice-candidate', {
                        candidate: event.candidate,
                        to: patientPhone // Send to patient's room
                    });
                }
            };

            // Handle connection state changes
            pcRef.current.onconnectionstatechange = () => {
                console.log('[WebRTC] 🔌 Connection state:', pcRef.current.connectionState);
                if (pcRef.current.connectionState === 'connected') {
                    setCallStatus('Connected');
                    setIsConnected(true);
                } else if (pcRef.current.connectionState === 'disconnected' || 
                           pcRef.current.connectionState === 'failed') {
                    setCallStatus('Disconnected');
                    setIsConnected(false);
                }
            };

            // ICE connection state for debugging
            pcRef.current.oniceconnectionstatechange = () => {
                console.log('[WebRTC] 🧊 ICE Connection state:', pcRef.current.iceConnectionState);
            };

            // ICE gathering state
            pcRef.current.onicegatheringstatechange = () => {
                console.log('[WebRTC] 🧊 ICE Gathering state:', pcRef.current.iceGatheringState);
            };

            // Create and send offer
            setCallStatus('Creating call offer...');
            const offer = await pcRef.current.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: true,
            });
            await pcRef.current.setLocalDescription(offer);

            // Send offer to patient
            socketRef.current.emit('call-user', {
                userToCall: patientPhone,
                signalData: offer,
                from: socketRef.current.id,
                doctorName,
            });

            setCallStatus('Ringing patient...');
            console.log('[WebRTC] Sent offer to patient:', patientPhone);
        } catch (err) {
            console.error('[WebRTC] Error creating peer connection:', err);
            setCallStatus('Failed to create call');
        }
    };

    const cleanup = () => {
        // Stop all media tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
            localStreamRef.current = null;
        }
        // Close peer connection
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        // Disconnect socket
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        // Reset refs for repeat calls
        isRemoteSet.current = false;
        candidateQueue.current = [];
        patientSocketIdRef.current = null;
    };

    const handleEndCall = () => {
        // Notify patient that doctor is ending the call
        if (socketRef.current?.connected && patientSocketIdRef.current) {
            console.log('[WebRTC] Notifying patient of call end');
            socketRef.current.emit('end-call', { 
                to: patientSocketIdRef.current,
                reason: 'doctor_ended'
            });
        }
        cleanup();
        onClose?.();
    };

    const toggleMute = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleCamera = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsCameraOff(!isCameraOff);
        }
    };

    if (loading) {
        return (
            <div className="d-flex flex-column align-items-center justify-content-center" 
                 style={{ height: '500px', background: '#0f172a', color: 'white' }}>
                <Spinner animation="border" variant="light" />
                <p className="mt-3">{callStatus}</p>
            </div>
        );
    }

    return (
        <div style={{ height: '500px', background: '#0f172a', position: 'relative' }}>
            {/* Remote Video (or waiting screen) */}
            <div style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
                {/* CRITICAL: Always render video element so ref exists when ontrack fires */}
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        background: '#1a1a2e',
                        display: isConnected ? 'block' : 'none',
                    }}
                />
                {/* Show waiting overlay when not connected */}
                {!isConnected && (
                    <div className="d-flex flex-column align-items-center justify-content-center h-100"
                         style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
                        <Video size={64} color="#64748b" />
                        <h5 className="text-white mt-3">{callStatus}</h5>
                        <p className="text-muted">{patientName || 'Patient'}</p>
                        <span className="badge bg-secondary">{patientPhone}</span>
                    </div>
                )}

                {/* Local Video PIP */}
                <div style={{
                    position: 'absolute',
                    top: 20,
                    right: 20,
                    width: 180,
                    height: 120,
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '2px solid #334155',
                }}>
                    <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            transform: 'scaleX(-1)',
                        }}
                    />
                </div>
            </div>

            {/* Controls */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 16,
                padding: 16,
                background: 'rgba(0,0,0,0.7)',
            }}>
                <Button
                    variant={isMuted ? 'danger' : 'secondary'}
                    className="rounded-circle p-3"
                    onClick={toggleMute}
                >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                </Button>

                <Button
                    variant="danger"
                    className="rounded-circle p-3"
                    onClick={handleEndCall}
                    style={{ width: 64, height: 64 }}
                >
                    <Phone size={28} style={{ transform: 'rotate(135deg)' }} />
                </Button>

                <Button
                    variant={isCameraOff ? 'danger' : 'secondary'}
                    className="rounded-circle p-3"
                    onClick={toggleCamera}
                >
                    {isCameraOff ? <VideoOff size={24} /> : <Video size={24} />}
                </Button>
            </div>
        </div>
    );
};

export default WebRTCVideoRoom;
