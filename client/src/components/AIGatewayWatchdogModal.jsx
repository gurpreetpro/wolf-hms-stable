import React, { useState, useEffect, useRef } from 'react';
import { Modal, Tabs, Tab, Card, Button, Form, Badge, Table, Alert, Spinner, Row, Col } from 'react-bootstrap';
import {
    Key, ShieldCheck, ShieldAlert, Activity, Cpu, Zap, CheckCircle2,
    AlertTriangle, RefreshCw, Bot, Send, Lock, Sliders, Server,
    Eye, EyeOff, Database, Sparkles, Clock, ArrowRight, Layers
} from 'lucide-react';
import api from '../utils/axiosInstance';

const AIGatewayWatchdogModal = ({ show, onHide, initialTab = 'keys' }) => {
    const [activeTab, setActiveTab] = useState(initialTab);

    // Sync tab when opened with specific initialTab
    useEffect(() => {
        if (show && initialTab) {
            setActiveTab(initialTab);
        }
    }, [show, initialTab]);

    // ==========================================
    // TAB 1: AI API KEYS & MODELS STATE
    // ==========================================
    const [keysStatus, setKeysStatus] = useState({
        gemini: { configured: false, maskedKey: '', modelsCount: 5, status: 'NOT_CONFIGURED', providerName: 'Google Gemini' },
        deepseek: { configured: false, maskedKey: '', modelsCount: 2, status: 'NOT_CONFIGURED', providerName: 'DeepSeek AI' },
        openai: { configured: false, maskedKey: '', modelsCount: 5, status: 'NOT_CONFIGURED', providerName: 'OpenAI' }
    });
    const [defaultModel, setDefaultModel] = useState('gemini-3.8-flash');
    const [failoverChain, setFailoverChain] = useState([]);
    const [guardrails, setGuardrails] = useState({
        temperature: 0.05,
        strictGrounding: true,
        phiRedaction: true
    });
    const [modelRegistry, setModelRegistry] = useState({});
    const [keysLoading, setKeysLoading] = useState(false);
    const [keysMessage, setKeysMessage] = useState(null);

    // Key inputs
    const [geminiKeyInput, setGeminiKeyInput] = useState('');
    const [deepseekKeyInput, setDeepseekKeyInput] = useState('');
    const [openaiKeyInput, setOpenaiKeyInput] = useState('');

    const [showGeminiKey, setShowGeminiKey] = useState(false);
    const [showDeepseekKey, setShowDeepseekKey] = useState(false);
    const [showOpenaiKey, setShowOpenaiKey] = useState(false);

    // Test states
    const [testingProvider, setTestingProvider] = useState(null);
    const [testResults, setTestResults] = useState({});

    // Fetch keys & model metadata
    const fetchKeysData = async () => {
        setKeysLoading(true);
        try {
            const res = await api.get('/api/ai/keys');
            if (res.data?.success) {
                if (res.data.keysStatus) setKeysStatus(res.data.keysStatus);
                if (res.data.defaultModel) setDefaultModel(res.data.defaultModel);
                if (res.data.failoverChain) setFailoverChain(res.data.failoverChain);
                if (res.data.guardrails) setGuardrails(res.data.guardrails);
                if (res.data.MODEL_REGISTRY) setModelRegistry(res.data.MODEL_REGISTRY);
            }
        } catch (err) {
            console.error('[AIGatewayModal] Error fetching keys data:', err);
        } finally {
            setKeysLoading(false);
        }
    };

    useEffect(() => {
        if (show) {
            fetchKeysData();
        }
    }, [show]);

    // Save Provider Key
    const handleSaveKey = async (provider) => {
        setKeysLoading(true);
        setKeysMessage(null);
        try {
            const payload = {
                defaultModel,
                temperature: guardrails.temperature,
                strictGrounding: guardrails.strictGrounding,
                phiRedaction: guardrails.phiRedaction
            };

            if (provider === 'gemini' && geminiKeyInput.trim()) payload.geminiKey = geminiKeyInput.trim();
            if (provider === 'deepseek' && deepseekKeyInput.trim()) payload.deepseekKey = deepseekKeyInput.trim();
            if (provider === 'openai' && openaiKeyInput.trim()) payload.openaiKey = openaiKeyInput.trim();

            const res = await api.post('/api/ai/keys', payload);
            if (res.data?.success) {
                setKeysMessage({ type: 'success', text: `Successfully saved ${provider.toUpperCase()} credentials!` });
                if (res.data.keysStatus) setKeysStatus(res.data.keysStatus);
                if (provider === 'gemini') setGeminiKeyInput('');
                if (provider === 'deepseek') setDeepseekKeyInput('');
                if (provider === 'openai') setOpenaiKeyInput('');
            } else {
                setKeysMessage({ type: 'danger', text: res.data?.error || 'Failed to save key' });
            }
        } catch (err) {
            setKeysMessage({ type: 'danger', text: err.response?.data?.error || err.message });
        } finally {
            setKeysLoading(false);
        }
    };

    // Test Provider Key
    const handleTestKey = async (provider, specificKey = null, modelId = null) => {
        setTestingProvider(provider);
        setTestResults(prev => ({ ...prev, [provider]: { loading: true } }));
        try {
            const res = await api.post('/api/ai/keys/test', {
                provider,
                apiKey: specificKey || undefined,
                modelId: modelId || undefined
            });
            setTestResults(prev => ({
                ...prev,
                [provider]: {
                    loading: false,
                    success: res.data?.success,
                    latencyMs: res.data?.latencyMs,
                    message: res.data?.message || res.data?.error,
                    modelTested: res.data?.modelTested
                }
            }));
        } catch (err) {
            setTestResults(prev => ({
                ...prev,
                [provider]: {
                    loading: false,
                    success: false,
                    message: err.response?.data?.error || err.message
                }
            }));
        } finally {
            setTestingProvider(null);
        }
    };

    // Switch Default Model
    const handleSwitchModel = async (newModel) => {
        try {
            setDefaultModel(newModel);
            await api.post('/api/ai/models/select', { defaultModel: newModel });
            setKeysMessage({ type: 'success', text: `Active model switched to ${newModel}` });
        } catch (err) {
            setKeysMessage({ type: 'danger', text: 'Failed to switch default model' });
        }
    };

    // ==========================================
    // TAB 2: WATCHDOG & 1-CLICK HEAL STATE
    // ==========================================
    const [telemetryCalls, setTelemetryCalls] = useState([]);
    const [healthScan, setHealthScan] = useState(null);
    const [scanningHealth, setScanningHealth] = useState(false);
    const [reportSubject, setReportSubject] = useState('');
    const [reportDesc, setReportDesc] = useState('');
    const [reporting, setReporting] = useState(false);
    const [reportResult, setReportResult] = useState(null);
    const [openTickets, setOpenTickets] = useState([]);

    const syncTelemetry = () => {
        if (typeof window !== 'undefined' && window.__WOLF_WATCHDOG_TELEMETRY__) {
            setTelemetryCalls([...(window.__WOLF_WATCHDOG_TELEMETRY__.apiCalls || [])]);
        }
    };

    const fetchTickets = async () => {
        try {
            const res = await api.get('/api/support/tickets?hospital_id=1');
            if (res.data?.success && Array.isArray(res.data.tickets)) {
                setOpenTickets(res.data.tickets.slice(0, 5));
            }
        } catch (e) {
            // Non-critical
        }
    };

    useEffect(() => {
        if (show && activeTab === 'watchdog') {
            syncTelemetry();
            fetchTickets();
            const interval = setInterval(syncTelemetry, 2500);
            return () => clearInterval(interval);
        }
    }, [show, activeTab]);

    const runHealthScan = async () => {
        setScanningHealth(true);
        try {
            const res = await api.get('/api/ai/watchdog/health-scan?hospital_id=1');
            if (res.data?.success) {
                setHealthScan(res.data);
            }
        } catch (err) {
            console.error('Health scan error:', err);
        } finally {
            setScanningHealth(false);
        }
    };

    const handleReportIssue = async (e) => {
        e?.preventDefault();
        setReporting(true);
        setReportResult(null);

        let userRole = 'Staff';
        try {
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            if (u.role) userRole = u.role;
        } catch (_) {}

        try {
            const res = await api.post('/api/ai/watchdog/report', {
                dashboard_route: window.location.pathname,
                active_tab: activeTab,
                user_role: userRole,
                subject: reportSubject || `Watchdog issue on ${window.location.pathname}`,
                description: reportDesc || 'Automated error report from client telemetry',
                telemetry: {
                    apiCalls: (window.__WOLF_WATCHDOG_TELEMETRY__?.apiCalls || []).slice(0, 10),
                    userAgent: navigator.userAgent
                }
            });

            if (res.data?.success) {
                setReportResult(res.data);
                setReportSubject('');
                setReportDesc('');
                fetchTickets();
                runHealthScan();
            }
        } catch (err) {
            console.error('Report submission error:', err);
        } finally {
            setReporting(false);
        }
    };

    // ==========================================
    // TAB 3: CO-PILOT CHAT STATE
    // ==========================================
    const [messages, setMessages] = useState([
        {
            sender: 'bot',
            text: 'Hello! I am your Wolf AI Clinical Co-Pilot. I am grounded on hospital databases, zero-hallucination protocols, and real-time clinical guidelines. How can I help you right now?',
            modelUsed: defaultModel,
            latencyMs: 120
        }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeTab]);

    const handleSendMessage = async (customPrompt = null) => {
        const text = customPrompt || chatInput;
        if (!text.trim() || chatLoading) return;

        const userMsg = { sender: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        if (!customPrompt) setChatInput('');
        setChatLoading(true);

        try {
            const res = await api.post('/api/ai/chat', {
                message: text,
                preferredModel: defaultModel,
                hospitalContext: {
                    currentPath: window.location.pathname,
                    clientTime: new Date().toISOString()
                }
            });

            const replyText = res.data?.data?.reply || res.data?.reply || res.data?.message || 'Response received.';
            const modelUsed = res.data?.data?.modelUsed || res.data?.modelUsed || defaultModel;
            const latencyMs = res.data?.data?.latencyMs || res.data?.latencyMs || 0;

            setMessages(prev => [
                ...prev,
                { sender: 'bot', text: replyText, modelUsed, latencyMs }
            ]);
        } catch (err) {
            setMessages(prev => [
                ...prev,
                {
                    sender: 'bot',
                    text: '⚠️ Notice: Clinical query could not be completed at this second. The watchdog logged this event.',
                    modelUsed: 'offline-fallback',
                    isError: true
                }
            ]);
        } finally {
            setChatLoading(false);
        }
    };

    return (
        <Modal
            show={show}
            onHide={onHide}
            size="xl"
            centered
            backdrop="static"
            className="ai-gateway-modal"
        >
            <Modal.Header closeButton className="bg-dark text-white border-secondary px-4 py-3">
                <div className="d-flex align-items-center justify-content-between w-100 pe-3">
                    <div className="d-flex align-items-center gap-2">
                        <div className="p-2 rounded-3 bg-primary bg-opacity-25 border border-primary">
                            <Bot size={24} className="text-primary" />
                        </div>
                        <div>
                            <Modal.Title className="fs-5 fw-bold mb-0 text-white d-flex align-items-center gap-2">
                                🐺 Wolf HMS — Unified AI Gateway & Watchdog Portal
                                <Badge bg="success" className="px-2 py-1 fs-6 d-flex align-items-center gap-1">
                                    <Sparkles size={12} />
                                    Active: {defaultModel}
                                </Badge>
                            </Modal.Title>
                            <small className="text-muted">
                                Multi-Provider Failover • Anti-Hallucination Guardrails • Live Self-Healing Telemetry
                            </small>
                        </div>
                    </div>
                </div>
            </Modal.Header>

            <Modal.Body className="bg-dark text-light p-4" style={{ minHeight: '560px' }}>
                <Tabs
                    activeKey={activeTab}
                    onSelect={(k) => setActiveTab(k)}
                    className="mb-4 custom-ai-tabs border-secondary"
                    fill
                >
                    {/* TAB 1: AI API KEYS & MODELS */}
                    <Tab
                        eventKey="keys"
                        title={
                            <span className="d-flex align-items-center justify-content-center gap-2 py-1">
                                <Key size={16} />
                                <strong>1. AI API Key Portal & Models</strong>
                            </span>
                        }
                    >
                        {keysMessage && (
                            <Alert variant={keysMessage.type} dismissible onClose={() => setKeysMessage(null)}>
                                {keysMessage.text}
                            </Alert>
                        )}

                        {/* Top Summary & Active Model Switcher */}
                        <Card className="bg-secondary bg-opacity-10 border border-secondary mb-4 p-3">
                            <Row className="align-items-center g-3">
                                <Col md={6}>
                                    <Form.Label className="small fw-bold text-uppercase text-info mb-1 d-flex align-items-center gap-1">
                                        <Cpu size={14} /> Active Default LLM Engine
                                    </Form.Label>
                                    <Form.Select
                                        value={defaultModel}
                                        onChange={(e) => handleSwitchModel(e.target.value)}
                                        className="bg-dark text-white border-secondary fw-semibold"
                                    >
                                        <optgroup label="Google Gemini (Primary Workhorse & Reasoning)">
                                            <option value="gemini-3.8-flash">Gemini 3.8 Flash (High-Speed Multimodal — Recommended)</option>
                                            <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite (Low Latency / Triage)</option>
                                            <option value="gemini-4-argon">Gemini 4 Argon (Deep Clinical Reasoning)</option>
                                            <option value="gemini-2.5-flash">Gemini 2.5 Flash (LTS Fallback Standard)</option>
                                            <option value="gemini-2.5-pro">Gemini 2.5 Pro (High-Capacity Diagnostics)</option>
                                        </optgroup>
                                        <optgroup label="DeepSeek AI (Ultra-Cost-Effective)">
                                            <option value="deepseek-flash">DeepSeek-V4.1-Flash (Ultra Low Cost / High Throughput)</option>
                                            <option value="deepseek-v4-pro">DeepSeek-V4-Pro (Advanced Medical Reasoning)</option>
                                        </optgroup>
                                        <optgroup label="OpenAI (Enterprise Precision)">
                                            <option value="gpt-6.1-sol">GPT-6.1 Sol (High Precision Healthcare Engine)</option>
                                            <option value="gpt-6-luna">GPT-6 Luna (Clinical Communication Model)</option>
                                            <option value="gpt-6-astra">GPT-6 Astra (Multimodal Diagnostic)</option>
                                            <option value="gpt-5.4">GPT-5.4 Enterprise</option>
                                            <option value="gpt-5.4-mini">GPT-5.4 Mini</option>
                                        </optgroup>
                                        <optgroup label="Offline Fallback">
                                            <option value="offline-clinical-catalog">Offline Clinical Catalog (Deterministic Protocol)</option>
                                        </optgroup>
                                    </Form.Select>
                                </Col>
                                <Col md={6}>
                                    <div className="small fw-bold text-uppercase text-info mb-1 d-flex align-items-center gap-1">
                                        <Layers size={14} /> Multi-Provider Automatic Failover Chain
                                    </div>
                                    <div className="d-flex flex-wrap align-items-center gap-1 p-2 bg-dark rounded border border-secondary">
                                        {(failoverChain.length > 0 ? failoverChain : ['gemini-3.8-flash', 'gemini-2.5-flash', 'deepseek-flash', 'gpt-6.1-sol', 'offline-clinical-catalog']).map((m, idx, arr) => (
                                            <React.Fragment key={m}>
                                                <Badge
                                                    bg={m === defaultModel ? 'primary' : m.includes('offline') ? 'dark' : 'secondary'}
                                                    className="px-2 py-1"
                                                >
                                                    {m}
                                                </Badge>
                                                {idx < arr.length - 1 && (
                                                    <ArrowRight size={12} className="text-muted" />
                                                )}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                </Col>
                            </Row>
                        </Card>

                        {/* Three Provider Cards */}
                        <Row className="g-3 mb-4">
                            {/* 1. Google Gemini */}
                            <Col lg={4}>
                                <Card className="h-100 bg-dark border-primary border-opacity-50 shadow-sm">
                                    <Card.Header className="bg-primary bg-opacity-10 border-primary border-opacity-25 d-flex justify-content-between align-items-center py-2">
                                        <span className="fw-bold text-white d-flex align-items-center gap-1">
                                            <Sparkles size={16} className="text-primary" /> Google Gemini
                                        </span>
                                        <Badge bg={keysStatus.gemini?.configured ? 'success' : 'secondary'}>
                                            {keysStatus.gemini?.configured ? `Active (${keysStatus.gemini.maskedKey})` : 'Not Configured'}
                                        </Badge>
                                    </Card.Header>
                                    <Card.Body className="p-3 d-flex flex-column justify-content-between">
                                        <div>
                                            <p className="small text-muted mb-2">
                                                Models: <code>gemini-3.8-flash</code>, <code>3.5-flash-lite</code>, <code>4-argon</code>, <code>2.5-flash</code>, <code>2.5-pro</code>
                                            </p>
                                            <Form.Group className="mb-2">
                                                <Form.Label className="small text-white-50">GEMINI_API_KEY</Form.Label>
                                                <div className="input-group input-group-sm">
                                                    <Form.Control
                                                        type={showGeminiKey ? 'text' : 'password'}
                                                        placeholder={keysStatus.gemini?.configured ? keysStatus.gemini.maskedKey : 'Enter AIzaSy...'}
                                                        value={geminiKeyInput}
                                                        onChange={(e) => setGeminiKeyInput(e.target.value)}
                                                        className="bg-secondary bg-opacity-25 text-white border-secondary"
                                                    />
                                                    <Button
                                                        variant="outline-secondary"
                                                        onClick={() => setShowGeminiKey(!showGeminiKey)}
                                                    >
                                                        {showGeminiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </Button>
                                                </div>
                                            </Form.Group>

                                            {testResults.gemini && (
                                                <div className={`p-2 rounded small mb-2 ${testResults.gemini.success ? 'bg-success bg-opacity-25 text-success border border-success' : 'bg-danger bg-opacity-25 text-danger border border-danger'}`}>
                                                    {testResults.gemini.success ? (
                                                        <span className="d-flex align-items-center gap-1">
                                                            <CheckCircle2 size={14} /> Latency: {testResults.gemini.latencyMs}ms ({testResults.gemini.modelTested})
                                                        </span>
                                                    ) : (
                                                        <span className="d-flex align-items-center gap-1">
                                                            <AlertTriangle size={14} /> {testResults.gemini.message}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="d-flex gap-2 pt-2 border-top border-secondary">
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                className="flex-grow-1"
                                                onClick={() => handleSaveKey('gemini')}
                                                disabled={keysLoading || !geminiKeyInput.trim()}
                                            >
                                                Save Key
                                            </Button>
                                            <Button
                                                variant="outline-info"
                                                size="sm"
                                                onClick={() => handleTestKey('gemini', geminiKeyInput)}
                                                disabled={testingProvider === 'gemini'}
                                            >
                                                {testingProvider === 'gemini' ? <Spinner size="sm" /> : <><Zap size={14} /> Test</>}
                                            </Button>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>

                            {/* 2. DeepSeek AI */}
                            <Col lg={4}>
                                <Card className="h-100 bg-dark border-info border-opacity-50 shadow-sm">
                                    <Card.Header className="bg-info bg-opacity-10 border-info border-opacity-25 d-flex justify-content-between align-items-center py-2">
                                        <span className="fw-bold text-white d-flex align-items-center gap-1">
                                            <Cpu size={16} className="text-info" /> DeepSeek AI
                                        </span>
                                        <Badge bg={keysStatus.deepseek?.configured ? 'success' : 'secondary'}>
                                            {keysStatus.deepseek?.configured ? `Active (${keysStatus.deepseek.maskedKey})` : 'Standby'}
                                        </Badge>
                                    </Card.Header>
                                    <Card.Body className="p-3 d-flex flex-column justify-content-between">
                                        <div>
                                            <p className="small text-muted mb-2">
                                                Models: <code>deepseek-flash</code> (V4.1 Ultra Low Cost), <code>deepseek-v4-pro</code>
                                            </p>
                                            <Form.Group className="mb-2">
                                                <Form.Label className="small text-white-50">DEEPSEEK_API_KEY</Form.Label>
                                                <div className="input-group input-group-sm">
                                                    <Form.Control
                                                        type={showDeepseekKey ? 'text' : 'password'}
                                                        placeholder={keysStatus.deepseek?.configured ? keysStatus.deepseek.maskedKey : 'Enter sk-...'}
                                                        value={deepseekKeyInput}
                                                        onChange={(e) => setDeepseekKeyInput(e.target.value)}
                                                        className="bg-secondary bg-opacity-25 text-white border-secondary"
                                                    />
                                                    <Button
                                                        variant="outline-secondary"
                                                        onClick={() => setShowDeepseekKey(!showDeepseekKey)}
                                                    >
                                                        {showDeepseekKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </Button>
                                                </div>
                                            </Form.Group>

                                            {testResults.deepseek && (
                                                <div className={`p-2 rounded small mb-2 ${testResults.deepseek.success ? 'bg-success bg-opacity-25 text-success border border-success' : 'bg-danger bg-opacity-25 text-danger border border-danger'}`}>
                                                    {testResults.deepseek.success ? (
                                                        <span className="d-flex align-items-center gap-1">
                                                            <CheckCircle2 size={14} /> Latency: {testResults.deepseek.latencyMs}ms ({testResults.deepseek.modelTested})
                                                        </span>
                                                    ) : (
                                                        <span className="d-flex align-items-center gap-1">
                                                            <AlertTriangle size={14} /> {testResults.deepseek.message}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="d-flex gap-2 pt-2 border-top border-secondary">
                                            <Button
                                                variant="info"
                                                size="sm"
                                                className="flex-grow-1 text-white"
                                                onClick={() => handleSaveKey('deepseek')}
                                                disabled={keysLoading || !deepseekKeyInput.trim()}
                                            >
                                                Save Key
                                            </Button>
                                            <Button
                                                variant="outline-info"
                                                size="sm"
                                                onClick={() => handleTestKey('deepseek', deepseekKeyInput)}
                                                disabled={testingProvider === 'deepseek'}
                                            >
                                                {testingProvider === 'deepseek' ? <Spinner size="sm" /> : <><Zap size={14} /> Test</>}
                                            </Button>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>

                            {/* 3. OpenAI */}
                            <Col lg={4}>
                                <Card className="h-100 bg-dark border-success border-opacity-50 shadow-sm">
                                    <Card.Header className="bg-success bg-opacity-10 border-success border-opacity-25 d-flex justify-content-between align-items-center py-2">
                                        <span className="fw-bold text-white d-flex align-items-center gap-1">
                                            <Server size={16} className="text-success" /> OpenAI
                                        </span>
                                        <Badge bg={keysStatus.openai?.configured ? 'success' : 'secondary'}>
                                            {keysStatus.openai?.configured ? `Active (${keysStatus.openai.maskedKey})` : 'Standby'}
                                        </Badge>
                                    </Card.Header>
                                    <Card.Body className="p-3 d-flex flex-column justify-content-between">
                                        <div>
                                            <p className="small text-muted mb-2">
                                                Models: <code>gpt-6.1-sol</code>, <code>gpt-6-luna</code>, <code>gpt-6-astra</code>, <code>gpt-5.4-mini</code>
                                            </p>
                                            <Form.Group className="mb-2">
                                                <Form.Label className="small text-white-50">OPENAI_API_KEY</Form.Label>
                                                <div className="input-group input-group-sm">
                                                    <Form.Control
                                                        type={showOpenaiKey ? 'text' : 'password'}
                                                        placeholder={keysStatus.openai?.configured ? keysStatus.openai.maskedKey : 'Enter sk-proj-...'}
                                                        value={openaiKeyInput}
                                                        onChange={(e) => setOpenaiKeyInput(e.target.value)}
                                                        className="bg-secondary bg-opacity-25 text-white border-secondary"
                                                    />
                                                    <Button
                                                        variant="outline-secondary"
                                                        onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                                                    >
                                                        {showOpenaiKey ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </Button>
                                                </div>
                                            </Form.Group>

                                            {testResults.openai && (
                                                <div className={`p-2 rounded small mb-2 ${testResults.openai.success ? 'bg-success bg-opacity-25 text-success border border-success' : 'bg-danger bg-opacity-25 text-danger border border-danger'}`}>
                                                    {testResults.openai.success ? (
                                                        <span className="d-flex align-items-center gap-1">
                                                            <CheckCircle2 size={14} /> Latency: {testResults.openai.latencyMs}ms ({testResults.openai.modelTested})
                                                        </span>
                                                    ) : (
                                                        <span className="d-flex align-items-center gap-1">
                                                            <AlertTriangle size={14} /> {testResults.openai.message}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="d-flex gap-2 pt-2 border-top border-secondary">
                                            <Button
                                                variant="success"
                                                size="sm"
                                                className="flex-grow-1"
                                                onClick={() => handleSaveKey('openai')}
                                                disabled={keysLoading || !openaiKeyInput.trim()}
                                            >
                                                Save Key
                                            </Button>
                                            <Button
                                                variant="outline-info"
                                                size="sm"
                                                onClick={() => handleTestKey('openai', openaiKeyInput)}
                                                disabled={testingProvider === 'openai'}
                                            >
                                                {testingProvider === 'openai' ? <Spinner size="sm" /> : <><Zap size={14} /> Test</>}
                                            </Button>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        {/* Anti-Hallucination Guardrails Panel */}
                        <Card className="bg-dark border-secondary p-3">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                                <span className="fw-bold text-white d-flex align-items-center gap-2">
                                    <Sliders size={18} className="text-warning" />
                                    Healthcare Anti-Hallucination & Compliance Guardrails
                                </span>
                                <Badge bg="warning" text="dark">Zero-Hallucination Policy Active</Badge>
                            </div>
                            <Row className="g-3">
                                <Col md={3}>
                                    <div className="p-2 bg-secondary bg-opacity-10 rounded border border-secondary text-center">
                                        <div className="small text-muted">Temperature Lock</div>
                                        <div className="fw-bold text-white fs-5">0.05</div>
                                        <div className="text-success small">Deterministic Medical Precision</div>
                                    </div>
                                </Col>
                                <Col md={3}>
                                    <div className="p-2 bg-secondary bg-opacity-10 rounded border border-secondary text-center">
                                        <div className="small text-muted">PHI / PII Auto-Redaction</div>
                                        <div className="fw-bold text-success fs-5">ENFORCED</div>
                                        <div className="text-muted small">Aadhaar, PAN & Phones Scrubbed</div>
                                    </div>
                                </Col>
                                <Col md={3}>
                                    <div className="p-2 bg-secondary bg-opacity-10 rounded border border-secondary text-center">
                                        <div className="small text-muted">Formulary Grounding</div>
                                        <div className="fw-bold text-info fs-5">LOCKED</div>
                                        <div className="text-muted small">Strict Hospital DB Catalog</div>
                                    </div>
                                </Col>
                                <Col md={3}>
                                    <div className="p-2 bg-secondary bg-opacity-10 rounded border border-secondary text-center">
                                        <div className="small text-muted">Physician Disclaimer</div>
                                        <div className="fw-bold text-warning fs-5">MANDATORY</div>
                                        <div className="text-muted small">Appended to All Clinical Outputs</div>
                                    </div>
                                </Col>
                            </Row>
                        </Card>
                    </Tab>

                    {/* TAB 2: WATCHDOG & 1-CLICK HEAL */}
                    <Tab
                        eventKey="watchdog"
                        title={
                            <span className="d-flex align-items-center justify-content-center gap-2 py-1">
                                <ShieldCheck size={16} />
                                <strong>2. Dashboard Watchdog & Auto-Heal</strong>
                            </span>
                        }
                    >
                        {/* Status bar */}
                        <div className="p-3 bg-secondary bg-opacity-10 border border-secondary rounded-3 mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                            <div>
                                <span className="text-muted me-2">Current Route:</span>
                                <Badge bg="dark" className="border border-secondary px-2 py-1 text-info fs-6">
                                    {window.location.pathname}
                                </Badge>
                                <span className="text-muted ms-3 me-2">Captured API Calls:</span>
                                <Badge bg={telemetryCalls.filter(c => c.status >= 400).length > 0 ? 'danger' : 'success'}>
                                    {telemetryCalls.length} calls ({telemetryCalls.filter(c => c.status >= 400).length} errors)
                                </Badge>
                            </div>
                            <Button
                                variant="outline-info"
                                size="sm"
                                onClick={runHealthScan}
                                disabled={scanningHealth}
                                className="d-flex align-items-center gap-1"
                            >
                                {scanningHealth ? <Spinner size="sm" /> : <Activity size={14} />}
                                <span>Run Live DB Integrity Scan</span>
                            </Button>
                        </div>

                        {/* Health Scan Scorecard if available */}
                        {healthScan && (
                            <Alert variant={healthScan.status === 'HEALTHY' ? 'success' : 'warning'} className="mb-3">
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="fw-bold">
                                        Health Score: {healthScan.score}% ({healthScan.status})
                                    </span>
                                    <small className="text-muted">{new Date(healthScan.timestamp).toLocaleTimeString()}</small>
                                </div>
                                <div className="d-flex flex-wrap gap-3 mt-2 small">
                                    <span>Unsynced Paid Labs: <strong>{healthScan.checks?.unsyncedPaidLabRequests}</strong></span>
                                    <span>Unsynced Paid Meds: <strong>{healthScan.checks?.unsyncedPaidMedications}</strong></span>
                                    <span>Orphan Invoice Items: <strong>{healthScan.checks?.orphanInvoiceItems}</strong></span>
                                    <span>Open Support Tickets: <strong>{healthScan.checks?.openSupportTickets}</strong></span>
                                </div>
                            </Alert>
                        )}

                        <Row className="g-3">
                            {/* Live Telemetry Table */}
                            <Col lg={7}>
                                <Card className="bg-dark border-secondary h-100">
                                    <Card.Header className="bg-secondary bg-opacity-10 border-secondary d-flex justify-content-between align-items-center py-2">
                                        <span className="fw-bold text-white small d-flex align-items-center gap-1">
                                            <Activity size={14} className="text-info" />
                                            Live Captured API Telemetry (Ring Buffer)
                                        </span>
                                        <Button
                                            variant="link"
                                            size="sm"
                                            className="text-muted p-0 text-decoration-none"
                                            onClick={() => {
                                                if (window.__WOLF_WATCHDOG_TELEMETRY__) {
                                                    window.__WOLF_WATCHDOG_TELEMETRY__.apiCalls = [];
                                                    setTelemetryCalls([]);
                                                }
                                            }}
                                        >
                                            Clear
                                        </Button>
                                    </Card.Header>
                                    <Card.Body className="p-0" style={{ maxHeight: '340px', overflowY: 'auto' }}>
                                        {telemetryCalls.length === 0 ? (
                                            <div className="p-4 text-center text-muted small">
                                                No API calls recorded yet. Interact with the dashboard to capture live telemetry.
                                            </div>
                                        ) : (
                                            <Table responsive hover variant="dark" className="table-sm mb-0 text-nowrap" style={{ fontSize: '0.78rem' }}>
                                                <thead>
                                                    <tr className="border-secondary text-muted">
                                                        <th>Method</th>
                                                        <th>Endpoint</th>
                                                        <th>Status</th>
                                                        <th>Latency</th>
                                                        <th>Time</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {telemetryCalls.slice(0, 15).map((call, idx) => (
                                                        <tr key={idx} className="border-secondary align-middle">
                                                            <td>
                                                                <Badge bg="secondary" style={{ fontSize: '0.65rem' }}>
                                                                    {call.method}
                                                                </Badge>
                                                            </td>
                                                            <td className="font-monospace text-light" style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {call.url}
                                                            </td>
                                                            <td>
                                                                <Badge bg={call.status >= 500 ? 'danger' : call.status >= 400 ? 'warning' : 'success'}>
                                                                    {call.status}
                                                                </Badge>
                                                            </td>
                                                            <td className="text-muted">{call.durationMs}ms</td>
                                                            <td className="text-muted">{new Date(call.timestamp).toLocaleTimeString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>

                            {/* 1-Click Issue Reporter & Auto-Heal */}
                            <Col lg={5}>
                                <Card className="bg-dark border-secondary h-100">
                                    <Card.Header className="bg-secondary bg-opacity-10 border-secondary py-2">
                                        <span className="fw-bold text-white small d-flex align-items-center gap-1">
                                            <ShieldAlert size={14} className="text-danger" />
                                            1-Click Issue Reporter & Safe Auto-Heal
                                        </span>
                                    </Card.Header>
                                    <Card.Body className="p-3">
                                        <Form onSubmit={handleReportIssue}>
                                            <Form.Group className="mb-2">
                                                <Form.Label className="small text-muted mb-1">Issue Subject</Form.Label>
                                                <Form.Control
                                                    size="sm"
                                                    placeholder="e.g. 500 error when clicking submit"
                                                    value={reportSubject}
                                                    onChange={(e) => setReportSubject(e.target.value)}
                                                    className="bg-secondary bg-opacity-25 text-white border-secondary"
                                                />
                                            </Form.Group>
                                            <Form.Group className="mb-2">
                                                <Form.Label className="small text-muted mb-1">Observations / Steps to reproduce</Form.Label>
                                                <Form.Control
                                                    as="textarea"
                                                    rows={3}
                                                    size="sm"
                                                    placeholder="Describe what occurred. Telemetry will be attached automatically."
                                                    value={reportDesc}
                                                    onChange={(e) => setReportDesc(e.target.value)}
                                                    className="bg-secondary bg-opacity-25 text-white border-secondary"
                                                />
                                            </Form.Group>
                                            <Button
                                                type="submit"
                                                variant="danger"
                                                size="sm"
                                                className="w-100 fw-bold d-flex align-items-center justify-content-center gap-2"
                                                disabled={reporting}
                                            >
                                                {reporting ? <Spinner size="sm" /> : <><ShieldAlert size={14} /> Report Issue & Run Auto-Heal</>}
                                            </Button>
                                        </Form>

                                        {/* Auto-Heal Result */}
                                        {reportResult && (
                                            <div className="mt-3 p-2 bg-secondary bg-opacity-25 rounded border border-info small">
                                                <div className="fw-bold text-info mb-1 d-flex align-items-center gap-1">
                                                    <CheckCircle2 size={14} /> Ticket #{reportResult.ticketId} Created & Diagnosed
                                                </div>
                                                {reportResult.autoHealedActions?.length > 0 && (
                                                    <div className="text-success mb-2">
                                                        <strong>Auto-Healed:</strong>
                                                        <ul className="mb-1 ps-3">
                                                            {reportResult.autoHealedActions.map((a, i) => (
                                                                <li key={i}>{a}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {reportResult.aiDiagnosis && (
                                                    <div className="text-light">
                                                        <div><strong>Root Cause:</strong> {reportResult.aiDiagnosis.rootCause}</div>
                                                        <div><strong>Recommended Fix:</strong> {reportResult.aiDiagnosis.developerFixRecommendation}</div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>

                        {/* Open Support Tickets */}
                        {openTickets.length > 0 && (
                            <div className="mt-3">
                                <div className="small fw-bold text-muted mb-2">Recent Support Tickets in System</div>
                                <div className="d-flex flex-column gap-1">
                                    {openTickets.map((t) => (
                                        <div key={t.id} className="p-2 bg-secondary bg-opacity-10 rounded border border-secondary d-flex justify-content-between align-items-center small">
                                            <div>
                                                <strong className="text-light">#{t.id} {t.subject}</strong>
                                                <span className="text-muted ms-2">({t.dashboard_route || '/'})</span>
                                            </div>
                                            <div className="d-flex align-items-center gap-2">
                                                <Badge bg={t.status === 'resolved' ? 'success' : 'warning'}>{t.status}</Badge>
                                                <Badge bg="secondary">{t.priority}</Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Tab>

                    {/* TAB 3: CLINICAL CO-PILOT */}
                    <Tab
                        eventKey="chat"
                        title={
                            <span className="d-flex align-items-center justify-content-center gap-2 py-1">
                                <Bot size={16} />
                                <strong>3. Wolf AI Clinical Co-Pilot</strong>
                            </span>
                        }
                    >
                        {/* Quick Prompt Chips */}
                        <div className="d-flex flex-wrap gap-2 mb-3">
                            {[
                                'Explain abnormal troponin-I cardiac biomarker level',
                                'Check drug interaction: Paracetamol, Warfarin and Ciprofloxacin',
                                'Provide rapid ICU bed occupancy breakdown',
                                'Triage acute chest pain with diaphoresis'
                            ].map((prompt, i) => (
                                <Button
                                    key={i}
                                    variant="outline-secondary"
                                    size="sm"
                                    className="text-light text-start border-secondary"
                                    style={{ fontSize: '0.78rem' }}
                                    onClick={() => handleSendMessage(prompt)}
                                >
                                    ⚡ {prompt}
                                </Button>
                            ))}
                        </div>

                        {/* Chat Messages Log */}
                        <Card className="bg-dark border-secondary mb-3" style={{ height: '360px', overflowY: 'auto' }}>
                            <Card.Body className="d-flex flex-column gap-2 p-3">
                                {messages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`d-flex flex-column ${msg.sender === 'user' ? 'align-items-end' : 'align-items-start'}`}
                                    >
                                        <div
                                            className={`p-3 rounded-3 shadow-sm ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-secondary bg-opacity-25 text-light border border-secondary'}`}
                                            style={{ maxWidth: '85%', fontSize: '0.9rem', lineHeight: '1.4' }}
                                        >
                                            <div className="d-flex justify-content-between align-items-center mb-1 gap-3 small opacity-75">
                                                <span className="fw-bold">{msg.sender === 'user' ? 'Clinical Staff' : 'Wolf AI'}</span>
                                                {msg.modelUsed && (
                                                    <Badge bg="dark" className="border border-secondary" style={{ fontSize: '0.65rem' }}>
                                                        {msg.modelUsed} {msg.latencyMs ? `(${msg.latencyMs}ms)` : ''}
                                                    </Badge>
                                                )}
                                            </div>
                                            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                                        </div>
                                    </div>
                                ))}
                                {chatLoading && (
                                    <div className="align-self-start p-3 bg-secondary bg-opacity-25 rounded-3 border border-secondary text-light small d-flex align-items-center gap-2">
                                        <Spinner size="sm" />
                                        <span>Consulting {defaultModel} clinical knowledge base...</span>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </Card.Body>
                        </Card>

                        {/* Chat Input */}
                        <Form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}>
                            <div className="input-group">
                                <Form.Control
                                    placeholder="Type clinical inquiry, drug interaction, or operational question..."
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    className="bg-secondary bg-opacity-25 text-white border-secondary"
                                    disabled={chatLoading}
                                />
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="px-4"
                                    disabled={chatLoading || !chatInput.trim()}
                                >
                                    {chatLoading ? <Spinner size="sm" /> : <Send size={16} />}
                                </Button>
                            </div>
                        </Form>
                    </Tab>
                </Tabs>
            </Modal.Body>

            <Modal.Footer className="bg-dark border-secondary px-4 py-2 d-flex justify-content-between align-items-center">
                <span className="small text-muted">
                    Wolf HMS v2.4 Enterprise • Server IP: 185.213.27.158 • Port: 5002
                </span>
                <Button variant="secondary" size="sm" onClick={onHide}>
                    Close Portal
                </Button>
            </Modal.Footer>

            <style>{`
                .ai-gateway-modal .modal-content {
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);
                    border-radius: 12px;
                }
                .custom-ai-tabs .nav-link {
                    color: #adb5bd !important;
                    border: 1px solid transparent;
                    transition: all 0.2s ease;
                }
                .custom-ai-tabs .nav-link.active {
                    color: #fff !important;
                    background-color: rgba(13, 148, 136, 0.3) !important;
                    border: 1px solid #0d9488 !important;
                    border-radius: 8px;
                }
            `}</style>
        </Modal>
    );
};

export default AIGatewayWatchdogModal;
