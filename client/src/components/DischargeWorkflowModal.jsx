import React, { useState } from 'react';
import { Modal, Form, Button, Row, Col, Badge, Alert, Card, ListGroup, ProgressBar } from 'react-bootstrap';
import { ClipboardCheck, CheckCircle, AlertTriangle, Calendar, Pill, FileText, CreditCard, User, UserCheck } from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * DischargeWorkflowModal - Structured discharge planning
 * 
 * Ensures all discharge requirements are met before releasing patient:
 * - Outstanding payments cleared
 * - Medications reconciled
 * - Follow-up appointments scheduled
 * - Discharge summary completed
 * - Patient education done
 */

const DISCHARGE_CHECKLIST = [
    { id: 'bills', label: 'All bills cleared', icon: CreditCard, category: 'Finance' },
    { id: 'meds', label: 'Discharge medications prepared', icon: Pill, category: 'Pharmacy' },
    { id: 'summary', label: 'Discharge summary completed', icon: FileText, category: 'Clinical' },
    { id: 'followup', label: 'Follow-up appointment scheduled', icon: Calendar, category: 'Clinical' },
    { id: 'education', label: 'Patient/Family education done', icon: UserCheck, category: 'Nursing' },
    { id: 'vitals', label: 'Final vitals recorded', icon: CheckCircle, category: 'Nursing' },
    { id: 'belongings', label: 'Patient belongings returned', icon: User, category: 'Admin' },
];

const DischargeWorkflowModal = ({ show, onHide, admission, onDischargeComplete }) => {
    const [checklist, setChecklist] = useState(
        DISCHARGE_CHECKLIST.reduce((acc, item) => ({ ...acc, [item.id]: false }), {})
    );
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [followUpDate, setFollowUpDate] = useState('');
    const [dischargeNotes, setDischargeNotes] = useState('');
    const [dischargeType, setDischargeType] = useState('Normal');

    // Calculate progress
    const completedCount = Object.values(checklist).filter(Boolean).length;
    const progress = Math.round((completedCount / DISCHARGE_CHECKLIST.length) * 100);
    const allComplete = completedCount === DISCHARGE_CHECKLIST.length;

    const handleToggle = (id) => {
        setChecklist({ ...checklist, [id]: !checklist[id] });
    };

    const handleSubmit = async () => {
        if (!allComplete) {
            setError('Please complete all checklist items before discharge');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            
            await axios.post(`${API}/api/admissions/discharge`, {
                admission_id: admission.admission_id,
                discharge_type: dischargeType,
                discharge_notes: dischargeNotes,
                follow_up_date: followUpDate || null,
                checklist_completed: checklist
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSuccess('Patient discharged successfully!');
            setTimeout(() => {
                onDischargeComplete?.();
                handleClose();
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Discharge failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setChecklist(DISCHARGE_CHECKLIST.reduce((acc, item) => ({ ...acc, [item.id]: false }), {}));
        setError('');
        setSuccess('');
        setFollowUpDate('');
        setDischargeNotes('');
        setDischargeType('Normal');
        onHide();
    };

    if (!admission) return null;

    return (
        <Modal show={show} onHide={handleClose} fullscreen={true} aria-labelledby="discharge-workflow-modal">
            <Modal.Header closeButton className="bg-success text-white">
                <Modal.Title className="d-flex align-items-center">
                    <ClipboardCheck size={20} className="me-2" />
                    Discharge Workflow - {admission.patient_name}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
                {success && <Alert variant="success"><CheckCircle size={16} className="me-1" />{success}</Alert>}

                {/* Patient Info Card */}
                <Card className="mb-3 border-0 bg-light">
                    <Card.Body className="py-2">
                        <Row>
                            <Col md={4}>
                                <small className="text-muted">Patient</small>
                                <div className="fw-bold">{admission.patient_name}</div>
                            </Col>
                            <Col md={4}>
                                <small className="text-muted">Ward / Bed</small>
                                <div className="fw-bold">{admission.ward} - Bed {admission.bed_number}</div>
                            </Col>
                            <Col md={4}>
                                <small className="text-muted">Admitted</small>
                                <div className="fw-bold">{new Date(admission.admitted_at).toLocaleDateString()}</div>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                {/* Progress Bar */}
                <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-bold">Discharge Readiness</span>
                        <span className={progress === 100 ? 'text-success fw-bold' : 'text-warning'}>
                            {completedCount}/{DISCHARGE_CHECKLIST.length} items
                        </span>
                    </div>
                    <ProgressBar 
                        now={progress} 
                        variant={progress === 100 ? 'success' : progress >= 50 ? 'warning' : 'danger'}
                        label={`${progress}%`}
                    />
                </div>

                {/* Discharge Checklist */}
                <Card className="mb-3">
                    <Card.Header className="py-2 bg-white fw-bold">
                        <ClipboardCheck size={16} className="me-2" />
                        Discharge Checklist
                    </Card.Header>
                    <ListGroup variant="flush">
                        {DISCHARGE_CHECKLIST.map(item => {
                            const Icon = item.icon;
                            return (
                                <ListGroup.Item 
                                    key={item.id}
                                    action
                                    onClick={() => handleToggle(item.id)}
                                    className="d-flex justify-content-between align-items-center py-2"
                                >
                                    <div className="d-flex align-items-center">
                                        <Form.Check
                                            type="checkbox"
                                            checked={checklist[item.id]}
                                            onChange={() => handleToggle(item.id)}
                                            className="me-3"
                                        />
                                        <Icon size={16} className="me-2 text-muted" />
                                        <span>{item.label}</span>
                                    </div>
                                    <Badge bg="secondary" className="small">{item.category}</Badge>
                                </ListGroup.Item>
                            );
                        })}
                    </ListGroup>
                </Card>

                <Row>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small">Discharge Type</Form.Label>
                            <Form.Select 
                                value={dischargeType}
                                onChange={(e) => setDischargeType(e.target.value)}
                                size="sm"
                            >
                                <option value="Normal">Normal Discharge</option>
                                <option value="Against Medical Advice">Against Medical Advice (AMA)</option>
                                <option value="Transfer">Transfer to Another Facility</option>
                                <option value="LAMA">Left Against Medical Advice</option>
                                <option value="Absconded">Absconded</option>
                                <option value="Death">Death</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold small">Follow-up Date</Form.Label>
                            <Form.Control
                                type="date"
                                value={followUpDate}
                                onChange={(e) => setFollowUpDate(e.target.value)}
                                size="sm"
                                min={new Date().toISOString().split('T')[0]}
                            />
                        </Form.Group>
                    </Col>
                </Row>

                <Form.Group className="mb-3">
                    <Form.Label className="fw-bold small">Discharge Notes</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={2}
                        placeholder="Any additional instructions or notes..."
                        value={dischargeNotes}
                        onChange={(e) => setDischargeNotes(e.target.value)}
                        size="sm"
                    />
                </Form.Group>

                {dischargeType !== 'Normal' && (
                    <Alert variant="warning" className="py-2 small">
                        <AlertTriangle size={14} className="me-1" />
                        Non-normal discharge type selected. Ensure proper documentation is completed.
                    </Alert>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
                <Button 
                    variant="success" 
                    size="sm"
                    onClick={handleSubmit} 
                    disabled={!allComplete || submitting}
                >
                    {submitting ? 'Processing...' : <><CheckCircle size={14} className="me-1" /> Complete Discharge</>}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default DischargeWorkflowModal;
