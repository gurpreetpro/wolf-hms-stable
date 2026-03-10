import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Form, Modal, ProgressBar, Collapse, Alert, InputGroup, Tabs, Tab } from 'react-bootstrap';
import { CheckSquare, Clock, AlertTriangle, Heart, Thermometer, Activity, Pill, Bed, Zap, Shield, Flame, Lock, User, ChevronDown, ChevronUp, Plus, X, Search, ClipboardList, UserCheck, LayoutGrid, List, LogOut } from 'lucide-react';
import api from '../utils/axiosInstance';
import CareTaskBoard from '../components/CareTaskBoard';
import { io } from '../utils/socket-stub';
import NursePatientProfile from '../components/NursePatientProfile';
import FloatingAIButton from '../components/FloatingAIButton';
import EmergencyProtocolGuide from '../components/EmergencyProtocolGuide';
import emergencySound from '../utils/emergencySound';
import DigitalWhiteboard from '../components/ward/DigitalWhiteboard';
import VoiceCommandButton from '../components/VoiceCommandButton';
import DeviceSimulator from '../components/DeviceSimulator';
import ShiftHandoverReport from '../components/ShiftHandoverReport';
import { FileText } from 'lucide-react';
import QuickActionDock from '../components/QuickActionDock';
import ChatAssistant from '../components/ChatAssistant';
import PharmacyRequestModal from '../components/PharmacyRequestModal';
import HousekeepingRequestModal from '../components/HousekeepingRequestModal';
import DietaryRequestModal from '../components/DietaryRequestModal';
import DoctorOrdersPanel from '../components/DoctorOrdersPanel';
import WardBloodTransfusionsPanel from '../components/WardBloodTransfusionsPanel';
import PatientAlertsPanel from '../components/nursing/PatientAlertsPanel';


import { useParams } from 'react-router-dom';

// Pre-loaded PRN Medications
const PRN_MEDICATIONS = [
    { name: 'Paracetamol 500mg', category: 'Antipyretic/Analgesic', reasons: ['Fever', 'Pain', 'Headache'] },
    { name: 'Paracetamol 650mg', category: 'Antipyretic/Analgesic', reasons: ['Fever', 'Pain', 'Headache'] },
    { name: 'Dicyclomine 10mg', category: 'Antispasmodic', reasons: ['Abdominal cramps', 'Colic'] },
    { name: 'Ondansetron 4mg', category: 'Antiemetic', reasons: ['Nausea', 'Vomiting'] },
    { name: 'Pantoprazole 40mg', category: 'PPI', reasons: ['Acidity', 'Gastric pain'] },
    { name: 'Tramadol 50mg', category: 'Analgesic', reasons: ['Moderate pain', 'Post-op pain'] },
    { name: 'Diclofenac 50mg', category: 'NSAID', reasons: ['Pain', 'Inflammation'] },
    { name: 'Salbutamol Nebulization', category: 'Bronchodilator', reasons: ['Breathlessness', 'Wheezing'] },
    { name: 'IV NS 500ml Bolus', category: 'Fluid', reasons: ['Dehydration', 'Low BP'] },
    { name: 'Custom Medication', category: 'Other', reasons: [] }
];

