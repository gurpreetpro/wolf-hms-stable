/**
 * VideoRoom - Teleconsultation wrapper for doctor dashboard
 * 
 * Uses the real VideoCall component for WebRTC video calling
 * Notifies patient app of incoming call before starting video
 */
import React, { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import VideoCall from '../VideoCall';

const VideoRoom = ({ roomId, patientId, patientPhone, appointmentId, role = 'doctor', onEndCall, onLeave }) => {
  const [token, setToken] = useState(null);
  const [userName, setUserName] = useState('Doctor');
  const [isReady, setIsReady] = useState(false);
  const [callStatus, setCallStatus] = useState('initializing'); // initializing, ringing, accepted, declined, timeout
  const [callSocket, setCallSocket] = useState(null);

  useEffect(() => {
    // Get auth token and user info
    const authToken = localStorage.getItem('token');
    const doctorId = localStorage.getItem('userId');
    const username = localStorage.getItem('username') || localStorage.getItem('fullName') || 'Doctor';
    
    if (!authToken) {
      console.error('[VideoRoom] No auth token found');
      return;
    }

    setToken(authToken);
    setUserName(username);

    // Connect to video signaling server
    const serverUrl = process.env.REACT_APP_SOCKET_URL || window.location.origin;
    const socket = io(`${serverUrl}/video`, {
      transports: ['websocket'],
      autoConnect: true
    });

    socket.on('connect', () => {
      console.log('[VideoRoom] Connected to video server');
      
      // Register as doctor
      socket.emit('register-doctor', { 
        doctorId: doctorId, 
        doctorName: username 
      });

      // Emit start-call to notify patient
      console.log('[VideoRoom] Emitting start-call to patient:', patientId || patientPhone);
      socket.emit('start-call', {
        patientId: patientId,
        patientPhone: patientPhone,
        appointmentId: appointmentId,
        roomId: roomId
      });

      setCallStatus('ringing');
    });

    socket.on('call-ringing', ({ callId, patientOnline }) => {
      console.log('[VideoRoom] Call ringing, patient online:', patientOnline);
      setCallStatus(patientOnline ? 'ringing' : 'ringing-offline');
    });

    socket.on('call-accepted', ({ callId, roomId: acceptedRoomId, peerId }) => {
      console.log('[VideoRoom] Call accepted! Room:', acceptedRoomId, 'Peer:', peerId);
      setCallStatus('accepted');
      setIsReady(true);
    });

    socket.on('call-declined', ({ callId, reason }) => {
      console.log('[VideoRoom] Call declined:', reason);
      setCallStatus('declined');
    });

    socket.on('call-timeout', ({ callId }) => {
      console.log('[VideoRoom] Call timed out');
      setCallStatus('timeout');
    });

    socket.on('error', (error) => {
      console.error('[VideoRoom] Socket error:', error);
    });

    setCallSocket(socket);

    return () => {
      socket.disconnect();
    };
  }, [patientId, patientPhone, appointmentId, roomId]);

  const handleCallEnd = () => {
    if (callSocket) {
      callSocket.emit('end-call', { roomId });
    }
    if (onEndCall) onEndCall();
    if (onLeave) onLeave();
  };

  const handleCancel = () => {
    if (callSocket) {
      callSocket.emit('end-call', { roomId });
    }
    if (onLeave) onLeave();
  };

  // Show ringing UI
  if (callStatus === 'ringing' || callStatus === 'ringing-offline') {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-dark text-white p-4" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
        <h4 className="mb-2">Calling Patient...</h4>
        <p className="text-muted mb-4">
          {callStatus === 'ringing-offline' 
            ? 'Patient app is offline. Waiting for them to come online...' 
            : 'Waiting for patient to answer...'}
        </p>
        <button className="btn btn-danger" onClick={handleCancel}>
          Cancel Call
        </button>
      </div>
    );
  }

  // Show declined UI
  if (callStatus === 'declined') {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-dark text-white p-4" style={{ minHeight: '400px' }}>
        <div className="text-danger mb-3">
          <svg width="64" height="64" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </div>
        <h4 className="mb-2">Call Declined</h4>
        <p className="text-muted mb-4">The patient declined the video call.</p>
        <button className="btn btn-secondary" onClick={handleCancel}>
          Close
        </button>
      </div>
    );
  }

  // Show timeout UI
  if (callStatus === 'timeout') {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-dark text-white p-4" style={{ minHeight: '400px' }}>
        <div className="text-warning mb-3">
          <svg width="64" height="64" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
            <path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 4.995z"/>
          </svg>
        </div>
        <h4 className="mb-2">No Answer</h4>
        <p className="text-muted mb-4">Patient did not answer the call.</p>
        <button className="btn btn-secondary" onClick={handleCancel}>
          Close
        </button>
      </div>
    );
  }

  // Show loading while getting auth
  if (!isReady) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-dark text-white p-4" style={{ minHeight: '400px' }}>
        <div className="spinner-border text-primary mb-3" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p>Initializing video call...</p>
      </div>
    );
  }

  // Show error if no token
  if (!token) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center h-100 bg-dark text-white p-4" style={{ minHeight: '400px' }}>
        <div className="alert alert-danger">
          <strong>Authentication Error</strong>
          <p className="mb-0">Please log in again to use video calling.</p>
        </div>
        <button className="btn btn-secondary mt-3" onClick={handleCallEnd}>
          Close
        </button>
      </div>
    );
  }

  // ICE servers configuration (TURN server for NAT traversal)
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Wolf VPS CoTURN server (TCP transport for firewall compatibility)
    {
      urls: 'turn:163.245.208.73:3478?transport=tcp',
      username: 'wolfhms',
      credential: 'WolfTurn2026Secure!'
    },
    // Also try UDP as fallback
    {
      urls: 'turn:163.245.208.73:3478',
      username: 'wolfhms',
      credential: 'WolfTurn2026Secure!'
    }
  ];

  return (
    <div style={{ minHeight: '500px', height: '100%' }}>
      <VideoCall
        token={token}
        roomId={roomId}
        userName={userName}
        iceServers={iceServers}
        onCallEnd={handleCallEnd}
      />
    </div>
  );
};

export default VideoRoom;

