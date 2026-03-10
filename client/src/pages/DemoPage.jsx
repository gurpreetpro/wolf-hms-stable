import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Button, Badge, ProgressBar, Modal } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Play,
    MousePointer,
    Users,
    Stethoscope,
    FlaskConical,
    Pill,
    BedDouble,
    Heart,
    FileCheck,
    CreditCard,
    RotateCcw,
    Pause,
    CheckCircle,
    ArrowRight,
    Zap,
    Monitor,
    Sparkles
} from 'lucide-react';
import axios from 'axios';

const DEMO_STEPS = [
    { id: 1, title: 'Patient Registration', dept: 'Reception', icon: Users, color: '#3b82f6', description: 'Register new patient at reception desk', path: '/opd' },
    { id: 2, title: 'Doctor Consultation', dept: 'OPD', icon: Stethoscope, color: '#8b5cf6', description: 'Doctor examines patient and diagnoses', path: '/doctor' },
    { id: 3, title: 'AI Clinical Support', dept: 'AI Assistant', icon: Sparkles, color: '#6366f1', description: 'AI-powered diagnosis and insights', path: '/ai-demo' },
    { id: 4, title: 'Lab Tests', dept: 'Laboratory', icon: FlaskConical, color: '#06b6d4', description: 'Order and process lab investigations', path: '/lab' },
    { id: 5, title: 'Radiology', dept: 'Imaging', icon: Monitor, color: '#f59e0b', description: 'X-rays, CT scans, MRI imaging', path: '/radiology' },
    { id: 6, title: 'Pharmacy', dept: 'Pharmacy', icon: Pill, color: '#10b981', description: 'Dispense prescribed medications', path: '/pharmacy' },
    { id: 7, title: 'Ward Admission', dept: 'IPD', icon: BedDouble, color: '#ec4899', description: 'Admit for in-patient care', path: '/ward' },
    { id: 8, title: 'Nursing Care', dept: 'Nursing', icon: Heart, color: '#ef4444', description: 'Vital signs and patient care', path: '/ward' },
    { id: 9, title: 'Discharge', dept: 'Doctor', icon: FileCheck, color: '#6366f1', description: 'Complete treatment summary', path: '/doctor' },
    { id: 10, title: 'Billing', dept: 'Finance', icon: CreditCard, color: '#22c55e', description: 'Generate invoice and payment', path: '/billing' }
];

