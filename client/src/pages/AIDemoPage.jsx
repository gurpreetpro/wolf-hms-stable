import React, { useState } from 'react';
import { Container, Card, Row, Col, Form, Button, Alert, Badge, Spinner, ListGroup, Table } from 'react-bootstrap';
import {
    Brain,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Pill,
    Stethoscope,
    Shield,
    Beaker,
    Plus,
    Trash2
} from 'lucide-react';
import axios from 'axios';

const AIDemoPage = () => {
    // Drug Check State
    const [medications, setMedications] = useState([
        { name: 'Warfarin', dose: '5mg', frequency: 'daily' },
        { name: 'Aspirin', dose: '81mg', frequency: 'daily' }
    ]);
    const [newMed, setNewMed] = useState('');
    const [drugCheckResult, setDrugCheckResult] = useState(null);
    const [checkingDrugs, setCheckingDrugs] = useState(false);

    // Symptom Analysis State
    const [symptoms, setSymptoms] = useState('fever, cough, headache, fatigue');
    const [patientAge, setPatientAge] = useState('45');
    const [patientGender, setPatientGender] = useState('Male');
    const [analyzeSymptoms, setAnalyzingSymptoms] = useState(false);
    const [symptomResult, setSymptomResult] = useState(null);

    // Lab Analysis State
    const [labResults, setLabResults] = useState([
        { testName: 'hemoglobin', value: '10.5' },
        { testName: 'glucose_fasting', value: '145' },
        { testName: 'potassium', value: '5.8' }
    ]);
    const [labAnalysis, setLabAnalysis] = useState(null);
    const [analyzingLabs, setAnalyzingLabs] = useState(false);

    const [error, setError] = useState(null);

    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    // Add medication
    const addMedication = () => {
        if (newMed.trim()) {
            setMedications([...medications, { name: newMed.trim(), dose: '', frequency: '' }]);
            setNewMed('');
        }
    };

    // Remove medication
    const removeMedication = (idx) => {
        setMedications(medications.filter((_, i) => i !== idx));
    };

    // Check drug interactions
    const handleDrugCheck = async () => {
        setCheckingDrugs(true);
        setError(null);
        setDrugCheckResult(null);

        try {
            const res = await axios.post('/api/ai/drug-check', {
                medications: medications
            }, config);

            setDrugCheckResult(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to check drug interactions');
        } finally {
            setCheckingDrugs(false);
        }
    };

    // Analyze symptoms with AI
    const handleSymptomAnalysis = async () => {
        setAnalyzingSymptoms(true);
        setError(null);
        setSymptomResult(null);

        try {
            const res = await axios.post('/api/ai/symptoms', {
                symptoms: symptoms.split(',').map(s => s.trim()),
                patientInfo: {
                    age: parseInt(patientAge),
                    gender: patientGender
                }
            }, config);

            setSymptomResult(res.data.analysis);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to analyze symptoms');
        } finally {
            setAnalyzingSymptoms(false);
        }
    };

    // Analyze lab results
    const handleLabAnalysis = async () => {
        setAnalyzingLabs(true);
        setError(null);
        setLabAnalysis(null);

        try {
            const res = await axios.post('/api/ai/lab-analysis', {
                results: labResults,
                patientInfo: { gender: patientGender.toLowerCase() }
            }, config);

            setLabAnalysis(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to analyze labs');
        } finally {
            setAnalyzingLabs(false);
        }
    };

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'severe': case 'critical': return 'danger';
            case 'moderate': return 'warning';
            case 'mild': return 'info';
            default: return 'secondary';
        }
    };

    return (
        <Container fluid className="p-4">
            {/* Header */}
            <div className="d-flex align-items-center gap-3 mb-4">
                <div className="p-3 rounded-3" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}>
                    <Brain size={28} className="text-white" />
                </div>
                <div>
                    <h2 className="mb-0 fw-bold">AI Clinical Decision Support Demo</h2>
                    <p className="text-muted mb-0">Test drug interactions, symptom analysis, and lab flagging</p>
                </div>
            </div>

            {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-4">
                    {error}
                </Alert>
            )}

            <Row>
                {/* Drug Interaction Checker */}
                <Col lg={6} className="mb-4">
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-primary text-white py-3">
                            <div className="d-flex align-items-center gap-2">
                                <Pill size={20} />
                                <h5 className="mb-0 fw-semibold">Drug Interaction Checker</h5>
                            </div>
                        </Card.Header>
                        <Card.Body>
                            <div className="mb-3">
                                <label className="fw-semibold mb-2">Current Medications:</label>
                                <div className="d-flex flex-wrap gap-2 mb-2">
                                    {medications.map((med, idx) => (
                                        <Badge key={idx} bg="secondary" className="d-flex align-items-center gap-1 py-2 px-3">
                                            {med.name}
                                            <Trash2 size={12}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => removeMedication(idx)}
                                            />
                                        </Badge>
                                    ))}
                                </div>
                                <div className="input-group">
                                    <Form.Control
                                        type="text"
                                        placeholder="Add medication..."
                                        value={newMed}
                                        onChange={(e) => setNewMed(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && addMedication()}
                                    />
                                    <Button variant="outline-primary" onClick={addMedication}>
                                        <Plus size={16} />
                                    </Button>
                                </div>
                                <small className="text-muted">Try: Warfarin + Aspirin, or Sildenafil + Nitroglycerin</small>
                            </div>

                            <Button
                                variant="primary"
                                onClick={handleDrugCheck}
                                disabled={checkingDrugs || medications.length < 2}
                                className="w-100"
                            >
                                {checkingDrugs ? (
                                    <><Spinner size="sm" className="me-2" />Checking...</>
                                ) : (
                                    <><Shield size={16} className="me-2" />Check Interactions</>
                                )}
                            </Button>

                            {/* Results */}
                            {drugCheckResult && (
                                <div className="mt-3">
                                    {drugCheckResult.hasInteractions ? (
                                        <Alert variant={drugCheckResult.hasSevereInteraction ? 'danger' : 'warning'} className="mb-0">
                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <AlertTriangle size={18} />
                                                <strong>{drugCheckResult.interactionCount} interaction(s) found!</strong>
                                            </div>
                                            {drugCheckResult.interactions.map((int, idx) => (
                                                <div key={idx} className="p-2 bg-white rounded mb-2">
                                                    <div className="d-flex align-items-center gap-2 mb-1">
                                                        <Badge bg={getSeverityColor(int.severity)}>{int.severity.toUpperCase()}</Badge>
                                                        <strong>{int.drug1} + {int.drug2}</strong>
                                                    </div>
                                                    <small className="d-block">{int.description}</small>
                                                    <small className="text-primary d-block mt-1">
                                                        <strong>Recommendation:</strong> {int.recommendation}
                                                    </small>
                                                </div>
                                            ))}
                                        </Alert>
                                    ) : (
                                        <Alert variant="success" className="mb-0 d-flex align-items-center gap-2">
                                            <CheckCircle size={18} />
                                            <span>No known drug interactions detected</span>
                                        </Alert>
                                    )}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Lab Result Analysis */}
                <Col lg={6} className="mb-4">
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-success text-white py-3">
                            <div className="d-flex align-items-center gap-2">
                                <Beaker size={20} />
                                <h5 className="mb-0 fw-semibold">Lab Result Analyzer</h5>
                            </div>
                        </Card.Header>
                        <Card.Body>
                            <div className="mb-3">
                                <label className="fw-semibold mb-2">Sample Lab Values:</label>
                                <Table size="sm" bordered>
                                    <thead>
                                        <tr>
                                            <th>Test</th>
                                            <th>Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {labResults.map((lab, idx) => (
                                            <tr key={idx}>
                                                <td>{lab.testName}</td>
                                                <td>{lab.value}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>

                            <Button
                                variant="success"
                                onClick={handleLabAnalysis}
                                disabled={analyzingLabs}
                                className="w-100"
                            >
                                {analyzingLabs ? (
                                    <><Spinner size="sm" className="me-2" />Analyzing...</>
                                ) : (
                                    <><Beaker size={16} className="me-2" />Analyze Labs</>
                                )}
                            </Button>

                            {/* Lab Results */}
                            {labAnalysis && (
                                <div className="mt-3">
                                    <Alert variant={labAnalysis.criticalCount > 0 ? 'danger' : labAnalysis.abnormalCount > 0 ? 'warning' : 'success'}>
                                        <strong>{labAnalysis.abnormalCount} abnormal</strong>, <strong>{labAnalysis.criticalCount} critical</strong> values
                                    </Alert>
                                    <ListGroup variant="flush">
                                        {labAnalysis.analysis.map((result, idx) => (
                                            <ListGroup.Item key={idx} className="d-flex justify-content-between align-items-center">
                                                <div>
                                                    <strong>{result.testName}</strong>
                                                    <small className="text-muted ms-2">{result.value} {result.unit}</small>
                                                </div>
                                                <Badge bg={getSeverityColor(result.severity)}>
                                                    {result.status === 'normal' ? '✓ Normal' : `${result.status.toUpperCase()}`}
                                                </Badge>
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* AI Symptom Analysis - Full Width */}
            <Card className="shadow-sm border-0 mb-4">
                <Card.Header className="text-white py-3" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}>
                    <div className="d-flex align-items-center gap-2">
                        <Stethoscope size={20} />
                        <h5 className="mb-0 fw-semibold">AI Diagnosis Suggestions (Powered by Gemini)</h5>
                    </div>
                </Card.Header>
                <Card.Body>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Patient Symptoms (comma separated)</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    value={symptoms}
                                    onChange={(e) => setSymptoms(e.target.value)}
                                    placeholder="fever, cough, headache..."
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Age</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={patientAge}
                                    onChange={(e) => setPatientAge(e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="fw-semibold">Gender</Form.Label>
                                <Form.Select value={patientGender} onChange={(e) => setPatientGender(e.target.value)}>
                                    <option>Male</option>
                                    <option>Female</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Button
                        variant="primary"
                        onClick={handleSymptomAnalysis}
                        disabled={analyzeSymptoms || !symptoms.trim()}
                        style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)', border: 'none' }}
                    >
                        {analyzeSymptoms ? (
                            <><Spinner size="sm" className="me-2" />Analyzing with AI...</>
                        ) : (
                            <><Brain size={16} className="me-2" />Get AI Diagnosis Suggestions</>
                        )}
                    </Button>

                    {/* AI Results */}
                    {symptomResult && !symptomResult.error && (
                        <Row className="mt-4">
                            <Col md={6}>
                                {symptomResult.differentialDiagnoses && (
                                    <>
                                        <h6 className="fw-bold mb-3">Possible Diagnoses:</h6>
                                        <ListGroup>
                                            {symptomResult.differentialDiagnoses.map((dx, idx) => (
                                                <ListGroup.Item key={idx}>
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <strong>{dx.condition}</strong>
                                                        <Badge bg={dx.probability === 'High' ? 'danger' : dx.probability === 'Medium' ? 'warning' : 'info'}>
                                                            {dx.probability}
                                                        </Badge>
                                                    </div>
                                                    {dx.reasoning && <small className="text-muted">{dx.reasoning}</small>}
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    </>
                                )}
                            </Col>
                            <Col md={6}>
                                {symptomResult.recommendedTests?.length > 0 && (
                                    <div className="mb-3">
                                        <h6 className="fw-bold mb-2">Recommended Tests:</h6>
                                        <div className="d-flex flex-wrap gap-2">
                                            {symptomResult.recommendedTests.map((test, idx) => (
                                                <Badge key={idx} bg="info">{test}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {symptomResult.redFlags?.length > 0 && (
                                    <Alert variant="danger" className="mt-3">
                                        <strong><AlertTriangle size={16} className="me-1" />Red Flags:</strong>
                                        <ul className="mb-0 mt-2">
                                            {symptomResult.redFlags.map((flag, idx) => (
                                                <li key={idx}>{flag}</li>
                                            ))}
                                        </ul>
                                    </Alert>
                                )}
                            </Col>
                        </Row>
                    )}

                    {symptomResult?.error && (
                        <Alert variant="warning" className="mt-3">
                            {symptomResult.error}
                        </Alert>
                    )}

                    <small className="text-muted d-block mt-3 fst-italic">
                        ⚠️ AI suggestions are for decision support only. Always use clinical judgment and appropriate diagnostics.
                    </small>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default AIDemoPage;
