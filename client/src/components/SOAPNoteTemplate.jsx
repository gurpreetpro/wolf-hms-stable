import React, { useState } from 'react';
import { Card, Form, Button, Badge, Row, Col, Dropdown } from 'react-bootstrap';
import { FileText, Sparkles, Copy, RotateCcw } from 'lucide-react';
import VoiceDictation from './VoiceDictation';

/**
 * SOAPNoteTemplate - Phase 5 Clinical Documentation Component
 * SOAP = Subjective, Objective, Assessment, Plan
 */

// Pre-defined template macros for common phrases
const TEMPLATE_MACROS = {
    general: {
        name: 'General Consultation',
        subjective: 'Patient presents with chief complaint of ',
        objective: 'Vitals: BP _/_mmHg, Temp _°F, PR _/min, SpO2 _%\nGeneral: Alert, oriented, no acute distress\n',
        assessment: '',
        plan: 'Advised:\n1. \n2. \nFollow-up: '
    },
    fever: {
        name: 'Fever Workup',
        subjective: 'Patient presents with fever since _ days, associated with chills/rigors. No cough, cold, or body aches. No urinary symptoms. Appetite reduced.',
        objective: 'Vitals: Temp _°F, PR _/min\nThroat: Not congested\nChest: Clear, NVBS\nAbdomen: Soft, non-tender',
        assessment: 'Acute febrile illness - ? Viral fever\n',
        plan: '1. Tab Paracetamol 500mg TID x 3 days\n2. Plenty of fluids\n3. CBC, Urine R/M\n4. Review in 3 days'
    },
    cough: {
        name: 'URTI / Cough',
        subjective: 'Patient presents with cough since _ days, productive/dry. Associated with cold, sore throat. No fever, no breathing difficulty.',
        objective: 'Throat: Congested\nChest: Clear, no added sounds\nSpO2: _%',
        assessment: 'Acute upper respiratory tract infection',
        plan: '1. Tab Cetirizine 10mg OD x 5 days\n2. Syrup Benadryl 10ml TID x 5 days\n3. Steam inhalation\n4. Warm fluids'
    },
    hypertension: {
        name: 'Hypertension Follow-up',
        subjective: 'Known hypertensive, on regular medications. No headache, chest pain, or breathlessness. Compliance: Good',
        objective: 'BP: _/_ mmHg (Sitting)\nPR: _/min\nNo pedal edema',
        assessment: 'Essential Hypertension - Controlled/Uncontrolled',
        plan: 'Continue current medications\nAdvised salt restriction, exercise\nReview in 1 month with BP chart'
    },
    diabetes: {
        name: 'Diabetes Follow-up',
        subjective: 'Known diabetic, on OHA/Insulin. No polyuria, polydipsia. No numbness/tingling. Diet compliance: Good/Fair',
        objective: 'Weight: _ kg\nFeet: No ulcers, sensations intact\nLast HbA1c: _%',
        assessment: 'Type 2 DM - Controlled/Uncontrolled',
        plan: 'Continue current regimen\nAdvised diet control\nFBS/PPBS/HbA1c due\nReview in 1 month'
    },
    gastritis: {
        name: 'Gastritis / Acidity',
        subjective: 'Patient presents with epigastric burning/pain since _ days. Associated with bloating, nausea. Related to spicy food. No vomiting, no blood in stools.',
        objective: 'Abdomen: Soft, epigastric tenderness+\nNo organomegaly',
        assessment: 'Acute gastritis / Dyspepsia',
        plan: '1. Tab Pantoprazole 40mg OD x 14 days\n2. Tab Domperidone 10mg TID x 5 days\n3. Avoid spicy food, tea, coffee\n4. Small frequent meals'
    }
};

