import { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Alert, Spinner, ProgressBar, Form, Modal, Row, Col } from 'react-bootstrap';
import { Activity, Droplet, Clock, AlertTriangle, CheckCircle, Thermometer } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';

export default function TransfusionMonitor({ wardId }) {
    const [loading, setLoading] = useState(true);
    const [transfusions, setTransfusions] = useState([]);
    const [selectedTransfusion, setSelectedTransfusion] = useState(null);
    const [showVitalsModal, setShowVitalsModal] = useState(false);
    const [showReactionModal, setShowReactionModal] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchActiveTransfusions();
        const interval = setInterval(fetchActiveTransfusions, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [wardId]);

    const fetchActiveTransfusions = async () => {
        try {
            const res = await axiosInstance.get('/blood-bank/transfusions/active');
            setTransfusions(res.data.transfusions || []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch transfusions:', err);
            setError('Failed to load active transfusions');
        } finally {
            setLoading(false);
        }
    };

    const calculateProgress = (transfusion) => {
        const start = new Date(transfusion.start_time);
        const now = new Date();
        const elapsed = (now - start) / (1000 * 60); // minutes
        const rate = transfusion.rate_ml_per_hour || 100;
        const volume = transfusion.volume_ml || 350;
        const expectedMinutes = (volume / rate) * 60;
        return Math.min(100, Math.round((elapsed / expectedMinutes) * 100));
    };

    const getVitalsStatus = (transfusion) => {
        const start = new Date(transfusion.start_time);
        const now = new Date();
        const elapsed = (now - start) / (1000 * 60); // minutes

        if (elapsed >= 60 && !transfusion.vitals_1hour) return { due: '1-hour', variant: 'danger' };
        if (elapsed >= 30 && !transfusion.vitals_30min) return { due: '30-min', variant: 'warning' };
        if (elapsed >= 15 && !transfusion.vitals_15min) return { due: '15-min', variant: 'info' };
        return { due: null, variant: 'success' };
    };

    if (loading) {
        return (
            <Card className="border-0 shadow-sm">
                <Card.Body className="text-center py-4">
                    <Spinner animation="border" variant="danger" />
                    <p className="mt-2 text-muted">Loading active transfusions...</p>
                </Card.Body>
            </Card>
        );
    }

    return (
        <>
            <Card className="border-0 shadow-sm">
                <Card.Header className="bg-danger text-white d-flex align-items-center justify-content-between">
                    <div>
                        <Droplet size={18} className="me-2" />
                        <span className="fw-bold">Active Transfusions</span>
                    </div>
                    <Badge bg="light" text="danger">{transfusions.length}</Badge>
                </Card.Header>
                <Card.Body className="p-0">
                    {error && <Alert variant="danger" className="m-3">{error}</Alert>}
                    
                    {transfusions.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <Activity size={40} className="mb-2 opacity-50" />
                            <p>No active transfusions</p>
                        </div>
                    ) : (
                        <Table hover className="mb-0">
                            <thead className="table-light">
                                <tr>
                                    <th>Patient</th>
                                    <th>Blood</th>
                                    <th>Progress</th>
                                    <th>Vitals</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transfusions.map(t => {
                                    const progress = calculateProgress(t);
                                    const vitalsStatus = getVitalsStatus(t);
                                    
                                    return (
                                        <tr key={t.id}>
                                            <td>
                                                <div className="fw-bold">{t.patient_name || 'Patient'}</div>
                                                <small className="text-muted">Bed: {t.bed_number || '-'}</small>
                                            </td>
                                            <td>
                                                <Badge bg="danger">{t.blood_group}</Badge>
                                                <div><small>{t.component_name || 'Blood'}</small></div>
                                            </td>
                                            <td style={{ width: '150px' }}>
                                                <ProgressBar 
                                                    now={progress} 
                                                    variant={progress > 80 ? 'success' : 'danger'}
                                                    label={`${progress}%`}
                                                />
                                                <small className="text-muted">
                                                    <Clock size={10} className="me-1" />
                                                    {new Date(t.start_time).toLocaleTimeString()}
                                                </small>
                                            </td>
                                            <td>
                                                {vitalsStatus.due ? (
                                                    <Badge bg={vitalsStatus.variant}>
                                                        {vitalsStatus.due} DUE
                                                    </Badge>
                                                ) : (
                                                    <Badge bg="success">
                                                        <CheckCircle size={12} className="me-1" />
                                                        OK
                                                    </Badge>
                                                )}
                                            </td>
                                            <td>
                                                <Button
                                                    size="sm"
                                                    variant="outline-primary"
                                                    className="me-1"
                                                    onClick={() => {
                                                        setSelectedTransfusion(t);
                                                        setShowVitalsModal(true);
                                                    }}
                                                >
                                                    <Thermometer size={14} />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline-danger"
                                                    onClick={() => {
                                                        setSelectedTransfusion(t);
                                                        setShowReactionModal(true);
                                                    }}
                                                >
                                                    <AlertTriangle size={14} />
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>

            {/* Vitals Modal */}
            <VitalsRecordModal
                show={showVitalsModal}
                onHide={() => setShowVitalsModal(false)}
                transfusion={selectedTransfusion}
                onSuccess={fetchActiveTransfusions}
            />

            {/* Reaction Modal */}
            <ReactionReportModal
                show={showReactionModal}
                onHide={() => setShowReactionModal(false)}
                transfusion={selectedTransfusion}
                onSuccess={fetchActiveTransfusions}
            />
        </>
    );
}

// Vitals Recording Modal
function VitalsRecordModal({ show, onHide, transfusion, onSuccess }) {
    const [submitting, setSubmitting] = useState(false);
    const [vitals, setVitals] = useState({
        temperature: '',
        blood_pressure_systolic: '',
        blood_pressure_diastolic: '',
        pulse: '',
        spo2: '',
        symptoms: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!transfusion) return;

        setSubmitting(true);
        try {
            // Determine which vitals interval this is
            const start = new Date(transfusion.start_time);
            const now = new Date();
            const elapsed = (now - start) / (1000 * 60);

            let vitalsField = 'vitals_15min';
            if (elapsed >= 60) vitalsField = 'vitals_1hour';
            else if (elapsed >= 30) vitalsField = 'vitals_30min';

            await axiosInstance.put(`/blood-bank/transfusions/${transfusion.id}/vitals`, {
                [vitalsField]: vitals
            });

            onSuccess?.();
            onHide();
        } catch (err) {
            console.error('Failed to record vitals:', err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title>
                    <Thermometer size={18} className="me-2" />
                    Record Vitals
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Temperature (°F)</Form.Label>
                                <Form.Control
                                    type="number"
                                    step="0.1"
                                    value={vitals.temperature}
                                    onChange={e => setVitals(p => ({ ...p, temperature: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Pulse (bpm)</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={vitals.pulse}
                                    onChange={e => setVitals(p => ({ ...p, pulse: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>BP Systolic</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={vitals.blood_pressure_systolic}
                                    onChange={e => setVitals(p => ({ ...p, blood_pressure_systolic: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>BP Diastolic</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={vitals.blood_pressure_diastolic}
                                    onChange={e => setVitals(p => ({ ...p, blood_pressure_diastolic: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>SpO2 (%)</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={vitals.spo2}
                                    onChange={e => setVitals(p => ({ ...p, spo2: e.target.value }))}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Form.Group className="mt-3">
                        <Form.Label>Any Symptoms?</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={vitals.symptoms}
                            onChange={e => setVitals(p => ({ ...p, symptoms: e.target.value }))}
                            placeholder="Note any symptoms..."
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>Cancel</Button>
                    <Button type="submit" variant="primary" disabled={submitting}>
                        {submitting ? 'Saving...' : 'Save Vitals'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}

// Reaction Report Modal
function ReactionReportModal({ show, onHide, transfusion, onSuccess }) {
    const [submitting, setSubmitting] = useState(false);
    const [data, setData] = useState({
        reaction_type: '',
        severity: 'Mild',
        symptoms: '',
        management_given: ''
    });

    const REACTION_TYPES = [
        'Allergic', 'Febrile', 'Hemolytic', 'TRALI', 'TACO', 'Anaphylactic', 'Other'
    ];
    const SEVERITIES = ['Mild', 'Moderate', 'Severe', 'Life-threatening'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!transfusion) return;

        setSubmitting(true);
        try {
            await axiosInstance.post('/blood-bank/reactions', {
                transfusion_id: transfusion.id,
                unit_id: transfusion.unit_id,
                patient_id: transfusion.patient_id,
                ...data
            });

            onSuccess?.();
            onHide();
        } catch (err) {
            console.error('Failed to report reaction:', err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton className="bg-danger text-white">
                <Modal.Title>
                    <AlertTriangle size={18} className="me-2" />
                    Report Transfusion Reaction
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Reaction Type *</Form.Label>
                                <Form.Select
                                    value={data.reaction_type}
                                    onChange={e => setData(p => ({ ...p, reaction_type: e.target.value }))}
                                    required
                                >
                                    <option value="">Select...</option>
                                    {REACTION_TYPES.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Severity *</Form.Label>
                                <Form.Select
                                    value={data.severity}
                                    onChange={e => setData(p => ({ ...p, severity: e.target.value }))}
                                    required
                                >
                                    {SEVERITIES.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                    <Form.Group className="mt-3">
                        <Form.Label>Symptoms *</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={data.symptoms}
                            onChange={e => setData(p => ({ ...p, symptoms: e.target.value }))}
                            placeholder="Describe symptoms..."
                            required
                        />
                    </Form.Group>
                    <Form.Group className="mt-3">
                        <Form.Label>Management Given</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={data.management_given}
                            onChange={e => setData(p => ({ ...p, management_given: e.target.value }))}
                            placeholder="Actions taken..."
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>Cancel</Button>
                    <Button type="submit" variant="danger" disabled={submitting}>
                        {submitting ? 'Reporting...' : 'Report Reaction'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}
