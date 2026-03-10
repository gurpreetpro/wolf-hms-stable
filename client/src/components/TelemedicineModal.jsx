import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Button, Badge, Alert, Spinner } from 'react-bootstrap';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Monitor, Users, Clock } from 'lucide-react';
import VideoRoom from './telemedicine/VideoRoom'; // Phase 9

/**
 * TelemedicineModal - Phase 4 Video Consultation Component
 * Uses Jitsi Meet for free, no-API-key video calls
 */
const TelemedicineModal = ({ show, onHide, patient, doctor }) => {
    const [callStatus, setCallStatus] = useState('idle'); // idle, connecting, connected, ended
    const [duration, setDuration] = useState(0);
    const roomNameRef = useRef(null);
    const [activeRoom, setActiveRoom] = useState(null); // Safe for render

    // Generate unique room name once when modal opens
    useEffect(() => {
        if (show && !roomNameRef.current) {
            const newRoom = `wolf-hms-${patient?.id || 'demo'}-${Math.floor(Math.random() * 100000)}`;
            roomNameRef.current = newRoom;
            setActiveRoom(newRoom);
        }
        if (!show) {
            roomNameRef.current = null;
            setActiveRoom(null);
            setCallStatus('idle');
            setDuration(0);
        }
    }, [show, patient?.id]);

    // Start call logic
    useEffect(() => {
        if (show && callStatus === 'connecting') {
            // Simulate connection delay for finding peers
            setTimeout(() => {
                setCallStatus('connected');
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [show, callStatus]);

    const handleStartCall = () => {
        setCallStatus('connecting');
    };

    const handleEndCall = () => {
        if (jitsiApiRef.current) {
            jitsiApiRef.current.executeCommand('hangup');
        }
        setCallStatus('ended');
        if (timerRef.current) clearInterval(timerRef.current);
    };

    // Toggles handled within VideoRoom

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const copyLinkToClipboard = () => {
        const link = `https://meet.jit.si/${roomName}`;
        navigator.clipboard.writeText(link);
        alert('Meeting link copied! Share with patient.');
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
            <Modal.Header className="bg-primary text-white">
                <Modal.Title className="d-flex align-items-center gap-2">
                    <Video size={24} />
                    Video Consultation
                    {callStatus === 'connected' && (
                        <Badge bg="success" className="ms-2">
                            <Clock size={12} className="me-1" />
                            {formatDuration(duration)}
                        </Badge>
                    )}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                {/* Patient Info Banner */}
                <div className="p-3 bg-light border-bottom d-flex justify-content-between align-items-center">
                    <div>
                        <strong>Patient:</strong> {patient?.patient_name || patient?.name || 'Unknown'}
                        <Badge bg="secondary" className="ms-2">
                            {patient?.complaint || 'General Consultation'}
                        </Badge>
                    </div>
                    <div>
                        <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={copyLinkToClipboard}
                        >
                            <Monitor size={14} className="me-1" />
                            Copy Meeting Link
                        </Button>
                    </div>
                </div>

                {/* Call Status Display */}
                {callStatus === 'idle' && (
                    <div className="text-center py-5">
                        <div className="mb-4">
                            <div
                                className="rounded-circle bg-primary bg-opacity-10 d-inline-flex align-items-center justify-content-center"
                                style={{ width: 120, height: 120 }}
                            >
                                <Video size={48} className="text-primary" />
                            </div>
                        </div>
                        <h5>Ready to Start Video Consultation</h5>
                        <p className="text-muted">
                            Click "Start Call" to begin the video consultation.<br />
                            Share the meeting link with the patient to join.
                        </p>
                        <Alert variant="info" className="mx-4">
                            <Users size={16} className="me-2" />
                            The patient can join using the meeting link on their phone or computer.
                        </Alert>
                    </div>
                )}

                {callStatus === 'connecting' && (
                    <div className="text-center py-5">
                        <Spinner animation="border" variant="primary" className="mb-3" />
                        <h5>Connecting...</h5>
                        <p className="text-muted">Setting up video call</p>
                    </div>
                )}

                {callStatus === 'ended' && (
                    <div className="text-center py-5">
                        <div className="mb-4">
                            <div
                                className="rounded-circle bg-success bg-opacity-10 d-inline-flex align-items-center justify-content-center"
                                style={{ width: 120, height: 120 }}
                            >
                                <PhoneOff size={48} className="text-success" />
                            </div>
                        </div>
                        <h5>Call Ended</h5>
                        <p className="text-muted">
                            Duration: {formatDuration(duration)}
                        </p>
                    </div>
                )}

                {/* Native Video Room */}
                {callStatus === 'connected' && activeRoom && (
                    <div style={{ minHeight: 500 }}>
                        <VideoRoom 
                            roomId={activeRoom} 
                            patientId={patient?.patient_id || patient?.id}
                            patientPhone={patient?.phone}
                            appointmentId={patient?.appointment_id || patient?.id}
                            role={doctor ? 'doctor' : 'patient'} 
                            onEndCall={handleEndCall}
                        />
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer className="d-flex justify-content-between">
                <div>
                    {/* Controls Moved to VideoRoom Component */}
                </div>
                <div>
                    {callStatus === 'idle' && (
                        <>
                            <Button variant="secondary" onClick={onHide} className="me-2">
                                Cancel
                            </Button>
                            <Button variant="success" onClick={handleStartCall}>
                                <Video size={18} className="me-2" />
                                Start Call
                            </Button>
                        </>
                    )}
                    {callStatus === 'connected' && (
                        <Button variant="danger" onClick={handleEndCall}>
                            <PhoneOff size={18} className="me-2" />
                            End Call
                        </Button>
                    )}
                    {callStatus === 'ended' && (
                        <Button variant="primary" onClick={onHide}>
                            Close
                        </Button>
                    )}
                </div>
            </Modal.Footer>
        </Modal>
    );
};

export default TelemedicineModal;
