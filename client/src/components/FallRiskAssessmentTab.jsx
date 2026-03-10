import React, { useState, useEffect } from 'react';
import { Form, Button, Row, Col, Badge, Card, Alert, ProgressBar } from 'react-bootstrap';
import { Shield, AlertTriangle, Save, CheckCircle } from 'lucide-react';
import api from '../utils/axiosInstance';

/**
 * FallRiskAssessmentTab - Morse Fall Scale Assessment
 * Gold Standard Phase 3 - Nursing Assessment Tool
 * 
 * Morse Fall Scale Items:
 * 1. History of falling (0/25)
 * 2. Secondary diagnosis (0/15)
 * 3. Ambulatory aid (0/15/30)
 * 4. IV/Heparin lock (0/20)
 * 5. Gait (0/10/20)
 * 6. Mental status (0/15)
 * 
 * Score: 0-24 = Low, 25-44 = Medium, 45+ = High
 */
const FallRiskAssessmentTab = ({ admissionId, patientId }) => {
    const [assessments, setAssessments] = useState([]);
    const [formData, setFormData] = useState({
        history_of_falling: 0,      // 0 or 25
        secondary_diagnosis: 0,      // 0 or 15
        ambulatory_aid: 0,           // 0, 15, or 30
        iv_therapy: 0,               // 0 or 20
        gait: 0,                     // 0, 10, or 20
        mental_status: 0             // 0 or 15
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (admissionId) fetchAssessments();
    }, [admissionId]);

    const fetchAssessments = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await api.get(`/api/nurse/fall-risk/${admissionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAssessments(res.data.assessments || []);
        } catch (err) {
            console.error('Failed to fetch fall risk:', err);
        } finally {
            setLoading(false);
        }
    };

    const calculateScore = () => {
        return Object.values(formData).reduce((a, b) => a + b, 0);
    };

    const getRiskLevel = (score) => {
        if (score >= 45) return { level: 'High', color: 'danger', icon: <AlertTriangle size={16} /> };
        if (score >= 25) return { level: 'Medium', color: 'warning', icon: <AlertTriangle size={16} /> };
        return { level: 'Low', color: 'success', icon: <CheckCircle size={16} /> };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        const score = calculateScore();
        const { level } = getRiskLevel(score);
        
        try {
            await api.post('/api/nurse/fall-risk', {
                admission_id: admissionId,
                patient_id: patientId,
                score,
                risk_level: level,
                ...formData
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            fetchAssessments();
            alert(`Fall risk assessment saved. Score: ${score} (${level} Risk)`);
        } catch (err) {
            console.error(err);
            alert('Failed to save fall risk assessment');
        }
    };

    const score = calculateScore();
    const risk = getRiskLevel(score);

    return (
        <div className="p-4">
            <h5 className="fw-bold mb-3">
                <Shield size={20} className="me-2 text-primary" />
                Fall Risk Assessment (Morse Scale)
            </h5>

            {/* Current Score Display */}
            <Card className={`mb-4 border-${risk.color}`}>
                <Card.Body className="d-flex align-items-center justify-content-between">
                    <div>
                        <span className="fw-bold">Current Score: </span>
                        <Badge bg={risk.color} className="fs-5 ms-2">{score}</Badge>
                    </div>
                    <Badge bg={risk.color} className="fs-6">
                        {risk.icon} {risk.level} Risk
                    </Badge>
                </Card.Body>
                <ProgressBar 
                    now={Math.min(score, 75)} 
                    max={75} 
                    variant={risk.color}
                    className="rounded-0"
                    style={{ height: '8px' }}
                />
            </Card>

            {/* Assessment Form */}
            <Form onSubmit={handleSubmit}>
                <Row>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">1. History of Falling</Form.Label>
                            <Form.Select 
                                value={formData.history_of_falling}
                                onChange={e => setFormData({...formData, history_of_falling: parseInt(e.target.value)})}
                            >
                                <option value={0}>No (0 points)</option>
                                <option value={25}>Yes (25 points)</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">2. Secondary Diagnosis</Form.Label>
                            <Form.Select 
                                value={formData.secondary_diagnosis}
                                onChange={e => setFormData({...formData, secondary_diagnosis: parseInt(e.target.value)})}
                            >
                                <option value={0}>No (0 points)</option>
                                <option value={15}>Yes (15 points)</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
                <Row>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">3. Ambulatory Aid</Form.Label>
                            <Form.Select 
                                value={formData.ambulatory_aid}
                                onChange={e => setFormData({...formData, ambulatory_aid: parseInt(e.target.value)})}
                            >
                                <option value={0}>None / Bed rest / Nurse assist (0)</option>
                                <option value={15}>Crutches / Cane / Walker (15)</option>
                                <option value={30}>Furniture for support (30)</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">4. IV / Heparin Lock</Form.Label>
                            <Form.Select 
                                value={formData.iv_therapy}
                                onChange={e => setFormData({...formData, iv_therapy: parseInt(e.target.value)})}
                            >
                                <option value={0}>No (0 points)</option>
                                <option value={20}>Yes (20 points)</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
                <Row>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">5. Gait</Form.Label>
                            <Form.Select 
                                value={formData.gait}
                                onChange={e => setFormData({...formData, gait: parseInt(e.target.value)})}
                            >
                                <option value={0}>Normal / Bed rest / Immobile (0)</option>
                                <option value={10}>Weak (10 points)</option>
                                <option value={20}>Impaired (20 points)</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">6. Mental Status</Form.Label>
                            <Form.Select 
                                value={formData.mental_status}
                                onChange={e => setFormData({...formData, mental_status: parseInt(e.target.value)})}
                            >
                                <option value={0}>Oriented to own ability (0)</option>
                                <option value={15}>Overestimates / Forgets limitations (15)</option>
                            </Form.Select>
                        </Form.Group>
                    </Col>
                </Row>
                <Button type="submit" variant="primary">
                    <Save size={16} className="me-1" /> Save Assessment
                </Button>
            </Form>

            {/* Assessment History */}
            {!loading && assessments.length > 0 && (
                <div className="mt-4">
                    <h6 className="fw-bold mb-2">Recent Assessments</h6>
                    {assessments.slice(0, 5).map(a => (
                        <Alert key={a.id} variant={a.risk_level === 'High' ? 'danger' : a.risk_level === 'Medium' ? 'warning' : 'success'} className="py-2 mb-2 d-flex justify-content-between">
                            <span>
                                <Badge bg={a.risk_level === 'High' ? 'danger' : a.risk_level === 'Medium' ? 'warning' : 'success'}>
                                    {a.score} - {a.risk_level} Risk
                                </Badge>
                            </span>
                            <small>{new Date(a.assessed_at).toLocaleString()}</small>
                        </Alert>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FallRiskAssessmentTab;
