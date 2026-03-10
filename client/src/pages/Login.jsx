import React, { useState, useMemo } from 'react';
import { Container, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/axiosInstance';
import { User, Lock } from 'lucide-react';
import { safeSetToken, safeSetUser } from '../utils/safeStorage';

const THEMES = {
    classic: {
        name: 'Classic Blue',
        bgLeft: '#1a2b4b',
        bgRight: '#f8f9fa',
        textRight: '#212529',
        inputBg: '#ffffff',
        accent: '#0d6efd',
        logoBorder: 'rgba(255,255,255,0.1)'
    },
    dark: {
        name: 'Modern Dark',
        bgLeft: '#000000',
        bgRight: '#121212',
        textRight: '#e0e0e0',
        inputBg: '#1e1e1e',
        accent: '#bb86fc',
        logoBorder: 'rgba(187, 134, 252, 0.3)'
    },
    medical: {
        name: 'Medical Clean',
        bgLeft: '#00796b',
        bgRight: '#e0f2f1',
        textRight: '#004d40',
        inputBg: '#ffffff',
        accent: '#00897b',
        logoBorder: 'rgba(255,255,255,0.2)'
    }
};

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const currentTheme = THEMES['medical'];

    // Pre-compute particle configurations to avoid Math.random in render
    const particles = useMemo(() =>
        Array.from({ length: 20 }, (_, i) => ({
            id: i,
            left: `${(i * 5) % 100}%`,
            animationDuration: `${7 + (i % 8)}s`,
            animationDelay: `${(i * 0.3) % 5}s`,
            size: `${5 + (i % 5)}px`,
            opacity: 0.5 + ((i % 5) * 0.1)
        })),
        []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            console.log('Login attempt payload:', { username, password });
            const res = await api.post('/api/auth/login', 
                { username, password },
                { headers: { 'Content-Type': 'application/json' } }
            );
            
            // Handle both wrapped and unwrapped response formats
            // Wrapped: { success: true, data: { token, user }, security_setup_required: false }
            // Unwrapped: { token, user, security_setup_required: false }
            
            const payload = res.data;
            const responseData = payload?.data || payload;
            
            const token = responseData?.token;
            const user = responseData?.user;
            
            // security_setup_required might be at the root of the payload or inside data
            const security_setup_required = payload.security_setup_required !== undefined 
                ? payload.security_setup_required 
                : responseData?.security_setup_required;
            
            // Validate we got actual values before storing
            if (!token || !user) {
                throw new Error('Invalid response from server - missing token or user');
            }
            
            // Use safe storage utilities
            safeSetToken(token);
            safeSetUser(user);

            if (security_setup_required) {
                navigate('/security-setup');
            } else {
                navigate('/');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err.response?.data?.message || err.message || 'Login failed');
        }
    };


    return (
        <Container fluid className="vh-100 p-0 overflow-hidden">
            <Row className="h-100 g-0">

                {/* Left Side - Branding with Floating Particles */}
                <Col md={5} className="d-none d-md-flex flex-column align-items-center justify-content-center text-white position-relative overflow-hidden"
                    style={{
                        background: 'linear-gradient(135deg, #0a1628 0%, #1a3a4a 50%, #0d2438 100%)',
                        transition: 'background 0.5s ease'
                    }}>

                    {/* Floating Particles CSS */}
                    <style>
                        {`
                            @keyframes floatUp {
                                0% { transform: translateY(100vh) scale(0); opacity: 0; }
                                10% { opacity: 1; }
                                90% { opacity: 1; }
                                100% { transform: translateY(-100vh) scale(1); opacity: 0; }
                            }
                            @keyframes floatLogo {
                                0%, 100% { transform: translateY(0px); }
                                50% { transform: translateY(-10px); }
                            }
                            @keyframes glowPulse {
                                0%, 100% { 
                                    filter: drop-shadow(0 0 15px rgba(0, 200, 180, 0.5)) drop-shadow(0 0 30px rgba(0, 150, 136, 0.3));
                                }
                                50% { 
                                    filter: drop-shadow(0 0 25px rgba(0, 220, 200, 0.7)) drop-shadow(0 0 50px rgba(0, 180, 160, 0.4));
                                }
                            }
                            .particle {
                                position: absolute;
                                width: 6px;
                                height: 6px;
                                background: radial-gradient(circle, rgba(0, 220, 200, 0.9) 0%, transparent 70%);
                                border-radius: 50%;
                                animation: floatUp linear infinite;
                            }
                            .logo-container {
                                animation: floatLogo 3s ease-in-out infinite;
                            }
                            .logo-glow {
                                animation: glowPulse 2.5s ease-in-out infinite;
                            }
                            .logo-glow:hover {
                                transform: scale(1.08);
                                transition: transform 0.3s ease;
                            }
                        `}
                    </style>

                    {/* Floating Particles */}
                    {particles.map((p) => (
                        <div
                            key={p.id}
                            className="particle"
                            style={{
                                left: p.left,
                                animationDuration: p.animationDuration,
                                animationDelay: p.animationDelay,
                                width: p.size,
                                height: p.size,
                                opacity: p.opacity
                            }}
                        />
                    ))}

                    {/* Logo and Branding */}
                    <div className="text-center z-1 position-relative">
                        <div className="logo-container mb-2">
                            <img
                                src="/wolf-logo-animated.png"
                                alt="WOLF HMS Logo"
                                className="img-fluid logo-glow"
                                style={{
                                    width: '320px',
                                    height: '320px',
                                    objectFit: 'contain'
                                }}
                            />
                        </div>
                        {/* WOLF HMS Text Image */}
                        <img
                            src="/wolf-hms-text.png"
                            alt="WOLF HMS"
                            style={{
                                width: '280px',
                                height: 'auto',
                                marginBottom: '0.5rem'
                            }}
                        />
                        {/* Bold tagline */}
                        <h3 style={{
                            fontSize: '1.4rem',
                            fontWeight: '700',
                            color: '#ffffff',
                            letterSpacing: '1px',
                            marginBottom: '0.75rem'
                        }}>The Ultimate Hospital Assistant.</h3>
                        {/* Teal accent subtitle */}
                        <p style={{
                            fontSize: '1rem',
                            fontWeight: '500',
                            color: 'rgba(0, 200, 180, 0.9)',
                            letterSpacing: '2px',
                            fontStyle: 'italic'
                        }}>Integrated. Intelligent. Secure.</p>
                    </div>
                </Col>

                {/* Right Side - Login Form with AI Flowing Waves Background */}
                <Col md={7} className="d-flex align-items-center justify-content-center position-relative overflow-hidden"
                    style={{ color: currentTheme.textRight, transition: 'color 0.5s ease' }}>

                    {/* AI Flowing Waves - Like Healthcare AI Analytics */}
                    <style>
                        {`
                            .ai-waves-bg {
                                position: absolute;
                                inset: 0;
                                background: linear-gradient(180deg, #ffffff 0%, #f0fafa 100%);
                                overflow: hidden;
                            }
                            @keyframes waveFlow {
                                0% { transform: translateX(-5%); }
                                50% { transform: translateX(5%); }
                                100% { transform: translateX(-5%); }
                            }
                            .wave-container {
                                position: absolute;
                                width: 120%;
                                left: -10%;
                                animation: waveFlow 20s ease-in-out infinite;
                            }
                            .wave-svg {
                                width: 100%;
                                height: auto;
                            }
                        `}
                    </style>
                    <div className="ai-waves-bg">
                        <div className="wave-container" style={{ bottom: '0', height: '70%' }}>
                            <svg className="wave-svg" viewBox="0 0 1200 400" preserveAspectRatio="none" style={{ height: '100%', opacity: 0.6 }}>
                                <defs>
                                    <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#00bfa5" stopOpacity="0.3" />
                                        <stop offset="50%" stopColor="#26c6da" stopOpacity="0.5" />
                                        <stop offset="100%" stopColor="#00897b" stopOpacity="0.3" />
                                    </linearGradient>
                                    <linearGradient id="waveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#4dd0e1" stopOpacity="0.2" />
                                        <stop offset="50%" stopColor="#00acc1" stopOpacity="0.4" />
                                        <stop offset="100%" stopColor="#26c6da" stopOpacity="0.2" />
                                    </linearGradient>
                                </defs>
                                {/* Wave 1 - Bottom */}
                                <path d="M0,350 Q150,280 300,320 T600,300 T900,340 T1200,300 L1200,400 L0,400 Z" fill="url(#waveGrad1)" />
                                {/* Wave 2 - Middle */}
                                <path d="M0,300 Q200,220 400,280 T800,240 T1200,280 L1200,400 L0,400 Z" fill="url(#waveGrad2)" opacity="0.7" />
                                {/* Dotted wave lines */}
                                <path d="M0,200 Q150,120 300,180 T600,140 T900,200 T1200,160" stroke="#00bcd4" strokeWidth="2" fill="none" strokeDasharray="4,8" opacity="0.5" />
                                <path d="M0,250 Q200,170 400,230 T800,180 T1200,240" stroke="#26a69a" strokeWidth="2" fill="none" strokeDasharray="4,8" opacity="0.4" />
                                <path d="M0,150 Q180,80 360,140 T720,100 T1080,160 T1200,120" stroke="#4db6ac" strokeWidth="1.5" fill="none" strokeDasharray="3,6" opacity="0.3" />
                                {/* Floating particles */}
                                <circle cx="100" cy="180" r="3" fill="#00bcd4" opacity="0.6" />
                                <circle cx="250" cy="220" r="2" fill="#26a69a" opacity="0.5" />
                                <circle cx="400" cy="160" r="4" fill="#4dd0e1" opacity="0.4" />
                                <circle cx="550" cy="240" r="2.5" fill="#00897b" opacity="0.6" />
                                <circle cx="700" cy="140" r="3" fill="#00bcd4" opacity="0.5" />
                                <circle cx="850" cy="200" r="2" fill="#26c6da" opacity="0.4" />
                                <circle cx="1000" cy="180" r="3.5" fill="#4db6ac" opacity="0.5" />
                                <circle cx="1100" cy="230" r="2" fill="#00acc1" opacity="0.6" />
                                <circle cx="180" cy="280" r="2.5" fill="#00bfa5" opacity="0.4" />
                                <circle cx="480" cy="300" r="3" fill="#26a69a" opacity="0.5" />
                                <circle cx="780" cy="260" r="2" fill="#00bcd4" opacity="0.4" />
                                <circle cx="950" cy="290" r="3" fill="#4dd0e1" opacity="0.5" />
                            </svg>
                        </div>
                    </div>

                    <div style={{ width: '100%', maxWidth: '450px', position: 'relative', zIndex: 10 }} className="p-4">
                        <div className="text-center mb-5">
                            <h1 className="fw-bold mb-2">Welcome Back!</h1>
                            <p className="opacity-75">Please log in to access your clinical dashboard.</p>
                        </div>

                        {error && <Alert variant="danger" className="mb-4 border-0 shadow-sm">{error}</Alert>}

                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-4 position-relative">
                                <div className="position-absolute top-50 start-0 translate-middle-y ps-3 opacity-50">
                                    <User size={20} color={currentTheme.textRight} />
                                </div>
                                <Form.Control
                                    type="text"
                                    placeholder="Username / Email"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                    className="ps-5 py-3 border-0 shadow-sm"
                                    style={{
                                        backgroundColor: currentTheme.inputBg,
                                        color: 'black',
                                        transition: 'background 0.5s ease'
                                    }}
                                />
                            </Form.Group>

                            <Form.Group className="mb-4 position-relative">
                                <div className="position-absolute top-50 start-0 translate-middle-y ps-3 opacity-50">
                                    <Lock size={20} color={currentTheme.textRight} />
                                </div>
                                <Form.Control
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="ps-5 py-3 border-0 shadow-sm"
                                    style={{
                                        backgroundColor: currentTheme.inputBg,
                                        color: 'black',
                                        transition: 'background 0.5s ease'
                                    }}
                                />
                            </Form.Group>

                            <Button
                                variant="primary"
                                type="submit"
                                className="w-100 py-3 fw-bold shadow-sm mb-4 text-uppercase border-0"
                                style={{
                                    letterSpacing: '1px',
                                    backgroundColor: currentTheme.accent,
                                    transition: 'background 0.5s ease'
                                }}
                            >
                                Secure Login
                            </Button>

                            <div className="d-flex justify-content-between small">
                                <Link to="/forgot-password" style={{ color: currentTheme.textRight }} className="text-decoration-none opacity-75 hover-opacity-100">Forgot Password?</Link>
                                <Link to="/register" style={{ color: currentTheme.accent }} className="text-decoration-none fw-bold">Sign Up</Link>
                            </div>
                        </Form>

                        <div className="mt-5 text-center small opacity-50">
                            &copy; 2025 Wolf Technologies India. All rights reserved.
                        </div>
                    </div>
                </Col>
            </Row>
        </Container >
    );
};

export default Login;
