import React, { useState, useEffect, useCallback } from 'react';
import { Container, Tabs, Tab, Card, Button, Table, Form, Row, Col, Badge, Alert, Modal } from 'react-bootstrap';

import ClinicalActionGrid from '../components/ClinicalActionGrid';
import axios from 'axios';
import { io } from '../utils/socket-stub';
import AdmissionModal from '../components/AdmissionModal';
import LabSelectionModal from '../components/LabSelectionModal';
import DoctorPatientProfile from '../components/DoctorPatientProfile';
import FloatingAIButton from '../components/FloatingAIButton';
import DrugInteractionAlert from '../components/DrugInteractionAlert';
import PrescriptionPrint from '../components/PrescriptionPrint';
import PatientQueueCard from '../components/PatientQueueCard';
import VitalsMiniTrend from '../components/VitalsMiniTrend';
import QuickActionsBar from '../components/QuickActionsBar';
import AIClinicalAssistant from '../components/AIClinicalAssistant';
import DoctorAnalytics from '../components/DoctorAnalytics';
import WebRTCVideoRoom from '../components/telemedicine/WebRTCVideoRoom';
import SOAPNoteTemplate from '../components/SOAPNoteTemplate';
import { Activity, FileText, FlaskConical, Save, Users, Plus, Trash2, Printer, TrendingUp, TrendingDown, Brain, Heart, Baby, Calendar, CheckCircle, Video, Wand2, Mic, Shield, ClipboardCheck } from 'lucide-react';
import ChatAssistant from '../components/ChatAssistant';
import SpecialtyModulesWrapper from '../components/SpecialtyModulesWrapper';
import ReferralNetwork from '../components/ReferralNetwork';
import DoctorScheduleManager from '../components/DoctorScheduleManager';
import FloatingToolbar from '../components/FloatingToolbar';

import SOAPNoteEditor from '../components/SOAPNoteEditor';
import RoundNoteQuickEntry from '../components/RoundNoteQuickEntry';
import ProblemListPanel from '../components/ProblemListPanel';
import SBARHandoffPanel from '../components/SBARHandoffPanel';

// PMJAY Insurance Components
import { PMJAYPackageSelector, PMJAYPackageCard, PMJAYBadge } from '../components/insurance';
import GovtSchemePanel from '../components/GovtSchemePanel';
import ABHALinker from '../components/ABHALinker';
import ConsentManager from '../components/ConsentManager';
import OrderSetSelector from '../components/OrderSetSelector';

// Helper to extract dosage from medicine name
const extractDosage = (name) => {
    if (!name) return '';
    const match = name.match(/(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|iu|u|%))/i);
    return match ? match[1] : '';
};

