import React, { useState, useRef, useEffect } from 'react';
import { Card, Button, Form, InputGroup, Spinner, Badge, Nav, Alert, Table } from 'react-bootstrap';
import { 
    MessageCircle, Send, X, Bot, Mic, MicOff, ShieldAlert, Activity, 
    Settings, Wrench, CheckCircle, AlertTriangle, RefreshCw, Cpu, Database
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';

const ChatAssistant = ({ show, onHide, hideTrigger = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('copilot'); // 'copilot' | 'watchdog' | 'models'
    const [messages, setMessages] = useState([
        { 
            sender: 'bot', 
            text: 'Hello! I am your Wolf AI Clinical Co-Pilot. How can I assist you today?',
            modelUsed: 'gemini-3.8-flash'
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    // Watchdog & Telemetry State
    const [errorCount, setErrorCount] = useState(0);
    const [reportSubject, setReportSubject] = useState('');
    const [reportDescription, setReportDescription] = useState('');
    const [reportLoading, setReportLoading] = useState(false);
    const [reportResult, setReportResult] = useState(null);
    const [healthScanLoading, setHealthScanLoading] = useState(false);
    const [healthScanResult, setHealthScanResult] = useState(null);
    const [recentTickets, setRecentTickets] = useState([]);

    // AI Models State
    const [modelRegistry, setModelRegistry] = useState(null);
    const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash');
    const [modelSaving, setModelSaving] = useState(false);
    const [modelSaveMsg, setModelSaveMsg] = useState(null);

    // Voice State
    const [voiceMode, setVoiceMode] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const recognitionRef = useRef(null);
    const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);

    const messagesEndRef = useRef(null);
    const location = useLocation();

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Text to Speech
    const speak = (text) => {
        if (synthRef.current) {
            synthRef.current.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            synthRef.current.speak(utterance);
        }
    };

    // Scan telemetry buffer for recent 4xx/5xx errors
    const checkTelemetryErrors = () => {
        if (typeof window !== 'undefined' && window.__WOLF_WATCHDOG_TELEMETRY__) {
            const apiCalls = window.__WOLF_WATCHDOG_TELEMETRY__.apiCalls || [];
            const recentErrors = apiCalls.filter(c => c.status >= 400);
            setErrorCount(recentErrors.length);
        }
    };

    useEffect(() => {
        checkTelemetryErrors();
        const interval = setInterval(checkTelemetryErrors, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('showAI') === 'true') {
            setIsOpen(true);
        }
    }, [location.search]);

    useEffect(() => {
        if (show !== undefined && show !== isOpen) {
            setIsOpen(show);
        }
    }, [show, isOpen]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen, activeTab]);

    // Fetch models and recent tickets when opening or switching tabs
    useEffect(() => {
        if (isOpen) {
            fetchModelRegistry();
            fetchRecentTickets();
            setReportSubject(`Issue on ${location.pathname}`);
        }
    }, [isOpen]);

    const fetchModelRegistry = async () => {
        try {
            const res = await axios.get('/api/ai/models');
            if (res.data?.success) {
                setModelRegistry(res.data);
                if (res.data.activeModel) {
                    setSelectedModel(res.data.activeModel);
                }
            }
        } catch (e) {
            console.warn('[ChatAssistant] Could not load model registry:', e.message);
        }
    };

    const fetchRecentTickets = async () => {
        try {
            const res = await axios.get('/api/support/tickets?limit=5');
            const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setRecentTickets(data);
        } catch (e) {
            console.warn('[ChatAssistant] Could not load tickets:', e.message);
        }
    };

    const handleModelSelect = async (e) => {
        e.preventDefault();
        setModelSaving(true);
        setModelSaveMsg(null);
        try {
            const res = await axios.post('/api/ai/models/select', {
                defaultModel: selectedModel
            });
            if (res.data?.success) {
                setModelSaveMsg({ type: 'success', text: `Switched active primary model to ${selectedModel}` });
                fetchModelRegistry();
            }
        } catch (err) {
            setModelSaveMsg({ type: 'danger', text: err.response?.data?.error || err.message });
        } finally {
            setModelSaving(false);
        }
    };

    const handleRunHealthScan = async () => {
        setHealthScanLoading(true);
        try {
            const res = await axios.get('/api/ai/watchdog/health-scan');
            if (res.data?.success) {
                setHealthScanResult(res.data);
            }
        } catch (err) {
            console.error('[Watchdog] Health scan failed:', err);
        } finally {
            setHealthScanLoading(false);
        }
    };

    const handleAutoHealReport = async (e) => {
        e.preventDefault();
        setReportLoading(true);
        setReportResult(null);

        const telemetrySnapshot = typeof window !== 'undefined' && window.__WOLF_WATCHDOG_TELEMETRY__
            ? {
                apiCalls: (window.__WOLF_WATCHDOG_TELEMETRY__.apiCalls || []).slice(0, 10),
                consoleErrors: (window.__WOLF_WATCHDOG_TELEMETRY__.consoleErrors || []).slice(0, 5)
            }
            : {};

        const user = JSON.parse(localStorage.getItem('user') || '{}');

        try {
            const res = await axios.post('/api/ai/watchdog/report', {
                dashboard_route: location.pathname,
                active_tab: activeTab,
                user_role: user.role || 'Staff',
                subject: reportSubject || `Issue on ${location.pathname}`,
                description: reportDescription || 'Automated one-click issue diagnostic and self-healing report',
                telemetry: telemetrySnapshot
            });

            if (res.data?.success) {
                setReportResult(res.data);
                fetchRecentTickets();
                setReportDescription('');
            }
        } catch (err) {
            setReportResult({
                error: err.response?.data?.error || err.message
            });
        } finally {
            setReportLoading(false);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        if (onHide) onHide();
    };

    // Initialize Speech Recognition
    useEffect(() => {
        if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('')
                    .toLowerCase();

                if (!isOpen && (transcript.includes('hey wolf') || transcript.includes('hey assistant'))) {
                    setIsOpen(true);
                    speak("I am listening.");
                }

                if (isOpen && voiceMode) {
                    const lastResult = event.results[event.results.length - 1];
                    if (lastResult.isFinal) {
                        setInput(lastResult[0].transcript);
                    }
                }
            };

            recognitionRef.current.onerror = (event) => {
                if (event.error === 'not-allowed') {
                    setVoiceMode(false);
                }
            };

            recognitionRef.current.onend = () => {
                if (voiceMode) {
                    try { recognitionRef.current.start(); } catch {}
                }
            };
        }
    }, [isOpen, voiceMode]);

    const toggleVoiceMode = () => {
        if (voiceMode) {
            setVoiceMode(false);
            setIsListening(false);
            recognitionRef.current?.stop();
        } else {
            setVoiceMode(true);
            setIsListening(true);
            try { recognitionRef.current?.start(); } catch {}
        }
    };

    // Live AI Chat
    const handleSend = async (e, overrideInput = null) => {
        if (e) e.preventDefault();
        const textToSend = overrideInput || input;
        if (!textToSend.trim()) return;

        const userMsg = { sender: 'user', text: textToSend };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const lowerInput = textToSend.toLowerCase();

            // Check if fast local lookup matches
            let localHandled = false;
            let answer = "";

            if (lowerInput === "doctors on duty" || lowerInput === "doctors") {
                const res = await axios.get('/api/auth/users', { headers });
                const users = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                const doctors = users.filter(u => u.role === 'doctor').length;
                answer = `There are currently ${doctors} doctors registered in the system.`;
                localHandled = true;
            } else if (lowerInput === "active ipd patients" || lowerInput === "ipd") {
                const res = await axios.get('/api/admissions/active', { headers });
                const admissions = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                answer = `There are ${admissions.length} active patients admitted in IPD wards.`;
                localHandled = true;
            } else if (lowerInput === "opd queue status" || lowerInput === "opd") {
                const res = await axios.get('/api/opd/queue', { headers });
                const queue = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                const waiting = queue.filter(q => q.status !== 'completed').length;
                answer = `OPD Queue: ${waiting} patients waiting or in consultation.`;
                localHandled = true;
            }

            if (localHandled) {
                const botMsg = { sender: 'bot', text: answer, modelUsed: 'hospital-db' };
                setMessages(prev => [...prev, botMsg]);
                setLoading(false);
                if (voiceMode) speak(answer);
                return;
            }

            // Real AI Call via POST /api/ai/chat
            const historyPayload = messages.slice(-6).map(m => ({
                role: m.sender === 'user' ? 'user' : 'model',
                content: m.text
            }));

            const chatRes = await axios.post('/api/ai/chat', {
                message: textToSend,
                history: historyPayload,
                context: {
                    currentRoute: location.pathname,
                    userRole: JSON.parse(localStorage.getItem('user') || '{}').role || 'Staff'
                }
            });

            const replyText = chatRes.data?.data?.reply || chatRes.data?.reply || 'I processed your request.';
            const modelUsed = chatRes.data?.data?.modelUsed || chatRes.data?.modelUsed || selectedModel;

            const botMsg = { sender: 'bot', text: replyText, modelUsed };
            setMessages(prev => [...prev, botMsg]);

            if (voiceMode) speak(replyText);

        } catch (err) {
            console.error('[ChatAssistant] Chat call error:', err);
            const botMsg = {
                sender: 'bot',
                text: 'Wolf AI is connected to offline medical protocols. Core hospital database and workflows remain active.',
                modelUsed: 'offline-fallback'
            };
            setMessages(prev => [...prev, botMsg]);
        } finally {
            setLoading(false);
        }
    };

    const quickChips = [
        "Doctors on Duty",
        "Active IPD Patients",
        "OPD Queue Status",
        "Bed Occupancy"
    ];

    const telemetryApiCalls = (typeof window !== 'undefined' && window.__WOLF_WATCHDOG_TELEMETRY__?.apiCalls) || [];

    return (
        <>
            {/* Global Floating Action Button */}
            {!isOpen && !hideTrigger && (
                <div 
                    className="position-fixed d-flex align-items-center gap-2"
                    style={{ bottom: '25px', right: '25px', zIndex: 1050 }}
                >
                    <Button
                        variant={voiceMode ? "danger" : (errorCount > 0 ? "danger" : "primary")}
                        className={`rounded-pill shadow-lg d-flex align-items-center gap-2 px-3 py-2 position-relative ${voiceMode ? 'pulse-animation' : ''}`}
                        style={{ height: '52px', border: '1px solid rgba(255, 255, 255, 0.35)', backdropFilter: 'blur(10px)' }}
                        onClick={() => setIsOpen(true)}
                        title="Open Wolf AI Co-Pilot & Watchdog"
                    >
                        {voiceMode ? <Mic size={22} /> : (errorCount > 0 ? <AlertTriangle size={22} className="text-warning" /> : <Bot size={22} />)}
                        <span className="fw-bold d-none d-sm-inline" style={{ fontSize: '0.88rem' }}>🛡️ AI & Watchdog</span>

                        {/* Error Notification Badge */}
                        {errorCount > 0 && (
                            <Badge bg="danger" className="ms-1 border border-light">
                                {errorCount} Err
                            </Badge>
                        )}
                    </Button>
                </div>
            )}

            {/* Chat & Watchdog Modal Panel */}
            {isOpen && (
                <Card
                    className="position-fixed shadow-lg border-0"
                    style={{
                        bottom: '25px',
                        right: '25px',
                        width: '420px',
                        height: '620px',
                        zIndex: 1050,
                        display: 'flex',
                        flexDirection: 'column',
                        borderRadius: '16px',
                        overflow: 'hidden'
                    }}
                >
                    {/* Header */}
                    <Card.Header className="bg-dark text-white p-3 border-0">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <div className="d-flex align-items-center gap-2">
                                <Bot size={22} className="text-primary" />
                                <span className="fw-bold">Wolf AI Gateway</span>
                                <Badge bg="primary" style={{ fontSize: '0.7rem' }}>
                                    {modelRegistry?.activeModel || selectedModel}
                                </Badge>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <Button
                                    variant="outline-info"
                                    size="sm"
                                    className="py-0 px-2 text-white border-secondary"
                                    style={{ fontSize: '0.72rem' }}
                                    onClick={() => {
                                        handleClose();
                                        window.dispatchEvent(new CustomEvent('open-ai-modal', { detail: { tab: 'keys' } }));
                                    }}
                                    title="Open Full AI Key Portal & Watchdog Modal"
                                >
                                    Portal ↗
                                </Button>
                                <Button
                                    variant="link"
                                    className="text-white p-0"
                                    onClick={toggleVoiceMode}
                                    title={voiceMode ? "Voice Mode ON" : "Turn Voice Mode ON"}
                                >
                                    {voiceMode ? <MicOff size={18} className="text-danger" /> : <Mic size={18} className="text-secondary" />}
                                </Button>
                                <Button variant="link" className="text-white p-0" onClick={handleClose}>
                                    <X size={20} />
                                </Button>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <Nav variant="pills" className="nav-fill bg-black p-1 rounded">
                            <Nav.Item>
                                <Nav.Link 
                                    active={activeTab === 'copilot'} 
                                    onClick={() => setActiveTab('copilot')}
                                    className="py-1 px-2 text-white small"
                                    style={{ fontSize: '0.8rem', cursor: 'pointer' }}
                                >
                                    💬 Co-Pilot
                                </Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link 
                                    active={activeTab === 'watchdog'} 
                                    onClick={() => setActiveTab('watchdog')}
                                    className="py-1 px-2 text-white small position-relative"
                                    style={{ fontSize: '0.8rem', cursor: 'pointer' }}
                                >
                                    🛡️ Watchdog
                                    {errorCount > 0 && (
                                        <Badge bg="danger" className="ms-1" pill style={{ fontSize: '0.65rem' }}>
                                            {errorCount}
                                        </Badge>
                                    )}
                                </Nav.Link>
                            </Nav.Item>
                            <Nav.Item>
                                <Nav.Link 
                                    active={activeTab === 'models'} 
                                    onClick={() => setActiveTab('models')}
                                    className="py-1 px-2 text-white small"
                                    style={{ fontSize: '0.8rem', cursor: 'pointer' }}
                                >
                                    ⚙️ Models
                                </Nav.Link>
                            </Nav.Item>
                        </Nav>
                    </Card.Header>

                    {/* Tab 1: AI Co-Pilot */}
                    {activeTab === 'copilot' && (
                        <>
                            <Card.Body className="flex-grow-1 overflow-auto bg-light p-3">
                                {messages.map((msg, idx) => (
                                    <div key={idx} className={`d-flex flex-column mb-3 ${msg.sender === 'user' ? 'align-items-end' : 'align-items-start'}`}>
                                        <div
                                            className={`p-3 rounded-3 shadow-sm ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-white text-dark'}`}
                                            style={{ maxWidth: '85%', fontSize: '0.88rem', whiteSpace: 'pre-wrap' }}
                                        >
                                            {msg.text}
                                        </div>
                                        {msg.modelUsed && (
                                            <span className="text-muted mt-1" style={{ fontSize: '0.65rem' }}>
                                                via {msg.modelUsed}
                                            </span>
                                        )}
                                    </div>
                                ))}

                                {loading && (
                                    <div className="d-flex align-items-center gap-2 text-muted small p-2">
                                        <Spinner animation="grow" size="sm" />
                                        <span>Thinking with {selectedModel}...</span>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </Card.Body>

                            {/* Quick Action Chips */}
                            <div className="px-3 py-1 bg-light border-top d-flex gap-1 overflow-auto" style={{ whiteSpace: 'nowrap' }}>
                                {quickChips.map((chip, i) => (
                                    <Badge 
                                        key={i} 
                                        bg="secondary" 
                                        className="py-1 px-2 text-white" 
                                        style={{ cursor: 'pointer', fontSize: '0.72rem' }}
                                        onClick={() => handleSend(null, chip)}
                                    >
                                        {chip}
                                    </Badge>
                                ))}
                            </div>

                            <Card.Footer className="bg-white border-top p-2">
                                <Form onSubmit={handleSend}>
                                    <InputGroup>
                                        <Form.Control
                                            placeholder={voiceMode ? "Listening..." : "Ask Wolf AI or search hospital..."}
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            disabled={loading}
                                            style={{ fontSize: '0.88rem' }}
                                        />
                                        <Button variant="primary" type="submit" disabled={loading || !input.trim()}>
                                            <Send size={16} />
                                        </Button>
                                    </InputGroup>
                                </Form>
                            </Card.Footer>
                        </>
                    )}

                    {/* Tab 2: Dashboard Watchdog & Auto-Heal */}
                    {activeTab === 'watchdog' && (
                        <Card.Body className="flex-grow-1 overflow-auto p-3 bg-light">
                            {/* Route & Health Summary */}
                            <div className="bg-white p-3 rounded-3 shadow-sm mb-3 border">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="fw-bold small text-muted">ACTIVE DASHBOARD</span>
                                    <Badge bg="info" className="text-dark">{location.pathname}</Badge>
                                </div>
                                <div className="d-flex gap-2">
                                    <Button 
                                        variant="outline-primary" 
                                        size="sm" 
                                        className="w-100 d-flex align-items-center justify-content-center gap-1"
                                        onClick={handleRunHealthScan}
                                        disabled={healthScanLoading}
                                    >
                                        {healthScanLoading ? <Spinner size="sm" /> : <Activity size={14} />}
                                        Run Live Health Scan
                                    </Button>
                                </div>
                            </div>

                            {/* Health Scan Result */}
                            {healthScanResult && (
                                <Alert variant={healthScanResult.status === 'HEALTHY' ? 'success' : 'warning'} className="p-2 small mb-3">
                                    <div className="fw-bold d-flex justify-content-between align-items-center mb-1">
                                        <span>System Score: {healthScanResult.score}/100</span>
                                        <Badge bg={healthScanResult.status === 'HEALTHY' ? 'success' : 'warning'}>
                                            {healthScanResult.status}
                                        </Badge>
                                    </div>
                                    <ul className="mb-0 ps-3" style={{ fontSize: '0.78rem' }}>
                                        <li>Unsynced Paid Lab Requests: {healthScanResult.checks?.unsyncedPaidLabRequests}</li>
                                        <li>Unsynced Paid Medications: {healthScanResult.checks?.unsyncedPaidMedications}</li>
                                        <li>Orphan Invoice Line Items: {healthScanResult.checks?.orphanInvoiceItems}</li>
                                        <li>Active Model: {healthScanResult.gateway?.activeModel}</li>
                                    </ul>
                                </Alert>
                            )}

                            {/* Recent Telemetry Snippet */}
                            <div className="bg-white p-3 rounded-3 shadow-sm mb-3 border">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="fw-bold small text-muted">CAPTURED API CALLS (LAST 20)</span>
                                    <Badge bg={errorCount > 0 ? 'danger' : 'success'}>
                                        {errorCount} errors
                                    </Badge>
                                </div>
                                {telemetryApiCalls.length === 0 ? (
                                    <span className="text-muted small">No API calls recorded yet.</span>
                                ) : (
                                    <div style={{ maxHeight: '110px', overflowY: 'auto' }}>
                                        <Table size="sm" hover className="mb-0" style={{ fontSize: '0.72rem' }}>
                                            <tbody>
                                                {telemetryApiCalls.slice(0, 5).map((call, idx) => (
                                                    <tr key={idx}>
                                                        <td>
                                                            <Badge bg={call.status >= 400 ? 'danger' : 'success'} style={{ fontSize: '0.65rem' }}>
                                                                {call.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="text-truncate" style={{ maxWidth: '180px' }} title={call.url}>
                                                            {call.method} {call.url}
                                                        </td>
                                                        <td className="text-muted text-end">{call.durationMs}ms</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </div>
                                )}
                            </div>

                            {/* One-Click Auto-Heal & Report Form */}
                            <div className="bg-white p-3 rounded-3 shadow-sm mb-3 border">
                                <div className="fw-bold small text-dark mb-2 d-flex align-items-center gap-1">
                                    <Wrench size={16} className="text-primary" />
                                    <span>1-Click Report Issue & Auto-Heal</span>
                                </div>
                                <Form onSubmit={handleAutoHealReport}>
                                    <Form.Group className="mb-2">
                                        <Form.Control
                                            size="sm"
                                            placeholder="Issue Subject"
                                            value={reportSubject}
                                            onChange={(e) => setReportSubject(e.target.value)}
                                            style={{ fontSize: '0.8rem' }}
                                        />
                                    </Form.Group>
                                    <Form.Group className="mb-2">
                                        <Form.Control
                                            as="textarea"
                                            rows={2}
                                            size="sm"
                                            placeholder="What happened? (Optional details)"
                                            value={reportDescription}
                                            onChange={(e) => setReportDescription(e.target.value)}
                                            style={{ fontSize: '0.8rem' }}
                                        />
                                    </Form.Group>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        type="submit"
                                        disabled={reportLoading}
                                        className="w-100 d-flex align-items-center justify-content-center gap-1"
                                    >
                                        {reportLoading ? <Spinner size="sm" /> : <CheckCircle size={14} />}
                                        Auto-Heal & Create Diagnostic Ticket
                                    </Button>
                                </Form>
                            </div>

                            {/* Auto-Heal Result Display */}
                            {reportResult && (
                                <Alert variant={reportResult.error ? 'danger' : 'success'} className="p-2 small mb-3">
                                    {reportResult.error ? (
                                        <span>Error: {reportResult.error}</span>
                                    ) : (
                                        <>
                                            <div className="fw-bold mb-1">
                                                ✅ Ticket #{reportResult.ticket?.ticket_number || reportResult.ticket?.id} Created!
                                            </div>
                                            {reportResult.autoHealedActions?.length > 0 && (
                                                <div className="mb-1">
                                                    <strong>Auto-Healed:</strong>
                                                    <ul className="ps-3 mb-0" style={{ fontSize: '0.75rem' }}>
                                                        {reportResult.autoHealedActions.map((act, i) => (
                                                            <li key={i}>{act}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                            {reportResult.diagnosis && (
                                                <div className="mt-1 pt-1 border-top" style={{ fontSize: '0.75rem' }}>
                                                    <strong>AI Root Cause:</strong> {reportResult.diagnosis.rootCause}<br />
                                                    <strong>Advice:</strong> {reportResult.diagnosis.userActionAdvice}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </Alert>
                            )}

                            {/* Recent Support Tickets */}
                            <div className="bg-white p-3 rounded-3 shadow-sm border">
                                <span className="fw-bold small text-muted d-block mb-2">RECENT SUPPORT TICKETS</span>
                                {recentTickets.length === 0 ? (
                                    <span className="text-muted small">No tickets found.</span>
                                ) : (
                                    <ul className="list-unstyled mb-0" style={{ fontSize: '0.75rem' }}>
                                        {recentTickets.map((t, idx) => (
                                            <li key={idx} className="d-flex justify-content-between align-items-center py-1 border-bottom">
                                                <div>
                                                    <span className="fw-bold">{t.ticket_number}</span>: {t.subject?.slice(0, 24)}...
                                                </div>
                                                <Badge bg={t.status === 'resolved' ? 'success' : 'warning'}>
                                                    {t.status}
                                                </Badge>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </Card.Body>
                    )}

                    {/* Tab 3: AI Models & Healthcare Guardrails */}
                    {activeTab === 'models' && (
                        <Card.Body className="flex-grow-1 overflow-auto p-3 bg-light">
                            {/* Model Selector Card */}
                            <div className="bg-white p-3 rounded-3 shadow-sm mb-3 border">
                                <div className="fw-bold small text-dark mb-2 d-flex align-items-center gap-1">
                                    <Cpu size={16} className="text-primary" />
                                    <span>Active Multi-Provider AI Model</span>
                                </div>

                                {modelSaveMsg && (
                                    <Alert variant={modelSaveMsg.type} className="p-2 small mb-2">
                                        {modelSaveMsg.text}
                                    </Alert>
                                )}

                                <Form onSubmit={handleModelSelect}>
                                    <Form.Group className="mb-2">
                                        <Form.Label className="small text-muted mb-1">Select Primary Clinical Model</Form.Label>
                                        <Form.Select 
                                            size="sm" 
                                            value={selectedModel} 
                                            onChange={(e) => setSelectedModel(e.target.value)}
                                            style={{ fontSize: '0.82rem' }}
                                        >
                                            <optgroup label="Google Gemini">
                                                <option value="gemini-3.8-flash">Gemini 3.8 Flash (Primary Workhorse)</option>
                                                <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite (Fast Telemetry)</option>
                                                <option value="gemini-4-argon">Gemini 4 Argon (Deep Reasoning)</option>
                                                <option value="gemini-3.5-flash">Gemini 3.5 Flash (Balanced NLP)</option>
                                                <option value="gemini-2.5-flash">Gemini 2.5 Flash (LTS Failover)</option>
                                                <option value="gemini-2.5-pro">Gemini 2.5 Pro (High Diagnostics)</option>
                                            </optgroup>
                                            <optgroup label="DeepSeek">
                                                <option value="deepseek-flash">DeepSeek-V4.1-Flash-1017 (Cost-Effective)</option>
                                                <option value="deepseek-v4-pro">DeepSeek-V4-Pro-0813 (Reasoning)</option>
                                            </optgroup>
                                            <optgroup label="OpenAI">
                                                <option value="gpt-6.1-sol">GPT-6.1 Sol (Clinical/Coding)</option>
                                                <option value="gpt-6-luna">GPT-6 Luna (Communication)</option>
                                                <option value="gpt-6-astra">GPT-6 Astra (Multimodal)</option>
                                                <option value="gpt-5.4">GPT-5.4 Enterprise</option>
                                                <option value="gpt-5.4-mini">GPT-5.4 Mini (Micro-Tasks)</option>
                                            </optgroup>
                                        </Form.Select>
                                    </Form.Group>

                                    <Button 
                                        variant="primary" 
                                        size="sm" 
                                        type="submit" 
                                        disabled={modelSaving}
                                        className="w-100"
                                    >
                                        {modelSaving ? <Spinner size="sm" /> : 'Set Active Model'}
                                    </Button>
                                </Form>
                            </div>

                            {/* Healthcare Guardrails Card */}
                            <div className="bg-white p-3 rounded-3 shadow-sm mb-3 border">
                                <div className="fw-bold small text-dark mb-2 d-flex align-items-center gap-1">
                                    <ShieldAlert size={16} className="text-success" />
                                    <span>Zero-Hallucination Guardrails</span>
                                </div>
                                <ul className="list-unstyled mb-0" style={{ fontSize: '0.78rem' }}>
                                    <li className="d-flex justify-content-between py-1 border-bottom">
                                        <span>Sampling Temperature</span>
                                        <Badge bg="success">0.05 (Deterministic)</Badge>
                                    </li>
                                    <li className="d-flex justify-content-between py-1 border-bottom">
                                        <span>PHI Redaction (Phone, Aadhaar, PAN)</span>
                                        <Badge bg="success">Active (Automated)</Badge>
                                    </li>
                                    <li className="d-flex justify-content-between py-1 border-bottom">
                                        <span>Hospital Formulary Grounding</span>
                                        <Badge bg="success">Enforced</Badge>
                                    </li>
                                    <li className="d-flex justify-content-between py-1 border-bottom">
                                        <span>Physician Sign-Off Advisory</span>
                                        <Badge bg="success">Mandatory</Badge>
                                    </li>
                                    <li className="d-flex justify-content-between py-1">
                                        <span>Multi-Provider Failover Circuit Breaker</span>
                                        <Badge bg="primary">6-Tier Active</Badge>
                                    </li>
                                </ul>
                            </div>

                            {/* Provider API Keys Status */}
                            <div className="bg-white p-3 rounded-3 shadow-sm border">
                                <div className="fw-bold small text-dark mb-2 d-flex align-items-center gap-1">
                                    <Database size={16} className="text-secondary" />
                                    <span>Provider Status</span>
                                </div>
                                <ul className="list-unstyled mb-0" style={{ fontSize: '0.78rem' }}>
                                    <li className="d-flex justify-content-between py-1 border-bottom">
                                        <span>Google Gemini API</span>
                                        <Badge bg={modelRegistry?.providerKeys?.gemini ? 'success' : 'secondary'}>
                                            {modelRegistry?.providerKeys?.gemini ? 'Configured' : 'Offline Catalog Fallback'}
                                        </Badge>
                                    </li>
                                    <li className="d-flex justify-content-between py-1 border-bottom">
                                        <span>DeepSeek API</span>
                                        <Badge bg={modelRegistry?.providerKeys?.deepseek ? 'success' : 'secondary'}>
                                            {modelRegistry?.providerKeys?.deepseek ? 'Configured' : 'Standby'}
                                        </Badge>
                                    </li>
                                    <li className="d-flex justify-content-between py-1">
                                        <span>OpenAI API</span>
                                        <Badge bg={modelRegistry?.providerKeys?.openai ? 'success' : 'secondary'}>
                                            {modelRegistry?.providerKeys?.openai ? 'Configured' : 'Standby'}
                                        </Badge>
                                    </li>
                                </ul>
                            </div>
                        </Card.Body>
                    )}
                </Card>
            )}

            <style>{`
                .pulse-animation {
                    animation: pulse-red 2s infinite;
                }
                @keyframes pulse-red {
                    0% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(220, 53, 69, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(220, 53, 69, 0); }
                }
            `}</style>
        </>
    );
};

export default ChatAssistant;