const SOAPNoteTemplate = ({
    onNotesChange,
    initialNotes,
    patientVitals,
    aiSuggestions
}) => {
    const [notes, setNotes] = useState({
        subjective: initialNotes?.subjective || '',
        objective: initialNotes?.objective || '',
        assessment: initialNotes?.assessment || '',
        plan: initialNotes?.plan || ''
    });
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    const handleTemplateSelect = (templateKey) => {
        const template = TEMPLATE_MACROS[templateKey];
        if (template) {
            setSelectedTemplate(templateKey);
            const newNotes = {
                subjective: template.subjective,
                objective: template.objective,
                assessment: template.assessment,
                plan: template.plan
            };
            setNotes(newNotes);
            if (onNotesChange) onNotesChange(newNotes);
        }
    };

    const handleFieldChange = (field, value) => {
        const newNotes = { ...notes, [field]: value };
        setNotes(newNotes);
        if (onNotesChange) onNotesChange(newNotes);
    };

    const handleVoiceTranscript = (transcript, fieldName) => {
        if (fieldName && notes.hasOwnProperty(fieldName)) {
            const newValue = notes[fieldName] + ' ' + transcript;
            handleFieldChange(fieldName, newValue.trim());
        }
    };

    const autoFillVitals = () => {
        if (patientVitals) {
            const vitalsText = `Vitals: BP ${patientVitals.bp || '_/_'}mmHg, Temp ${patientVitals.temp || '_'}°F, PR ${patientVitals.heart_rate || '_'}/min, SpO2 ${patientVitals.spo2 || '_'}%\nWeight: ${patientVitals.weight || '_'}kg\n`;
            handleFieldChange('objective', vitalsText + notes.objective.replace(/Vitals:.*\n/, ''));
        }
    };

    const copyToClipboard = () => {
        const fullNote = `SUBJECTIVE:\n${notes.subjective}\n\nOBJECTIVE:\n${notes.objective}\n\nASSESSMENT:\n${notes.assessment}\n\nPLAN:\n${notes.plan}`;
        navigator.clipboard.writeText(fullNote);
        alert('SOAP note copied to clipboard!');
    };

    const clearAll = () => {
        const emptyNotes = { subjective: '', objective: '', assessment: '', plan: '' };
        setNotes(emptyNotes);
        setSelectedTemplate(null);
        if (onNotesChange) onNotesChange(emptyNotes);
    };

    return (
        <Card className="shadow-sm">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center py-2">
                <div className="d-flex align-items-center gap-2">
                    <FileText size={18} className="text-primary" />
                    <strong>SOAP Notes</strong>
                    {selectedTemplate && (
                        <Badge bg="info" className="ms-2">
                            {TEMPLATE_MACROS[selectedTemplate]?.name}
                        </Badge>
                    )}
                </div>
                <div className="d-flex gap-2">
                    <Dropdown>
                        <Dropdown.Toggle variant="outline-primary" size="sm">
                            <Sparkles size={14} className="me-1" />
                            Templates
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            {Object.entries(TEMPLATE_MACROS).map(([key, template]) => (
                                <Dropdown.Item
                                    key={key}
                                    onClick={() => handleTemplateSelect(key)}
                                    active={selectedTemplate === key}
                                >
                                    {template.name}
                                </Dropdown.Item>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown>
                    <Button variant="outline-secondary" size="sm" onClick={copyToClipboard}>
                        <Copy size={14} />
                    </Button>
                    <Button variant="outline-danger" size="sm" onClick={clearAll}>
                        <RotateCcw size={14} />
                    </Button>
                </div>
            </Card.Header>
            <Card.Body className="p-2">
                <Row>
                    <Col md={6}>
                        {/* Subjective */}
                        <Form.Group className="mb-2">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <Form.Label className="mb-0 fw-bold text-primary small">
                                    S - Subjective (History)
                                </Form.Label>
                                <VoiceDictation
                                    fieldName="subjective"
                                    onTranscript={handleVoiceTranscript}
                                />
                            </div>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={notes.subjective}
                                onChange={(e) => handleFieldChange('subjective', e.target.value)}
                                placeholder="Chief complaint, history, symptoms..."
                                className="small"
                            />
                        </Form.Group>

                        {/* Objective */}
                        <Form.Group className="mb-2">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <Form.Label className="mb-0 fw-bold text-success small">
                                    O - Objective (Exam)
                                </Form.Label>
                                <div className="d-flex gap-1">
                                    {patientVitals && (
                                        <Button
                                            variant="outline-success"
                                            size="sm"
                                            className="py-0 px-1"
                                            onClick={autoFillVitals}
                                        >
                                            Auto-fill Vitals
                                        </Button>
                                    )}
                                    <VoiceDictation
                                        fieldName="objective"
                                        onTranscript={handleVoiceTranscript}
                                    />
                                </div>
                            </div>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={notes.objective}
                                onChange={(e) => handleFieldChange('objective', e.target.value)}
                                placeholder="Vitals, physical exam findings..."
                                className="small"
                            />
                        </Form.Group>
                    </Col>

                    <Col md={6}>
                        {/* Assessment */}
                        <Form.Group className="mb-2">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <Form.Label className="mb-0 fw-bold text-warning small">
                                    A - Assessment (Diagnosis)
                                </Form.Label>
                                <VoiceDictation
                                    fieldName="assessment"
                                    onTranscript={handleVoiceTranscript}
                                />
                            </div>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={notes.assessment}
                                onChange={(e) => handleFieldChange('assessment', e.target.value)}
                                placeholder="Diagnosis, differential diagnosis..."
                                className="small"
                            />
                            {aiSuggestions?.diagnoses && (
                                <div className="mt-1">
                                    <small className="text-muted">AI Suggestions: </small>
                                    {aiSuggestions.diagnoses.slice(0, 2).map((d, i) => (
                                        <Badge
                                            key={i}
                                            bg="light"
                                            text="dark"
                                            className="me-1 cursor-pointer"
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => handleFieldChange('assessment', notes.assessment + d.name + '\n')}
                                        >
                                            + {d.name}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </Form.Group>

                        {/* Plan */}
                        <Form.Group className="mb-2">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                                <Form.Label className="mb-0 fw-bold text-danger small">
                                    P - Plan (Treatment)
                                </Form.Label>
                                <VoiceDictation
                                    fieldName="plan"
                                    onTranscript={handleVoiceTranscript}
                                />
                            </div>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={notes.plan}
                                onChange={(e) => handleFieldChange('plan', e.target.value)}
                                placeholder="Medications, tests, follow-up..."
                                className="small"
                            />
                        </Form.Group>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
    );
};

export default SOAPNoteTemplate;
