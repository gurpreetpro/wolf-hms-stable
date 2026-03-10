import React, { useState } from 'react';
import { Modal, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { Brush, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../utils/axiosInstance';

const HousekeepingRequestModal = ({ show, onHide, defaultLocation = '' }) => {
    const [type, setType] = useState('Cleaning'); // Cleaning, Repair, Spill, Inspection
    const [location, setLocation] = useState(defaultLocation);
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('Routine');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            const token = localStorage.getItem('token');
            
            await api.post('/api/housekeeping', {
                type,
                location,
                description,
                priority
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setStatus({ type: 'success', msg: 'Cleaning/Maintenance request sent!' });
            
            // Reset
            setDescription('');
            setTimeout(() => {
                onHide();
                setStatus(null);
            }, 1500);

        } catch (err) {
            console.error('Housekeeping request error:', err);
            setStatus({ type: 'error', msg: 'Failed to send request. Try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton className="bg-info-subtle">
                <Modal.Title className="d-flex align-items-center gap-2">
                    <Brush size={20} /> Request Cleaning / Maintenance
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {status && (
                        <Alert variant={status.type === 'success' ? 'success' : 'danger'}>
                            {status.type === 'success' ? <CheckCircle size={16} className="me-2"/> : <AlertCircle size={16} className="me-2"/>}
                            {status.msg}
                        </Alert>
                    )}

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Request Type</Form.Label>
                                <Form.Select 
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                >
                                    <option value="Cleaning">General Cleaning</option>
                                    <option value="Spill">Spill (Urgent)</option>
                                    <option value="Repair">Repair / Maintenance</option>
                                    <option value="Inspection">Inspection Request</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Priority</Form.Label>
                                <Form.Select 
                                    value={priority} 
                                    onChange={(e) => setPriority(e.target.value)}
                                    className={priority === 'Method' ? 'text-danger fw-bold' : ''}
                                >
                                    <option value="Routine">Routine</option>
                                    <option value="Urgent">Urgent</option>
                                    <option value="STAT">STAT (Immediate Risk)</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>Location *</Form.Label>
                        <Form.Control 
                            placeholder="e.g. Ward A, Bed 05, Bathroom"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            required
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Description / Details</Form.Label>
                        <Form.Control 
                            as="textarea"
                            rows={3}
                            placeholder="Describe what needs cleaning or checking..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </Form.Group>

                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>Cancel</Button>
                    <Button variant="info" type="submit" disabled={loading} className="text-white">
                        {loading ? 'Sending...' : 'Send Request'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default HousekeepingRequestModal;
