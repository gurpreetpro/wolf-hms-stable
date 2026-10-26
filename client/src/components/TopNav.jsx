import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container, Button, Dropdown, Modal } from 'react-bootstrap';
import {
    LayoutDashboard,
    Settings,
    Bell,
    LogOut,
    ChevronDown,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Grid3x3,
    Map,
    Key,
    Sparkles
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import api from '../utils/axiosInstance';
import SettingsModal from './settings/SettingsModal';
import AIGatewayWatchdogModal from './AIGatewayWatchdogModal';

const TopNav = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showSettings, setShowSettings] = useState(false);
    const [showPanicModal, setShowPanicModal] = useState(false);
    const [panicLoading, setPanicLoading] = useState(false);

    // AI Gateway & Watchdog Portal State
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiModalTab, setAiModalTab] = useState('keys');
    const [activeModelName, setActiveModelName] = useState('Gemini 3.8 Flash');
    const [telemetryErrorCount, setTelemetryErrorCount] = useState(0);

    // Check telemetry buffer & active model
    const checkTelemetry = () => {
        if (typeof window !== 'undefined' && window.__WOLF_WATCHDOG_TELEMETRY__) {
            const apiCalls = window.__WOLF_WATCHDOG_TELEMETRY__.apiCalls || [];
            const recentErrors = apiCalls.filter(c => c.status >= 400);
            setTelemetryErrorCount(recentErrors.length);
        }
    };

    useEffect(() => {
        checkTelemetry();
        const interval = setInterval(checkTelemetry, 3000);

        // Fetch active model
        api.get('/api/ai/keys')
            .then(res => {
                if (res.data?.defaultModel) {
                    const formatted = res.data.defaultModel.replace('gemini-', 'Gemini ').replace('deepseek-', 'DeepSeek ').replace('gpt-', 'GPT ');
                    setActiveModelName(formatted);
                }
            })
            .catch(() => {});

        // Global event listener to open AI modal from floating button or other components
        const handleOpenAIModal = (e) => {
            if (e?.detail?.tab) setAiModalTab(e.detail.tab);
            setShowAIModal(true);
        };
        window.addEventListener('open-ai-modal', handleOpenAIModal);

        return () => {
            clearInterval(interval);
            window.removeEventListener('open-ai-modal', handleOpenAIModal);
        };
    }, []);

    let user = {};
    try {
        const userStr = localStorage.getItem('user');
        // Guard against "undefined" string or null/empty
        if (userStr && userStr !== 'undefined' && userStr !== 'null') {
            const storedUser = JSON.parse(userStr);
            user = storedUser || {};
        }
    } catch (e) {
        console.error('Error parsing user data in TopNav:', e);
        user = {};
    }

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const isHome = location.pathname === '/';

    const handlePanicTrigger = async () => {
        setPanicLoading(true);
        try {
            await api.post('/api/alerts/duress', { 
                location: location.pathname 
            });
            setShowPanicModal(false);
        } catch (err) {
            console.error('Failed to trigger panic:', err);
        } finally {
            setPanicLoading(false);
        }
    };

    return (
        <>
            <Navbar className="top-nav-premium sticky-top">
                <Container fluid className="px-4">
                    {/* Brand */}
                    <Navbar.Brand as={Link} to="/" className="brand-logo">
                        <div className="brand-icon-img">
                            <img src="/wolf_logo.png" alt="Wolf Logo" style={{ width: '42px', height: '42px', objectFit: 'contain' }} />
                        </div>
                        <span className="brand-text">WOLF HMS</span>
                    </Navbar.Brand>

                    {/* Center - Dashboard Button (only show when not on home) */}
                    <Nav className="mx-auto">
                        {!isHome && (
                            <>
                                <Nav.Link as={Link} to="/" className="dashboard-btn d-flex align-items-center gap-2">
                                    <LayoutDashboard size={18} />
                                    <span>Dashboard</span>
                                </Nav.Link>
                                <Nav.Link as={Link} to="/security" className="dashboard-btn d-flex align-items-center gap-2 ms-2">
                                    <Shield size={18} />
                                    <span>Security</span>
                                </Nav.Link>
                                <Nav.Link as={Link} to="/security/floor-plans" className="dashboard-btn d-flex align-items-center gap-2 ms-2">
                                    <Map size={18} />
                                    <span>Floor Plans</span>
                                </Nav.Link>
                            </>
                        )}
                    </Nav>

                {/* Right Side */}
                    <div className="nav-right d-flex align-items-center">
                        {/* 1. AI API Key Portal & Models Pill Button */}
                        <Button
                            variant="outline-light"
                            className="ai-portal-pill-btn d-flex align-items-center gap-1 px-3 py-1 me-2 rounded-pill shadow-sm"
                            onClick={() => { setAiModalTab('keys'); setShowAIModal(true); }}
                            title="Open AI API Key Portal & Switch Models"
                        >
                            <Key size={14} className="text-warning" />
                            <span className="d-none d-md-inline">AI Keys:</span>
                            <span className="text-warning fw-bold">{activeModelName || 'Gemini 3.8'}</span>
                        </Button>

                        {/* 2. Watchdog / Report Issue Pill Button */}
                        <Button
                            variant="outline-light"
                            className={`watchdog-pill-btn d-flex align-items-center gap-1 px-3 py-1 me-2 rounded-pill shadow-sm ${telemetryErrorCount > 0 ? 'watchdog-err' : 'watchdog-ok'}`}
                            onClick={() => { setAiModalTab('watchdog'); setShowAIModal(true); }}
                            title="Open Watchdog & Telemetry Monitor"
                        >
                            {telemetryErrorCount > 0 ? (
                                <>
                                    <ShieldAlert size={14} className="text-danger" />
                                    <span className="d-none d-md-inline">Watchdog:</span>
                                    <span className="badge bg-danger ms-1">{telemetryErrorCount} Err</span>
                                </>
                            ) : (
                                <>
                                    <ShieldCheck size={14} className="text-success" />
                                    <span className="d-none d-md-inline">Watchdog:</span>
                                    <span className="text-success fw-bold d-flex align-items-center gap-1">
                                        <span className="status-dot-green"></span> Healthy
                                    </span>
                                </>
                            )}
                        </Button>

                        {/* Panic Button for Clinical Staff */}
                        {['nurse', 'doctor', 'ward_incharge'].includes(user.role) && (
                            <Button 
                                variant="danger" 
                                className="panic-btn me-2" 
                                onClick={() => setShowPanicModal(true)}
                            >
                                <ShieldAlert size={18} className="me-1" />
                                <span>PANIC</span>
                            </Button>
                        )}

                        {/* Theme Toggle */}
                        <ThemeToggle />

                        <Button variant="link" className="notification-btn">
                            <Bell size={20} />
                            <span className="notification-dot"></span>
                        </Button>

                        <Dropdown align="end" className="user-dropdown">
                            <Dropdown.Toggle as="div" className="user-trigger">
                                <div className="user-avatar">
                                    {user.username ? user.username.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div className="user-info">
                                    <span className="user-name">{user.full_name || user.username || 'User'}</span>
                                    <span className="user-role">{user.role}</span>
                                </div>
                                <ChevronDown size={14} />
                            </Dropdown.Toggle>

                            <Dropdown.Menu className="glass-dropdown user-menu">
                                {['super_admin', 'admin', 'platform_admin'].includes(user.role) && (
                                    <>
                                        <Dropdown.Item as={Link} to="/platform" className="dropdown-item-custom">
                                            <Grid3x3 size={14} />
                                            <span>Platform Dashboard</span>
                                        </Dropdown.Item>
                                        <Dropdown.Divider />
                                    </>
                                )}
                                <Dropdown.Item onClick={() => setShowSettings(true)} className="dropdown-item-custom">
                                    <Settings size={14} />
                                    <span>Settings</span>
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item onClick={handleLogout} className="dropdown-item-custom text-danger">
                                    <LogOut size={14} />
                                    <span>Sign Out</span>
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </div>
                </Container>
            </Navbar>

            {/* Panic Confirmation Modal */}
            <Modal show={showPanicModal} onHide={() => setShowPanicModal(false)} centered className="cyber-modal">
                <Modal.Header closeButton className="bg-danger text-white border-0">
                    <Modal.Title className="d-flex align-items-center">
                        <ShieldAlert size={24} className="me-2" />
                        CONFIRM CODE VIOLET
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-dark text-light border-0 text-center py-4">
                    <h5 className="text-danger fw-bold mb-3">ARE YOU IN IMMEDIATE DANGER?</h5>
                    <p className="mb-0">This will summon Security and trigger a hospital-wide alert.</p>
                </Modal.Body>
                <Modal.Footer className="bg-dark border-top border-secondary">
                    <Button variant="secondary" onClick={() => setShowPanicModal(false)}>Cancel</Button>
                    <Button 
                        variant="danger" 
                        onClick={handlePanicTrigger} 
                        disabled={panicLoading}
                        className="fw-bold px-4"
                    >
                        {panicLoading ? 'TRIGGERING...' : 'YES, TRIGGER DURESS'}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Global Settings Modal */}
            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                user={user}
            />

            {/* Global AI Gateway & Watchdog Portal Modal */}
            <AIGatewayWatchdogModal
                show={showAIModal}
                onHide={() => setShowAIModal(false)}
                initialTab={aiModalTab}
            />

            <style>{`
                /* ===== Top Navigation Premium Styles ===== */
                .top-nav-premium {
                    background: linear-gradient(135deg, #0d9488 0%, #0f766e 50%, #115e59 100%);
                    padding: 0.6rem 0;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .ai-portal-pill-btn {
                    background: rgba(255, 255, 255, 0.12);
                    border: 1px solid rgba(255, 255, 255, 0.35);
                    backdrop-filter: blur(8px);
                    font-size: 0.82rem;
                    font-weight: 600;
                    transition: all 0.2s ease;
                }
                .ai-portal-pill-btn:hover {
                    background: rgba(255, 255, 255, 0.22);
                    border-color: rgba(255, 255, 255, 0.6);
                    transform: translateY(-1px);
                }
                .watchdog-pill-btn {
                    backdrop-filter: blur(8px);
                    font-size: 0.82rem;
                    font-weight: 600;
                    transition: all 0.2s ease;
                }
                .watchdog-pill-btn.watchdog-ok {
                    background: rgba(255, 255, 255, 0.12);
                    border: 1px solid rgba(255, 255, 255, 0.35);
                }
                .watchdog-pill-btn.watchdog-ok:hover {
                    background: rgba(255, 255, 255, 0.22);
                    border-color: rgba(255, 255, 255, 0.6);
                    transform: translateY(-1px);
                }
                .watchdog-pill-btn.watchdog-err {
                    background: rgba(220, 53, 69, 0.25);
                    border: 1px solid #dc3545;
                }
                .status-dot-green {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background-color: #10b981;
                    box-shadow: 0 0 6px #10b981;
                    display: inline-block;
                }

                /* Brand */
                .brand-logo {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    text-decoration: none;
                    color: white !important;
                }
                .brand-icon {
                    background: rgba(255, 255, 255, 0.15);
                    padding: 0.5rem;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(10px);
                }
                .brand-text {
                    font-weight: 700;
                    font-size: 1.15rem;
                    letter-spacing: -0.5px;
                }

                /* Dashboard Button */
                .dashboard-btn {
                    background: rgba(255, 255, 255, 0.95) !important;
                    color: #0d9488 !important;
                    padding: 0.5rem 1.25rem !important;
                    border-radius: 25px;
                    font-weight: 600;
                    font-size: 0.875rem;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                    transition: all 0.2s ease;
                }
                .dashboard-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                }

                /* Right Side */
                .nav-right {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }

                /* Notification Button */
                .notification-btn {
                    position: relative;
                    padding: 0.5rem;
                    color: rgba(255, 255, 255, 0.8) !important;
                    transition: all 0.2s ease;
                }
                .notification-btn:hover {
                    color: white !important;
                    transform: scale(1.05);
                }
                .notification-dot {
                    position: absolute;
                    top: 6px;
                    right: 6px;
                    width: 8px;
                    height: 8px;
                    background: #ef4444;
                    border-radius: 50%;
                    border: 2px solid #0d9488;
                }

                /* Glass Dropdown Menu */
                .glass-dropdown {
                    background: rgba(15, 118, 110, 0.95) !important;
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.15) !important;
                    border-radius: 12px !important;
                    padding: 0.5rem !important;
                    margin-top: 0.5rem !important;
                    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3) !important;
                    min-width: 180px;
                    animation: dropdownFade 0.2s ease;
                }
                @keyframes dropdownFade {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* Dropdown Item */
                .dropdown-item-custom {
                    display: flex;
                    align-items: center;
                    gap: 0.65rem;
                    padding: 0.6rem 0.85rem !important;
                    border-radius: 8px;
                    color: rgba(255, 255, 255, 0.9) !important;
                    font-size: 0.85rem;
                    font-weight: 500;
                    transition: all 0.15s ease;
                }
                .dropdown-item-custom:hover {
                    background: rgba(255, 255, 255, 0.15) !important;
                    color: white !important;
                    transform: translateX(3px);
                }
                .dropdown-item-custom.text-danger {
                    color: #fca5a5 !important;
                }
                .dropdown-item-custom.text-danger:hover {
                    background: rgba(239, 68, 68, 0.2) !important;
                    color: #fecaca !important;
                }

                .glass-dropdown .dropdown-divider {
                    border-color: rgba(255, 255, 255, 0.1);
                    margin: 0.4rem 0;
                }

                /* User Dropdown */
                .user-trigger {
                    display: flex;
                    align-items: center;
                    gap: 0.65rem;
                    padding: 0.35rem 0.5rem 0.35rem 0.35rem;
                    border-radius: 50px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    background: rgba(255, 255, 255, 0.1);
                }
                .user-trigger:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
                .user-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: white;
                    color: #0d9488;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 0.85rem;
                }
                .user-info {
                    display: flex;
                    flex-direction: column;
                    line-height: 1.2;
                .user-role {
                    color: rgba(255, 255, 255, 0.65);
                    font-size: 0.7rem;
                    text-transform: capitalize;
                }
                .user-trigger > svg {
                    color: rgba(255, 255, 255, 0.7);
                }

                .user-menu {
                    min-width: 160px !important;
                }

                    .nav-right {
                        padding: 1rem 0;
                    }
                    .user-info {
                        display: flex;
                    }
                }

                .panic-btn {
                    font-weight: 800;
                    letter-spacing: 0.5px;
                    border-radius: 20px;
                    animation: pulse-red 2s infinite;
                    box-shadow: 0 0 10px rgba(220, 53, 69, 0.5);
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

export default TopNav;
