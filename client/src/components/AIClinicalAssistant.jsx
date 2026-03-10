import React, { useState } from 'react';
import { Card, Button, Badge, Spinner, Alert, ListGroup } from 'react-bootstrap';
import { Sparkles, Pill, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import axios from 'axios';

/**
 * AIClinicalAssistant - Phase 2 AI Enhancement Component
 * Provides diagnosis suggestions, prescription assistant, and clinical summary
 */
const AIClinicalAssistant = ({
    symptoms,
    diagnosis,
    patient,
    prescriptions,
    labTests,
    onDiagnosisSuggest,
    onPrescriptionSuggest
}) => {
    const [loading, setLoading] = useState({ diagnosis: false, prescription: false, summary: false });
    const [diagnosisSuggestions, setDiagnosisSuggestions] = useState(null);
    const [prescriptionSuggestions, setPrescriptionSuggestions] = useState(null);
    const [summaryData, setSummaryData] = useState(null);
    const [error, setError] = useState(null);

    const token = localStorage.getItem('token');

    // AI Diagnosis Suggestions
    const handleDiagnosisSuggest = async () => {
        if (!symptoms) {
            setError('Please enter symptoms/complaint first');
            return;
        }

        setLoading(prev => ({ ...prev, diagnosis: true }));
        setError(null);

        try {
            const res = await axios.post('/api/ai/diagnose', {
                symptoms,
                age: patient?.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : null,
                gender: patient?.gender
            }, { headers: { Authorization: `Bearer ${token}` } });

            setDiagnosisSuggestions(res.data);
        } catch (err) {
            setError('Failed to get AI diagnosis suggestions');
            console.error(err);
        } finally {
            setLoading(prev => ({ ...prev, diagnosis: false }));
        }
    };

    // AI Prescription Suggestions
    const handlePrescriptionSuggest = async () => {
        if (!diagnosis) {
            setError('Please enter diagnosis first');
            return;
        }

        setLoading(prev => ({ ...prev, prescription: true }));
        setError(null);

        try {
            const res = await axios.post('/api/ai/prescribe', {
                diagnosis,
                age: patient?.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : null
            }, { headers: { Authorization: `Bearer ${token}` } });

            setPrescriptionSuggestions(res.data);
        } catch (err) {
            setError('Failed to get AI prescription suggestions');
            console.error(err);
        } finally {
            setLoading(prev => ({ ...prev, prescription: false }));
        }
    };

    // Apply suggested prescription
    const applyPrescription = (med) => {
        if (onPrescriptionSuggest) {
            onPrescriptionSuggest({
                name: med.name,
                dose: med.dose,
                freq: med.frequency,
                duration: med.duration
            });
        }
    };

    return (
        <Card className="border-0 shadow-sm mb-3" style={{ background: 'linear-gradient(135deg, #667eea10 0%, #764ba210 100%)' }}>
            <Card.Header className="bg-transparent border-0 d-flex align-items-center gap-2">
                <Sparkles className="text-primary" size={18} />
                <span className="fw-bold">AI Clinical Assistant</span>
                <Badge bg="info" className="ms-auto">Phase 2</Badge>
            </Card.Header>
            <Card.Body className="pt-0">
                {error && <Alert variant="danger" className="py-2 small" dismissible onClose={() => setError(null)}>{error}</Alert>}

                <div className="d-flex gap-2 flex-wrap mb-3">
                    {/* Diagnosis Button */}
                    <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={handleDiagnosisSuggest}
                        disabled={loading.diagnosis || !symptoms}
                    >
                        {loading.diagnosis ? <Spinner size="sm" className="me-1" /> : <Sparkles size={14} className="me-1" />}
                        Suggest Diagnoses
                    </Button>

                    {/* Prescription Button */}
                    <Button
                        size="sm"
                        variant="outline-success"
                        onClick={handlePrescriptionSuggest}
                        disabled={loading.prescription || !diagnosis}
                    >
                        {loading.prescription ? <Spinner size="sm" className="me-1" /> : <Pill size={14} className="me-1" />}
                        Suggest Medications
                    </Button>
                </div>

                {/* Diagnosis Suggestions Display */}
                {diagnosisSuggestions && (
                    <div className="mb-3">
                        <h6 className="small fw-bold mb-2">
                            <FileText size={14} className="me-1" />
                            Possible Diagnoses
                            {diagnosisSuggestions.fallback && <Badge bg="warning" className="ms-2">Fallback</Badge>}
                        </h6>
                        <ListGroup variant="flush" className="small">
                            {diagnosisSuggestions.diagnoses?.map((d, i) => (
                                <ListGroup.Item
                                    key={i}
                                    className="d-flex justify-content-between align-items-start py-2 px-2"
                                    action
                                    onClick={() => onDiagnosisSuggest?.(d.name)}
                                >
                                    <div>
                                        <strong>{d.name}</strong>
                                        {d.icd10 && <small className="text-muted ms-2">[{d.icd10}]</small>}
                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{d.reasoning}</div>
                                    </div>
                                    <Badge bg={d.confidence === 'High' ? 'success' : d.confidence === 'Medium' ? 'warning' : 'secondary'}>
                                        {d.confidence}
                                    </Badge>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>

                        {diagnosisSuggestions.redFlags?.length > 0 && (
                            <Alert variant="warning" className="mt-2 py-2 small">
                                <AlertTriangle size={14} className="me-1" />
                                <strong>Red Flags:</strong> {diagnosisSuggestions.redFlags.join(', ')}
                            </Alert>
                        )}
                    </div>
                )}

                {/* Prescription Suggestions Display */}
                {prescriptionSuggestions && (
                    <div>
                        <h6 className="small fw-bold mb-2">
                            <Pill size={14} className="me-1" />
                            Suggested Medications
                            {prescriptionSuggestions.fallback && <Badge bg="warning" className="ms-2">Fallback</Badge>}
                        </h6>
                        <ListGroup variant="flush" className="small">
                            {prescriptionSuggestions.medications?.map((med, i) => (
                                <ListGroup.Item
                                    key={i}
                                    className="d-flex justify-content-between align-items-center py-2 px-2"
                                >
                                    <div>
                                        <strong>{med.name}</strong> - {med.dose} - {med.frequency}
                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                            {med.duration} | {med.route} {med.notes && `| ${med.notes}`}
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline-success"
                                        onClick={() => applyPrescription(med)}
                                    >
                                        <CheckCircle size={12} className="me-1" /> Add
                                    </Button>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>

                        {prescriptionSuggestions.warnings?.length > 0 && (
                            <Alert variant="warning" className="mt-2 py-2 small">
                                <AlertTriangle size={14} className="me-1" />
                                <strong>Check:</strong> {prescriptionSuggestions.warnings.join(', ')}
                            </Alert>
                        )}
                    </div>
                )}

                {/* Disclaimer */}
                <div className="text-muted mt-3" style={{ fontSize: '0.7rem' }}>
                    ⚕️ AI suggestions are for clinical decision support only. Final decisions rest with the treating physician.
                </div>
            </Card.Body>
        </Card>
    );
};

export default AIClinicalAssistant;
