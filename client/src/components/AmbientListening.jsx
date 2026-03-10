import React, { useState, useRef } from 'react';
import { Card, Button, Badge, Form, Spinner } from 'react-bootstrap';
import { Mic, MicOff, FileText, Copy, Check } from 'lucide-react';

/**
 * AmbientListening — Speech-to-Text Auto-Documentation
 * Uses Web Speech API / Google Speech-to-Text for real-time transcription
 * during clinical consultations, auto-generating documentation
 */
const AmbientListening = ({ patient = {}, onTranscriptReady }) => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [structuredNote, setStructuredNote] = useState('');
    const [processing, setProcessing] = useState(false);
    const [copied, setCopied] = useState(false);
    const [duration, setDuration] = useState(0);
    const recognitionRef = useRef(null);
    const timerRef = useRef(null);

    const startListening = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('Speech Recognition not supported in this browser. Please use Chrome.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN';

        recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = 0; i < event.results.length; i++) {
                finalTranscript += event.results[i][0].transcript;
            }
            setTranscript(finalTranscript);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            if (event.error !== 'no-speech') stopListening();
        };

        recognition.onend = () => {
            if (isListening) recognition.start();
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
        setDuration(0);
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        clearInterval(timerRef.current);
        setIsListening(false);
    };

    const processTranscript = async () => {
        setProcessing(true);
        // Simulate AI processing — in production, this calls Gemini
        await new Promise(resolve => setTimeout(resolve, 1500));

        const now = new Date().toLocaleString();
        const note = `CONSULTATION NOTE (Auto-Generated from Ambient Recording)
Date: ${now}
Patient: ${patient.name || 'N/A'} | Duration: ${formatDuration(duration)}

CHIEF COMPLAINT:
${extractSection(transcript, 'complaint') || 'As discussed during consultation'}

HISTORY OF PRESENT ILLNESS:
${transcript.length > 100 ? transcript.substring(0, 200) + '...' : transcript || 'Transcription captured during live consultation'}

REVIEW OF SYSTEMS:
- General: As noted in conversation
- Relevant systems reviewed per discussion

ASSESSMENT:
Based on clinical discussion and examination findings.

PLAN:
- As discussed with patient during consultation
- Follow-up as recommended

---
⚠️ AI-GENERATED NOTE — Requires physician review and signature before filing.
Raw transcript length: ${transcript.length} characters | Recording duration: ${formatDuration(duration)}`;

        setStructuredNote(note);
        setProcessing(false);
        if (onTranscriptReady) onTranscriptReady(note);
    };

    const extractSection = (text, type) => {
        const lower = text.toLowerCase();
        if (type === 'complaint') {
            const keywords = ['complaining', 'pain', 'problem', 'issue', 'feeling', 'symptoms'];
            for (const kw of keywords) {
                const idx = lower.indexOf(kw);
                if (idx !== -1) return text.substring(Math.max(0, idx - 20), idx + 80).trim();
            }
        }
        return '';
    };

    const formatDuration = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(structuredNote || transcript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Card className="border-0 shadow-sm mb-3" style={{ borderLeft: `4px solid ${isListening ? '#dc3545' : '#6c757d'}` }}>
            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                    {isListening ? <Mic size={18} className="text-danger" /> : <MicOff size={18} className="text-muted" />}
                    <strong>🎤 Ambient Clinical Documentation</strong>
                    {isListening && <Badge bg="danger" className="pulse-animation">● RECORDING — {formatDuration(duration)}</Badge>}
                </div>
                <div className="d-flex gap-2">
                    {!isListening ? (
                        <Button size="sm" variant="danger" onClick={startListening}>🎤 Start Recording</Button>
                    ) : (
                        <Button size="sm" variant="outline-danger" onClick={stopListening}>⏹ Stop</Button>
                    )}
                    {transcript && !isListening && (
                        <Button size="sm" variant="primary" onClick={processTranscript} disabled={processing}>
                            {processing ? <Spinner size="sm" animation="border" /> : '🤖 Generate Note'}
                        </Button>
                    )}
                </div>
            </Card.Header>
            <Card.Body>
                {transcript ? (
                    <>
                        <Form.Group className="mb-2">
                            <Form.Label className="small text-muted">Raw Transcript</Form.Label>
                            <Form.Control as="textarea" rows={3} value={transcript} onChange={e => setTranscript(e.target.value)}
                                style={{ fontFamily: 'monospace', fontSize: '0.8rem', background: '#f8f9fa' }} />
                        </Form.Group>
                        {structuredNote && (
                            <Form.Group className="mb-2">
                                <Form.Label className="small text-muted">📝 Structured Note (AI-Generated)</Form.Label>
                                <Form.Control as="textarea" rows={8} value={structuredNote} onChange={e => setStructuredNote(e.target.value)}
                                    style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} />
                                <div className="d-flex gap-2 mt-2">
                                    <Button size="sm" variant={copied ? 'success' : 'outline-primary'} onClick={handleCopy}>
                                        {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy to Chart</>}
                                    </Button>
                                </div>
                            </Form.Group>
                        )}
                    </>
                ) : (
                    <div className="text-center text-muted py-4">
                        <FileText size={32} className="mb-2" />
                        <p className="small mb-0">Click "Start Recording" to begin ambient clinical documentation<br />
                        Speech will be transcribed in real-time and structured into a clinical note</p>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default AmbientListening;
