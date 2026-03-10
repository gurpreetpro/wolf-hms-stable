import React, { useState } from 'react';
import { Modal, Form, Button, Row, Col, Badge, Alert, Table } from 'react-bootstrap';
import { Activity, Plus, Clock, Trash2 } from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Vital types
const VITAL_TYPES = [
    { value: 'BP', label: 'Blood Pressure', unit: 'mmHg' },
    { value: 'Temp', label: 'Temperature', unit: '°F' },
    { value: 'HR', label: 'Heart Rate', unit: 'bpm' },
    { value: 'SpO2', label: 'Oxygen Saturation', unit: '%' },
    { value: 'RR', label: 'Respiratory Rate', unit: '/min' },
    { value: 'All', label: 'Complete Vital Signs', unit: '' }
];

// Frequency options
const FREQ_OPTIONS = [
    { value: 'Once', label: 'Once (STAT)' },
    { value: 'Q1H', label: 'Every 1 Hour' },
    { value: 'Q2H', label: 'Every 2 Hours' },
    { value: 'Q4H', label: 'Every 4 Hours' },
    { value: 'Q6H', label: 'Every 6 Hours' },
    { value: 'Q8H', label: 'Every 8 Hours' },
    { value: 'TID', label: '3 Times Daily (TID)' },
    { value: 'BID', label: '2 Times Daily (BID)' },
    { value: 'QD', label: 'Once Daily' }
];

// Duration options
const DURATION_OPTIONS = [
    '4 hours', '8 hours', '12 hours', '24 hours', '48 hours', '72 hours', 'Until further notice'
];

const IPDVitalRequestModal = ({ show, onHide, admissionId, patientId, patientName, onVitalRequested }) => {
    const [requests, setRequests] = useState([]);
    const [currentRequest, setCurrentRequest] = useState({
        vital_type: 'BP',
        frequency: 'Q4H',
        duration: '24 hours',
        notes: ''
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleAddRequest = () => {
        if (!currentRequest.vital_type) return;
        setRequests([...requests, { ...currentRequest, id: Date.now() }]);
        setCurrentRequest({
            vital_type: 'BP',
            frequency: 'Q4H',
            duration: '24 hours',
            notes: ''
        });
    };

    const handleRemoveRequest = (id) => {
        setRequests(requests.filter(r => r.id !== id));
    };

    const handleSubmit = async () => {
        if (requests.length === 0) {
            // If no requests added but current form has data, use it
            if (currentRequest.vital_type) {
                setRequests([{ ...currentRequest, id: Date.now() }]);
            } else {
                setError('Please add at least one vital request');
                return;
            }
        }

        setSubmitting(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const requestsToSubmit = requests.length > 0 ? requests : [{ ...currentRequest, id: Date.now() }];
            
            for (const req of requestsToSubmit) {
                await axios.post(`${API}/api/clinical/request-vitals`, {
                    admission_id: admissionId,
                    patient_id: patientId,
                    vital_type: req.vital_type,
                    frequency: req.frequency,
                    duration: req.duration,
                    notes: req.notes
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            setSuccess(`${requestsToSubmit.length} vital monitoring request(s) submitted!`);
            setTimeout(() => {
                onVitalRequested?.();
                handleClose();
            }, 1000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit vital request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setRequests([]);
        setCurrentRequest({
            vital_type: 'BP',
            frequency: 'Q4H',
            duration: '24 hours',
            notes: ''
        });
        setError('');
        setSuccess('');
        onHide();
    };

    const getVitalLabel = (type) => VITAL_TYPES.find(v => v.value === type)?.label || type;
    const getFreqLabel = (freq) => FREQ_OPTIONS.find(f => f.value === freq)?.label || freq;

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton className="bg-success text-white">
                <Modal.Title className="d-flex align-items-center">
                    <Activity size={20} className="me-2" />
                    Request Vital Monitoring for {patientName}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                <Row className="mb-3">
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label className="fw-bold">Vital Type</Form.Label>
                            <Form.Select
                                value={currentRequest.vital_type}
                                onChange={e => setCurrentRequest({ ...currentRequest, vital_type: e.target.value })}
                            >
                                {VITAL_TYPES.map(v => (
                                    <option key={v.value} value={v.value}>{v.label}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label className="fw-bold">Frequency</Form.Label>
                            <Form.Select
                                value={currentRequest.frequency}
                                onChange={e => setCurrentRequest({ ...currentRequest, frequency: e.target.value })}
                            >
                                {FREQ_OPTIONS.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={4}>
                        <Form.Group>
                            <Form.Label className="fw-bold">Duration</Form.Label>
                            <Form.Select
                                value={currentRequest.duration}
                                onChange={e => setCurrentRequest({ ...currentRequest, duration: e.target.value })}
                            >
                                {DURATION_OPTIONS.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>

                <Row className="mb-3">
                    <Col md={9}>
                        <Form.Group>
                            <Form.Label className="fw-bold">Special Instructions (Optional)</Form.Label>
                            <Form.Control
                                placeholder="e.g., Alert if BP > 180/100, Monitor for bradycardia"
                                value={currentRequest.notes}
                                onChange={e => setCurrentRequest({ ...currentRequest, notes: e.target.value })}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={3} className="d-flex align-items-end">
                        <Button variant="outline-primary" onClick={handleAddRequest} className="w-100">
                            <Plus size={16} className="me-1" /> Add to List
                        </Button>
                    </Col>
                </Row>

                {/* Pending Requests Table */}
                {requests.length > 0 && (
                    <div className="border rounded p-2">
                        <h6 className="fw-bold mb-2">Pending Requests ({requests.length})</h6>
                        <Table size="sm" className="mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Vital</th>
                                    <th>Frequency</th>
                                    <th>Duration</th>
                                    <th>Notes</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(req => (
                                    <tr key={req.id}>
                                        <td><Badge bg="info">{getVitalLabel(req.vital_type)}</Badge></td>
                                        <td>{getFreqLabel(req.frequency)}</td>
                                        <td>{req.duration}</td>
                                        <td className="text-muted small">{req.notes || '-'}</td>
                                        <td>
                                            <Button 
                                                variant="link" 
                                                className="p-0 text-danger"
                                                onClick={() => handleRemoveRequest(req.id)}
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}

                <Alert variant="info" className="mt-3 small">
                    <Clock size={14} className="me-1" /> Nurses will receive these monitoring requests in their Ward Dashboard and record vitals at the specified intervals.
                </Alert>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                <Button 
                    variant="success" 
                    onClick={handleSubmit} 
                    disabled={submitting}
                >
                    {submitting ? 'Submitting...' : (
                        <>
                            <Plus size={16} className="me-1" />
                            Submit {requests.length > 0 ? requests.length : 1} Request(s)
                        </>
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default IPDVitalRequestModal;
