import React, { useState } from 'react';
import { Modal, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { Pill, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../utils/axiosInstance';

const PharmacyRequestModal = ({ show, onHide, admissions = [] }) => {
    const [requestType, setRequestType] = useState('Patient'); // 'Patient' or 'Stock'
    const [selectedPatient, setSelectedPatient] = useState('');
    const [drugName, setDrugName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [priority, setPriority] = useState('Routine');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // { type: 'success'|'error', msg: '' }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            const token = localStorage.getItem('token');
            const admission = admissions.find(a => a.patient_name === selectedPatient);

            // Payload structure depends on whether we have a dedicated Pharmacy Order table.
            // For now, we log it as a Clinical Task for the Pharmacy/Nurse workflow.
            const taskPayload = {
                admission_id: requestType === 'Patient' ? admission?.admission_id : null,
                type: 'Pharmacy Request',
                description: `${priority.toUpperCase()}: Request for ${drugName} (Qty: ${quantity}) - ${requestType}`,
                status: 'Pending',
                scheduled_time: new Date().toISOString(),
                notes: `Priority: ${priority}. Requested by Nurse.`
            };

            // Using existing clinical tasks endpoint as a bridge
            await api.post('/api/clinical/tasks', taskPayload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setStatus({ type: 'success', msg: 'Request sent to Pharmacy successfully!' });
            
            // Reset form partially
            setDrugName('');
            setQuantity('');
            setTimeout(() => {
                onHide();
                setStatus(null);
            }, 1500);

        } catch (err) {
            console.error('Pharmacy request error:', err);
            setStatus({ type: 'error', msg: 'Failed to send request. Please try again.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title className="d-flex align-items-center gap-2">
                    <Pill size={20} /> Pharmacy Request
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

                    <Form.Group className="mb-3">
                        <Form.Label>Request Type</Form.Label>
                        <div className="d-flex gap-3">
                            <Form.Check 
                                type="radio" 
                                label="For Patient" 
                                checked={requestType === 'Patient'} 
                                onChange={() => setRequestType('Patient')}
                            />
                            <Form.Check 
                                type="radio" 
                                label="Ward Stock Refill" 
                                checked={requestType === 'Stock'} 
                                onChange={() => setRequestType('Stock')}
                            />
                        </div>
                    </Form.Group>

                    {requestType === 'Patient' && (
                        <Form.Group className="mb-3">
                            <Form.Label>Select Patient *</Form.Label>
                            <Form.Select 
                                value={selectedPatient} 
                                onChange={(e) => setSelectedPatient(e.target.value)}
                                required
                            >
                                <option value="">-- Select Patient --</option>
                                {admissions.map(adm => (
                                    <option key={adm.admission_id} value={adm.patient_name}>
                                        {adm.bed_number} - {adm.patient_name}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    )}

                    <Row>
                        <Col md={8}>
                            <Form.Group className="mb-3">
                                <Form.Label>Drug Name / Item *</Form.Label>
                                <Form.Control 
                                    value={drugName}
                                    onChange={(e) => setDrugName(e.target.value)}
                                    placeholder="e.g. Paracetamol IV"
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <Form.Label>Quantity *</Form.Label>
                                <Form.Control 
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    placeholder="e.g. 5 vials"
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>Priority</Form.Label>
                        <Form.Select 
                            value={priority} 
                            onChange={(e) => setPriority(e.target.value)}
                        >
                            <option value="Routine">Routine</option>
                            <option value="Urgent">Urgent</option>
                            <option value="STAT">STAT (Emergency)</option>
                        </Form.Select>
                    </Form.Group>

                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>Cancel</Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? 'Sending...' : 'Send Request'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default PharmacyRequestModal;
