import React, { useState, useEffect } from 'react';
import { Modal, Button, Row, Col, Alert, Badge, Spinner, Card, Form, ProgressBar } from 'react-bootstrap';
import { Droplet, AlertTriangle, Zap, Phone, Clock, CheckCircle, Activity, User, Siren } from 'lucide-react';
import api from '../utils/axiosInstance';

/**
 * EmergencyBloodRelease - Massive Transfusion Protocol (MTP) Component
 * For emergency situations requiring immediate blood release
 */
const EmergencyBloodRelease = ({ show, onHide, patient, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Confirm, 2: Protocol, 3: Complete
    const [mtpActive, setMtpActive] = useState(false);
    const [stockInfo, setStockInfo] = useState([]);
    const [countdown, setCountdown] = useState(null);
    const [error, setError] = useState(null);
    
    const [form, setForm] = useState({
        patient_blood_group: '',
        use_o_negative: true,
        indication: '',
        trauma_score: '',
        estimated_blood_loss: '',
        attending_physician: '',
        contact_number: ''
    });

    // MTP Protocol packages (standard ratios)
    const MTP_PACKAGES = [
        { 
            name: 'MTP Package 1',
            description: 'Initial resuscitation',
            prbc: 6, ffp: 4, platelets: 1, cryo: 0
        },
        { 
            name: 'MTP Package 2',
            description: 'Continued resuscitation',
            prbc: 6, ffp: 4, platelets: 1, cryo: 10
        },
        { 
            name: 'MTP Package 3+',
            description: 'Ongoing massive transfusion',
            prbc: 6, ffp: 4, platelets: 1, cryo: 10
        }
    ];

    const [selectedPackage, setSelectedPackage] = useState(0);

    useEffect(() => {
        if (show) {
            fetchStock();
            setStep(1);
            setMtpActive(false);
        }
    }, [show]);

    useEffect(() => {
        if (patient?.blood_group) {
            setForm(prev => ({ ...prev, patient_blood_group: patient.blood_group }));
        }
    }, [patient]);

    // Countdown timer when MTP is activated
    useEffect(() => {
        let timer;
        if (mtpActive && countdown > 0) {
            timer = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [mtpActive, countdown]);

    const fetchStock = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/api/blood-bank/dashboard', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data?.data || res.data;
            setStockInfo(data.inventory || []);
        } catch (err) {
            console.error('Failed to fetch stock:', err);
        }
    };

    const getONegativeStock = () => {
        return stockInfo.find(s => s.blood_group === 'O-')?.units || 0;
    };

    const activateMTP = async () => {
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            await api.post('/api/blood-bank/emergency-release', {
                patient_id: patient?.id || patient?.patient_id,
                blood_group: form.use_o_negative ? 'O-' : form.patient_blood_group,
                mtp_package: selectedPackage + 1,
                package_details: MTP_PACKAGES[selectedPackage],
                indication: form.indication,
                trauma_score: form.trauma_score,
                estimated_blood_loss: form.estimated_blood_loss,
                attending_physician: form.attending_physician,
                contact_number: form.contact_number,
                emergency_type: 'MTP'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setMtpActive(true);
            setCountdown(300); // 5 minute countdown for blood delivery
            setStep(3);
        } catch (err) {
            console.error('Failed to activate MTP:', err);
            setError(err.response?.data?.message || 'Failed to activate emergency protocol');
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const renderStep1 = () => (
        <>
            <Alert variant="danger" className="d-flex align-items-start">
                <Siren size={24} className="me-3 mt-1" />
                <div>
                    <strong className="d-block mb-1">MASSIVE TRANSFUSION PROTOCOL (MTP)</strong>
                    <p className="mb-0 small">
                        This protocol is for life-threatening hemorrhage requiring rapid transfusion of large volumes of blood products.
                        Activating MTP will immediately release O-negative blood and notify the blood bank team.
                    </p>
                </div>
            </Alert>

            {/* Patient Info */}
            <Card className="mb-3 border-danger">
                <Card.Body className="py-2">
                    <Row>
                        <Col>
                            <User size={16} className="me-2 text-muted" />
                            <strong>{patient?.name || patient?.patient_name || 'Unknown Patient'}</strong>
                            {patient?.blood_group && <Badge bg="danger" className="ms-2">{patient.blood_group}</Badge>}
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            <Row className="g-3">
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Patient Blood Group (if known)</Form.Label>
                        <Form.Select 
                            value={form.patient_blood_group}
                            onChange={(e) => setForm({...form, patient_blood_group: e.target.value})}
                        >
                            <option value="">Unknown</option>
                            {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Indication *</Form.Label>
                        <Form.Select 
                            value={form.indication}
                            onChange={(e) => setForm({...form, indication: e.target.value})}
                            required
                        >
                            <option value="">Select</option>
                            <option value="Trauma">Trauma</option>
                            <option value="GI Bleed">GI Bleed</option>
                            <option value="PPH">Post-Partum Hemorrhage</option>
                            <option value="Surgical">Surgical Bleeding</option>
                            <option value="Ruptured AAA">Ruptured AAA</option>
                            <option value="Other">Other</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Estimated Blood Loss (mL)</Form.Label>
                        <Form.Control 
                            type="number"
                            placeholder="e.g., 2000"
                            value={form.estimated_blood_loss}
                            onChange={(e) => setForm({...form, estimated_blood_loss: e.target.value})}
                        />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group>
                        <Form.Label>Attending Physician *</Form.Label>
                        <Form.Control 
                            placeholder="Dr. Name"
                            value={form.attending_physician}
                            onChange={(e) => setForm({...form, attending_physician: e.target.value})}
                            required
                        />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group>
                        <Form.Label><Phone size={14} className="me-1" />Contact Number *</Form.Label>
                        <Form.Control 
                            placeholder="For blood bank callbacks"
                            value={form.contact_number}
                            onChange={(e) => setForm({...form, contact_number: e.target.value})}
                            required
                        />
                    </Form.Group>
                </Col>
            </Row>

            <Form.Check 
                type="checkbox"
                className="mt-3"
                label={<><strong>Use O-negative (Universal Donor)</strong> - Recommended when blood type unknown or time-critical</>}
                checked={form.use_o_negative}
                onChange={(e) => setForm({...form, use_o_negative: e.target.checked})}
            />
            <small className="text-muted d-block mt-1">
                O-negative stock: <Badge bg={getONegativeStock() > 4 ? 'success' : 'warning'}>{getONegativeStock()} units</Badge>
            </small>
        </>
    );

    const renderStep2 = () => (
        <>
            <h5 className="mb-3"><Droplet className="me-2 text-danger" /> Select MTP Package</h5>
            
            <Row className="g-3">
                {MTP_PACKAGES.map((pkg, idx) => (
                    <Col md={4} key={idx}>
                        <Card 
                            className={`h-100 cursor-pointer ${selectedPackage === idx ? 'border-danger bg-danger bg-opacity-10' : ''}`}
                            onClick={() => setSelectedPackage(idx)}
                            style={{ cursor: 'pointer' }}
                        >
                            <Card.Body>
                                <Form.Check 
                                    type="radio"
                                    name="mtpPackage"
                                    checked={selectedPackage === idx}
                                    onChange={() => setSelectedPackage(idx)}
                                    label={<strong>{pkg.name}</strong>}
                                />
                                <small className="text-muted d-block mb-2">{pkg.description}</small>
                                <div className="small">
                                    <div>🩸 PRBC: <strong>{pkg.prbc}</strong> units</div>
                                    <div>💧 FFP: <strong>{pkg.ffp}</strong> units</div>
                                    <div>🔵 Platelets: <strong>{pkg.platelets}</strong> unit</div>
                                    {pkg.cryo > 0 && <div>❄️ Cryo: <strong>{pkg.cryo}</strong> units</div>}
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Alert variant="warning" className="mt-3">
                <AlertTriangle size={16} className="me-2" />
                <strong>Standard 1:1:1 Ratio:</strong> PRBC to FFP to Platelets for optimal resuscitation
            </Alert>
        </>
    );

    const renderStep3 = () => (
        <div className="text-center py-4">
            {mtpActive ? (
                <>
                    <div className="mb-4">
                        <Zap size={64} className="text-danger mb-3" style={{ animation: 'pulse 1s infinite' }} />
                        <h3 className="text-danger">MTP ACTIVATED</h3>
                        <p className="text-muted">Blood bank has been alerted. Blood products are being prepared.</p>
                    </div>
                    
                    <Card className="bg-danger text-white mb-4">
                        <Card.Body>
                            <h5>Estimated Delivery Time</h5>
                            <h1 className="display-4">{countdown !== null ? formatTime(countdown) : '--:--'}</h1>
                            <ProgressBar 
                                now={(countdown / 300) * 100} 
                                variant="light" 
                                className="mt-2"
                            />
                        </Card.Body>
                    </Card>

                    <Alert variant="info">
                        <Activity size={16} className="me-2" />
                        <strong>MTP {MTP_PACKAGES[selectedPackage].name}</strong> dispatched
                        <div className="mt-2 small">
                            {MTP_PACKAGES[selectedPackage].prbc} PRBC + {MTP_PACKAGES[selectedPackage].ffp} FFP + 
                            {MTP_PACKAGES[selectedPackage].platelets} Platelets
                        </div>
                    </Alert>

                    <div className="d-grid gap-2">
                        <Button variant="outline-danger" onClick={() => setStep(2)}>
                            Request Additional Package
                        </Button>
                        <Button variant="success" onClick={() => { onSuccess?.(); onHide(); }}>
                            <CheckCircle size={16} className="me-1" /> Close
                        </Button>
                    </div>
                </>
            ) : (
                <Spinner animation="border" variant="danger" />
            )}
        </div>
    );

    return (
        <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
            <Modal.Header className="bg-danger text-white">
                <Modal.Title>
                    <Siren size={24} className="me-2" />
                    EMERGENCY BLOOD RELEASE - MTP
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
                
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}
            </Modal.Body>
            {step < 3 && (
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide} disabled={loading}>Cancel</Button>
                    {step === 1 && (
                        <Button 
                            variant="warning" 
                            onClick={() => setStep(2)}
                            disabled={!form.indication || !form.attending_physician || !form.contact_number}
                        >
                            Next: Select Package →
                        </Button>
                    )}
                    {step === 2 && (
                        <>
                            <Button variant="outline-secondary" onClick={() => setStep(1)}>← Back</Button>
                            <Button 
                                variant="danger" 
                                onClick={activateMTP}
                                disabled={loading}
                            >
                                {loading ? (
                                    <><Spinner size="sm" className="me-1" /> Activating...</>
                                ) : (
                                    <><Zap size={16} className="me-1" /> ACTIVATE MTP</>
                                )}
                            </Button>
                        </>
                    )}
                </Modal.Footer>
            )}
        </Modal>
    );
};

export default EmergencyBloodRelease;
