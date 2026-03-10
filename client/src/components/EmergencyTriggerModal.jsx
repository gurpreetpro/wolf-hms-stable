import React, { useState } from 'react';
import { Modal, Button, Row, Col } from 'react-bootstrap';
import { AlertTriangle, Flame, Baby, Users, ShieldAlert, Zap } from 'lucide-react';
import axios from 'axios';
import EmergencyBloodRelease from './EmergencyBloodRelease';

const EmergencyTriggerModal = ({ show, onHide }) => {
    const [showMTP, setShowMTP] = useState(false);
    
    // Auto-hide main modal when MTP is opened
    const handleMTPClick = () => {
        setShowMTP(true);
        // onHide(); // Optional: close trigger modal? Better to keep it open or just cover it?
        // Let's keep it proper: MTP is a sub-modal here
    };

    const triggerEmergency = async (code) => {
        try {
            const token = localStorage.getItem('token');
            // Assuming we have an endpoint to trigger emergency which then broadcasts via socket
            // If not, we might need to emit socket directly if client has socket access, 
            // but usually it's better to go through API for logging.
            // For now, let's assume we post to /api/emergency/trigger
            await axios.post('/api/emergency/trigger', {
                code: code,
                location: 'General Ward' // In a real app, this would be dynamic based on user location
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onHide();
        } catch (error) {
            console.error('Failed to trigger emergency:', error);
            alert('Failed to trigger emergency. Please try again or call 911.');
        }
    };

    const codes = [
        { code: 'Blue', label: 'Medical Emergency', color: '#00AEEF', textColor: 'white', icon: <AlertTriangle size={32} /> },
        { code: 'Pink', label: 'Child Abduction', color: '#EC008C', textColor: 'white', icon: <Baby size={32} /> },
        { code: 'Red', label: 'Fire', color: '#ED1C24', textColor: 'white', icon: <Flame size={32} /> },
        { code: 'Yellow', label: 'Disaster', color: '#FFF200', textColor: 'black', icon: <Users size={32} /> },
        { code: 'Violet', label: 'Violence', color: '#9E005D', textColor: 'white', icon: <ShieldAlert size={32} /> },
        { code: 'MTP', label: 'Massive Transfusion', color: '#dc3545', textColor: 'white', icon: <Zap size={32} />, action: 'mtp' },
    ];

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="bg-dark text-white border-0">
                <Modal.Title className="fw-bold text-danger d-flex align-items-center gap-2">
                    <AlertTriangle size={28} /> EMERGENCY TRIGGER
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="bg-dark p-4">
                <p className="text-white-50 text-center mb-4">Select the type of emergency to broadcast immediately.</p>
                <Row className="g-3">
                    {codes.map((item) => (
                        <Col key={item.code} md={4} sm={6}>
                            <Button
                                className="w-100 h-100 p-4 d-flex flex-column align-items-center justify-content-center border-0 shadow-lg hover-scale"
                                style={{
                                    backgroundColor: item.color,
                                    color: item.textColor,
                                    minHeight: '150px',
                                    transition: 'transform 0.2s'
                                }}
                                onClick={() => item.action === 'mtp' ? handleMTPClick() : triggerEmergency(item.code, item.color)}
                            >
                                <div className="mb-2">{item.icon}</div>
                                <div className="fs-3 fw-bold">CODE {item.code.toUpperCase()}</div>
                                <div className="small opacity-75">{item.label}</div>
                            </Button>
                        </Col>
                    ))}
                </Row>
            </Modal.Body>
            
            {/* MTP Modal */}
            <EmergencyBloodRelease 
                show={showMTP} 
                onHide={() => setShowMTP(false)} 
                patient={null} // Allow manual entry
                onSuccess={onHide}
            />
        </Modal>
    );
};

export default EmergencyTriggerModal;
