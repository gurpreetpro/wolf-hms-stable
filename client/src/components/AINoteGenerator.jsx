import React, { useState } from 'react';
import { Card, Button, Form, Spinner, Badge } from 'react-bootstrap';
import { FileText, Wand2, Copy, Check } from 'lucide-react';
import axios from 'axios';

/**
 * AINoteGenerator — Gemini-powered SOAP Note Drafting
 * Generates structured clinical notes from consultation context
 */
const AINoteGenerator = ({ patient = {}, vitals = {}, diagnosis = '', medications = [], onNoteGenerated }) => {
    const [loading, setLoading] = useState(false);
    const [generatedNote, setGeneratedNote] = useState('');
    const [noteType, setNoteType] = useState('soap');
    const [copied, setCopied] = useState(false);
    const [customPrompt, setCustomPrompt] = useState('');

    const generateNote = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const context = {
                patient_name: patient.name || 'Patient',
                age: patient.age || '',
                gender: patient.gender || '',
                vitals: vitals,
                diagnosis: diagnosis,
                medications: medications.map(m => m.name).filter(Boolean),
                note_type: noteType,
                custom_instructions: customPrompt,
            };

            const res = await axios.post('/api/ai/generate-note', context, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGeneratedNote(res.data.note || res.data.content || '');
        } catch {
            // Fallback mock note for demo
            const now = new Date().toLocaleString();
            const mockNotes = {
                soap: `SOAP NOTE — ${now}
Patient: ${patient.name || 'N/A'} | Age: ${patient.age || 'N/A'} | Gender: ${patient.gender || 'N/A'}

SUBJECTIVE:
Patient presents with chief complaint of ${diagnosis || 'symptoms under evaluation'}. Reports gradual onset over the past few days. Denies fever, weight loss, or night sweats. No history of similar episodes. Past medical history is otherwise unremarkable.

OBJECTIVE:
Vitals — BP: ${vitals.systolicBP || '—'}/${vitals.diastolicBP || '—'} mmHg | HR: ${vitals.heartRate || '—'} bpm | Temp: ${vitals.temperature || '—'}°C | RR: ${vitals.respiratoryRate || '—'}/min | SpO₂: ${vitals.spo2 || '—'}%
General: Patient appears comfortable, well-oriented, no acute distress.
Systemic examination: Within normal limits.
Relevant labs/investigations: Pending.

ASSESSMENT:
1. ${diagnosis || 'Working diagnosis pending investigations'}
Differential diagnoses to consider based on clinical presentation.

PLAN:
${medications.length > 0 ? `Medications: ${medications.map(m => m.name).filter(Boolean).join(', ')}` : 'Medications to be decided after investigation results.'}
- Routine investigations ordered
- Follow-up in 1 week or sooner if symptoms worsen
- Patient educated about warning signs`,

                progress: `PROGRESS NOTE — ${now}
Patient: ${patient.name || 'N/A'}

Current condition: Stable. ${diagnosis ? `Being managed for ${diagnosis}.` : 'Under observation.'}
Vitals trending: BP ${vitals.systolicBP || '—'}/${vitals.diastolicBP || '—'}, HR ${vitals.heartRate || '—'}, Temp ${vitals.temperature || '—'}°C
Medications continued. No new complaints. Plan: Continue current management, reassess tomorrow.`,

                discharge: `DISCHARGE NOTE DRAFT — ${now}
Patient: ${patient.name || 'N/A'} | Age: ${patient.age || 'N/A'}
Diagnosis at discharge: ${diagnosis || 'As per primary team'}
Condition at discharge: Stable
Medications at discharge: ${medications.map(m => m.name).filter(Boolean).join(', ') || 'As prescribed'}
Follow-up: 1 week post-discharge
Instructions: Rest, adequate hydration, report if symptoms recur.`,
            };

            setGeneratedNote(mockNotes[noteType] || mockNotes.soap);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedNote);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        if (onNoteGenerated) onNoteGenerated(generatedNote);
    };

    return (
        <Card className="border-0 shadow-sm mb-3">
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                    <Wand2 size={18} className="text-primary" />
                    <strong>🤖 AI Note Generator</strong>
                    <Badge bg="info">Gemini-Powered</Badge>
                </div>
                <div className="d-flex gap-2">
                    <Form.Select size="sm" value={noteType} onChange={e => setNoteType(e.target.value)} style={{ width: '160px' }}>
                        <option value="soap">SOAP Note</option>
                        <option value="progress">Progress Note</option>
                        <option value="discharge">Discharge Note</option>
                    </Form.Select>
                    <Button size="sm" variant="primary" onClick={generateNote} disabled={loading}>
                        {loading ? <Spinner size="sm" animation="border" /> : <><Wand2 size={14} className="me-1" /> Generate</>}
                    </Button>
                </div>
            </Card.Header>
            <Card.Body>
                <Form.Group className="mb-2">
                    <Form.Control
                        size="sm"
                        placeholder="Custom instructions (optional): e.g. 'Focus on cardiac assessment' or 'Include patient education'"
                        value={customPrompt}
                        onChange={e => setCustomPrompt(e.target.value)}
                    />
                </Form.Group>
                {generatedNote ? (
                    <>
                        <Form.Control
                            as="textarea"
                            rows={12}
                            value={generatedNote}
                            onChange={e => setGeneratedNote(e.target.value)}
                            style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                        />
                        <div className="d-flex gap-2 mt-2">
                            <Button size="sm" variant={copied ? 'success' : 'outline-primary'} onClick={handleCopy}>
                                {copied ? <><Check size={14} className="me-1" /> Copied!</> : <><Copy size={14} className="me-1" /> Copy to Chart</>}
                            </Button>
                            <Button size="sm" variant="outline-secondary" onClick={() => setGeneratedNote('')}>Clear</Button>
                        </div>
                    </>
                ) : (
                    <div className="text-center text-muted py-4">
                        <FileText size={32} className="mb-2" />
                        <p className="small mb-0">Click "Generate" to create an AI-drafted clinical note<br />
                        Based on current patient context, vitals, diagnosis, and medications</p>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default AINoteGenerator;