const WardDashboard = () => {
    const { wardId } = useParams();
    const [showVitalsModal, setShowVitalsModal] = useState(false);
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);
    const [showPatientProfile, setShowPatientProfile] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [selectedAdmission, setSelectedAdmission] = useState(null);
    const [vitals, setVitals] = useState({ bp: '', pulse: '', temp: '', spo2: '' });

    // Emergency State
    const [activeEmergency, setActiveEmergency] = useState(null);


    // Medication Recording States
    const [showMedSection, setShowMedSection] = useState(false);
    const [medications, setMedications] = useState([]);
    const [notifyDoctor, setNotifyDoctor] = useState(true);

    // Real Data States
    const [admissions, setAdmissions] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    // Ward Selection State
    // Ward Selection State
    const [wardFilter, setWardFilter] = useState(wardId ? decodeURIComponent(wardId) : 'All');
    const selectedWard = wardFilter; // Alias for backward compatibility with existing code using selectedWard

    // Search State
    const [activeTab, setActiveTab] = useState('ward');
    const [searchQuery, setSearchQuery] = useState('');

    // Nurse Assignments State
    const [viewMode, setViewMode] = useState('all'); // 'all' or 'my'
    const [assignedBeds, setAssignedBeds] = useState([]);
    const [displayMode, setDisplayMode] = useState('whiteboard'); // 'list' or 'whiteboard'
    const [showHandoverReport, setShowHandoverReport] = useState(false);

    // Quick Action State
    const [activeModal, setActiveModal] = useState(null); // 'emergency' | 'ai' | 'chat' | 'voice'
    const [showPharmacyModal, setShowPharmacyModal] = useState(false);
    const [showCleaningModal, setShowCleaningModal] = useState(false);
    const [showDietaryModal, setShowDietaryModal] = useState(false);
    const [showSimulator, setShowSimulator] = useState(true); // Toggle for simulator visibility

    // Handlers
    const handleOpenEmergency = () => setActiveModal('emergency');
    const handleOpenAI = () => setActiveModal('ai');
    const handleOpenChat = () => setActiveModal('chat');
    const handleCloseModal = () => setActiveModal(null);

    const handleShowProfile = (admission) => {
        setSelectedAdmission(admission);
        setShowPatientProfile(true);
    };
    
    // Voice command handler wrapper





    const handleVoiceCommand = (command) => {
        console.log('Received Voice Command:', command);
        if (command.type === 'OPEN_BED') {
            // Find patient in that bed
            console.log('Voice Open Bed:', command.bedNumber);
            const target = filteredAdmissions.find(a =>
                a.bed_number && (
                    a.bed_number === command.bedNumber ||
                    a.bed_number.toLowerCase().endsWith(command.bedNumber) ||
                    a.bed_number.includes(command.bedNumber)
                )
            );
            if (target) {
                handleShowProfile(target);
            } else {
                // Fallback: Try exact match in all admissions
                const targetBroad = admissions.find(a => a.bed_number == command.bedNumber);
                if (targetBroad) {
                    handleShowProfile(targetBroad);
                } else {
                    alert(`Bed ${command.bedNumber} not found or empty.`);
                }
            }
        } else if (command.type === 'LOG_VITALS') {
            alert(`Mic Log: BP ${command.vitals.sys}/${command.vitals.dia} for Bed ${command.bedNumber}`);
        }
    };

    const [attendantCounts, setAttendantCounts] = useState({});

    const fetchWardData = async () => {
        const token = localStorage.getItem('token');
        setFetchError(null);
        try {
            const [wardRes, safetyRes] = await Promise.all([
                api.get('/api/nurse/ward-overview', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/api/ward-access/stats', { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: { by_admission: [] } } }))
            ]);

            console.log('Ward Data Fetched:', wardRes.data);
            setAdmissions(wardRes.data.data.admissions || []);
            setTasks(wardRes.data.data.tasks || []);

            // Process Safety Stats
            const counts = {};
            if (safetyRes.data && safetyRes.data.data && safetyRes.data.data.by_admission) {
                safetyRes.data.data.by_admission.forEach(item => {
                    counts[item.admission_id] = item.count;
                });
            }
            setAttendantCounts(counts);

            setLoading(false);
        } catch (err) {
            console.error('Error fetching ward data:', err);
            setFetchError('Failed to load ward data. Please try again.');
            setLoading(false);
        }
    };

    const fetchMyAssignments = async () => {
        try {
            const token = localStorage.getItem('token');
            // Mock date for now, ideally strictly current date
            const today = new Date().toISOString().split('T')[0];
            const res = await api.get(`/api/roster/my-assignments?date=${today}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Result is array of assignments, we extract unique bed IDs for active shift
            // Assuming backend returns assignments for the requested date.
            // We need to filter client side or backend for "current" shift to be precise,
            // but for now let's just take all beds assigned to this nurse for today.
            const allBeds = res.data.reduce((acc, curr) => [...acc, ...curr.bed_ids], []);
            setAssignedBeds([...new Set(allBeds)]); // Unique IDs
        } catch (err) {
            console.error('Failed to fetch my assignments:', err);
        }
    };


    const fetchActiveEmergency = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/api/emergency/status', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data && res.data.data) {
                setActiveEmergency(res.data.data);
                emergencySound.play(); // Resume sound if active
            }
        } catch (err) {
            console.error('Failed to fetch emergency status:', err);
        }
    };

    const handleResolveEmergency = async () => {
        // Direct resolve for reliability (native confirm was causing issues)
        try {
            const token = localStorage.getItem('token');
            // Optimistic update to remove banner immediately
            setActiveEmergency(null);
            emergencySound.stop();

            await api.post('/api/emergency/resolve', { id: activeEmergency?.id }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Emergency Resolved.');
        } catch (err) {
            console.error('Failed to resolve emergency:', err);
            const msg = err.response?.data?.message || 'Failed to resolve. Please try again.';
            alert(`Error: ${msg}`);
        }
    };

    useEffect(() => {
        fetchWardData();
        fetchMyAssignments();
        fetchActiveEmergency();

        // Socket.IO Connection
        const socket = io('/', { path: '/socket.io' });

        socket.on('connect', () => {
            console.log('✅ Ward Dashboard Connected to Socket');
        });

        socket.on('clinical_update', (data) => {
            console.log('🔔 Clinical Update Received:', data);
            fetchWardData();
        });

        // Emergency Alert Sound & State
        socket.on('emergency_broadcast', (data) => {
            console.log('🚨 EMERGENCY ALERT:', data);
            setActiveEmergency(data);
            emergencySound.play();
        });

        socket.on('emergency_resolved', (data) => {
            console.log('✅ Emergency Resolved:', data);
            setActiveEmergency(null);
            emergencySound.stop();
            alert(`Emergency Resolved by ${data.resolved_by}`);
        });

        // IoT Device Data Listener
        socket.on('iot_vitals_received', (data) => {
            console.log('📡 IoT Data:', data);
            // In a real app, use a Toast. For demo, alert is fine or a custom notification state.
            // Using alert might block UI, so let's log and maybe use a small timeout alert or just rely on console/refresh
            // But user wants to SEE it.
            const msg = `📡 IoT Update from ${data.bedNumber}:\n${data.type}: ${data.value}`;
            alert(msg);
            fetchWardData();
        });

        return () => {
            socket.disconnect();
            emergencySound.stop(); // Stop sound on unmount
        };
    }, []);

    const handleVitalsSubmit = async (e) => {
        e.preventDefault();

        // Find the admission for the selected patient
        const admission = filteredAdmissions.find(a => a.patient_name === selectedPatient);

        try {
            const token = localStorage.getItem('token');

            // Save vitals
            await api.post('/api/clinical/vitals', {
                admission_id: admission?.admission_id || selectedAdmission?.id,
                patient_id: admission?.patient_id || selectedAdmission?.patient_id,
                bp: vitals.bp,
                heart_rate: vitals.pulse,
                temp: vitals.temp,
                spo2: vitals.spo2
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Save medications if any were given
            if (medications.length > 0) {
                for (const med of medications) {
                    await api.post('/api/clinical/tasks', {
                        admission_id: admission?.admission_id || selectedAdmission?.id,
                        type: 'PRN Medication',
                        description: `${med.name} - ${med.reason} (Route: ${med.route})`,
                        scheduled_time: new Date().toISOString(),
                        status: 'Completed',
                        notes: `Administered by nurse. ${med.customName ? `Custom: ${med.customName}` : ''}`
                    }, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                }

                // Notify doctor if enabled
                if (notifyDoctor) {
                    console.log(`📱 Notifying doctor about ${medications.length} PRN medication(s) for ${selectedPatient}`);
                    // In production, this would send actual notification
                }
            }

            const medsGiven = medications.length > 0 ? ` + ${medications.length} medication(s)` : '';
            alert(`✅ Vitals${medsGiven} saved for ${selectedPatient}`);

            // Reset all states
            setShowVitalsModal(false);
            setVitals({ bp: '', pulse: '', temp: '', spo2: '' });
            setMedications([]);
            setShowMedSection(false);
            fetchWardData();
        } catch (err) {
            console.error('Vitals save error:', err);
            alert('❌ Error saving vitals. Please try again.');
        }
    };

    // Add a new medication entry
    const addMedication = () => {
        setMedications([...medications, {
            name: '',
            customName: '',
            reason: '',
            route: 'Oral',
            time: new Date().toLocaleTimeString()
        }]);
    };

    // Remove a medication entry
    const removeMedication = (index) => {
        setMedications(medications.filter((_, i) => i !== index));
    };

    // Update a medication entry
    const updateMedication = (index, field, value) => {
        const updated = [...medications];
        updated[index][field] = value;

        // If selecting a PRN med, auto-populate reasons
        if (field === 'name' && value !== 'Custom Medication') {
            const prnMed = PRN_MEDICATIONS.find(m => m.name === value);
            if (prnMed && prnMed.reasons.length > 0) {
                updated[index].reason = prnMed.reasons[0];
            }
        }

        setMedications(updated);
    };

    const openVitalsModal = (patientName) => {
        setSelectedPatient(patientName);
        setMedications([]);
        setShowMedSection(false);
        setShowVitalsModal(true);
    };

    const openPatientProfile = (admission) => {
        setSelectedAdmission(admission);
        setShowPatientProfile(true);
    };

    const triggerEmergency = async (code) => {
        try {
            const token = localStorage.getItem('token');
            await api.post('/api/emergency/trigger', {
                code: code,
                location: selectedWard === 'All' ? 'Ward A' : selectedWard // Use selected ward or default
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`CODE ${code.toUpperCase()} TRIGGERED!`);
            setShowEmergencyModal(false);
        } catch (err) {
            console.error(err);
            alert('Failed to trigger emergency');
        }
    };

    // Filter Logic - Ward + Search + Assignment
    const wardFilteredAdmissions = selectedWard === 'All'
        ? admissions
        : admissions.filter(a => a.ward === selectedWard);

    // Apply Assignment Filter
    const assignmentFilteredAdmissions = viewMode === 'my' && assignedBeds.length > 0
        ? wardFilteredAdmissions.filter(a => assignedBeds.includes(a.bed_id)) // Assuming admission has bed_id or we need to match bed_number if ids missing
        : wardFilteredAdmissions;

    // Apply search filter
    const filteredAdmissions = searchQuery.trim()
        ? assignmentFilteredAdmissions.filter(a =>
            a.patient_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.bed_number?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : assignmentFilteredAdmissions;

    const wardFilteredTasks = selectedWard === 'All'
        ? tasks
        : tasks.filter(t => t.ward === selectedWard);

    // Apply Assignment Filter to Tasks
    // Tasks usually link to admission or patient, assuming we can match via patient name or bed number
    // Best effort matching if explicit bed_id isn't on task object
    const assignmentFilteredTasks = viewMode === 'my' && assignedBeds.length > 0
        ? wardFilteredTasks.filter(t => {
            // Find admission for this task to get bed ID
            const adm = admissions.find(a => a.patient_name === t.patient_name);
            return adm && assignedBeds.includes(adm.bed_id);
        })
        : wardFilteredTasks;

    // Apply search filter to tasks
    const filteredTasks = searchQuery.trim()
        ? assignmentFilteredTasks.filter(t =>
            t.patient_name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : assignmentFilteredTasks;

    if (loading) return <Container className="py-4"><div className="text-center">Loading...</div></Container>;

    if (fetchError) {
        return (
            <Container className="py-5 text-center">
                <AlertTriangle size={48} className="text-danger mb-3" />
                <h5 className="text-danger">{fetchError}</h5>
                <Button variant="primary" className="mt-3" onClick={() => window.location.reload()}>
                    Retry
                </Button>
            </Container>
        );
    }

    return (
        <Container className="py-4">
            {/* Active Emergency Banner */}
            {activeEmergency && (
                <div className="bg-danger text-white p-3 mb-4 rounded shadow-lg d-flex justify-content-between align-items-center animate-pulse border border-white border-3">
                    <div className="d-flex align-items-center gap-3">
                        <AlertTriangle size={32} className="text-warning" />
                        <div>
                            <h4 className="mb-0 fw-bold">🚨 ACTIVE EMERGENCY: CODE {activeEmergency.code}</h4>
                            <div className="fs-5">Location: {activeEmergency.location}</div>
                        </div>
                    </div>
                    <Button variant="light" size="lg" className="text-danger fw-bold" onClick={handleResolveEmergency}>
                        <CheckSquare size={20} className="me-2" /> RESOLVE / STAND DOWN
                    </Button>
                </div>
            )}

            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0 fw-bold border-start border-4 border-primary ps-3">
                    Smart Ward
                    <span className="fs-6 ms-3 text-muted fw-normal d-none d-md-inline">Real-time Monitoring</span>
                    <Form.Check 
                        type="switch"
                        id="simulator-switch"
                        label="Sim"
                        checked={showSimulator}
                        onChange={(e) => setShowSimulator(e.target.checked)}
                        className="d-inline-block ms-3 fs-6"
                        title="Toggle Device Simulator"
                    />
                    {showSimulator && <DeviceSimulator />}
                </h2>
                <div className="d-flex gap-2">
                    <Button variant="outline-info" onClick={() => setShowHandoverReport(true)}>
                        <FileText size={18} className="me-2" /> Shift Handover
                    </Button>
                    <Button variant="danger" className="animate-pulse" onClick={() => setShowEmergencyModal(true)}>
                        <AlertTriangle size={18} className="me-2" /> EMERGENCY
                    </Button>
                    <Button variant="primary" onClick={() => openVitalsModal('Quick Log')}>
                        <Activity size={18} className="me-2" /> Quick Vitals Log
                    </Button>
                </div>
            </div>
            {/* Tab Navigation */}
            <Tabs
                activeKey={activeTab}
                onSelect={(k) => setActiveTab(k)}
                className="mb-4"
            >
                <Tab
                    eventKey="ward"
                    title={
                        <span className="d-flex align-items-center gap-2">
                            <Bed size={16} /> Ward View
                        </span>
                    }
                >
                    {/* Patient Search Bar and Filter */}
                    <Row className="mb-3 mt-3 align-items-center">
                        <Col md={6}>
                            <InputGroup>
                                <InputGroup.Text className="bg-white">
                                    <Search size={18} className="text-muted" />
                                </InputGroup.Text>
                                <Form.Control
                                    placeholder="Search patients by name or bed number..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="border-start-0"
                                />
                                {searchQuery && (
                                    <Button
                                        variant="outline-secondary"
                                        onClick={() => setSearchQuery('')}
                                        className="border-start-0"
                                    >
                                        <X size={16} />
                                    </Button>
                                )}
                            </InputGroup>
                        </Col>
                        <Col md={6} className="text-end">
                            <div className="d-inline-flex align-items-center gap-3">
                                {/* Assignment Filter */}
                                <div className="d-inline-flex align-items-center bg-white border rounded p-1">
                                    <Button
                                        variant={viewMode === 'all' ? 'primary' : 'light'}
                                        size="sm"
                                        onClick={() => setViewMode('all')}
                                        className="me-1"
                                    >
                                        All Patients
                                    </Button>
                                    <Button
                                        variant={viewMode === 'my' ? 'primary' : 'light'}
                                        size="sm"
                                        onClick={() => setViewMode('my')}
                                        className="d-flex align-items-center"
                                    >
                                        <UserCheck size={14} className="me-1" /> My
                                    </Button>
                                </div>
                                {/* View Mode Toggle (Whiteboard vs List) */}
                                <div className="d-inline-flex align-items-center bg-white border rounded p-1">
                                    <Button
                                        variant={displayMode === 'list' ? 'secondary' : 'light'}
                                        size="sm"
                                        onClick={() => setDisplayMode('list')}
                                        title="List View"
                                        className="me-1"
                                    >
                                        <List size={16} />
                                    </Button>
                                    <Button
                                        variant={displayMode === 'whiteboard' ? 'secondary' : 'light'}
                                        size="sm"
                                        onClick={() => setDisplayMode('whiteboard')}
                                        title="Smart Whiteboard"
                                    >
                                        <LayoutGrid size={16} />
                                    </Button>
                                </div>
                            </div>
                        </Col>
                    </Row>

                    {viewMode === 'my' && assignedBeds.length === 0 && (
                        <Alert variant="info" className="mb-3">
                            <AlertTriangle size={16} className="me-2" />
                            You have no assigned beds for the current shift. Switching to All Patients view.
                        </Alert>
                    )}

                    {/* Patient Alerts Panel - Gold Standard Enhancement */}
                    <PatientAlertsPanel admissions={filteredAdmissions} wardFilter={wardFilter} />

                    {displayMode === 'whiteboard' ? (
                        <DigitalWhiteboard
                            admissions={filteredAdmissions}
                            allAdmissions={admissions}
                            onPatientClick={openPatientProfile}
                            wardFilter={wardFilter}
                            setWardFilter={setWardFilter}
                        />
                    ) : (
                        <Row className="mb-4">
                            <Col md={8}>
                                <h5 className="fw-bold mb-3 text-secondary">Pending Care Tasks ({selectedWard})</h5>
                                {filteredTasks.length > 0 ? filteredTasks.map(task => (
                                    <Card key={task.id} className={`mb-3 border-start border-5 ${task.status === 'Overdue' ? 'border-danger' : 'border-success'} shadow-sm`}>
                                        <Card.Body className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <div className="fw-bold d-flex align-items-center gap-2">
                                                    {task.patient_name} <Badge bg="secondary">{task.bed_number}</Badge>
                                                    <Badge bg="info" text="dark">{task.ward}</Badge>
                                                    {task.status === 'Overdue' && <Badge bg="danger">Overdue</Badge>}
                                                </div>
                                                <div className="text-muted">{task.description}</div>
                                            </div>
                                            <div className="text-end">
                                                <div className="fw-bold text-primary">{new Date(task.scheduled_time).toLocaleTimeString()}</div>
                                                <div className="d-flex gap-2 mt-1">
                                                    <Button size="sm" variant="outline-primary" onClick={() => openVitalsModal(task.patient_name)}>
                                                        <Heart size={14} className="me-1" /> Vitals
                                                    </Button>
                                                    <Button size="sm" variant="success">
                                                        <CheckSquare size={14} className="me-1" /> Done
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                )) : <Card><Card.Body>No pending tasks for {selectedWard}</Card.Body></Card>}
                            </Col>

                            <Col md={4}>
                                <h5 className="fw-bold mb-3 text-secondary">Admitted Patients ({selectedWard})</h5>
                                <Row className="g-2">
                                    {filteredAdmissions.length > 0 ? filteredAdmissions.map(admission => (
                                        <Col xs={12} key={admission.admission_id}>
                                            <Card
                                                className="text-start h-100 border-0 shadow-sm bg-info-subtle cursor-pointer"
                                                onClick={() => openPatientProfile(admission)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <Card.Body className="p-3">
                                                    <div className="d-flex justify-content-between align-items-start">
                                                        <div>
                                                            <User size={18} className="text-info me-2" />
                                                            <strong>{admission.patient_name}</strong>
                                                            <Badge bg="dark" className="ms-2">{admission.bed_number}</Badge>
                                                            {attendantCounts[admission.admission_id] > 0 && (
                                                                <Badge bg="warning" text="dark" className="ms-2 animate-pulse">
                                                                    <Users size={12} className="me-1" />
                                                                    {attendantCounts[admission.admission_id]} Attendants
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <small className="text-muted d-block mt-1">Ward: {admission.ward}</small>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    )) : <Col xs={12}><Card><Card.Body>No admitted patients in {selectedWard}</Card.Body></Card></Col>}
                                </Row>

                                <Card className="mt-4 border-0 shadow-sm">
                                    <Card.Header className="bg-white fw-bold">Quick Actions</Card.Header>
                                    <Card.Body>
                                        <div className="d-grid gap-2">
                                            <Button variant="outline-dark" className="text-start" onClick={() => setShowPharmacyModal(true)}>
                                                <Pill size={18} className="me-2" /> Request Meds
                                            </Button>
                                            <Button variant="outline-info" className="text-start" onClick={() => setShowCleaningModal(true)}>
                                                <Brush size={18} className="me-2" /> Request Cleaning
                                            </Button>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    )}

                    {/* Vitals Modal */}
                    <Modal show={showVitalsModal} onHide={() => setShowVitalsModal(false)} centered>
                        <Modal.Header closeButton>
                            <Modal.Title>Log Vitals: {selectedPatient === 'Quick Log' ? 'Select Patient' : selectedPatient}</Modal.Title>
                        </Modal.Header>
                        <Form onSubmit={handleVitalsSubmit}>
                            <Modal.Body>
                                {/* Patient Selector - shown when Quick Log is clicked */}
                                {selectedPatient === 'Quick Log' && (
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-bold">Select Patient *</Form.Label>
                                        <Form.Select
                                            required
                                            value={selectedPatient}
                                            onChange={(e) => setSelectedPatient(e.target.value)}
                                        >
                                            <option value="Quick Log">-- Select a Patient --</option>
                                            {filteredAdmissions.map(admission => (
                                                <option key={admission.admission_id} value={admission.patient_name}>
                                                    {admission.patient_name} - Bed {admission.bed_number} ({admission.ward})
                                                </option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                )}
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Blood Pressure (mmHg)</Form.Label>
                                            <Form.Control
                                                placeholder="120/80"
                                                value={vitals.bp}
                                                onChange={e => setVitals({ ...vitals, bp: e.target.value })}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Pulse (bpm)</Form.Label>
                                            <Form.Control
                                                placeholder="72"
                                                value={vitals.pulse}
                                                onChange={e => setVitals({ ...vitals, pulse: e.target.value })}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Temperature (°F)</Form.Label>
                                            <Form.Control
                                                placeholder="98.6"
                                                value={vitals.temp}
                                                onChange={e => setVitals({ ...vitals, temp: e.target.value })}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>SpO2 (%)</Form.Label>
                                            <Form.Control
                                                placeholder="98"
                                                value={vitals.spo2}
                                                onChange={e => setVitals({ ...vitals, spo2: e.target.value })}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                {/* Collapsible Medication Section */}
                                <div className="border-top pt-3 mt-3">
                                    <Button
                                        variant="link"
                                        className="p-0 text-decoration-none d-flex align-items-center gap-2 fw-bold"
                                        onClick={() => setShowMedSection(!showMedSection)}
                                    >
                                        <Pill size={18} className="text-primary" />
                                        Additional Medication Given (Optional)
                                        {showMedSection ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        {medications.length > 0 && (
                                            <Badge bg="primary" className="ms-2">{medications.length}</Badge>
                                        )}
                                    </Button>

                                    <Collapse in={showMedSection}>
                                        <div className="mt-3">
                                            {medications.length === 0 ? (
                                                <Alert variant="light" className="d-flex justify-content-between align-items-center mb-2">
                                                    <span className="text-muted">No medications added yet</span>
                                                    <Button size="sm" variant="outline-primary" onClick={addMedication}>
                                                        <Plus size={14} className="me-1" /> Add Medication
                                                    </Button>
                                                </Alert>
                                            ) : (
                                                <>
                                                    {medications.map((med, index) => (
                                                        <Card key={index} className="mb-2 bg-light border-0">
                                                            <Card.Body className="p-2">
                                                                <div className="d-flex justify-content-between mb-2">
                                                                    <small className="fw-bold text-muted">Medication #{index + 1}</small>
                                                                    <Button
                                                                        variant="link"
                                                                        className="p-0 text-danger"
                                                                        onClick={() => removeMedication(index)}
                                                                    >
                                                                        <X size={16} />
                                                                    </Button>
                                                                </div>
                                                                <Row className="g-2">
                                                                    <Col xs={12}>
                                                                        <Form.Select
                                                                            size="sm"
                                                                            value={med.name}
                                                                            onChange={(e) => updateMedication(index, 'name', e.target.value)}
                                                                            required
                                                                        >
                                                                            <option value="">-- Select Medicine --</option>
                                                                            {PRN_MEDICATIONS.map(prn => (
                                                                                <option key={prn.name} value={prn.name}>
                                                                                    {prn.name} ({prn.category})
                                                                                </option>
                                                                            ))}
                                                                        </Form.Select>
                                                                    </Col>
                                                                    {med.name === 'Custom Medication' && (
                                                                        <Col xs={12}>
                                                                            <Form.Control
                                                                                size="sm"
                                                                                placeholder="Enter custom medication name & dose"
                                                                                value={med.customName}
                                                                                onChange={(e) => updateMedication(index, 'customName', e.target.value)}
                                                                                required
                                                                            />
                                                                        </Col>
                                                                    )}
                                                                    <Col xs={6}>
                                                                        {med.name && med.name !== 'Custom Medication' && PRN_MEDICATIONS.find(p => p.name === med.name)?.reasons.length > 0 ? (
                                                                            <Form.Select
                                                                                size="sm"
                                                                                value={med.reason}
                                                                                onChange={(e) => updateMedication(index, 'reason', e.target.value)}
                                                                            >
                                                                                <option value="">Reason</option>
                                                                                {PRN_MEDICATIONS.find(p => p.name === med.name)?.reasons.map(r => (
                                                                                    <option key={r} value={r}>{r}</option>
                                                                                ))}
                                                                            </Form.Select>
                                                                        ) : (
                                                                            <Form.Control
                                                                                size="sm"
                                                                                placeholder="Reason for giving"
                                                                                value={med.reason}
                                                                                onChange={(e) => updateMedication(index, 'reason', e.target.value)}
                                                                            />
                                                                        )}
                                                                    </Col>
                                                                    <Col xs={6}>
                                                                        <Form.Select
                                                                            size="sm"
                                                                            value={med.route}
                                                                            onChange={(e) => updateMedication(index, 'route', e.target.value)}
                                                                        >
                                                                            <option value="Oral">Oral</option>
                                                                            <option value="IV">IV</option>
                                                                            <option value="IM">IM</option>
                                                                            <option value="SC">SC</option>
                                                                            <option value="Nebulization">Nebulization</option>
                                                                            <option value="Topical">Topical</option>
                                                                        </Form.Select>
                                                                    </Col>
                                                                </Row>
                                                            </Card.Body>
                                                        </Card>
                                                    ))}
                                                    <Button
                                                        size="sm"
                                                        variant="outline-primary"
                                                        className="w-100"
                                                        onClick={addMedication}
                                                    >
                                                        <Plus size={14} className="me-1" /> Add Another Medication
                                                    </Button>
                                                </>
                                            )}

                                            {/* Doctor Notification Toggle */}
                                            {medications.length > 0 && (
                                                <Form.Check
                                                    type="checkbox"
                                                    id="notify-doctor"
                                                    className="mt-3"
                                                    label={
                                                        <span className="d-flex align-items-center gap-1">
                                                            <AlertTriangle size={14} className="text-warning" />
                                                            Notify assigned doctor about PRN medications
                                                        </span>
                                                    }
                                                    checked={notifyDoctor}
                                                    onChange={(e) => setNotifyDoctor(e.target.checked)}
                                                />
                                            )}
                                        </div>
                                    </Collapse>
                                </div>
                            </Modal.Body>
                            <Modal.Footer>
                                <Button variant="secondary" onClick={() => setShowVitalsModal(false)}>Cancel</Button>
                                <Button variant="success" type="submit">
                                    {medications.length > 0 ? `Save Vitals + ${medications.length} Med(s)` : 'Save Vitals'}
                                </Button>
                            </Modal.Footer>
                        </Form>
                    </Modal>

                    {/* Emergency Modal */}
                    <Modal show={showEmergencyModal} onHide={() => setShowEmergencyModal(false)} centered size="lg">
                        <Modal.Header closeButton className="bg-danger text-white">
                            <Modal.Title className="fw-bold"><AlertTriangle size={24} className="me-2" /> EMERGENCY TRIGGER</Modal.Title>
                        </Modal.Header>
                        <Modal.Body className="p-4">
                            <p className="text-center text-muted mb-4">Select the type of emergency to broadcast to all units.</p>
                            <Row className="g-3">
                                <Col md={4}>
                                    <Button variant="primary" size="lg" className="w-100 py-4 fw-bold" onClick={() => triggerEmergency('Blue')}>
                                        <Heart size={32} className="mb-2 d-block mx-auto" /> CODE BLUE
                                        <div className="small fw-normal">Cardiac Arrest</div>
                                    </Button>
                                </Col>
                                <Col md={4}>
                                    <Button variant="danger" size="lg" className="w-100 py-4 fw-bold" onClick={() => triggerEmergency('Red')}>
                                        <AlertTriangle size={32} className="mb-2 d-block mx-auto" /> CODE RED
                                        <div className="small fw-normal">Fire / Smoke</div>
                                    </Button>
                                </Col>
                                <Col md={4}>
                                    <Button variant="warning" size="lg" className="w-100 py-4 fw-bold text-dark" onClick={() => triggerEmergency('Yellow')}>
                                        <Activity size={32} className="mb-2 d-block mx-auto" /> CODE YELLOW
                                        <div className="small fw-normal">Disaster / Mass Casualty</div>
                                    </Button>
                                </Col>

                                <Col md={4}>
                                    <Button style={{ backgroundColor: '#ff69b4', borderColor: '#ff69b4' }} size="lg" className="w-100 py-4 fw-bold text-white" onClick={() => triggerEmergency('Pink')}>
                                        <Shield size={32} className="mb-2 d-block mx-auto" /> CODE PINK
                                        <div className="small fw-normal">Child Abduction</div>
                                    </Button>
                                </Col>
                                <Col md={4}>
                                    <Button variant="dark" size="lg" className="w-100 py-4 fw-bold text-white" onClick={() => triggerEmergency('Black')}>
                                        <Shield size={32} className="mb-2 d-block mx-auto" /> CODE BLACK
                                        <div className="small fw-normal">Bomb Threat</div>
                                    </Button>
                                </Col>
                                <Col md={4}>
                                    <Button variant="secondary" size="lg" className="w-100 py-4 fw-bold text-white" onClick={() => triggerEmergency('Grey')}>
                                        <Shield size={32} className="mb-2 d-block mx-auto" /> CODE GREY
                                        <div className="small fw-normal">Security / Violence</div>
                                    </Button>
                                </Col>
                                <Col md={12}>
                                    <Button style={{ backgroundColor: '#fd7e14', borderColor: '#fd7e14' }} size="lg" className="w-100 py-3 fw-bold text-white" onClick={() => triggerEmergency('Orange')}>
                                        <Zap size={28} className="me-2" /> CODE ORANGE - Hazardous Material Spill / Chemical Incident
                                    </Button>
                                </Col>
                            </Row>
                        </Modal.Body>
                    </Modal>

                    {/* Patient Profile Modal */}
                    <NursePatientProfile
                        show={showPatientProfile}
                        onHide={() => setShowPatientProfile(false)}
                        admission={selectedAdmission}
                    />

                    {/* Ai Clinical  - Controlled Mode */}
                    <FloatingAIButton 
                        isOpen={activeModal === 'ai'} 
                        onClose={handleCloseModal}
                        patientContext={selectedAdmission}
                    />

                    {/* Emergency Protocol Guide - Controlled Mode */}
                    <EmergencyProtocolGuide 
                        isOpen={activeModal === 'emergency'} 
                        onClose={handleCloseModal} 
                    />
                </Tab>

                {/* Task Board Tab */}
                <Tab
                    eventKey="taskboard"
                    title={
                        <span className="d-flex align-items-center gap-2">
                            <ClipboardList size={16} /> Task Board
                        </span>
                    }
                >
                    <div className="mt-3">
                        <CareTaskBoard ward={selectedWard === 'All' ? null : selectedWard} />
                    </div>
                </Tab>

                {/* Doctor Orders Tab - IPD CPOE Integration */}
                <Tab
                    eventKey="doctororders"
                    title={
                        <span className="d-flex align-items-center gap-2">
                            <Pill size={16} /> Doctor Orders
                        </span>
                    }
                >
                    <div className="mt-3">
                        <DoctorOrdersPanel 
                            wardFilter={selectedWard} 
                            onOrderComplete={fetchWardData} 
                        />
                    </div>
                </Tab>
            </Tabs >

            {/* Voice Command Logic (Hidden Trigger) & Quick Action Dock */}
            <div style={{ display: 'none' }}>
                <VoiceCommandButton onCommand={handleVoiceCommand}>
                     <button id="hidden-voice-trigger" type="button" />
                </VoiceCommandButton>
            </div>
            
            <QuickActionDock 
                onEmergencyClick={handleOpenEmergency}
                onAIClick={handleOpenAI}
                onVoiceClick={() => document.getElementById('hidden-voice-trigger')?.click()}
                onChatClick={handleOpenChat}
                onCleaningClick={() => setShowCleaningModal(true)}
                onDietaryClick={() => setShowDietaryModal(true)}
            />

            <ChatAssistant 
                show={activeModal === 'chat'} 
                onHide={handleCloseModal} 
                hideTrigger={true}
            />
            
            {/* Shift Handover Report Modal - Gold Standard Phase 3 */}
            <ShiftHandoverReport 
                show={showHandoverReport} 
                onHide={() => setShowHandoverReport(false)} 
                wardFilter={selectedWard}
            />

            {/* Pharmacy Request Modal */}
            <PharmacyRequestModal 
                show={showPharmacyModal} 
                onHide={() => setShowPharmacyModal(false)}
                admissions={admissions}
            />

            {/* Housekeeping Request Modal */}
            <HousekeepingRequestModal
                show={showCleaningModal}
                onHide={() => setShowCleaningModal(false)}
                defaultLocation={selectedWard !== 'All' ? selectedWard : ''}
            />

            <DietaryRequestModal
                show={showDietaryModal}
                onHide={() => setShowDietaryModal(false)}
                patients={admissions || []}
                wardId={selectedWard !== 'All' ? selectedWard : 'General Ward'}
            />
        </Container>
    );
};

export default WardDashboard;