const DoctorDashboard = () => {
    const [key, setKey] = useState('opd');
    const [opdQueue, setOpdQueue] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [prescriptions, setPrescriptions] = useState([{ name: '', dose: '', freq: '', duration: '' }]);
    const [diagnosis, setDiagnosis] = useState('');
    const [labTests, setLabTests] = useState([]);
    const [availableTests, setAvailableTests] = useState([]);
    const [showAdmissionModal, setShowAdmissionModal] = useState(false);
    const [showLabModal, setShowLabModal] = useState(false);
    const [admittedPatients, setAdmittedPatients] = useState([]);
    const [selectedIPDPatient, setSelectedIPDPatient] = useState(null);
    const [showIPDModal, setShowIPDModal] = useState(false);

    // Autocomplete State
    const [inventory, setInventory] = useState([]);
    const [suggestions, setSuggestions] = useState({}); // Keyed by row index

    // Real Data from APIs
    const [vitals, setVitals] = useState(null);
    const [history, setHistory] = useState([]);

    // Prescription Print Modal
    const [showPrescriptionPrint, setShowPrescriptionPrint] = useState(false);
    const [prescriptionData, setPrescriptionData] = useState(null);

    // Vitals History for trends (Phase 1)
    const [vitalsHistory, setVitalsHistory] = useState([]);

    // Telemedicine Modal (Phase 4)
    const [showTelemedicine, setShowTelemedicine] = useState(false);
    const [telemedicinePatient, setTelemedicinePatient] = useState(null);


    // Follow-up Scheduling State
    const [showFollowupModal, setShowFollowupModal] = useState(false);
    const [followupData, setFollowupData] = useState({ days: 7, notes: '' });

    // Grid Layout Modal State (Option 1 Redesign)
    const [activeToolModal, setActiveToolModal] = useState(null); // 'specialty', 'ai', 'soap', 'referral'
    
    // AI Parse State
    const [showParseModal, setShowParseModal] = useState(false);
    const [parseText, setParseText] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    // PMJAY Package Selection State
    const [showPMJAYSelector, setShowPMJAYSelector] = useState(false);
    const [selectedPMJAYPackage, setSelectedPMJAYPackage] = useState(null);
    const [pmjayTargetPatient, setPmjayTargetPatient] = useState(null); // Which IPD patient PMJAY is being assigned to
    const [pmjayAssignedMap, setPmjayAssignedMap] = useState({}); // admissionId -> packageInfo

    // ABDM / ABHA State
    const [showABHALinker, setShowABHALinker] = useState(false);
    const [abhaTargetPatient, setAbhaTargetPatient] = useState(null);

    // Consent Manager State
    const [showConsentManager, setShowConsentManager] = useState(false);
    const [consentTargetPatient, setConsentTargetPatient] = useState(null);

    const handleMagicParse = async () => {
        if (!parseText.trim()) return;
        setIsParsing(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/ai/parse-prescription', { text: parseText }); // Note: No auth header needed on ai routes yet, but good practice
            
            if (res.data.success && res.data.data.valid) {
                const newMeds = res.data.data.medications.map(m => ({
                    name: m.drug_name,
                    dose: m.dosage || '',
                    freq: m.frequency_display || m.frequency || '',
                    duration: m.duration || ''
                }));
                
                // Append or replace? Let's append if current is empty, else ask. For now, append.
                setPrescriptions(prev => {
                     // Filter out initial empty row if it exists
                     const cleanPrev = prev.filter(p => p.name);
                     return [...cleanPrev, ...newMeds];
                });
                setShowParseModal(false);
                setParseText('');
            } else {
                alert('Could not identify any medications. Please try standard format: "Drug 500mg BD for 3 days"');
            }
        } catch (err) {
            console.error('AI Parse Error:', err);
            alert('Failed to parse text.');
        } finally {
            setIsParsing(false);
        }
    };

    const toggleRecording = () => {
        if (!isRecording) {
            setIsRecording(true);
            // Simulate recording
            setTimeout(() => {
                setParseText(prev => prev + (prev ? '\n' : '') + "Amoxicillin 500mg TDS for 5 days\nParacetamol 650mg SOS");
                setIsRecording(false);
            }, 2000);
        } else {
            setIsRecording(false);
        }
    };

    // New: Referral Logic
    const [allDoctors, setAllDoctors] = useState([]);
    const [referralTargetDoctor, setReferralTargetDoctor] = useState(null);


    const fetchQueue = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/opd/queue', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Handle both wrapped and unwrapped responses
            const list = res.data?.data || res.data;
            setOpdQueue(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error(err);
            setOpdQueue([]);
        }
    }, []);

    const fetchLabTests = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/lab/tests', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Handle both wrapped and unwrapped responses
            const list = res.data?.data || res.data || [];
            setAvailableTests(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error('Lab tests fetch error:', err);
            setAvailableTests([]);
        }
    }, []);

    const fetchAdmittedPatients = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/admissions/active', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Handle both wrapped and unwrapped responses
            const list = res.data?.data || res.data;
            setAdmittedPatients(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error('Admitted patients fetch error:', err);
            setAdmittedPatients([]);
        }
    }, []);

    const fetchInventory = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/pharmacy/inventory', {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Handle both wrapped and unwrapped responses
            const list = res.data?.data || res.data;
            setInventory(Array.isArray(list) ? list : []);
        } catch (err) {
            // 403 is expected for doctors - silently handle
            if (err.response?.status !== 403) {
                console.error('Inventory fetch error:', err);
            }
            setInventory([]);
        }
    }, []);

    const fetchDoctors = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/auth/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const users = res.data?.data || res.data || [];
            const doctors = (Array.isArray(users) ? users : []).filter(u => u.role === 'doctor');
            setAllDoctors(doctors);
        } catch (err) {
            console.error('Doctors fetch error:', err);
        }
    }, []);

    const fetchVitals = useCallback(async (patient_id) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/clinical/vitals/${patient_id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data && res.data.length > 0) {
                setVitals(res.data[0]);
                setVitalsHistory(res.data.slice(0, 5)); // Store last 5 for trends
            } else {
                setVitals(null);
                setVitalsHistory([]);
            }
        } catch (err) {
            console.error(err);
            setVitals(null);
        }
    }, []);

    const fetchHistory = useCallback(async (patient_id) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/clinical/history/${patient_id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(res.data || []);
        } catch (err) {
            console.error(err);
            setHistory([]);
        }
    }, []);

    useEffect(() => {
        fetchQueue();
        fetchLabTests();
        fetchAdmittedPatients();
        fetchInventory();
        fetchDoctors();

        // Socket.IO Connection
        const socket = io('/', { path: '/socket.io' });

        socket.on('connect', () => {
            console.log('✅ Doctor Dashboard Connected to Socket');
        });

        socket.on('opd_update', (data) => {
            console.log('🔔 OPD Update Received:', data);
            fetchQueue();
        });

        socket.on('clinical_update', (data) => {
            console.log('🔔 Clinical Update Received:', data);
            // If the update is relevant to the currently selected patient, refresh their data
            if (selectedPatient && (data.patient_id === selectedPatient.patient_id || data.admission_id)) {
                fetchVitals(selectedPatient.patient_id);
                fetchHistory(selectedPatient.patient_id);
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [selectedPatient, fetchQueue, fetchVitals, fetchHistory, fetchLabTests, fetchAdmittedPatients, fetchInventory]);

    useEffect(() => {
        if (selectedPatient) {
            fetchVitals(selectedPatient.patient_id);
            fetchHistory(selectedPatient.patient_id);
        }
    }, [selectedPatient, fetchVitals, fetchHistory]);

    const handleAddPrescription = () => {
        setPrescriptions([...prescriptions, { name: '', dose: '', freq: '', duration: '' }]);
    };

    const handleRemovePrescription = (index) => {
        if (prescriptions.length > 1) {
            setPrescriptions(prescriptions.filter((_, i) => i !== index));
        }
    };

    const updatePrescription = (index, field, value) => {
        setPrescriptions(prev => {
            const updated = [...prev];
            // Setup object for multi-field updates
            if (typeof field === 'object') {
                updated[index] = { ...updated[index], ...field };
            } else {
                updated[index] = { ...updated[index], [field]: value };
            }
            return updated;
        });
    };

    const handleLabTestsConfirm = (selectedTests) => {
        setLabTests(selectedTests);
    };

    const handleRemoveLabTest = (testName) => {
        setLabTests(labTests.filter(t => t !== testName));
    };

    const handleConsultationSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPatient) return;

        try {
            const token = localStorage.getItem('token');

            // Filter out empty prescriptions
            const validPrescriptions = prescriptions.filter(rx => rx.name.trim() !== '');

            console.log('Submitting consultation:', {
                visit_id: selectedPatient.id,
                diagnosis,
                prescriptions: validPrescriptions,
                lab_requests: labTests
            });

            const response = await axios.post('/api/clinical/consultation', {
                visit_id: selectedPatient.id,
                diagnosis,
                prescriptions: validPrescriptions,
                lab_requests: labTests
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('Consultation response:', response.data);

            // Save prescription data for printing
            setPrescriptionData({
                patient: selectedPatient,
                prescriptions: validPrescriptions,
                diagnosis: diagnosis,
                doctor: 'Dr. ' + (localStorage.getItem('username') || 'Consulting Physician')
            });

            // Show prescription print modal
            setShowPrescriptionPrint(true);

            // Reset form but keep patient selected until print is done
            // Will fully reset when print modal closes
        } catch (err) {
            console.error('Consultation save error:', err);
            console.error('Error response:', err.response?.data);
            alert(`❌ Error: ${err.response?.data?.error || err.response?.data?.message || err.message}`);
        }
    };

    // Handle prescription print modal close
    const handlePrescriptionClose = () => {
        setShowPrescriptionPrint(false);
        setPrescriptionData(null);
        // Reset form and queue after printing
        setPrescriptions([{ name: '', dose: '', freq: '', duration: '' }]);
        setDiagnosis('');
        setLabTests([]);
        setSelectedPatient(null);
        fetchQueue();
    };

    return (
        <div className="container-fluid py-4 min-vh-100 bg-light-soft">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold text-dark mb-0">Doctor Dashboard</h3>
                <div className="text-muted small">v5.1 (Clean UI)</div>
            </div>

            <Tabs activeKey={key} onSelect={(k) => setKey(k)} className="mb-4 modern-tabs border-bottom">
                <Tab eventKey="opd" title="OPD Clinic">
                    <Row>
                        <Col md={4}>
                            <Card className="h-100 border-0 shadow-sm">
                                <Card.Header className="bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                                    <span className="fw-bold text-dark">Patient Queue</span>
                                    <Badge bg="primary" pill>{opdQueue.length} waiting</Badge>
                                </Card.Header>
                                <div className="list-group list-group-flush" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                    {opdQueue.map(p => (
                                        <PatientQueueCard
                                            key={p.id}
                                            patient={p}
                                            isSelected={selectedPatient?.id === p.id}
                                            onClick={() => setSelectedPatient(p)}
                                            onVideoCall={(patient) => {
                                                setTelemedicinePatient(patient);
                                                setShowTelemedicine(true);
                                            }}
                                        />
                                    ))}
                                    {opdQueue.length === 0 && <div className="p-3 text-center text-muted">No patients waiting</div>}
                                </div>
                            </Card>
                        </Col>

                        <Col md={8}>
                            {selectedPatient ? (
                                <div className="d-flex flex-column gap-3">
                                    {/* Vitals & History Section */}
                                    <Card className="shadow-sm border-0">
                                        <Card.Header className="bg-light fw-bold d-flex align-items-center gap-2">
                                            <Activity size={18} /> Vitals & History
                                        </Card.Header>
                                        <Card.Body>
                                            <Row className="text-center mb-3">
                                                <Col>
                                                    <VitalsMiniTrend
                                                        label="BP"
                                                        current={vitals?.bp}
                                                        previous={vitalsHistory[1]?.bp}
                                                        danger={vitals?.bp?.includes('14') || vitals?.bp?.includes('15')}
                                                    />
                                                </Col>
                                                <Col>
                                                    <VitalsMiniTrend
                                                        label="Pulse"
                                                        current={vitals?.heart_rate}
                                                        previous={vitalsHistory[1]?.heart_rate}
                                                        unit=" bpm"
                                                        warning={parseInt(vitals?.heart_rate) > 100}
                                                    />
                                                </Col>
                                                <Col>
                                                    <VitalsMiniTrend
                                                        label="Temp"
                                                        current={vitals?.temp}
                                                        previous={vitalsHistory[1]?.temp}
                                                        unit="°F"
                                                        warning={parseFloat(vitals?.temp) > 99.5}
                                                        danger={parseFloat(vitals?.temp) > 101}
                                                    />
                                                </Col>
                                                <Col>
                                                    <VitalsMiniTrend
                                                        label="SpO2"
                                                        current={vitals?.spo2}
                                                        previous={vitalsHistory[1]?.spo2}
                                                        unit="%"
                                                        danger={parseInt(vitals?.spo2) < 94}
                                                    />
                                                </Col>
                                            </Row>
                                            <hr />
                                            <div className="small">
                                                <strong>Past Visits:</strong>
                                                {history.length > 0 ? (
                                                    <ul className="mt-2 mb-0">
                                                        {history.slice(0, 3).map((h, i) => (
                                                            <li key={i}>
                                                                <strong>{new Date(h.date).toLocaleDateString()}</strong>: {h.diagnosis || h.complaint}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <div className="text-muted mt-2">No previous visits</div>
                                                )}
                                            </div>
                                        </Card.Body>
                                    </Card>

                                    {/* Phase 6: Specialty Modules (auto-detected) - COLLAPSIBLE */}
                                    {/* --- OPTION 1: CLINICAL ACTION GRID --- */}
                                    <ClinicalActionGrid onActionClick={(tool) => setActiveToolModal(tool)} />

                                    {/* Tool Modals */}
                                    {/* 1. Specialty Tools Modal */}
                                    <Modal show={activeToolModal === 'specialty'} onHide={() => setActiveToolModal(null)} size="lg" centered>
                                        <Modal.Header closeButton className="bg-teal-subtle text-teal border-bottom-0">
                                            <Modal.Title><Heart size={20} className="me-2"/>Specialty Tools</Modal.Title>
                                        </Modal.Header>
                                        <Modal.Body>
                                            <SpecialtyModulesWrapper
                                                patient={selectedPatient}
                                                vitals={vitals}
                                                department={selectedPatient?.department}
                                            />
                                        </Modal.Body>
                                    </Modal>

                                    {/* 2. AI Assistant Modal */}
                                    <Modal show={activeToolModal === 'ai'} onHide={() => setActiveToolModal(null)} size="xl" centered scrollable>
                                        <Modal.Header closeButton className="bg-purple-subtle text-purple border-bottom-0">
                                            <Modal.Title><Brain size={20} className="me-2"/>AI Clinical Assistant</Modal.Title>
                                        </Modal.Header>
                                        <Modal.Body className="p-0">
                                            <AIClinicalAssistant
                                                symptoms={selectedPatient?.complaint}
                                                diagnosis={diagnosis}
                                                patient={selectedPatient}
                                                prescriptions={prescriptions}
                                                labTests={labTests}
                                                onDiagnosisSuggest={(name) => setDiagnosis(name)}
                                                onPrescriptionSuggest={(med) => {
                                                    const newRx = [...prescriptions];
                                                    const emptyIdx = newRx.findIndex(r => !r.name);
                                                    if (emptyIdx >= 0) {
                                                        newRx[emptyIdx] = med;
                                                    } else {
                                                        newRx.push(med);
                                                    }
                                                    setPrescriptions(newRx);
                                                    // Optional: Close modal after picking? keeping open for now.
                                                }}
                                            />
                                        </Modal.Body>
                                    </Modal>

                                    {/* 3. SOAP Notes Modal */}
                                    <Modal show={activeToolModal === 'soap'} onHide={() => setActiveToolModal(null)} size="lg" centered>
                                        <Modal.Header closeButton className="bg-green-subtle text-success border-bottom-0">
                                            <Modal.Title><FileText size={20} className="me-2"/>SOAP Notes</Modal.Title>
                                        </Modal.Header>
                                        <Modal.Body>
                                            <SOAPNoteTemplate
                                                patientVitals={vitals}
                                                onNotesChange={(notes) => {
                                                    if (notes.assessment && !diagnosis.includes(notes.assessment.split('\n')[0])) {
                                                    }
                                                }}
                                            />
                                        </Modal.Body>
                                    </Modal>

                                    {/* 4. Referral Network Modal */}
                                    <Modal show={activeToolModal === 'referral'} onHide={() => setActiveToolModal(null)} size="lg" centered>
                                        <Modal.Header closeButton className="bg-cyan-subtle text-info border-bottom-0">
                                            <Modal.Title><Users size={20} className="me-2"/>Referral Network</Modal.Title>
                                        </Modal.Header>
                                        <Modal.Body>
                                            <ReferralNetwork 
                                                patient={selectedPatient} 
                                                internalDoctors={allDoctors}
                                                initialSelectedDoctor={referralTargetDoctor}
                                            />
                                        </Modal.Body>
                                    </Modal>

                                    {/* 5. AI Magic Parse Modal */}
                                    <Modal show={showParseModal} onHide={() => setShowParseModal(false)} centered>
                                        <Modal.Header closeButton className="bg-gradient-primary text-white border-0">
                                            <Modal.Title className="d-flex align-items-center gap-2">
                                                <Wand2 size={20} /> Smart Prescription Compose
                                            </Modal.Title>
                                        </Modal.Header>
                                        <Modal.Body className="bg-light">
                                            <p className="small text-muted mb-2">
                                                Dictate or type complete prescription. We'll format it for you.
                                                <br/>
                                                <em>Ex: "Metformin 500mg BD for 1 month"</em>
                                            </p>
                                            <Form.Control
                                                as="textarea"
                                                rows={5}
                                                value={parseText}
                                                onChange={e => setParseText(e.target.value)}
                                                placeholder="Type or record here..."
                                                className="mb-3 shadow-sm border-0"
                                            />
                                            <div className="d-flex justify-content-between">
                                                <Button 
                                                    variant={isRecording ? "danger" : "outline-danger"}
                                                    onClick={toggleRecording}
                                                    className="d-flex align-items-center gap-2"
                                                >
                                                    <Mic size={18} className={isRecording ? "animate-pulse" : ""} />
                                                    {isRecording ? "Stop Recording" : "Record Voice"}
                                                </Button>
                                                <Button 
                                                    variant="primary" 
                                                    onClick={handleMagicParse} 
                                                    disabled={isParsing || !parseText}
                                                >
                                                    {isParsing ? 'Processing...' : '✨ Magic Parse'}
                                                </Button>
                                            </div>
                                        </Modal.Body>
                                    </Modal>

                                    {/* Consultation Form */}
                                    <Card className="shadow-sm border-0">
                                        <Card.Header className="bg-primary text-white fw-bold">
                                            Consultation: {selectedPatient.patient_name}
                                        </Card.Header>
                                        <Card.Body>
                                            <Form onSubmit={handleConsultationSubmit}>
                                                {/* Diagnosis */}
                                                <Form.Group className="mb-4">
                                                    <Form.Label className="fw-bold"><FileText size={16} className="me-1" /> Clinical Diagnosis</Form.Label>
                                                    <Form.Control
                                                        as="textarea"
                                                        rows={2}
                                                        placeholder="Enter diagnosis..."
                                                        value={diagnosis}
                                                        onChange={e => setDiagnosis(e.target.value)}
                                                        required
                                                    />
                                                </Form.Group>

                                                {/* Prescriptions Table */}
                                                <div className="mb-4">
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <h6 className="fw-bold mb-0">💊 Prescriptions</h6>
                                                        <Button 
                                                            variant="outline-primary" 
                                                            size="sm" 
                                                            className="d-flex align-items-center gap-1"
                                                            onClick={() => setShowParseModal(true)}
                                                        >
                                                            <Wand2 size={14} /> Smart Compose
                                                        </Button>
                                                    </div>
                                                    <Table bordered size="sm" className="mb-2">
                                                        <thead className="table-light">
                                                            <tr>
                                                                <th style={{ width: '35%' }}>Medicine Name</th>
                                                                <th style={{ width: '20%' }}>Dosage</th>
                                                                <th style={{ width: '20%' }}>Frequency</th>
                                                                <th style={{ width: '15%' }}>Duration</th>
                                                                <th style={{ width: '10%' }}>Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {prescriptions.map((rx, index) => (
                                                                <tr key={index}>
                                                                    <td>
                                                                        <div className="position-relative">
                                                                            <Form.Control
                                                                                size="sm"
                                                                                value={rx.name}
                                                                                onChange={e => {
                                                                                    updatePrescription(index, 'name', e.target.value);
                                                                                    // Filter suggestions
                                                                                    if (e.target.value.length > 1) {
                                                                                        const search = e.target.value.toLowerCase();
                                                                                        const matches = inventory.filter(item =>
                                                                                            item.name.toLowerCase().includes(search) ||
                                                                                            (item.generic_name && item.generic_name.toLowerCase().includes(search))
                                                                                        ).slice(0, 10); // Limit to 10
                                                                                        setSuggestions({ ...suggestions, [index]: matches });
                                                                                    } else {
                                                                                        const newSuggestions = { ...suggestions };
                                                                                        delete newSuggestions[index];
                                                                                        setSuggestions(newSuggestions);
                                                                                    }
                                                                                }}
                                                                                onFocus={() => {
                                                                                    if (rx.name.length > 1) {
                                                                                        const search = rx.name.toLowerCase();
                                                                                        const matches = inventory.filter(item =>
                                                                                            item.name.toLowerCase().includes(search) ||
                                                                                            (item.generic_name && item.generic_name.toLowerCase().includes(search))
                                                                                        ).slice(0, 10);
                                                                                        setSuggestions({ ...suggestions, [index]: matches });
                                                                                    }
                                                                                }}
                                                                                onBlur={() => {
                                                                                    // Delay hide to allow click
                                                                                    setTimeout(() => {
                                                                                        const newSuggestions = { ...suggestions };
                                                                                        delete newSuggestions[index];
                                                                                        setSuggestions(newSuggestions);
                                                                                    }, 200);
                                                                                }}
                                                                                placeholder="Type to search..."
                                                                                autoComplete="off"
                                                                            />
                                                                            {suggestions[index] && suggestions[index].length > 0 && (
                                                                                <div className="position-absolute w-100 bg-white border rounded shadow-sm" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                                                                                    {suggestions[index].map(item => (
                                                                                        <div
                                                                                            key={item.id}
                                                                                            className="p-2 border-bottom small"
                                                                                            style={{ cursor: 'pointer', hover: { backgroundColor: '#f8f9fa' } }}
                                                                                            onClick={() => {
                                                                                                const dose = extractDosage(item.name) || extractDosage(item.generic_name);
                                                                                                
                                                                                                // Update name and optionally dose if found
                                                                                                if (dose) {
                                                                                                    updatePrescription(index, { name: item.name, dose: dose });
                                                                                                } else {
                                                                                                    updatePrescription(index, 'name', item.name);
                                                                                                }
                                                                                                
                                                                                                const newSuggestions = { ...suggestions };
                                                                                                delete newSuggestions[index];
                                                                                                setSuggestions(newSuggestions);
                                                                                            }}
                                                                                        >
                                                                                            <strong>{item.name}</strong> <small className="text-muted">({item.generic_name || 'N/A'})</small>
                                                                                            <br/>
                                                                                            <small style={{ fontSize: '0.7em' }} className="text-info">Stock: {item.stock_quantity}</small>
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <Form.Control
                                                                            size="sm"
                                                                            value={rx.dose}
                                                                            onChange={e => updatePrescription(index, 'dose', e.target.value)}
                                                                            placeholder="500mg"
                                                                        />
                                                                    </td>
                                                                    <td>
                                                                        <Form.Select
                                                                            size="sm"
                                                                            value={rx.freq}
                                                                            onChange={e => updatePrescription(index, 'freq', e.target.value)}
                                                                        >
                                                                            <option value="">Select...</option>
                                                                            <option value="OD">OD (Once Daily)</option>
                                                                            <option value="BD/BID">BD/BID (Twice)</option>
                                                                            <option value="TID">TID (Thrice)</option>
                                                                            <option value="QID">QID (4 times)</option>
                                                                            <option value="PRN">PRN (As needed)</option>
                                                                        </Form.Select>
                                                                    </td>
                                                                    <td>
                                                                        <Form.Control
                                                                            size="sm"
                                                                            value={rx.duration}
                                                                            onChange={e => updatePrescription(index, 'duration', e.target.value)}
                                                                            placeholder="7 days"
                                                                        />
                                                                    </td>
                                                                    <td className="text-center">
                                                                        {prescriptions.length > 1 ? (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="outline-danger"
                                                                                onClick={() => handleRemovePrescription(index)}
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </Button>
                                                                        ) : (
                                                                            <span className="text-muted">-</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </Table>
                                                    <Button
                                                        size="sm"
                                                        variant="outline-primary"
                                                        onClick={handleAddPrescription}
                                                        className="w-100"
                                                    >
                                                        <Plus size={16} className="me-1" /> Add Medicine
                                                    </Button>

                                                    {/* AI Drug Interaction Check */}
                                                    <DrugInteractionAlert medications={prescriptions} />
                                                </div>

                                                {/* Lab Tests with Modal */}
                                                <div className="mb-4">
                                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                                        <h6 className="fw-bold mb-0"><FlaskConical size={16} className="me-1" /> Lab Requests</h6>
                                                        <Button
                                                            size="sm"
                                                            variant="outline-primary"
                                                            onClick={() => setShowLabModal(true)}
                                                        >
                                                            <FlaskConical size={16} className="me-1" /> Select Lab Tests
                                                        </Button>
                                                    </div>

                                                    {/* Selected Tests as Badges */}
                                                    {labTests.length > 0 ? (
                                                        <div className="d-flex flex-wrap gap-2 p-3 bg-light rounded">
                                                            {labTests.map((test, idx) => (
                                                                <Badge
                                                                    key={idx}
                                                                    bg="info"
                                                                    className="d-flex align-items-center gap-2 px-3 py-2"
                                                                    style={{ fontSize: '0.9rem' }}
                                                                >
                                                                    {test}
                                                                    <Trash2
                                                                        size={14}
                                                                        style={{ cursor: 'pointer' }}
                                                                        onClick={() => handleRemoveLabTest(test)}
                                                                    />
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <div className="text-center p-4 bg-light rounded text-muted small">
                                                            No lab tests selected. Click "Select Lab Tests" to add.
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Quick Actions Bar (Phase 1) - Moved above Sign & Send */}
                                                <QuickActionsBar
                                                    onOrderCBC={() => setLabTests([...labTests, 'CBC (Complete Blood Count)'])}
                                                    onOrderLFT={() => setLabTests([...labTests, 'LFT (Liver Function Test)'])}
                                                    onOrderRFT={() => setLabTests([...labTests, 'RFT (Kidney Function Test)'])}
                                                    doctors={allDoctors}
                                                    onReferPatient={(doctor) => {
                                                        setReferralTargetDoctor(doctor);
                                                        setActiveToolModal('referral');
                                                    }}
                                                    onScheduleFollowup={() => setShowFollowupModal(true)}
                                                />

                                                <div className="d-grid gap-2">
                                                    <Button type="submit" variant="success" size="lg">
                                                        <Save size={18} className="me-2" /> Sign & Send
                                                    </Button>
                                                    <Button variant="outline-danger" onClick={() => setShowAdmissionModal(true)}>
                                                        Admit Patient
                                                    </Button>
                                                </div>
                                            </Form>
                                        </Card.Body>
                                    </Card>
                                </div>
                            ) : (
                                <div className="text-center p-5 text-muted bg-light rounded border border-dashed">
                                    <Users size={48} className="mb-3 opacity-25" />
                                    <h5>No Patient Selected</h5>
                                    <p>Select a patient from the queue to start consultation</p>
                                </div>
                            )}
                        </Col>
                    </Row>
                </Tab>

                <Tab eventKey="ipd" title="In-Patient Rounds">
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-white fw-bold d-flex justify-content-between align-items-center">
                            <span>Admitted Patients (IPD)</span>
                            <Badge bg="primary">{admittedPatients.length} Patients</Badge>
                        </Card.Header>
                        <div className="list-group list-group-flush" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                            {admittedPatients.map(p => (
                                <div
                                    key={p.admission_id}
                                    className="list-group-item list-group-item-action"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => { setSelectedIPDPatient(p); setShowIPDModal(true); }}
                                >
                                    <div className="d-flex w-100 justify-content-between">
                                        <div className="d-flex align-items-center gap-2">
                                            <h6 className="mb-1 fw-bold">{p.patient_name}</h6>
                                            {p.last_round_at && new Date(p.last_round_at).toDateString() === new Date().toDateString() && (
                                                <Badge bg="success" className="d-flex align-items-center"><CheckCircle size={12} className="me-1"/> Seen Today</Badge>
                                            )}
                                            {/* PMJAY Badge — shows if package is assigned */}
                                            {pmjayAssignedMap[p.admission_id] && (
                                                <Badge bg="warning" text="dark" className="d-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                                                    <Heart size={10} /> PMJAY: {pmjayAssignedMap[p.admission_id].packageName}
                                                </Badge>
                                            )}
                                            {/* Phase H5: Govt Scheme Badge */}
                                            {p.govt_scheme_code && (
                                                <Badge bg="success" className="d-flex align-items-center gap-1" style={{ fontSize: '0.7rem' }}>
                                                    🏛 {p.govt_scheme_code.toUpperCase()}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="d-flex align-items-center gap-2">
                                            {/* PMJAY Assign Button */}
                                            <Button
                                                size="sm"
                                                variant={pmjayAssignedMap[p.admission_id] ? 'outline-warning' : 'outline-success'}
                                                className="d-flex align-items-center gap-1 py-0 px-2"
                                                style={{ fontSize: '0.75rem' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setPmjayTargetPatient(p);
                                                    setShowPMJAYSelector(true);
                                                }}
                                                title="Assign PMJAY Ayushman Bharat Package"
                                            >
                                                <Heart size={12} /> {pmjayAssignedMap[p.admission_id] ? 'Change PMJAY' : '🏥 PMJAY'}
                                            </Button>
                                            {/* ABHA Link Button */}
                                            <Button
                                                size="sm"
                                                variant="outline-primary"
                                                className="d-flex align-items-center gap-1 py-0 px-2"
                                                style={{ fontSize: '0.7rem' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setAbhaTargetPatient(p);
                                                    setShowABHALinker(true);
                                                }}
                                                title="Link ABHA Health ID"
                                            >
                                                <Shield size={11} /> ABHA
                                            </Button>
                                            {/* Consent Button */}
                                            <Button
                                                size="sm"
                                                variant="outline-secondary"
                                                className="d-flex align-items-center gap-1 py-0 px-2"
                                                style={{ fontSize: '0.7rem' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConsentTargetPatient(p);
                                                    setShowConsentManager(true);
                                                }}
                                                title="Manage Consent"
                                            >
                                                <ClipboardCheck size={11} /> Consent
                                            </Button>
                                            <Badge bg="info">{p.ward} - Bed {p.bed_number}</Badge>
                                        </div>
                                    </div>
                                    <small className="text-muted d-block mb-2">
                                        {p.gender}, {p.dob ? new Date().getFullYear() - new Date(p.dob).getFullYear() : 'N/A'} yrs |
                                        Admitted: {new Date(p.admitted_at).toLocaleDateString()}
                                    </small>
                                    <div onClick={(e) => e.stopPropagation()}>
                                        <RoundNoteQuickEntry
                                            admissionId={p.admission_id}
                                            patientId={p.patient_id}
                                            compact={true}
                                        />
                                    </div>
                                </div>
                            ))}
                            {admittedPatients.length === 0 && (
                                <div className="p-4 text-center text-muted">
                                    <FileText size={48} className="mb-3 opacity-25" />
                                    <h6>No admitted patients</h6>
                                </div>
                            )}
                        </div>
                    </Card>
                </Tab>

                {/* Phase 3: Analytics Tab */}
                <Tab eventKey="analytics" title="📊 My Analytics">
                    <DoctorAnalytics />
                </Tab>

                {/* Wave 3: Order Sets */}
                <Tab eventKey="order-sets" title="📦 Order Sets">
                    <Card className="shadow-sm border-0 mt-2">
                        <Card.Header className="bg-white fw-bold">Quick Order Sets — Standardized Clinical Protocols</Card.Header>
                        <Card.Body>
                            {selectedPatient ? (
                                <OrderSetSelector
                                    patientId={selectedPatient.id}
                                    admissionId={selectedPatient.admission_id}
                                    onOrdersPlaced={(orders) => {
                                        alert(`✅ ${orders?.length || 0} orders placed from set!`);
                                    }}
                                />
                            ) : (
                                <div className="text-center p-4 text-muted">
                                    <Users size={48} className="mb-3 opacity-25" />
                                    <h6>Select an IPD patient first to apply an order set</h6>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Tab>

                {/* Phase 4: SBAR Handoffs */}
                <Tab eventKey="handoffs" title="🔁 Shift Handoffs">
                    <SBARHandoffPanel />
                </Tab>

                {/* Phase 7: Schedule Manager (Restored) */}
                <Tab eventKey="schedule" title="🗓️ My Roster">
                   <div className="p-2">
                     <DoctorScheduleManager doctorName={localStorage.getItem('username') || 'Dr. Demo'} />
                   </div>
                </Tab>

                {/* Wave 3: Referral Out */}
                <Tab eventKey="referral" title="↗️ Refer Out">
                    <Card className="shadow-sm border-0 mt-2">
                        <Card.Body>
                            <ReferralNetwork
                                patient={selectedPatient || null}
                                onReferralSent={() => alert('✅ Referral sent successfully!')}
                            />
                        </Card.Body>
                    </Card>
                </Tab>

                {/* Phase H5: Govt Health Schemes */}
                <Tab eventKey="govt-schemes" title="🏛 Govt Schemes">
                    <Card className="shadow-sm border-0 mt-2">
                        <Card.Header className="bg-white fw-bold d-flex justify-content-between align-items-center">
                            <span>Government Health Scheme Packages</span>
                            <Badge bg="success">CGHS / ECHS / CAPF / PM-JAY</Badge>
                        </Card.Header>
                        <Card.Body>
                            <GovtSchemePanel
                                patient={selectedPatient || selectedIPDPatient}
                                admissionId={selectedIPDPatient?.admission_id}
                            />
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>

            {/* Modals */}
            <AdmissionModal
                show={showAdmissionModal}
                onHide={() => setShowAdmissionModal(false)}
                patient={selectedPatient}
                onAdmit={(data) => {
                    alert(`Patient Admitted to ${data.admission.ward} - ${data.admission.bed_number}`);
                    fetchQueue();
                }}
            />

            <LabSelectionModal
                show={showLabModal}
                onHide={() => setShowLabModal(false)}
                availableTests={availableTests}
                selectedTests={labTests}
                onConfirm={handleLabTestsConfirm}
            />

            <DoctorPatientProfile
                show={showIPDModal}
                onHide={() => setShowIPDModal(false)}
                admission={selectedIPDPatient}
                onDischarge={() => { fetchAdmittedPatients(); setShowIPDModal(false); }}
            />

            {/* Prescription Print Modal */}
            {prescriptionData && (
                <PrescriptionPrint
                    show={showPrescriptionPrint}
                    onHide={handlePrescriptionClose}
                    patient={prescriptionData.patient}
                    prescriptions={prescriptionData.prescriptions}
                    diagnosis={prescriptionData.diagnosis}
                    doctor={prescriptionData.doctor}
                    doctorRegNo="KMC-88221" // Todo: Fetch from doctor profile
                    vitals={vitals}
                />
            )}

            {/* Telemedicine Modal (Phase 4) */}
            {/* Telemedicine Modal (Phase 4 - Upgrade to WebRTC) */}
            <Modal show={showTelemedicine} onHide={() => { setShowTelemedicine(false); setTelemedicinePatient(null); }} size="xl" centered>
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title><Video size={20} className="me-2" />Teleconsultation: {telemedicinePatient?.patient_name}</Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0 bg-black">
                     {telemedicinePatient && (
                         <WebRTCVideoRoom 
                            patientId={telemedicinePatient.patient_id || telemedicinePatient.id}
                            patientPhone={telemedicinePatient.phone}
                            patientName={telemedicinePatient.patient_name}
                            appointmentId={telemedicinePatient.appointment_id || telemedicinePatient.id}
                            onClose={() => { setShowTelemedicine(false); setTelemedicinePatient(null); }}
                         />
                     )}
                </Modal.Body>
            </Modal>

            {/* Follow-up Scheduling Modal */}
            <Modal show={showFollowupModal} onHide={() => setShowFollowupModal(false)}>
                <Modal.Header closeButton className="bg-info text-white">
                    <Modal.Title><Calendar size={20} className="me-2" />Schedule Follow-up</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedPatient && (
                        <Alert variant="info" className="mb-3">
                            <strong>Patient:</strong> {selectedPatient.patient_name}
                        </Alert>
                    )}
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Follow-up in:</Form.Label>
                            <Form.Select
                                value={followupData.days}
                                onChange={e => setFollowupData({ ...followupData, days: parseInt(e.target.value) })}
                            >
                                <option value={3}>3 Days</option>
                                <option value={7}>1 Week</option>
                                <option value={14}>2 Weeks</option>
                                <option value={30}>1 Month</option>
                                <option value={60}>2 Months</option>
                                <option value={90}>3 Months</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Notes</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Follow-up notes (optional)"
                                value={followupData.notes}
                                onChange={e => setFollowupData({ ...followupData, notes: e.target.value })}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowFollowupModal(false)}>Cancel</Button>
                    <Button
                        variant="info"
                        onClick={async () => {
                            try {
                                const token = localStorage.getItem('token');
                                await axios.post('/api/appointments', {
                                    patient_id: selectedPatient?.patient_id,
                                    appointment_date: new Date(Date.now() + followupData.days * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                                    notes: followupData.notes || 'Follow-up visit',
                                    type: 'follow-up'
                                }, { headers: { Authorization: `Bearer ${token}` } });
                                setShowFollowupModal(false);
                                setFollowupData({ days: 7, notes: '' });
                                alert(`✅ Follow-up scheduled for ${followupData.days} days`);
                            } catch (err) {
                                alert('Failed to schedule follow-up');
                            }
                        }}
                    >
                        Schedule Follow-up
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Controlled AI Clinical Support */}
            <FloatingAIButton 
                isOpen={activeToolModal === 'ai'} 
                onClose={() => setActiveToolModal(null)}
                patientContext={selectedPatient}
            />

            {/* Controlled AI Chat Bot */}
            <ChatAssistant 
                show={activeToolModal === 'chat'} 
                onHide={() => setActiveToolModal(null)} 
                hideTrigger={true} // Hidden because we use toolbar button
            />

            {/* Floating Quick-Access Toolbar (UI Reorganization) */}
            <FloatingToolbar
                patientSelected={!!selectedPatient}
                onAIClick={() => setActiveToolModal('ai')}
                onChatClick={() => setActiveToolModal('chat')}
                onSOAPClick={() => setActiveToolModal('soap')}
                onCardiologyClick={() => setActiveToolModal('specialty')}
                onPediatricsClick={() => setActiveToolModal('specialty')}
                onReferralClick={() => setActiveToolModal('referral')}
                onVideoClick={() => {
                    if (selectedPatient) {
                        setTelemedicinePatient(selectedPatient);
                        setShowTelemedicine(true);
                    }
                }}
                onScheduleClick={() => setKey('schedule')} // Switch to Schedule tab
                showPediatrics={selectedPatient && new Date().getFullYear() - new Date(selectedPatient.dob).getFullYear() < 18}
                showCardiology={true}
            />

            {/* PMJAY Package Selector Modal */}
            <PMJAYPackageSelector
                show={showPMJAYSelector}
                onHide={() => { setShowPMJAYSelector(false); setPmjayTargetPatient(null); }}
                patientData={pmjayTargetPatient || selectedPatient || {}}
                diagnosis={diagnosis}
                onSelect={async (pkg) => {
                    setSelectedPMJAYPackage(pkg);
                    setShowPMJAYSelector(false);
                    
                    // Persist to admission (activates Zero Billing Mode)
                    const targetAdmissionId = pmjayTargetPatient?.admission_id;
                    if (targetAdmissionId) {
                        try {
                            const token = localStorage.getItem('token');
                            const res = await axios.post('/api/pmjay/claims/assign-package', {
                                admissionId: targetAdmissionId,
                                packageCode: pkg.packageCode || pkg.code,
                                packageName: pkg.packageName || pkg.name,
                                packageRate: pkg.rate || pkg.adjustedRate || 0,
                                requiresPreauth: pkg.requiresPreauth || false
                            }, { headers: { Authorization: `Bearer ${token}` } });
                            
                            if (res.data?.success) {
                                // Update local map
                                setPmjayAssignedMap(prev => ({
                                    ...prev,
                                    [targetAdmissionId]: {
                                        packageCode: pkg.packageCode || pkg.code,
                                        packageName: pkg.packageName || pkg.name,
                                        packageRate: pkg.rate || pkg.adjustedRate || 0
                                    }
                                }));
                                alert(`✅ PMJAY Package Assigned!\n\nPackage: ${pkg.packageName || pkg.name}\nRate: ₹${(pkg.rate || 0).toLocaleString()}\nPatient: ${pmjayTargetPatient.patient_name}\n\n🏥 Zero Billing Mode Activated`);
                            }
                        } catch (err) {
                            console.error('PMJAY assign error:', err);
                            alert(`✅ Package Selected: ${pkg.packageName}\nRate: ₹${(pkg.rate || 0).toLocaleString()}\n⚠️ Could not save to admission (${err.response?.data?.message || err.message})`);
                        }
                    } else {
                        alert(`✅ Package Selected: ${pkg.packageName || pkg.name}\nRate: ₹${(pkg.rate || 0).toLocaleString()}`);
                    }
                    setPmjayTargetPatient(null);
                }}
            />

            {/* PMJAY Package Display Card (floating) */}
            {selectedPMJAYPackage && (pmjayTargetPatient || selectedPatient) && (
                <div className="position-fixed" style={{ bottom: 90, right: 20, zIndex: 1000, width: 350 }}>
                    <PMJAYPackageCard
                        packageData={selectedPMJAYPackage}
                        onEdit={() => setShowPMJAYSelector(true)}
                        onRemove={async () => {
                            const admId = pmjayTargetPatient?.admission_id;
                            if (admId) {
                                try {
                                    const token = localStorage.getItem('token');
                                    await axios.post('/api/pmjay/claims/remove-package', 
                                        { admissionId: admId },
                                        { headers: { Authorization: `Bearer ${token}` } });
                                    setPmjayAssignedMap(prev => {
                                        const next = { ...prev };
                                        delete next[admId];
                                        return next;
                                    });
                                } catch (err) {
                                    console.error('PMJAY remove error:', err);
                                }
                            }
                            setSelectedPMJAYPackage(null);
                        }}
                    />
                </div>
            )}

            {/* ABHA Health ID Linker Modal */}
            <ABHALinker
                show={showABHALinker}
                onHide={() => { setShowABHALinker(false); setAbhaTargetPatient(null); }}
                patient={abhaTargetPatient ? {
                    id: abhaTargetPatient.patient_id,
                    name: abhaTargetPatient.patient_name,
                    admission_id: abhaTargetPatient.admission_id
                } : null}
                onABHALinked={(abhaData) => {
                    alert(`✅ ABHA Linked!\n\nABHA Number: ${abhaData?.abhaNumber || 'N/A'}\nPatient: ${abhaTargetPatient?.patient_name}`);
                    setShowABHALinker(false);
                    setAbhaTargetPatient(null);
                }}
            />

            {/* Consent Manager Modal */}
            <Modal
                show={showConsentManager}
                onHide={() => { setShowConsentManager(false); setConsentTargetPatient(null); }}
                size="lg"
                centered
            >
                <Modal.Header closeButton>
                    <Modal.Title>📋 Consent Management — {consentTargetPatient?.patient_name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {consentTargetPatient && (
                        <ConsentManager
                            patientId={consentTargetPatient.patient_id}
                            abhaNumber={consentTargetPatient.abha_number}
                        />
                    )}
                </Modal.Body>
            </Modal>

        </div>
    );
};

export default DoctorDashboard;
