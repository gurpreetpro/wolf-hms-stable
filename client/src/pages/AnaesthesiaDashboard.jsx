import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Badge, Tabs, Tab } from 'react-bootstrap';
import { Activity, Zap, Syringe, ClipboardList, Lock, Phone, Video, Bell, Wind, LogOut, Shield, UserX, Home, Calculator } from 'lucide-react';
import axios from 'axios';
import io from '../utils/socket-stub';
import emergencySound from '../utils/emergencySound';


const socket = io('/', { path: '/socket.io' });

const AnaesthesiaDashboard = () => {
    const [mode, setMode] = useState('Routine'); // Routine or War
    const [activeCode, setActiveCode] = useState('Blue'); // Default to Blue
    const [logs, setLogs] = useState([]);
    const [weight, setWeight] = useState('');
    const [drugDose, setDrugDose] = useState(null);

    const [emergencyData, setEmergencyData] = useState(null);

    useEffect(() => {
        socket.on('emergency_broadcast', (data) => {
            setMode('War');
            setActiveCode(data.code);
            setEmergencyData(data); // Capture emergency data
            emergencySound.play(); // Play emergency alert sound
        });

        return () => {
            socket.off('emergency_broadcast');
        };
    }, []);

    const logAction = async (action) => {
        const log = { time: new Date().toLocaleTimeString(), action };
        setLogs([log, ...logs]);

        // CRITICAL FIX: Only send response if we have an active emergency
        if (!emergencyData) {
            console.warn('No active emergency to respond to');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/emergency/respond', {
                emergency_id: emergencyData.id, // DYNAMIC from socket
                location: emergencyData.location,
                code: activeCode,
                action: action,
                timestamp: new Date().toISOString()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error('Emergency response error:', err);
        }
    };

    const calculateDose = () => {
        if (!weight) return;
        setDrugDose({
            propofol: (weight * 2).toFixed(1) + ' mg',
            fentanyl: (weight * 1.5).toFixed(1) + ' mcg',
            rocuronium: (weight * 0.6).toFixed(1) + ' mg'
        });
    };

    // Dynamic Background based on Code
    const getWarModeStyles = () => {
        switch (activeCode) {
            case 'Blue': return 'bg-primary bg-opacity-25';
            case 'Red': return 'bg-danger bg-opacity-25';
            case 'Pink': return 'bg-danger bg-opacity-10'; // Pinkish
            case 'Yellow': return 'bg-warning bg-opacity-25';
            case 'Violet': return 'bg-dark bg-opacity-50 text-white';
            default: return 'bg-dark text-white';
        }
    };

    const renderWarButtons = () => {
        switch (activeCode) {
            case 'Blue': // Medical Emergency
                return (
                    <>
                        <Button variant="danger" size="lg" className="p-4 fs-3 fw-bold shadow" onClick={() => logAction('CPR Started')}>
                            <Activity size={32} className="me-2" /> CPR START
                        </Button>
                        <Button variant="warning" size="lg" className="p-4 fs-3 fw-bold text-dark shadow" onClick={() => logAction('Shock Delivered')}>
                            <Zap size={32} className="me-2" /> SHOCK
                        </Button>
                        <Button variant="info" size="lg" className="p-4 fs-3 fw-bold text-white shadow" onClick={() => logAction('Epinephrine 1mg')}>
                            <Syringe size={32} className="me-2" /> EPI 1mg
                        </Button>
                        <Button variant="success" size="lg" className="p-4 fs-3 fw-bold shadow" onClick={() => logAction('Intubation')}>
                            <ClipboardList size={32} className="me-2" /> INTUBATE
                        </Button>
                    </>
                );
            case 'Pink': // Child Abduction
                return (
                    <>
                        <Button variant="dark" size="lg" className="p-4 fs-3 fw-bold shadow" onClick={() => logAction('Exits Locked')}>
                            <Lock size={32} className="me-2" /> LOCKDOWN
                        </Button>
                        <Button variant="primary" size="lg" className="p-4 fs-3 fw-bold shadow" onClick={() => logAction('Police Notified')}>
                            <Phone size={32} className="me-2" /> POLICE
                        </Button>
                        <Button variant="secondary" size="lg" className="p-4 fs-3 fw-bold shadow" onClick={() => logAction('CCTV Checked')}>
                            <Video size={32} className="me-2" /> CHECK CCTV
                        </Button>
                        <Button variant="danger" size="lg" className="p-4 fs-3 fw-bold shadow" onClick={() => logAction('Code Pink All Clear')}>
                            <Shield size={32} className="me-2" /> ALL CLEAR
                        </Button>
                    </>
                );
            case 'Red': // Fire
                return (
                    <>
                        <Button variant="danger" size="lg" className="p-4 fs-3 fw-bold shadow" onClick={() => logAction('Alarm Activated')}>
                            <Bell size={32} className="me-2" /> ALARM
                        </Button>
                        <Button variant="warning" size="lg" className="p-4 fs-3 fw-bold text-dark shadow" onClick={() => logAction('O2 Valves Closed')}>
                            <Wind size={32} className="me-2" /> CLOSE O2
                        </Button>
                        <Button variant="dark" size="lg" className="p-4 fs-3 fw-bold shadow" onClick={() => logAction('Ward Evacuated')}>
                            <LogOut size={32} className="me-2" /> EVACUATE
                        </Button>
                        <Button variant="success" size="lg" className="p-4 fs-3 fw-bold shadow" onClick={() => logAction('Fire Extinguished')}>
                            <Shield size={32} className="me-2" /> EXTINGUISHED
                        </Button>
                    </>
                );
            case 'Yellow': // Disaster
                return (
                    <>
                        <Button variant="warning" size="lg" className="p-4 fs-3 fw-bold text-dark shadow" onClick={() => logAction('Triage Area Open')}>
                            <Activity size={32} className="me-2" /> OPEN TRIAGE
                        </Button>
                        <Button variant="primary" size="lg" className="p-4 fs-3 fw-bold shadow" onClick={() => logAction('Staff Called Back')}>
                            <Phone size={32} className="me-2" /> CALL STAFF
                        </Button>
                        <Button variant="info" size="lg" className="p-4 fs-3 fw-bold text-white shadow" onClick={() => logAction('Stock Checked')}>
                            <ClipboardList size={32} className="me-2" /> CHECK STOCK
                        </Button>
                        <Button variant="success" size="lg" className="p-4 fs-3 fw-bold shadow" onClick={() => logAction('Disaster Stand Down')}>
                            <Home size={32} className="me-2" /> STAND DOWN
                        </Button>
                    </>
                );
            case 'Violet': // Violence
                return (
                    <>
                        <Button variant="dark" size="lg" className="p-4 fs-3 fw-bold shadow" onClick={() => logAction('Security Called')}>
                            <Shield size={32} className="me-2" /> SECURITY
                        </Button>
                        <Button variant="danger" size="lg" className="p-4 fs-3 fw-bold shadow" onClick={() => logAction('Patient Restrained')}>
                            <UserX size={32} className="me-2" /> RESTRAIN
                        </Button>
                        <Button variant="success" size="lg" className="p-4 fs-3 fw-bold shadow" onClick={() => logAction('Safe Room Secured')}>
                            <Lock size={32} className="me-2" /> SECURE ROOM
                        </Button>
                        <Button variant="info" size="lg" className="p-4 fs-3 fw-bold text-white shadow" onClick={() => logAction('De-escalated')}>
                            <Activity size={32} className="me-2" /> DE-ESCALATE
                        </Button>
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <Container fluid className={`min-vh-100 p-4 transition-all ${mode === 'War' ? getWarModeStyles() : 'bg-light'}`}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold d-flex align-items-center gap-3">
                    Anaesthesia & Critical Care
                    {mode === 'War' && (
                        <Badge bg="danger" className="fs-4 animate-pulse shadow">
                            CODE {activeCode.toUpperCase()} ACTIVE
                        </Badge>
                    )}
                </h3>
                <div className="d-flex align-items-center gap-3 bg-white p-2 rounded shadow-sm">
                    {mode === 'War' && (
                        <Form.Select
                            value={activeCode}
                            onChange={(e) => setActiveCode(e.target.value)}
                            className="bg-light border-0 fw-bold"
                            style={{ width: '150px' }}
                        >
                            <option value="Blue">Blue</option>
                            <option value="Pink">Pink</option>
                            <option value="Red">Red</option>
                            <option value="Yellow">Yellow</option>
                            <option value="Violet">Violet</option>
                        </Form.Select>
                    )}
                    <Form.Check
                        type="switch"
                        id="war-mode-switch"
                        label="WAR MODE"
                        checked={mode === 'War'}
                        onChange={(e) => setMode(e.target.checked ? 'War' : 'Routine')}
                        className="fs-5 fw-bold text-danger mb-0"
                    />
                </div>
            </div>

            {mode === 'Routine' ? (
                <Container>
                    <Tabs defaultActiveKey="preop" className="mb-4">
                        <Tab eventKey="preop" title="Pre-Op Clearance">
                            <Row>
                                <Col md={6}>
                                    <Card className="shadow-sm border-0 mb-4">
                                        <Card.Header className="bg-white fw-bold">Patient Assessment</Card.Header>
                                        <Card.Body>
                                            <Form>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Patient Name</Form.Label>
                                                    <Form.Control placeholder="Select Patient..." />
                                                </Form.Group>
                                                <Form.Check label="NPO Status Confirmed" className="mb-2" />
                                                <Form.Check label="Consent Signed" className="mb-2" />
                                                <Form.Check label="Airway Assessment (Mallampati)" className="mb-2" />
                                                <Form.Check label="Allergies Checked" className="mb-2" />
                                                <Button variant="primary" className="mt-3 w-100">Clear for Surgery</Button>
                                            </Form>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card className="shadow-sm border-0">
                                        <Card.Header className="bg-white fw-bold">Drug Calculator</Card.Header>
                                        <Card.Body>
                                            <div className="d-flex gap-2 mb-3">
                                                <Form.Control
                                                    type="number"
                                                    placeholder="Weight (kg)"
                                                    value={weight}
                                                    onChange={e => setWeight(e.target.value)}
                                                />
                                                <Button onClick={calculateDose}><Calculator size={18} /></Button>
                                            </div>
                                            {drugDose && (
                                                <div className="bg-light p-3 rounded">
                                                    <div className="d-flex justify-content-between mb-1">
                                                        <span>Propofol (2mg/kg):</span> <strong>{drugDose.propofol}</strong>
                                                    </div>
                                                    <div className="d-flex justify-content-between mb-1">
                                                        <span>Fentanyl (1.5mcg/kg):</span> <strong>{drugDose.fentanyl}</strong>
                                                    </div>
                                                    <div className="d-flex justify-content-between">
                                                        <span>Rocuronium (0.6mg/kg):</span> <strong>{drugDose.rocuronium}</strong>
                                                    </div>
                                                </div>
                                            )}
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </Tab>
                        <Tab eventKey="monitor" title="Live Monitor">
                            <Card className="bg-black text-success border-0 shadow-lg p-5">
                                <Row className="text-center">
                                    <Col>
                                        <div className="text-secondary small mb-2">ECG</div>
                                        <Activity size={64} className="animate-pulse mb-3" />
                                        <h1 className="display-1 fw-bold">72</h1>
                                        <div className="text-muted small">BPM</div>
                                    </Col>
                                    <Col>
                                        <div className="text-secondary small mb-2">SpO2</div>
                                        <h1 className="display-1 fw-bold text-info mt-4">99%</h1>
                                    </Col>
                                    <Col>
                                        <div className="text-secondary small mb-2">NIBP</div>
                                        <h1 className="display-1 fw-bold text-warning mt-4">120/80</h1>
                                        <div className="text-muted small">mmHg</div>
                                    </Col>
                                </Row>
                            </Card>
                        </Tab>
                    </Tabs>
                </Container>
            ) : (
                // WAR MODE UI
                <Row className="h-75">
                    <Col md={8} className="d-flex align-items-center">
                        <div className="d-grid gap-4 w-100" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            {renderWarButtons()}
                        </div>
                    </Col>
                    <Col md={4}>
                        <Card className="bg-black bg-opacity-75 text-white border-0 h-100 shadow-lg">
                            <Card.Header className="fw-bold border-secondary d-flex justify-content-between align-items-center">
                                <span>Live Scribe Log</span>
                                <Badge bg="danger">REC</Badge>
                            </Card.Header>
                            <Card.Body className="overflow-auto" style={{ maxHeight: '600px' }}>
                                {logs.length === 0 && <div className="text-muted text-center mt-5">Waiting for actions...</div>}
                                {logs.map((log, i) => (
                                    <div key={i} className="mb-2 border-bottom border-secondary pb-2 animate-slide-in">
                                        <Badge bg="secondary" className="me-2">{log.time}</Badge>
                                        <span className="fw-bold fs-5">{log.action}</span>
                                    </div>
                                ))}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}
        </Container>
    );
};

export default AnaesthesiaDashboard;
