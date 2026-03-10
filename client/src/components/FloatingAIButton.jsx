import React, { useState } from 'react';
import { Button, Offcanvas, Card, Nav, Tab, Form, Alert, Badge, Spinner, ListGroup } from 'react-bootstrap';
import {
    Brain,
    X,
    Pill,
    Stethoscope,
    Beaker,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Sparkles,
    Send
} from 'lucide-react';
import axios from 'axios';

/**
 * Floating AI Clinical Support Button & Sidebar
 * Provides quick access to AI-powered clinical decision support
 */
const FloatingAIButton = ({ patientContext = null, isOpen, onClose }) => {
    const [show, setShow] = useState(false);
    const [activeTab, setActiveTab] = useState('symptoms');
    const [loading, setLoading] = useState(false);

    // Form states
    const [symptoms, setSymptoms] = useState('');
    const [medications, setMedications] = useState('');
    const [labResults, setLabResults] = useState('');

    // Result states
    const [symptomResult, setSymptomResult] = useState(null);
    const [drugResult, setDrugResult] = useState(null);
    const [labResult, setLabResult] = useState(null);
    const [error, setError] = useState('');

    const isControlled = typeof isOpen !== 'undefined';
    const displayShow = isControlled ? isOpen : show;
    const handleClose = isControlled ? onClose : () => setShow(false);
    const handleOpen = isControlled ? () => { } : () => setShow(true);

    const handleSymptomAnalysis = async () => {
        if (!symptoms.trim()) return;
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/ai/symptoms', {
                symptoms: symptoms.split(',').map(s => s.trim()),
                patientInfo: patientContext || {}
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSymptomResult(res.data);
        } catch (err) {
            console.error('AI Analysis Error:', err);
            const errData = err.response?.data?.error || err.message;
            setError(typeof errData === 'object' ? (errData.message || JSON.stringify(errData)) : errData || 'Failed to analyze symptoms');
        } finally {
            setLoading(false);
        }
    };

    const handleDrugCheck = async () => {
        if (!medications.trim()) return;
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/ai/drug-check', {
                medications: medications.split(',').map(m => m.trim())
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDrugResult(res.data);
        } catch (err) {
            console.error('Drug Check Error:', err);
            const errData = err.response?.data?.error || err.message;
            setError(typeof errData === 'object' ? (errData.message || JSON.stringify(errData)) : errData || 'Failed to check interactions');
        } finally {
            setLoading(false);
        }
    };

    const handleLabAnalysis = async () => {
        if (!labResults.trim()) return;
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            // Parse lab results format: "test:value, test:value"
            const results = {};
            labResults.split(',').forEach(item => {
                const [test, value] = item.split(':').map(s => s.trim());
                if (test && value) results[test] = parseFloat(value) || value;
            });

            const res = await axios.post('/api/ai/lab-analysis', {
                results,
                patientInfo: patientContext || {}
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLabResult(res.data);
        } catch (err) {
            console.error('Lab Analysis Error:', err);
            const errData = err.response?.data?.error || err.message;
            setError(typeof errData === 'object' ? (errData.message || JSON.stringify(errData)) : errData || 'Failed to analyze lab results');
        } finally {
            setLoading(false);
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'severe': case 'critical': return 'danger';
            case 'moderate': return 'warning';
            case 'mild': case 'minor': return 'info';
            default: return 'secondary';
        }
    };

    return (
        <>
            {/* Floating Button - Only show if not controlled */}
            {!isControlled && (
                <Button
                    variant="primary"
                    className="position-fixed shadow-lg d-flex align-items-center gap-2"
                    style={{
                        bottom: '90px',
                        right: '24px',
                        zIndex: 1040,
                        borderRadius: '50px',
                        padding: '12px 20px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        animation: 'pulse 2s infinite'
                    }}
                    onClick={handleOpen}
                >
                    <Brain size={20} />
                    <span className="d-none d-md-inline">Clinical AI</span>
                </Button>
            )}

            {/* Slide-out Panel */}
            <Offcanvas show={displayShow} onHide={handleClose} placement="end" style={{ width: '420px' }}>
                <Offcanvas.Header className="bg-primary text-white">
                    <Offcanvas.Title className="d-flex align-items-center gap-2">
                        <Brain size={24} />
                        Clinical Decision Support
                    </Offcanvas.Title>
                    <Button variant="link" className="text-white p-0" onClick={handleClose}>
                        <X size={20} />
                    </Button>
                </Offcanvas.Header>
                <Offcanvas.Body className="p-0">
                    <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
                        <Nav variant="tabs" className="nav-fill border-bottom">
                            <Nav.Item>
                                <Nav.Link eventKey="symptoms" className="py-3">
                                    <Stethoscope size={16} className="me-1" />
                                    Symptoms
                                </Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="drugs" className="py-3">
                                    <Pill size={16} className="me-1" />
                                    Drugs
                                </Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="labs" className="py-3">
                                    <Beaker size={16} className="me-1" />
                                    Labs
                                </Nav.Link>
                            </Nav.Item>
                        </Nav>

                        <Tab.Content className="p-3">
                            {error && <Alert variant="danger" className="mb-3">{error}</Alert>}

                            {/* Symptom Analysis Tab */}
                            <Tab.Pane eventKey="symptoms">
                                <Card className="border-0 bg-light mb-3">
                                    <Card.Body>
                                        <Form.Group>
                                            <Form.Label className="fw-bold">Enter Symptoms</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={3}
                                                placeholder="e.g., headache, fever, fatigue (comma-separated)"
                                                value={symptoms}
                                                onChange={(e) => setSymptoms(e.target.value)}
                                            />
                                        </Form.Group>
                                        <Button
                                            variant="primary"
                                            className="w-100 mt-3"
                                            onClick={handleSymptomAnalysis}
                                            disabled={loading || !symptoms.trim()}
                                        >
                                            {loading ? <Spinner size="sm" /> : <><Sparkles size={16} className="me-2" />Analyze Symptoms</>}
                                        </Button>
                                    </Card.Body>
                                </Card>

                                {symptomResult && (
                                    <Card className="border-0 shadow-sm">
                                        {/* Urgency Banner */}
                                        {(symptomResult.analysis?.urgencyLevel || symptomResult.urgencyLevel) && (
                                            <Card.Header className={`text-white fw-bold d-flex justify-content-between align-items-center ${(symptomResult.analysis?.urgencyLevel || symptomResult.urgencyLevel) === 'CRITICAL' ? 'bg-danger' :
                                                (symptomResult.analysis?.urgencyLevel || symptomResult.urgencyLevel) === 'URGENT' ? 'bg-warning text-dark' :
                                                    'bg-info'
                                                }`}>
                                                <span>
                                                    {(symptomResult.analysis?.urgencyLevel || symptomResult.urgencyLevel) === 'CRITICAL' && '🔴 '}
                                                    {(symptomResult.analysis?.urgencyLevel || symptomResult.urgencyLevel) === 'URGENT' && '🟠 '}
                                                    {symptomResult.analysis?.urgencyLevel || symptomResult.urgencyLevel}
                                                </span>
                                                <Badge bg="light" text="dark">
                                                    Triage: {symptomResult.analysis?.triageCategory || symptomResult.triageCategory || 'Assess'}
                                                </Badge>
                                            </Card.Header>
                                        )}

                                        {/* Immediate Actions */}
                                        {(symptomResult.analysis?.immediateActions || symptomResult.immediateActions)?.length > 0 && (
                                            <Card.Body className="bg-danger-subtle border-bottom">
                                                <div className="fw-bold text-danger mb-2">⚡ Immediate Actions:</div>
                                                {(symptomResult.analysis?.immediateActions || symptomResult.immediateActions).map((action, idx) => (
                                                    <div key={idx} className="mb-1">
                                                        <Badge bg="danger" className="me-2">{idx + 1}</Badge>
                                                        {action}
                                                    </div>
                                                ))}
                                            </Card.Body>
                                        )}

                                        {/* Differential Diagnoses */}
                                        <Card.Body className="border-bottom">
                                            <div className="fw-bold mb-2">
                                                <Stethoscope size={16} className="me-2" />
                                                Differential Diagnoses:
                                            </div>
                                            <ListGroup variant="flush">
                                                {(symptomResult.analysis?.differentialDiagnoses || symptomResult.differentialDiagnoses || []).map((diag, idx) => (
                                                    <ListGroup.Item key={idx} className="px-0 d-flex justify-content-between align-items-start">
                                                        <div className="flex-grow-1">
                                                            <div className="fw-bold">{diag.condition}</div>
                                                            {diag.icd10Code && <small className="text-muted d-block">ICD-10: {diag.icd10Code}</small>}
                                                            <small className="text-secondary d-block mt-1">{diag.reasoning}</small>
                                                            {diag.keyFindings && (
                                                                <small className="text-info d-block mt-1">🔍 Key findings: {diag.keyFindings}</small>
                                                            )}
                                                        </div>
                                                        <Badge bg={diag.probability === 'High' ? 'danger' : diag.probability === 'Medium' ? 'warning' : 'info'}>
                                                            {diag.probability}
                                                        </Badge>
                                                    </ListGroup.Item>
                                                ))}
                                            </ListGroup>
                                        </Card.Body>

                                        {/* Nursing Interventions */}
                                        {(symptomResult.analysis?.nursingInterventions || symptomResult.nursingInterventions)?.length > 0 && (
                                            <Card.Body className="bg-primary-subtle border-bottom">
                                                <div className="fw-bold text-primary mb-2">👩‍⚕️ Nursing Interventions:</div>
                                                {(symptomResult.analysis?.nursingInterventions || symptomResult.nursingInterventions).map((intervention, idx) => (
                                                    <div key={idx} className="mb-1 small">• {intervention}</div>
                                                ))}
                                            </Card.Body>
                                        )}

                                        {/* Recommended Tests */}
                                        {(symptomResult.analysis?.recommendedTests || symptomResult.recommendedTests)?.length > 0 && (
                                            <Card.Body className="border-bottom">
                                                <div className="fw-bold mb-2">📋 Recommended Tests:</div>
                                                {(symptomResult.analysis?.recommendedTests || symptomResult.recommendedTests).map((test, idx) => (
                                                    <div key={idx} className="d-flex justify-content-between align-items-center mb-1 small">
                                                        <span>{typeof test === 'object' ? test.test : test}</span>
                                                        {typeof test === 'object' && test.priority && (
                                                            <Badge bg={test.priority === 'STAT' ? 'danger' : 'secondary'}>{test.priority}</Badge>
                                                        )}
                                                    </div>
                                                ))}
                                            </Card.Body>
                                        )}

                                        {/* Red Flags */}
                                        {(symptomResult.analysis?.redFlags || symptomResult.redFlags)?.length > 0 && (
                                            <Card.Body className="bg-warning-subtle border-bottom">
                                                <div className="fw-bold text-danger mb-2">⚠️ Red Flags to Watch:</div>
                                                {(symptomResult.analysis?.redFlags || symptomResult.redFlags).map((flag, idx) => (
                                                    <div key={idx} className="mb-1 small text-danger">• {flag}</div>
                                                ))}
                                            </Card.Body>
                                        )}

                                        {/* Escalation Criteria */}
                                        {(symptomResult.analysis?.escalationCriteria || symptomResult.escalationCriteria) && (
                                            <Card.Body className="bg-danger-subtle border-bottom">
                                                <div className="fw-bold mb-1">📢 When to Escalate:</div>
                                                <small>{symptomResult.analysis?.escalationCriteria || symptomResult.escalationCriteria}</small>
                                            </Card.Body>
                                        )}

                                        {/* Clinical Pearl */}
                                        {(symptomResult.analysis?.clinicalPearl || symptomResult.clinicalPearl) && (
                                            <Card.Footer className="bg-success-subtle">
                                                <div className="fw-bold mb-1">💡 Clinical Pearl:</div>
                                                <small>{symptomResult.analysis?.clinicalPearl || symptomResult.clinicalPearl}</small>
                                            </Card.Footer>
                                        )}

                                        {/* Disclaimer */}
                                        <Card.Footer className="bg-light small text-muted">
                                            <Brain size={14} className="me-1" />
                                            {symptomResult.analysis?.disclaimer || symptomResult.disclaimer || 'AI-assisted clinical decision support. Always apply clinical judgment.'}
                                        </Card.Footer>
                                    </Card>
                                )}
                            </Tab.Pane>

                            {/* Drug Interactions Tab */}
                            <Tab.Pane eventKey="drugs">
                                <Card className="border-0 bg-light mb-3">
                                    <Card.Body>
                                        <Form.Group>
                                            <Form.Label className="fw-bold">Enter Medications</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={3}
                                                placeholder="e.g., Aspirin, Warfarin, Ibuprofen (comma-separated)"
                                                value={medications}
                                                onChange={(e) => setMedications(e.target.value)}
                                            />
                                        </Form.Group>
                                        <Button
                                            variant="warning"
                                            className="w-100 mt-3"
                                            onClick={handleDrugCheck}
                                            disabled={loading || !medications.trim()}
                                        >
                                            {loading ? <Spinner size="sm" /> : <><AlertTriangle size={16} className="me-2" />Check Interactions</>}
                                        </Button>
                                    </Card.Body>
                                </Card>

                                {drugResult && (
                                    <Card className="border-0 shadow-sm">
                                        <Card.Header className={`bg-${drugResult.interactions?.length > 0 ? 'danger' : 'success'} text-white fw-bold`}>
                                            {drugResult.interactions?.length > 0 ? (
                                                <><AlertTriangle size={16} className="me-2" />{drugResult.interactions.length} Interaction(s) Found</>
                                            ) : (
                                                <><CheckCircle size={16} className="me-2" />No Interactions Found</>
                                            )}
                                        </Card.Header>
                                        <ListGroup variant="flush">
                                            {drugResult.interactions?.map((int, idx) => (
                                                <ListGroup.Item key={idx} className="border-start border-4" style={{ borderColor: int.severity === 'severe' ? '#dc3545' : int.severity === 'moderate' ? '#ffc107' : '#0dcaf0' }}>
                                                    <div className="d-flex justify-content-between">
                                                        <strong>{int.drug1} ↔ {int.drug2}</strong>
                                                        <Badge bg={getSeverityColor(int.severity)}>{int.severity}</Badge>
                                                    </div>
                                                    <small className="text-muted d-block mt-1">{int.description}</small>
                                                    {int.recommendation && (
                                                        <small className="text-primary d-block mt-1">
                                                            <CheckCircle size={12} className="me-1" />{int.recommendation}
                                                        </small>
                                                    )}
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    </Card>
                                )}
                            </Tab.Pane>

                            {/* Lab Analysis Tab */}
                            <Tab.Pane eventKey="labs">
                                <Card className="border-0 bg-light mb-3">
                                    <Card.Body>
                                        <Form.Group>
                                            <Form.Label className="fw-bold">Enter Lab Results</Form.Label>
                                            <Form.Control
                                                as="textarea"
                                                rows={3}
                                                placeholder="e.g., Hemoglobin:8.5, Glucose:180, Creatinine:2.1"
                                                value={labResults}
                                                onChange={(e) => setLabResults(e.target.value)}
                                            />
                                            <Form.Text className="text-muted">Format: TestName:Value, separated by commas</Form.Text>
                                        </Form.Group>
                                        <Button
                                            variant="info"
                                            className="w-100 mt-3 text-white"
                                            onClick={handleLabAnalysis}
                                            disabled={loading || !labResults.trim()}
                                        >
                                            {loading ? <Spinner size="sm" /> : <><Beaker size={16} className="me-2" />Analyze Labs</>}
                                        </Button>
                                    </Card.Body>
                                </Card>

                                {labResult && (
                                    <Card className="border-0 shadow-sm">
                                        <Card.Header className="bg-white fw-bold">
                                            <Beaker size={16} className="me-2 text-info" />
                                            Lab Analysis
                                        </Card.Header>
                                        <ListGroup variant="flush">
                                            {labResult.findings?.map((finding, idx) => (
                                                <ListGroup.Item key={idx}>
                                                    <div className="d-flex align-items-center gap-2">
                                                        {finding.status === 'critical' ? <XCircle className="text-danger" size={16} /> :
                                                            finding.status === 'abnormal' ? <AlertTriangle className="text-warning" size={16} /> :
                                                                <CheckCircle className="text-success" size={16} />}
                                                        <strong>{finding.test}</strong>
                                                        <Badge bg={finding.status === 'critical' ? 'danger' : finding.status === 'abnormal' ? 'warning' : 'success'}>
                                                            {finding.value}
                                                        </Badge>
                                                    </div>
                                                    {finding.interpretation && (
                                                        <small className="text-muted d-block mt-1">{finding.interpretation}</small>
                                                    )}
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                        {labResult.summary && (
                                            <Card.Footer className="bg-light small">
                                                <Brain size={14} className="me-1" />
                                                {labResult.summary}
                                            </Card.Footer>
                                        )}
                                    </Card>
                                )}
                            </Tab.Pane>
                        </Tab.Content>
                    </Tab.Container>
                </Offcanvas.Body>
            </Offcanvas>

            {/* Pulse animation CSS */}
            <style>{`
                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(102, 126, 234, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0); }
                }
            `}</style>
        </>
    );
};

export default FloatingAIButton;
