import React, { useState, useEffect } from 'react';
import { Tab, Form, Button, Row, Col, Badge, ListGroup, Alert, Card } from 'react-bootstrap';
import { Crosshair, AlertTriangle, Save } from 'lucide-react';
import api from '../utils/axiosInstance';

/**
 * WoundAssessment - Track wound healing progress
 * Gold Standard Phase 3 - Nursing Assessment Tool
 */
const WoundAssessmentTab = ({ admissionId, patientId }) => {
    const [wounds, setWounds] = useState([]);
    const [woundForm, setWoundForm] = useState({
        location: '',
        type: 'Surgical',
        size_cm: '',
        appearance: 'Pink',
        drainage: 'None',
        dressing_type: '',
        notes: ''
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (admissionId) fetchWounds();
    }, [admissionId]);

    const fetchWounds = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await api.get(`/api/nurse/wounds/${admissionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setWounds(res.data.wounds || []);
        } catch (err) {
            console.error('Failed to fetch wounds:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            await api.post('/api/nurse/wounds', {
                admission_id: admissionId,
                patient_id: patientId,
                ...woundForm
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            setWoundForm({
                location: '',
                type: 'Surgical',
                size_cm: '',
                appearance: 'Pink',
                drainage: 'None',
                dressing_type: '',
                notes: ''
            });
            fetchWounds();
            alert('Wound assessment saved');
        } catch (err) {
            console.error(err);
            alert('Failed to save wound assessment');
        }
    };

    const getAppearanceColor = (appearance) => {
        const colors = {
            'Pink': 'success',
            'Red': 'danger',
            'Yellow': 'warning',
            'Black': 'dark',
            'Mixed': 'secondary'
        };
        return colors[appearance] || 'secondary';
    };

    return (
        <div className="p-4">
            <h5 className="fw-bold mb-3">
                <Crosshair size={20} className="me-2 text-primary" />
                Wound Assessment
            </h5>

            {/* Add New Wound Form */}
            <Card className="mb-4 border-0 shadow-sm">
                <Card.Header className="bg-light">Add New Wound Assessment</Card.Header>
                <Card.Body>
                    <Form onSubmit={handleSubmit}>
                        <Row>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Location*</Form.Label>
                                    <Form.Control 
                                        value={woundForm.location}
                                        onChange={e => setWoundForm({...woundForm, location: e.target.value})}
                                        placeholder="e.g., Right leg, lower"
                                        required
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Type</Form.Label>
                                    <Form.Select 
                                        value={woundForm.type}
                                        onChange={e => setWoundForm({...woundForm, type: e.target.value})}
                                    >
                                        <option>Surgical</option>
                                        <option>Pressure Ulcer</option>
                                        <option>Diabetic Ulcer</option>
                                        <option>Laceration</option>
                                        <option>Burn</option>
                                        <option>Drain Site</option>
                                        <option>Other</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Size (cm)</Form.Label>
                                    <Form.Control 
                                        value={woundForm.size_cm}
                                        onChange={e => setWoundForm({...woundForm, size_cm: e.target.value})}
                                        placeholder="e.g., 5x3"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Appearance</Form.Label>
                                    <Form.Select 
                                        value={woundForm.appearance}
                                        onChange={e => setWoundForm({...woundForm, appearance: e.target.value})}
                                    >
                                        <option>Pink</option>
                                        <option>Red</option>
                                        <option>Yellow</option>
                                        <option>Black</option>
                                        <option>Mixed</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Drainage</Form.Label>
                                    <Form.Select 
                                        value={woundForm.drainage}
                                        onChange={e => setWoundForm({...woundForm, drainage: e.target.value})}
                                    >
                                        <option>None</option>
                                        <option>Serous</option>
                                        <option>Sanguineous</option>
                                        <option>Purulent</option>
                                        <option>Mixed</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Dressing Type</Form.Label>
                                    <Form.Control 
                                        value={woundForm.dressing_type}
                                        onChange={e => setWoundForm({...woundForm, dressing_type: e.target.value})}
                                        placeholder="e.g., Dry gauze"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Notes</Form.Label>
                            <Form.Control 
                                as="textarea" 
                                rows={2}
                                value={woundForm.notes}
                                onChange={e => setWoundForm({...woundForm, notes: e.target.value})}
                                placeholder="Additional observations..."
                            />
                        </Form.Group>
                        <Button type="submit" variant="primary">
                            <Save size={16} className="me-1" /> Save Assessment
                        </Button>
                    </Form>
                </Card.Body>
            </Card>

            {/* Wound History */}
            <h6 className="fw-bold mb-2">Assessment History</h6>
            {loading ? (
                <p className="text-muted">Loading...</p>
            ) : wounds.length > 0 ? (
                <ListGroup>
                    {wounds.map(wound => (
                        <ListGroup.Item key={wound.id} className="d-flex justify-content-between align-items-start">
                            <div>
                                <strong>{wound.location}</strong>
                                <Badge bg="secondary" className="ms-2">{wound.type}</Badge>
                                <Badge bg={getAppearanceColor(wound.appearance)} className="ms-1">{wound.appearance}</Badge>
                                <div className="small text-muted mt-1">
                                    Size: {wound.size_cm || 'N/A'} • Drainage: {wound.drainage} • Dressing: {wound.dressing_type || 'N/A'}
                                </div>
                                {wound.notes && <small className="text-muted d-block">{wound.notes}</small>}
                            </div>
                            <small className="text-muted">{new Date(wound.assessed_at).toLocaleString()}</small>
                        </ListGroup.Item>
                    ))}
                </ListGroup>
            ) : (
                <Alert variant="info" className="py-2">No wound assessments recorded</Alert>
            )}
        </div>
    );
};

export default WoundAssessmentTab;
