import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Badge, Dropdown, Alert } from 'react-bootstrap';
import { FileText, Save, Clock, ChevronDown, Sparkles, CheckCircle } from 'lucide-react';
import axios from 'axios';

// Common SOAP templates for quick selection
const SOAP_TEMPLATES = {
    'Stable Patient': {
        subjective: 'Patient reports feeling better today. No new complaints. Pain controlled.',
        objective: 'Vitals stable. Alert and oriented. Lungs clear. Abdomen soft.',
        assessment: 'Stable condition. Responding well to treatment.',
        plan: 'Continue current management. Monitor vitals. Plan discharge if stable.'
    },
    'Fever Workup': {
        subjective: 'Patient complains of fever and chills. Associated body aches.',
        objective: 'Temp elevated. Tachycardia present. No obvious focus of infection.',
        assessment: 'Fever of unknown origin. Rule out infection.',
        plan: 'Blood cultures x2, CBC, Urine R/M. Start empiric antibiotics if indicated.'
    },
    'Post-Op Day 1': {
        subjective: 'Post-operative day 1. Tolerated surgery well. Mild pain at incision site.',
        objective: 'Wound clean and dry. No signs of infection. Bowel sounds present.',
        assessment: 'Uncomplicated post-operative course.',
        plan: 'Advance diet as tolerated. Continue pain management. Early mobilization.'
    },
    'Respiratory Distress': {
        subjective: 'Increasing shortness of breath. Productive cough.',
        objective: 'SpO2 reduced. Tachypnea. Crackles on auscultation.',
        assessment: 'Acute respiratory distress. Possible pneumonia/ARDS.',
        plan: 'Stat CXR, ABG. Increase O2 support. Consider ICU transfer if worsening.'
    }
};

const SOAPNoteEditor = ({
    admissionId,
    patientId,
    patientName,
    onSave,
    existingNote,
    vitals,
    labResults
}) => {
    const [subjective, setSubjective] = useState(existingNote?.subjective || '');
    const [objective, setObjective] = useState(existingNote?.objective || '');
    const [assessment, setAssessment] = useState(existingNote?.assessment || '');
    const [plan, setPlan] = useState(existingNote?.plan || '');
    const [noteType, setNoteType] = useState(existingNote?.note_type || 'Progress');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');

    // Auto-populate objective with vitals if available
    useEffect(() => {
        if (vitals && !objective) {
            const vitalsText = `Vitals: BP ${vitals.bp || 'N/A'}, HR ${vitals.heart_rate || 'N/A'} bpm, Temp ${vitals.temp || 'N/A'}°F, SpO2 ${vitals.spo2 || 'N/A'}%`;
            setObjective(vitalsText);
        }
    }, [vitals]);

    const applyTemplate = (templateName) => {
        const template = SOAP_TEMPLATES[templateName];
        if (template) {
            setSubjective(template.subjective);
            setObjective(template.objective);
            setAssessment(template.assessment);
            setPlan(template.plan);
        }
    };

    const handleSave = async () => {
        if (!subjective && !objective && !assessment && !plan) {
            setError('Please fill at least one section');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const doctorName = localStorage.getItem('username') || 'Doctor';

            await axios.post('/api/clinical/soap-notes', {
                admission_id: admissionId,
                patient_id: patientId,
                subjective,
                objective,
                assessment,
                plan,
                note_type: noteType,
                doctor_name: 'Dr. ' + doctorName
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSaved(true);
            setTimeout(() => setSaved(false), 3000);

            if (onSave) onSave();
        } catch (err) {
            console.error('Error saving SOAP note:', err);
            setError(err.response?.data?.error || 'Failed to save note');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Card className="border-0 shadow-sm">
            <Card.Header className="bg-gradient d-flex justify-content-between align-items-center"
                style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)' }}>
                <div className="d-flex align-items-center gap-2 text-white">
                    <FileText size={20} />
                    <span className="fw-bold">SOAP Note</span>
                    {patientName && <Badge bg="light" text="dark" className="ms-2">{patientName}</Badge>}
                </div>
                <div className="d-flex gap-2">
                    <Form.Select
                        size="sm"
                        value={noteType}
                        onChange={(e) => setNoteType(e.target.value)}
                        style={{ width: '130px' }}
                    >
                        <option value="Admission">Admission Note</option>
                        <option value="Progress">Progress Note</option>
                        <option value="Discharge">Discharge Note</option>
                    </Form.Select>
                    <Dropdown>
                        <Dropdown.Toggle variant="light" size="sm">
                            <Sparkles size={14} className="me-1" /> Templates
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            {Object.keys(SOAP_TEMPLATES).map(name => (
                                <Dropdown.Item key={name} onClick={() => applyTemplate(name)}>
                                    {name}
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown>
                </div>
            </Card.Header>
            <Card.Body>
                {error && <Alert variant="danger" className="py-2">{error}</Alert>}
                {saved && <Alert variant="success" className="py-2"><CheckCircle size={16} className="me-2" />Note saved successfully!</Alert>}

                <Row>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold text-primary">
                                <span className="bg-primary text-white rounded px-2 py-1 me-2">S</span>
                                Subjective
                            </Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                placeholder="Patient's symptoms, complaints, history..."
                                value={subjective}
                                onChange={(e) => setSubjective(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold text-success">
                                <span className="bg-success text-white rounded px-2 py-1 me-2">O</span>
                                Objective
                            </Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                placeholder="Vitals, physical exam findings, lab results..."
                                value={objective}
                                onChange={(e) => setObjective(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                </Row>
                <Row>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold text-warning">
                                <span className="bg-warning text-dark rounded px-2 py-1 me-2">A</span>
                                Assessment
                            </Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                placeholder="Diagnosis, clinical impression, differential..."
                                value={assessment}
                                onChange={(e) => setAssessment(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold text-info">
                                <span className="bg-info text-white rounded px-2 py-1 me-2">P</span>
                                Plan
                            </Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={4}
                                placeholder="Treatment plan, medications, follow-up..."
                                value={plan}
                                onChange={(e) => setPlan(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                </Row>

                <div className="d-flex justify-content-between align-items-center mt-3">
                    <small className="text-muted">
                        <Clock size={14} className="me-1" />
                        {new Date().toLocaleString()}
                    </small>
                    <Button
                        variant="success"
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4"
                    >
                        {saving ? (
                            <>Saving...</>
                        ) : (
                            <><Save size={18} className="me-2" /> Sign & Save Note</>
                        )}
                    </Button>
                </div>
            </Card.Body>
        </Card>
    );
};

export default SOAPNoteEditor;