const DemoPage = () => {
    const navigate = useNavigate();
    const [demoMode, setDemoMode] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [demoPatient, setDemoPatient] = useState(null);
    const [showComplete, setShowComplete] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mounted, setMounted] = useState(false);

    // config removed


    const location = useLocation();

    // Mount animation
    useEffect(() => {
        setTimeout(() => setMounted(true), 100);
    }, []);

    // Check for resume state or query params
    useEffect(() => {
        const searchParams = new URLSearchParams(location.search);
        const modeParam = searchParams.get('mode');
        const demoActive = localStorage.getItem('demoActive');
        const savedStep = localStorage.getItem('demoStep');

        if (modeParam === 'menu') {
            setDemoMode(null);
        } else if (demoActive === 'true' && savedStep) {
            setDemoMode('guided');
            setCurrentStep(parseInt(savedStep));
        }
    }, [location]);

    // Auto-play timer
    useEffect(() => {
        let timer;
        if (demoMode === 'autoplay' && isPlaying && currentStep < DEMO_STEPS.length) {
            timer = setTimeout(() => {
                if (currentStep < DEMO_STEPS.length - 1) {
                    setCurrentStep(prev => prev + 1);
                } else {
                    setIsPlaying(false);
                    setShowComplete(true);
                }
            }, 3000);
        }
        return () => clearTimeout(timer);
    }, [demoMode, isPlaying, currentStep]);

    const startDemo = async (mode) => {
        setLoading(true);
        try {
            // 1. Login as Demo Admin
            const loginRes = await axios.post('/api/auth/demo-login');
            const { token, user } = loginRes.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('demoActive', 'true');

            // Update config with new token
            const newConfig = { headers: { Authorization: `Bearer ${token}` } };

            // 2. Create Demo Patient
            const res = await axios.post('/api/opd/demo-patient', {}, newConfig);
            setDemoPatient(res.data);

            setDemoMode(mode);
            setCurrentStep(0);
            if (mode === 'autoplay') setIsPlaying(true);

        } catch (err) {
            console.error('Demo start error:', err);
            setError('Failed to start demo environment. Please ensure server is running.');
            // Do NOT use fallback token as it breaks backend connectivity
            localStorage.removeItem('token');
            localStorage.removeItem('demoActive');
        } finally {
            setLoading(false);
        }
    };

    const resetDemo = async () => {
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            if (token && demoPatient?.id) {
                await axios.post('/api/opd/demo-reset', { patientId: demoPatient.id }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
        } catch (err) {
            console.error('Reset error (ignored):', err);
        }

        // Clear session and local storage (logout)
        localStorage.removeItem('demoActive');
        localStorage.removeItem('demoStep');
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        setDemoMode(null);
        setCurrentStep(0);
        setIsPlaying(false);
        setDemoPatient(null);
        setShowComplete(false);
        setLoading(false);
    };

    // Navigate to department and keep demo state
    // Use window.location.href to force page reload so ProtectedRoute re-reads the token
    const goToDepartment = (path) => {
        localStorage.setItem('demoActive', 'true');
        localStorage.setItem('demoStep', currentStep.toString());
        window.location.href = path;
    };

    const progress = ((currentStep + 1) / DEMO_STEPS.length) * 100;

    return (
        <div className="demo-container" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)', overflow: 'hidden', position: 'relative' }}>

            {/* Animated Background */}
            <div className="bg-animation">
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="floating-orb" style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 5}s`,
                        animationDuration: `${10 + Math.random() * 10}s`
                    }} />
                ))}
            </div>

            <Container fluid className="position-relative p-4" style={{ zIndex: 1 }}>

                {/* Landing View */}
                {!demoMode && (
                    <div className={`text-center transition-all ${mounted ? 'fade-in-up' : 'opacity-0'}`}>

                        {/* Hero */}
                        <div className="mb-5 pt-4">
                            <div className="d-inline-flex align-items-center gap-2 px-4 py-2 rounded-pill mb-4 glow-badge">
                                <Sparkles size={16} className="text-warning" />
                                <span className="text-white small fw-semibold">Interactive Demo</span>
                            </div>

                            <h1 className="display-3 fw-bold text-white mb-3 title-gradient">
                                <span className="text-gradient">Wolf</span> Hospital Management
                                <br />
                                <span className="text-gradient">System Demo</span>
                            </h1>

                            <p className="lead text-white-50 mb-5 mx-auto" style={{ maxWidth: 600 }}>
                                Experience the complete patient journey from registration to billing
                            </p>
                        </div>

                        {/* Journey Flow */}
                        <div className="journey-flow mb-5 py-4">
                            <div className="d-flex justify-content-center flex-wrap gap-2 align-items-center">
                                {DEMO_STEPS.map((step, idx) => (
                                    <div key={step.id} className="d-flex align-items-center step-preview" style={{ animationDelay: `${idx * 0.1}s` }}>
                                        <div className="step-icon-wrapper" style={{ '--step-color': step.color }}>
                                            <step.icon size={18} />
                                        </div>
                                        {idx < DEMO_STEPS.length - 1 && (
                                            <ArrowRight size={14} className="text-white-50 mx-1 arrow-pulse" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Mode Cards */}
                        <Row className="justify-content-center g-4 px-3" style={{ maxWidth: 900, margin: '0 auto' }}>
                            <Col md={6}>
                                <div
                                    className="mode-card guided-card"
                                    onClick={() => !loading && startDemo('guided')}
                                >
                                    <div className="card-glow" />
                                    <div className="card-content">
                                        <div className="icon-box guided-icon">
                                            <MousePointer size={28} />
                                        </div>
                                        <h3 className="text-white mb-2">Guided Tour</h3>
                                        <p className="text-white-50 small mb-3">Interactive step-by-step walkthrough</p>
                                        <ul className="feature-list">
                                            <li><CheckCircle size={14} /> Control your pace</li>
                                            <li><CheckCircle size={14} /> Pre-filled demo data</li>
                                            <li><CheckCircle size={14} /> Department navigation</li>
                                        </ul>
                                        <Button variant="light" className="mt-3 w-100 fw-semibold">
                                            Start Guided Tour →
                                        </Button>
                                    </div>
                                </div>
                            </Col>

                            <Col md={6}>
                                <div
                                    className="mode-card autoplay-card"
                                    onClick={() => !loading && startDemo('autoplay')}
                                >
                                    <div className="card-glow" />
                                    <div className="card-content">
                                        <div className="icon-box autoplay-icon">
                                            <Zap size={28} />
                                        </div>
                                        <h3 className="text-white mb-2">Auto-Play</h3>
                                        <p className="text-white-50 small mb-3">Sit back and watch the simulation</p>
                                        <ul className="feature-list">
                                            <li><CheckCircle size={14} /> Fully automated</li>
                                            <li><CheckCircle size={14} /> 3 seconds per step</li>
                                            <li><CheckCircle size={14} /> Pause anytime</li>
                                        </ul>
                                        <Button variant="light" className="mt-3 w-100 fw-semibold">
                                            Start Auto-Play →
                                        </Button>
                                    </div>
                                </div>
                            </Col>
                        </Row>

                        {loading && (
                            <div className="mt-5">
                                <div className="spinner-glow" />
                            </div>
                        )}
                    </div>
                )}

                {error && (
                    <Alert variant="danger" className="mx-auto mt-4" style={{ maxWidth: 600 }} onClose={() => setError('')} dismissible>
                        {error}
                    </Alert>
                )}

                {/* Demo In Progress */}
                {demoMode && (
                    <div className="demo-progress fade-in">
                        {/* Header */}
                        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                            <div>
                                <Badge className={`mb-2 mode-badge ${demoMode === 'guided' ? 'guided-badge' : 'autoplay-badge'}`}>
                                    {demoMode === 'guided' ? '🖱️ Guided Tour' : '⚡ Auto-Play'}
                                </Badge>
                                <h2 className="text-white mb-1">Patient Journey Demo</h2>
                                {demoPatient && <small className="text-white-50">Patient: {demoPatient.name}</small>}
                            </div>
                            <div className="d-flex gap-2">
                                {demoMode === 'autoplay' && (
                                    <Button variant={isPlaying ? 'warning' : 'success'} className="control-btn" onClick={() => setIsPlaying(!isPlaying)}>
                                        {isPlaying ? <><Pause size={16} /> Pause</> : <><Play size={16} /> Resume</>}
                                    </Button>
                                )}
                                <Button variant="outline-light" className="control-btn" onClick={resetDemo}>
                                    <RotateCcw size={16} /> Reset
                                </Button>
                            </div>
                        </div>

                        {/* Progress */}
                        <div className="progress-section mb-4">
                            <div className="d-flex justify-content-between text-white-50 small mb-2">
                                <span>Progress</span>
                                <span>{currentStep + 1} / {DEMO_STEPS.length}</span>
                            </div>
                            <div className="progress-bar-wrapper">
                                <div className="progress-bar-fill" style={{ width: `${progress}%` }}>
                                    <div className="progress-glow" />
                                </div>
                            </div>
                        </div>

                        {/* Current Step Highlight */}
                        <Card className="current-step-card mb-4">
                            <Card.Body className="d-flex align-items-center gap-4 p-4">
                                <div className="step-icon-large pulse-ring" style={{ backgroundColor: DEMO_STEPS[currentStep].color }}>
                                    {React.createElement(DEMO_STEPS[currentStep].icon, { size: 36, className: 'text-white' })}
                                </div>
                                <div className="flex-grow-1">
                                    <Badge bg="dark" className="mb-2">{DEMO_STEPS[currentStep].dept}</Badge>
                                    <h3 className="text-white mb-1">{DEMO_STEPS[currentStep].title}</h3>
                                    <p className="text-white-50 mb-0">{DEMO_STEPS[currentStep].description}</p>
                                </div>
                                {demoMode === 'guided' && DEMO_STEPS[currentStep].path && (
                                    <Button variant="primary" size="lg" onClick={() => goToDepartment(DEMO_STEPS[currentStep].path)}>
                                        Open {DEMO_STEPS[currentStep].dept}
                                    </Button>
                                )}
                            </Card.Body>
                        </Card>

                        {/* Steps Grid */}
                        <Row className="g-3">
                            {DEMO_STEPS.map((step, idx) => {
                                const isActive = idx === currentStep;
                                const isCompleted = idx < currentStep;
                                return (
                                    <Col key={step.id} xs={6} md={4} lg={3}>
                                        <div
                                            className={`step-card ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                                            style={{ '--step-color': step.color }}
                                            onClick={() => demoMode === 'guided' && setCurrentStep(idx)}
                                        >
                                            <div className="step-number">{step.id}</div>
                                            <div className="step-icon-mini">
                                                {isCompleted ? <CheckCircle size={20} /> : <step.icon size={20} />}
                                            </div>
                                            <div className="step-title">{step.title}</div>
                                            <div className="step-dept">{step.dept}</div>
                                        </div>
                                    </Col>
                                );
                            })}
                        </Row>

                        {/* Navigation */}
                        {demoMode === 'guided' && (
                            <div className="d-flex justify-content-center gap-3 mt-4">
                                <Button variant="outline-light" disabled={currentStep === 0} onClick={() => setCurrentStep(p => p - 1)}>
                                    ← Previous
                                </Button>
                                {currentStep < DEMO_STEPS.length - 1 ? (
                                    <Button variant="primary" onClick={() => setCurrentStep(p => p + 1)}>
                                        Next Step →
                                    </Button>
                                ) : (
                                    <Button variant="success" onClick={() => setShowComplete(true)}>
                                        <CheckCircle size={16} className="me-1" /> Complete Demo
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </Container>

            {/* Completion Modal */}
            <Modal show={showComplete} onHide={resetDemo} centered className="completion-modal">
                <Modal.Body className="text-center py-5 bg-dark rounded-3">
                    <div className="completion-icon mb-4">
                        <CheckCircle size={60} />
                    </div>
                    <h2 className="text-white mb-3">Demo Complete! 🎉</h2>
                    <p className="text-white-50 mb-4">
                        You've experienced the full patient journey through our HMS.
                    </p>
                    <div className="d-flex justify-content-center gap-3">
                        <Button variant="primary" size="lg" onClick={resetDemo}>
                            <RotateCcw size={18} className="me-2" /> Restart Demo
                        </Button>
                        <Button variant="outline-light" size="lg" onClick={() => navigate('/')}>
                            Go to Dashboard
                        </Button>
                    </div>
                </Modal.Body>
            </Modal>

            <style>{`
                /* Animations */
                @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
                    50% { transform: translateY(-20px) rotate(180deg); opacity: 0.1; }
                }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                }
                @keyframes glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.3); }
                    50% { box-shadow: 0 0 40px rgba(139, 92, 246, 0.6); }
                }
                @keyframes shimmer {
                    0% { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                @keyframes pulseRing {
                    0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.4); }
                    100% { box-shadow: 0 0 0 20px rgba(255,255,255,0); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .fade-in-up { animation: fadeInUp 0.8s ease-out forwards; }
                .fade-in { animation: fadeInUp 0.5s ease-out forwards; }
                .opacity-0 { opacity: 0; }

                /* Background orbs */
                .floating-orb {
                    position: absolute;
                    width: 300px;
                    height: 300px;
                    border-radius: 50%;
                    background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%);
                    animation: float 15s ease-in-out infinite;
                    pointer-events: none;
                }

                /* Title gradient */
                .text-gradient {
                    background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 50%, #22c55e 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                /* Glow badge */
                .glow-badge {
                    background: rgba(139, 92, 246, 0.2);
                    border: 1px solid rgba(139, 92, 246, 0.4);
                    animation: glow 2s ease-in-out infinite;
                }

                /* Company Branding */
                .brand-container {
                    background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
                    border: 1px solid rgba(255,255,255,0.2);
                    backdrop-filter: blur(10px);
                    transition: all 0.3s ease;
                }
                .brand-container:hover {
                    border-color: rgba(139, 92, 246, 0.5);
                    box-shadow: 0 0 30px rgba(139, 92, 246, 0.2);
                }
                .company-logo {
                    width: 60px;
                    height: 60px;
                    border-radius: 14px;
                    object-fit: cover;
                    border: 2px solid rgba(255,255,255,0.3);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                    transition: transform 0.3s ease;
                }
                .brand-container:hover .company-logo {
                    transform: scale(1.05);
                }
                .company-name {
                    background: linear-gradient(90deg, #fff 0%, #a5b4fc 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                }

                /* Step preview */
                .step-preview { animation: fadeInUp 0.6s ease-out backwards; }
                .step-icon-wrapper {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    background: color-mix(in srgb, var(--step-color) 20%, transparent);
                    border: 2px solid var(--step-color);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--step-color);
                    transition: all 0.3s ease;
                }
                .step-icon-wrapper:hover {
                    background: var(--step-color);
                    color: white;
                    transform: scale(1.1);
                }
                .arrow-pulse { animation: pulse 1.5s ease-in-out infinite; }

                /* Mode cards */
                .mode-card {
                    position: relative;
                    border-radius: 20px;
                    padding: 30px;
                    cursor: pointer;
                    overflow: hidden;
                    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.1);
                }
                .mode-card:hover {
                    transform: translateY(-8px);
                    border-color: rgba(255,255,255,0.3);
                }
                .card-glow {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 200%;
                    height: 200%;
                    transform: translate(-50%, -50%);
                    opacity: 0;
                    transition: opacity 0.4s;
                }
                .guided-card .card-glow { background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 50%); }
                .autoplay-card .card-glow { background: radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 50%); }
                .mode-card:hover .card-glow { opacity: 1; }
                .card-content { position: relative; z-index: 1; }
                .icon-box {
                    width: 60px;
                    height: 60px;
                    border-radius: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 20px;
                    color: white;
                }
                .guided-icon { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
                .autoplay-icon { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
                .feature-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    text-align: left;
                }
                .feature-list li {
                    color: rgba(255,255,255,0.7);
                    font-size: 0.9rem;
                    margin-bottom: 8px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .feature-list li svg { color: #22c55e; }

                /* Spinner */
                .spinner-glow {
                    width: 50px;
                    height: 50px;
                    border: 3px solid rgba(139, 92, 246, 0.3);
                    border-top-color: #8b5cf6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                }

                /* Demo progress */
                .mode-badge {
                    padding: 8px 16px;
                    font-size: 0.85rem;
                }
                .guided-badge { background: linear-gradient(135deg, #3b82f6, #2563eb) !important; }
                .autoplay-badge { background: linear-gradient(135deg, #8b5cf6, #7c3aed) !important; }
                .control-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 16px;
                }

                /* Progress bar */
                .progress-bar-wrapper {
                    height: 8px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 4px;
                    overflow: hidden;
                }
                .progress-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #8b5cf6, #06b6d4, #22c55e);
                    background-size: 200% 100%;
                    animation: shimmer 2s linear infinite;
                    border-radius: 4px;
                    position: relative;
                    transition: width 0.5s ease;
                }

                /* Current step card */
                .current-step-card {
                    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(6, 182, 212, 0.1));
                    border: 1px solid rgba(139, 92, 246, 0.3);
                    border-radius: 16px;
                }
                .step-icon-large {
                    width: 80px;
                    height: 80px;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    animation: pulseRing 2s ease-out infinite;
                }

                /* Step cards */
                .step-card {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    padding: 16px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    position: relative;
                    overflow: hidden;
                }
                .step-card:hover {
                    border-color: var(--step-color);
                    transform: translateY(-4px);
                }
                .step-card.active {
                    background: color-mix(in srgb, var(--step-color) 20%, transparent);
                    border-color: var(--step-color);
                    box-shadow: 0 0 30px color-mix(in srgb, var(--step-color) 30%, transparent);
                }
                .step-card.completed {
                    background: rgba(34, 197, 94, 0.1);
                    border-color: #22c55e;
                }
                .step-number {
                    position: absolute;
                    top: 8px;
                    right: 8px;
                    width: 20px;
                    height: 20px;
                    background: rgba(255,255,255,0.1);
                    border-radius: 50%;
                    font-size: 0.7rem;
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .step-icon-mini {
                    width: 44px;
                    height: 44px;
                    border-radius: 12px;
                    background: var(--step-color);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    margin: 0 auto 10px;
                }
                .step-card.completed .step-icon-mini { background: #22c55e; }
                .step-title { color: white; font-weight: 600; font-size: 0.85rem; margin-bottom: 4px; }
                .step-dept { color: rgba(255,255,255,0.5); font-size: 0.75rem; }

                /* Completion */
                .completion-modal .modal-content { background: transparent; border: none; }
                .completion-icon {
                    width: 100px;
                    height: 100px;
                    background: linear-gradient(135deg, #22c55e, #16a34a);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    margin: 0 auto;
                    animation: pulse 1.5s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

export default DemoPage;
