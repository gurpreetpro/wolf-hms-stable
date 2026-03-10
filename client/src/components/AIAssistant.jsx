import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Form, Alert, Badge, Spinner, Collapse, ListGroup, Nav, Tab } from 'react-bootstrap';
import {
    Brain,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Pill,
    Stethoscope,
    ChevronDown,
    ChevronUp,
    Shield,
    Beaker,
    Mic,
    MicOff,
    MessageSquare,
    FileText,
    Send
} from 'lucide-react';
import axios from 'axios';

const AIAssistant = ({ patientInfo, currentMedications = [], onSuggestion }) => {
    const [activeTab, setActiveTab] = useState('clinical');
    const [expanded, setExpanded] = useState(true);
    const [error, setError] = useState(null);

    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    // --- CLINICAL TAB STATES ---
    const [symptoms, setSymptoms] = useState('');
    const [analyzing, setAnalyzing] = useState(false);
    const [checkingDrugs, setCheckingDrugs] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [drugCheckResult, setDrugCheckResult] = useState(null);

    // --- CHAT TAB STATES ---
    const [chatHistory, setChatHistory] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    // --- SCRIBE TAB STATES ---
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [scribeLoading, setScribeLoading] = useState(false);
    const [scribeResult, setScribeResult] = useState(null);
    const recognitionRef = useRef(null);

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                if (finalTranscript) {
                    setTranscript(prev => prev + ' ' + finalTranscript);
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };
        }
    }, []);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            setTranscript('');
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    // --- API HANDLERS ---

    const handleSymptomAnalysis = async () => {
        if (!symptoms.trim()) return;
        setAnalyzing(true);
        setError(null);
        try {
            const res = await axios.post('/api/ai/symptoms', {
                symptoms: symptoms.split(',').map(s => s.trim()),
                patientInfo
            }, config);
            setAnalysisResult(res.data);
        } catch (err) {
            setError('Failed to analyze symptoms');
        } finally {
            setAnalyzing(false);
        }
    };

    const handleDrugCheck = async () => {
        if (currentMedications.length < 2) return setError('Need 2+ meds');
        setCheckingDrugs(true);
        setError(null);
        try {
            const res = await axios.post('/api/ai/drug-check', {
                medications: currentMedications.map(m => m.medication || m.name || m)
            }, config);
            setDrugCheckResult(res.data);
        } catch (err) {
            setError('Drug check failed');
        } finally {
            setCheckingDrugs(false);
        }
    };

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const userMsg = { role: 'user', content: chatInput };
        setChatHistory(prev => [...prev, userMsg]);
        setChatInput('');
        setChatLoading(true);

        try {
            const res = await axios.post('/api/ai/chat', {
                history: chatHistory.concat(userMsg),
                message: userMsg.content,
                context: { patientInfo, currentMedications }
            }, config);
            
            setChatHistory(prev => [...prev, { role: 'model', content: res.data.reply }]);
        } catch (err) {
            setChatHistory(prev => [...prev, { role: 'model', content: "Error: Could not reach Wolf AI." }]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleScribe = async () => {
        if (!transcript.trim()) return;
        setScribeLoading(true);
        try {
            const res = await axios.post('/api/ai/scribe', {
                transcript,
                patientInfo
            }, config);
            setScribeResult(res.data);
        } catch (err) {
            setError('Scribe failed');
        } finally {
            setScribeLoading(false);
        }
    };

    // --- HELPERS ---
    const getSeverityColor = (s) => s === 'severe' ? 'danger' : s === 'moderate' ? 'warning' : 'info';


    return (
        <Card className="shadow-sm border-0 mb-4">
            <Card.Header
                className="bg-gradient text-white d-flex align-items-center justify-content-between"
                style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)', cursor: 'pointer' }}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="d-flex align-items-center gap-2">
                    <Brain size={20} />
                    <span className="fw-semibold">Wolf AI Agent</span>
                    <Badge bg="light" text="dark" className="ms-2">v2.0 (Alpha)</Badge>
                </div>
                {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </Card.Header>

            <Collapse in={expanded}>
                <Card.Body className="p-0">
                    <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
                        <Nav variant="tabs" className="bg-light px-3 pt-2">
                            <Nav.Item>
                                <Nav.Link eventKey="clinical" className="d-flex align-items-center gap-2">
                                    <Stethoscope size={16} /> Clinical
                                </Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="chat" className="d-flex align-items-center gap-2">
                                    <MessageSquare size={16} /> Chat
                                </Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link eventKey="scribe" className="d-flex align-items-center gap-2">
                                    <FileText size={16} /> Scribe Mode
                                </Nav.Link>
                            </Nav.Item>
                        </Nav>

                        <div className="p-3">
                            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}

                            <Tab.Content>
                                {/* CLINICAL TAB (Original Logic) */}
                                <Tab.Pane eventKey="clinical">
                                    {/* Drug Check */}
                                    <div className="mb-4">
                                        <div className="d-flex justify-content-between mb-2">
                                        <h6 className="fw-bold"><Pill size={16} className="me-1"/>Drug Safety</h6>
                                            <Button size="sm" variant="outline-primary" onClick={handleDrugCheck} disabled={checkingDrugs || currentMedications.length < 2}>
                                                {checkingDrugs ? <Spinner size="sm"/> : 'Check Interactions'}
                                            </Button>
                                        </div>
                                        {drugCheckResult?.hasInteractions ? (
                                            <Alert variant="warning">
                                                <strong>{drugCheckResult.interactionCount} Interactions Found</strong>
                                                <ListGroup variant="flush" className="mt-2 bg-transparent">
                                                    {drugCheckResult.interactions.map((int, i) => (
                                                        <ListGroup.Item key={i} className="bg-transparent px-0 py-1">
                                                            <Badge bg={getSeverityColor(int.severity)} className="me-2">{int.severity}</Badge>
                                                            {int.drug1} + {int.drug2}
                                                        </ListGroup.Item>
                                                    ))}
                                                </ListGroup>
                                            </Alert>
                                        ) : drugCheckResult ? <Alert variant="success">No interactions found.</Alert> : null}
                                    </div>
                                    
                                    <hr />

                                    {/* Symptom Check */}
                                    <h6 className="fw-bold mb-2"><Brain size={16} className="me-1"/>Symptom Analysis</h6>
                                    <div className="input-group mb-3">
                                        <Form.Control 
                                            placeholder="Enter symptoms..." 
                                            value={symptoms} 
                                            onChange={e => setSymptoms(e.target.value)}
                                        />
                                        <Button variant="outline-success" onClick={handleSymptomAnalysis} disabled={analyzing}>
                                            {analyzing ? <Spinner size="sm"/> : 'Analyze'}
                                        </Button>
                                    </div>
                                    
                                    {analysisResult && (
                                        <div className="bg-light p-3 rounded">
                                            {analysisResult.differentialDiagnoses?.map((dx, i) => (
                                                <div key={i} className="mb-2">
                                                    <strong>{dx.condition}</strong> <Badge bg="secondary">{dx.probability}</Badge>
                                                    <div className="small text-muted">{dx.reasoning}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Tab.Pane>

                                {/* CHAT TAB */}
                                <Tab.Pane eventKey="chat">
                                    <div className="d-flex flex-column" style={{ height: '300px' }}>
                                        <div className="flex-grow-1 overflow-auto border rounded p-3 mb-3 bg-light">
                                            {chatHistory.length === 0 && <div className="text-center text-muted mt-5">Ask Wolf AI about the patient...</div>}
                                            {chatHistory.map((msg, idx) => (
                                                <div key={idx} className={`d-flex mb-2 ${msg.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                                                    <div className={`p-2 rounded ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-white border'}`} style={{ maxWidth: '80%' }}>
                                                        {msg.content}
                                                    </div>
                                                </div>
                                            ))}
                                            {chatLoading && <div className="text-muted small">Wolf AI is thinking...</div>}
                                        </div>
                                        <Form onSubmit={handleChatSubmit} className="d-flex gap-2">
                                            <Form.Control 
                                                value={chatInput} 
                                                onChange={e => setChatInput(e.target.value)} 
                                                placeholder="Type a message..."
                                            />
                                            <Button type="submit"><Send size={18}/></Button>
                                        </Form>
                                    </div>
                                </Tab.Pane>

                                {/* SCRIBE TAB */}
                                <Tab.Pane eventKey="scribe">
                                    <div className="text-center mb-3">
                                        <Button 
                                            variant={isListening ? "danger" : "outline-danger"} 
                                            size="lg" 
                                            className="rounded-circle p-4 mb-3"
                                            onClick={toggleListening}
                                        >
                                            {isListening ? <MicOff size={32} className="animate-pulse"/> : <Mic size={32}/>}
                                        </Button>
                                        <p className="text-muted">{isListening ? 'Listening... (Speak clearly)' : 'Tap mic to start recording'}</p>
                                    </div>

                                    <Form.Control 
                                        as="textarea" 
                                        rows={4} 
                                        value={transcript} 
                                        onChange={e => setTranscript(e.target.value)}
                                        placeholder="Transcript will appear here..."
                                        className="mb-3"
                                    />

                                    <Button className="w-100 mb-3" onClick={handleScribe} disabled={!transcript || scribeLoading}>
                                        {scribeLoading ? <Spinner size="sm" className="me-2"/> : <FileText size={18} className="me-2"/>}
                                        Generate SOAP Note
                                    </Button>

                                    {scribeResult && (
                                        <div className="border rounded p-3 bg-light">
                                            <h6>Generated SOAP Note</h6>
                                            <pre className="small mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                                                {JSON.stringify(scribeResult, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </Tab.Pane>
                            </Tab.Content>
                        </div>
                    </Tab.Container>
                </Card.Body>
            </Collapse>
        </Card>
    );
};

export default AIAssistant;
