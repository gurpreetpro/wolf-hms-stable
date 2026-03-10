import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Alert, Spinner, Modal, Form, Row, Col } from 'react-bootstrap';
import { Activity, CheckCircle, Clock, User, RefreshCw, AlertTriangle, Droplet, FlaskConical } from 'lucide-react';
import api from '../utils/axiosInstance';

/**
 * PreTransfusionTestPanel - Lab component for crossmatch and compatibility testing
 * Displays pending blood requests requiring pre-transfusion testing
 */
const PreTransfusionTestPanel = ({ onTestComplete }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(null);
    const [showTestModal, setShowTestModal] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    
    // Test results form
    const [testResults, setTestResults] = useState({
        patient_blood_type: '',
        patient_rh: '',
        antibody_screen: 'Negative',
        antibody_identified: '',
        crossmatch_method: 'Immediate Spin',
        crossmatch_result: 'Compatible',
        notes: ''
    });

    // Fetch pending blood requests requiring crossmatch
    const fetchRequests = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await api.get('/api/blood-bank/requests', {
                headers: { Authorization: `Bearer ${token}` },
                params: { status: 'Pending' }
            });
            
            const data = res.data?.data || res.data;
            setRequests(data.requests || []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch blood requests:', err);
            setError('Failed to load pending tests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
        // Refresh every 30 seconds
        const interval = setInterval(fetchRequests, 30000);
        return () => clearInterval(interval);
    }, []);

    const openTestModal = (request) => {
        setSelectedRequest(request);
        setTestResults({
            patient_blood_type: request.blood_group_required?.replace(/[+-]/g, '') || '',
            patient_rh: request.blood_group_required?.includes('+') ? 'Positive' : 'Negative',
            antibody_screen: 'Negative',
            antibody_identified: '',
            crossmatch_method: 'Immediate Spin',
            crossmatch_result: 'Compatible',
            notes: ''
        });
        setShowTestModal(true);
    };

    const handleSubmitResults = async () => {
        try {
            setProcessing(selectedRequest.id);
            const token = localStorage.getItem('token');
            
            // Record crossmatch result
            await api.post('/api/blood-bank/crossmatch', {
                request_id: selectedRequest.id,
                patient_id: selectedRequest.patient_id,
                ...testResults
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // If compatible, approve the request
            if (testResults.crossmatch_result === 'Compatible') {
                await api.put(`/api/blood-bank/requests/${selectedRequest.id}/process`, {
                    action: 'approve'
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            
            setShowTestModal(false);
            fetchRequests();
            onTestComplete?.();
        } catch (err) {
            console.error('Failed to record test results:', err);
            alert(err.response?.data?.message || 'Failed to record test results');
        } finally {
            setProcessing(null);
        }
    };

    const getPriorityBadge = (priority) => {
        const colors = {
            'Emergency': 'danger',
            'Urgent': 'warning',
            'Routine': 'secondary'
        };
        return <Badge bg={colors[priority] || 'secondary'}>{priority}</Badge>;
    };

    if (loading) {
        return (
            <Card className="shadow-sm border-0">
                <Card.Body className="text-center py-4">
                    <Spinner animation="border" variant="info" size="sm" />
                    <p className="text-muted mt-2 mb-0">Loading blood bank tests...</p>
                </Card.Body>
            </Card>
        );
    }

    if (error) {
        return (
            <Alert variant="danger" className="d-flex align-items-center justify-content-between">
                <span>{error}</span>
                <Button variant="outline-danger" size="sm" onClick={fetchRequests}>
                    <RefreshCw size={14} className="me-1" /> Retry
                </Button>
            </Alert>
        );
    }

    return (
        <>
            <Card className="shadow-sm border-0">
                <Card.Header className="bg-info text-white d-flex justify-content-between align-items-center">
                    <span>
                        <FlaskConical size={18} className="me-2" />
                        Pre-Transfusion Testing ({requests.length} pending)
                    </span>
                    <Button variant="light" size="sm" onClick={fetchRequests}>
                        <RefreshCw size={14} className="me-1" /> Refresh
                    </Button>
                </Card.Header>
                <Card.Body className="p-0">
                    {requests.length === 0 ? (
                        <div className="text-center py-4 text-muted">
                            <CheckCircle size={32} className="mb-2 text-success" />
                            <p className="mb-0">No pending crossmatch tests</p>
                        </div>
                    ) : (
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>Request ID</th>
                                    <th>Patient</th>
                                    <th>Blood Group</th>
                                    <th>Component</th>
                                    <th>Units</th>
                                    <th>Priority</th>
                                    <th>Requested</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {requests.map(r => (
                                    <tr key={r.id}>
                                        <td><code>{r.request_id}</code></td>
                                        <td>
                                            <User size={14} className="me-1 text-muted" />
                                            <strong>{r.patient_name}</strong>
                                        </td>
                                        <td><Badge bg="danger">{r.blood_group_required}</Badge></td>
                                        <td>{r.component_name || 'PRBC'}</td>
                                        <td>{r.units_required}</td>
                                        <td>{getPriorityBadge(r.priority)}</td>
                                        <td>
                                            <small className="text-muted">
                                                <Clock size={12} className="me-1" />
                                                {new Date(r.created_at).toLocaleString()}
                                            </small>
                                        </td>
                                        <td>
                                            <Button 
                                                variant="info" 
                                                size="sm"
                                                onClick={() => openTestModal(r)}
                                            >
                                                <Activity size={14} className="me-1" /> Perform Crossmatch
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            {/* Crossmatch Test Modal */}
            <Modal show={showTestModal} onHide={() => setShowTestModal(false)} size="lg" centered>
                <Modal.Header closeButton className="bg-info text-white">
                    <Modal.Title><FlaskConical size={20} className="me-2" /> Crossmatch Test Results</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedRequest && (
                        <>
                            <Alert variant="warning" className="d-flex align-items-center">
                                <AlertTriangle size={18} className="me-2" />
                                <div>
                                    <strong>Patient:</strong> {selectedRequest.patient_name} | 
                                    <strong className="ms-2">Requested:</strong> {selectedRequest.blood_group_required} | 
                                    <strong className="ms-2">Units:</strong> {selectedRequest.units_required}
                                </div>
                            </Alert>

                            <h6 className="fw-bold mb-3">
                                <Droplet size={16} className="me-2 text-danger" />
                                ABO/Rh Confirmation
                            </h6>
                            <Row className="g-3 mb-4">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Patient Blood Type</Form.Label>
                                        <Form.Select 
                                            value={testResults.patient_blood_type}
                                            onChange={e => setTestResults({...testResults, patient_blood_type: e.target.value})}
                                        >
                                            <option value="">Select</option>
                                            <option value="A">A</option>
                                            <option value="B">B</option>
                                            <option value="O">O</option>
                                            <option value="AB">AB</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Rh Factor</Form.Label>
                                        <Form.Select 
                                            value={testResults.patient_rh}
                                            onChange={e => setTestResults({...testResults, patient_rh: e.target.value})}
                                        >
                                            <option value="Positive">Positive (+)</option>
                                            <option value="Negative">Negative (-)</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>

                            <h6 className="fw-bold mb-3">Antibody Screen</h6>
                            <Row className="g-3 mb-4">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Antibody Screen Result</Form.Label>
                                        <Form.Select 
                                            value={testResults.antibody_screen}
                                            onChange={e => setTestResults({...testResults, antibody_screen: e.target.value})}
                                        >
                                            <option value="Negative">Negative</option>
                                            <option value="Positive">Positive</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                {testResults.antibody_screen === 'Positive' && (
                                    <Col md={6}>
                                        <Form.Group>
                                            <Form.Label>Antibody Identified</Form.Label>
                                            <Form.Control 
                                                placeholder="e.g., Anti-Kell, Anti-E"
                                                value={testResults.antibody_identified}
                                                onChange={e => setTestResults({...testResults, antibody_identified: e.target.value})}
                                            />
                                        </Form.Group>
                                    </Col>
                                )}
                            </Row>

                            <h6 className="fw-bold mb-3">Crossmatch</h6>
                            <Row className="g-3 mb-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Crossmatch Method</Form.Label>
                                        <Form.Select 
                                            value={testResults.crossmatch_method}
                                            onChange={e => setTestResults({...testResults, crossmatch_method: e.target.value})}
                                        >
                                            <option value="Immediate Spin">Immediate Spin</option>
                                            <option value="AHG">Anti-Human Globulin (AHG)</option>
                                            <option value="Electronic">Electronic Crossmatch</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Crossmatch Result</Form.Label>
                                        <Form.Select 
                                            value={testResults.crossmatch_result}
                                            onChange={e => setTestResults({...testResults, crossmatch_result: e.target.value})}
                                            className={testResults.crossmatch_result === 'Incompatible' ? 'border-danger' : ''}
                                        >
                                            <option value="Compatible">Compatible ✓</option>
                                            <option value="Incompatible">Incompatible ✗</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            </Row>

                            {testResults.crossmatch_result === 'Incompatible' && (
                                <Alert variant="danger">
                                    <AlertTriangle size={16} className="me-2" />
                                    Blood is INCOMPATIBLE. This request will be flagged and cannot be issued.
                                </Alert>
                            )}

                            <Form.Group className="mt-3">
                                <Form.Label>Lab Notes</Form.Label>
                                <Form.Control 
                                    as="textarea"
                                    rows={2}
                                    placeholder="Any additional observations..."
                                    value={testResults.notes}
                                    onChange={e => setTestResults({...testResults, notes: e.target.value})}
                                />
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowTestModal(false)}>Cancel</Button>
                    <Button 
                        variant={testResults.crossmatch_result === 'Compatible' ? 'success' : 'warning'}
                        onClick={handleSubmitResults}
                        disabled={!testResults.patient_blood_type || processing}
                    >
                        {processing ? 'Submitting...' : (
                            testResults.crossmatch_result === 'Compatible' 
                                ? <><CheckCircle size={16} className="me-1" /> Approve & Release</>
                                : <><AlertTriangle size={16} className="me-1" /> Record Incompatibility</>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default PreTransfusionTestPanel;
