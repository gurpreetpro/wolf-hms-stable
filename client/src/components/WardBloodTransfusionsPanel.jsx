import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Alert, Spinner, Modal, Form, Row, Col } from 'react-bootstrap';
import { Droplet, CheckCircle, Clock, User, RefreshCw, AlertTriangle, Activity } from 'lucide-react';
import api from '../utils/axiosInstance';

/**
 * WardBloodTransfusionsPanel - Shows blood transfusion orders for nurses
 * Displays pending blood requests and allows tracking of transfusion administration
 */
const WardBloodTransfusionsPanel = ({ wardFilter = 'All', onTransfusionComplete }) => {
    const [transfusions, setTransfusions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processing, setProcessing] = useState(null);
    const [showChecklistModal, setShowChecklistModal] = useState(false);
    const [selectedTransfusion, setSelectedTransfusion] = useState(null);
    
    // Transfusion checklist form
    const [checklist, setChecklist] = useState({
        patient_verified: false,
        blood_verified: false,
        vitals_recorded: false,
        consent_obtained: false,
        iv_line_checked: false,
        bp: '',
        pulse: '',
        temp: '',
        notes: ''
    });

    // Fetch pending blood transfusions
    const fetchTransfusions = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await api.get('/api/blood-bank/requests', {
                headers: { Authorization: `Bearer ${token}` },
                params: { status: 'Approved' }
            });
            
            const data = res.data?.data || res.data;
            setTransfusions(data.requests || []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch blood transfusions:', err);
            setError('Failed to load blood transfusions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTransfusions();
        // Refresh every 30 seconds
        const interval = setInterval(fetchTransfusions, 30000);
        return () => clearInterval(interval);
    }, []);

    const openChecklist = (transfusion) => {
        setSelectedTransfusion(transfusion);
        setChecklist({
            patient_verified: false,
            blood_verified: false,
            vitals_recorded: false,
            consent_obtained: false,
            iv_line_checked: false,
            bp: '',
            pulse: '',
            temp: '',
            notes: ''
        });
        setShowChecklistModal(true);
    };

    const handleStartTransfusion = async () => {
        if (!checklist.patient_verified || !checklist.blood_verified || !checklist.vitals_recorded) {
            alert('Please complete all required checklist items before starting transfusion.');
            return;
        }

        try {
            setProcessing(selectedTransfusion.id);
            const token = localStorage.getItem('token');
            await api.post('/api/blood-bank/transfusion/start', {
                request_id: selectedTransfusion.id,
                checklist: checklist,
                vitals: {
                    bp: checklist.bp,
                    pulse: checklist.pulse,
                    temp: checklist.temp
                }
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setShowChecklistModal(false);
            fetchTransfusions();
            onTransfusionComplete?.();
        } catch (err) {
            console.error('Failed to start transfusion:', err);
            alert(err.response?.data?.message || 'Failed to start transfusion');
        } finally {
            setProcessing(null);
        }
    };

    const handleCompleteTransfusion = async (transfusionId) => {
        try {
            setProcessing(transfusionId);
            const token = localStorage.getItem('token');
            await api.post('/api/blood-bank/transfusion/complete', {
                request_id: transfusionId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            fetchTransfusions();
            onTransfusionComplete?.();
        } catch (err) {
            console.error('Failed to complete transfusion:', err);
            alert(err.response?.data?.message || 'Failed to complete transfusion');
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

    // Filter by ward if specified
    const filteredTransfusions = wardFilter === 'All' 
        ? transfusions 
        : transfusions.filter(t => t.ward === wardFilter || t.department === wardFilter);

    if (loading) {
        return (
            <Card className="shadow-sm border-0">
                <Card.Body className="text-center py-4">
                    <Spinner animation="border" variant="danger" size="sm" />
                    <p className="text-muted mt-2 mb-0">Loading blood transfusions...</p>
                </Card.Body>
            </Card>
        );
    }

    if (error) {
        return (
            <Alert variant="danger" className="d-flex align-items-center justify-content-between">
                <span>{error}</span>
                <Button variant="outline-danger" size="sm" onClick={fetchTransfusions}>
                    <RefreshCw size={14} className="me-1" /> Retry
                </Button>
            </Alert>
        );
    }

    return (
        <>
            <Card className="shadow-sm border-0">
                <Card.Header className="bg-danger text-white d-flex justify-content-between align-items-center">
                    <span>
                        <Droplet size={18} className="me-2" />
                        Blood Transfusions ({filteredTransfusions.length} pending)
                    </span>
                    <Button variant="light" size="sm" onClick={fetchTransfusions}>
                        <RefreshCw size={14} className="me-1" /> Refresh
                    </Button>
                </Card.Header>
                <Card.Body className="p-0">
                    {filteredTransfusions.length === 0 ? (
                        <div className="text-center py-4 text-muted">
                            <CheckCircle size={32} className="mb-2 text-success" />
                            <p className="mb-0">No pending blood transfusions</p>
                        </div>
                    ) : (
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="table-light">
                                <tr>
                                    <th>Patient</th>
                                    <th>Bed</th>
                                    <th>Blood Group</th>
                                    <th>Units</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransfusions.map(t => (
                                    <tr key={t.id}>
                                        <td>
                                            <User size={14} className="me-1 text-muted" />
                                            <strong>{t.patient_name}</strong>
                                        </td>
                                        <td><Badge bg="dark">{t.bed_number || 'N/A'}</Badge></td>
                                        <td><Badge bg="danger">{t.blood_group_required}</Badge></td>
                                        <td>{t.units_issued || 0}/{t.units_required}</td>
                                        <td>{getPriorityBadge(t.priority)}</td>
                                        <td>
                                            {t.transfusion_status === 'In Progress' ? (
                                                <Badge bg="info"><Activity size={12} className="me-1" /> In Progress</Badge>
                                            ) : (
                                                <Badge bg="warning"><Clock size={12} className="me-1" /> Ready</Badge>
                                            )}
                                        </td>
                                        <td>
                                            {t.transfusion_status === 'In Progress' ? (
                                                <Button 
                                                    variant="success" 
                                                    size="sm"
                                                    onClick={() => handleCompleteTransfusion(t.id)}
                                                    disabled={processing === t.id}
                                                >
                                                    {processing === t.id ? 'Processing...' : (
                                                        <><CheckCircle size={14} className="me-1" /> Complete</>
                                                    )}
                                                </Button>
                                            ) : (
                                                <Button 
                                                    variant="danger" 
                                                    size="sm"
                                                    onClick={() => openChecklist(t)}
                                                >
                                                    <Droplet size={14} className="me-1" /> Start Transfusion
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            {/* Transfusion Checklist Modal */}
            <Modal show={showChecklistModal} onHide={() => setShowChecklistModal(false)} size="lg" centered>
                <Modal.Header closeButton className="bg-danger text-white">
                    <Modal.Title><Droplet size={20} className="me-2" /> Pre-Transfusion Checklist</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedTransfusion && (
                        <>
                            <Alert variant="info">
                                <strong>Patient:</strong> {selectedTransfusion.patient_name} | 
                                <strong className="ms-2">Blood:</strong> {selectedTransfusion.blood_group_required} | 
                                <strong className="ms-2">Units:</strong> {selectedTransfusion.units_required}
                            </Alert>

                            <h6 className="fw-bold mb-3">
                                <AlertTriangle size={16} className="me-2 text-warning" />
                                Safety Verification (All Required)
                            </h6>
                            
                            <Form.Check 
                                type="checkbox"
                                label="Patient identification verified (wristband, verbal confirmation)"
                                checked={checklist.patient_verified}
                                onChange={e => setChecklist({...checklist, patient_verified: e.target.checked})}
                                className="mb-2"
                            />
                            <Form.Check 
                                type="checkbox"
                                label="Blood product verified (unit label matches request, expiry checked)"
                                checked={checklist.blood_verified}
                                onChange={e => setChecklist({...checklist, blood_verified: e.target.checked})}
                                className="mb-2"
                            />
                            <Form.Check 
                                type="checkbox"
                                label="Patient consent obtained and documented"
                                checked={checklist.consent_obtained}
                                onChange={e => setChecklist({...checklist, consent_obtained: e.target.checked})}
                                className="mb-2"
                            />
                            <Form.Check 
                                type="checkbox"
                                label="IV line patency checked"
                                checked={checklist.iv_line_checked}
                                onChange={e => setChecklist({...checklist, iv_line_checked: e.target.checked})}
                                className="mb-3"
                            />

                            <h6 className="fw-bold mb-3">Pre-Transfusion Vitals</h6>
                            <Row className="g-3">
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Blood Pressure *</Form.Label>
                                        <Form.Control 
                                            placeholder="120/80"
                                            value={checklist.bp}
                                            onChange={e => setChecklist({...checklist, bp: e.target.value})}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Pulse (bpm) *</Form.Label>
                                        <Form.Control 
                                            type="number"
                                            placeholder="72"
                                            value={checklist.pulse}
                                            onChange={e => setChecklist({...checklist, pulse: e.target.value})}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Temperature (°F) *</Form.Label>
                                        <Form.Control 
                                            type="number"
                                            step="0.1"
                                            placeholder="98.6"
                                            value={checklist.temp}
                                            onChange={e => setChecklist({...checklist, temp: e.target.value})}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Form.Check 
                                type="checkbox"
                                label="Vitals recorded above"
                                checked={checklist.vitals_recorded}
                                onChange={e => setChecklist({...checklist, vitals_recorded: e.target.checked})}
                                className="mt-3"
                            />

                            <Form.Group className="mt-3">
                                <Form.Label>Notes</Form.Label>
                                <Form.Control 
                                    as="textarea"
                                    rows={2}
                                    placeholder="Any observations or concerns..."
                                    value={checklist.notes}
                                    onChange={e => setChecklist({...checklist, notes: e.target.value})}
                                />
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowChecklistModal(false)}>Cancel</Button>
                    <Button 
                        variant="danger" 
                        onClick={handleStartTransfusion}
                        disabled={!checklist.patient_verified || !checklist.blood_verified || !checklist.vitals_recorded || processing}
                    >
                        {processing ? 'Starting...' : <><Droplet size={16} className="me-1" /> Start Transfusion</>}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default WardBloodTransfusionsPanel;
