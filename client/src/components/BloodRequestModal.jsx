import { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Badge, Spinner } from 'react-bootstrap';
import { Droplet, AlertCircle, Clock, Plus } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const PRIORITIES = ['Routine', 'Urgent', 'Emergency'];

export default function BloodRequestModal({ show, onHide, patient, admissionId, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [componentTypes, setComponentTypes] = useState([]);
    const [patientBloodProfile, setPatientBloodProfile] = useState(null);
    const [error, setError] = useState(null);
    
    const [formData, setFormData] = useState({
        blood_group_required: '',
        component_type_id: 1,
        units_required: 1,
        priority: 'Routine',
        indication: '',
        diagnosis: '',
        hemoglobin_level: '',
        cross_match_required: true,
        urgency_notes: ''
    });

    useEffect(() => {
        if (show && patient?.id) {
            fetchData();
        }
    }, [show, patient?.id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch component types
            const typesRes = await axiosInstance.get('/blood-bank/component-types');
            setComponentTypes(typesRes.data.componentTypes || []);

            // Fetch patient blood profile
            try {
                const profileRes = await axiosInstance.get(`/blood-bank/patient/${patient.id}/blood-profile`);
                setPatientBloodProfile(profileRes.data);
                if (profileRes.data.patient?.blood_group) {
                    setFormData(prev => ({
                        ...prev,
                        blood_group_required: profileRes.data.patient.blood_group
                    }));
                }
            } catch (err) {
                console.log('No blood profile yet');
            }
        } catch (err) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            await axiosInstance.post('/blood-bank/requests', {
                patient_id: patient.id,
                admission_id: admissionId,
                department: 'Doctor Request',
                ...formData,
                component_type_id: parseInt(formData.component_type_id),
                units_required: parseInt(formData.units_required)
            });

            onSuccess?.();
            onHide();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create request');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="bg-danger text-white">
                <Modal.Title>
                    <Droplet size={20} className="me-2" />
                    Request Blood for {patient?.name}
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {loading ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" variant="danger" />
                        </div>
                    ) : (
                        <>
                            {error && <Alert variant="danger">{error}</Alert>}

                            {/* Patient Blood Info */}
                            {patientBloodProfile && (
                                <Alert variant="info" className="d-flex align-items-center">
                                    <div className="me-3">
                                        <strong>Patient Blood Group:</strong>{' '}
                                        <Badge bg="danger" className="fs-6">
                                            {patientBloodProfile.patient?.blood_group || 'Unknown'}
                                        </Badge>
                                    </div>
                                    {patientBloodProfile.summary?.total_reactions > 0 && (
                                        <Badge bg="warning" text="dark">
                                            <AlertCircle size={12} className="me-1" />
                                            Previous Reaction
                                        </Badge>
                                    )}
                                </Alert>
                            )}

                            <Row className="mb-3">
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Blood Group Required *</Form.Label>
                                        <Form.Select
                                            name="blood_group_required"
                                            value={formData.blood_group_required}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="">Select...</option>
                                            {BLOOD_GROUPS.map(g => (
                                                <option key={g} value={g}>{g}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Component *</Form.Label>
                                        <Form.Select
                                            name="component_type_id"
                                            value={formData.component_type_id}
                                            onChange={handleChange}
                                            required
                                        >
                                            {componentTypes.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={4}>
                                    <Form.Group>
                                        <Form.Label>Units Required *</Form.Label>
                                        <Form.Control
                                            type="number"
                                            name="units_required"
                                            value={formData.units_required}
                                            onChange={handleChange}
                                            min={1}
                                            max={10}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Row className="mb-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Priority *</Form.Label>
                                        <Form.Select
                                            name="priority"
                                            value={formData.priority}
                                            onChange={handleChange}
                                            required
                                        >
                                            {PRIORITIES.map(p => (
                                                <option key={p} value={p}>{p}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Hemoglobin Level (g/dL)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            step="0.1"
                                            name="hemoglobin_level"
                                            value={formData.hemoglobin_level}
                                            onChange={handleChange}
                                            placeholder="e.g., 8.5"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Row className="mb-3">
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Indication *</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={2}
                                            name="indication"
                                            value={formData.indication}
                                            onChange={handleChange}
                                            placeholder="Reason for transfusion..."
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group>
                                        <Form.Label>Diagnosis</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={2}
                                            name="diagnosis"
                                            value={formData.diagnosis}
                                            onChange={handleChange}
                                            placeholder="Patient diagnosis..."
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>

                            <Form.Group className="mb-3">
                                <Form.Check
                                    type="checkbox"
                                    name="cross_match_required"
                                    checked={formData.cross_match_required}
                                    onChange={handleChange}
                                    label="Cross-match required before transfusion"
                                />
                            </Form.Group>

                            {formData.priority === 'Emergency' && (
                                <Form.Group className="mb-3">
                                    <Form.Label>Urgency Notes</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={2}
                                        name="urgency_notes"
                                        value={formData.urgency_notes}
                                        onChange={handleChange}
                                        placeholder="Explain urgency..."
                                    />
                                </Form.Group>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>Cancel</Button>
                    <Button 
                        type="submit" 
                        variant="danger" 
                        disabled={submitting || loading}
                    >
                        {submitting ? (
                            <>
                                <Spinner size="sm" className="me-2" />
                                Requesting...
                            </>
                        ) : (
                            <>
                                <Plus size={16} className="me-1" />
                                Request Blood
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
}
