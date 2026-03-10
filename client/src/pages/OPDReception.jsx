import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, ListGroup, Badge, Form, Alert, Tabs, Tab, Table, InputGroup } from 'react-bootstrap';
import { Plus, User, Search, Activity, Bed, Users, Filter, X, Edit, Clock, Monitor, AlertCircle } from 'lucide-react';
// import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { io } from '../utils/socket-stub';
import { useTheme } from '../contexts/ThemeContext';
import PatientRegistrationModal from '../components/PatientRegistrationModal';
import EditPatientModal from '../components/EditPatientModal';
import RefundConfirmationModal from '../components/RefundConfirmationModal';
import RescheduleModal from '../components/RescheduleModal';
import DoctorCalendar from '../components/DoctorCalendar';
import PatientProfileModal from '../components/PatientProfileModal';
import InsuranceVerificationModal from '../components/InsuranceVerificationModal';
import VisitorPassModal from '../components/VisitorPassModal';
import RegistrationReceipt from '../components/RegistrationReceipt';
import PMJAYVerificationModal from '../components/insurance/PMJAYVerificationModal';
import PMJAYBadge from '../components/insurance/PMJAYBadge';
import { Eye, Printer, Shield, UserPlus, Heart } from 'lucide-react';


// --- GLASS UI COMPONENTS ---
const GlassCard = ({ children, className = '', isDark }) => (
    <div className={`p-4 rounded-4 shadow-lg ${className}`}
        style={{
            background: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
            color: isDark ? '#e2e8f0' : '#1e293b'
        }}>
        {children}
    </div>
);

// Common hospital departments
const DEPARTMENTS = [
    'All Departments',
    'General Medicine',
    'Cardiology',
    'Orthopedics',
    'Pediatrics',
    'Gynecology',
    'ENT',
    'Ophthalmology',
    'Dermatology',
    'Neurology',
    'Emergency'
];

const OPDReception = () => {
    const { isDark } = useTheme();
    // const navigate = useNavigate(); // Unused
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [patientToEdit, setPatientToEdit] = useState(null);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [showRescheduleModal, setShowRescheduleModal] = useState(false);
    const [visitToCancel, setVisitToCancel] = useState(null);
    const [visitToReschedule, setVisitToReschedule] = useState(null);
    const [queue, setQueue] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [doctors, setDoctors] = useState([]);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [selectedPatientId, setSelectedPatientId] = useState(null);
    const [showInsuranceModal, setShowInsuranceModal] = useState(false);
    const [showVisitorModal, setShowVisitorModal] = useState(false);
    const [selectedPatientForInsurance, setSelectedPatientForInsurance] = useState(null);
    
    // PMJAY Verification
    const [showPMJAYModal, setShowPMJAYModal] = useState(false);
    const [selectedPatientForPMJAY, setSelectedPatientForPMJAY] = useState(null);
    
    // Receipt Printing
    const [showReceiptModal, setShowReceiptModal] = useState(false);
    const [selectedReceiptData, setSelectedReceiptData] = useState(null);

    const [stats, setStats] = useState({
        patientsWaiting: 0,
        bedsAvailable: 0,
        doctorsActive: 0
    });

    const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
    const [selectedDoctor, setSelectedDoctor] = useState('All Doctors');
    const [viewMode, setViewMode] = useState('queue'); // 'queue' or 'calendar'
    // const [appointments, setAppointments] = useState([]); // Unused

    // --- FETCH DATA ---
    const fetchQueue = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/opd/queue', { headers: { Authorization: `Bearer ${token}` } });
            const list = res.data.data || res.data;
            setQueue(Array.isArray(list) ? list : []);
            setStats(prev => ({ ...prev, patientsWaiting: (Array.isArray(list) ? list.length : 0) }));
        } catch (err) { console.error(err); }
    };

    const fetchDoctors = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/auth/users', { headers: { Authorization: `Bearer ${token}` } });
            const list = res.data.data || res.data;
            const doctorList = (Array.isArray(list) ? list : []).filter(u => u.role === 'doctor' && u.is_active);
            setDoctors(doctorList);
            setStats(prev => ({ ...prev, doctorsActive: doctorList.length }));
        } catch (err) { console.error(err); }
    };

    const fetchReceptionStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/reception/stats', { headers: { Authorization: `Bearer ${token}` } });
            setStats(prev => ({ ...prev, bedsAvailable: res.data.beds_available }));
        } catch (err) { console.error('Failed to fetch reception stats:', err); }
    };

    // --- VISITOR MANAGEMENT (Phase 23B) ---
    const [visitors, setVisitors] = useState([]);
    const [invites, setInvites] = useState([]);

    const fetchVisitors = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/visitors/active', { headers: { Authorization: `Bearer ${token}` } });
            setVisitors(res.data.data || res.data || []);
        } catch (err) { console.error('Failed to fetch visitors', err); }
    };

    const fetchInvites = async () => {
        try {
            const token = localStorage.getItem('token');
            // Assuming this route exists from Phase 23B backend work
            const res = await axios.get('/api/visitors/invites', { headers: { Authorization: `Bearer ${token}` } });
            setInvites(res.data.data || res.data || []);
        } catch (err) { console.error('Failed to fetch invites', err); }
    };

    // --- SEARCH ---
    const searchPatient = async (query) => {
        if (query.length < 2) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/patients/search?q=${query}`, { headers: { Authorization: `Bearer ${token}` } });
            setSearchResults(res.data);
            setShowSearchResults(res.data.length > 0);
        } catch (err) { console.error('Search error:', err); }
    };

    // --- EFFECTS ---
    useEffect(() => {
        fetchQueue();
        fetchDoctors();
        fetchReceptionStats();
        fetchVisitors();
        fetchInvites();
        const socket = io('/', { path: '/socket.io' });
        socket.on('opd_update', () => { fetchQueue(); fetchReceptionStats(); });
        socket.on('visitor_update', () => { fetchVisitors(); }); // Listen for visitor events
        return () => socket.disconnect();
         
    }, []);

    // --- HANDLERS ---
    const handleRegister = () => {
        fetchQueue();
        setSelectedPatient(null);
    };

    const handleEditClick = async (visit) => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/patients/${visit.patient_id}`, { headers: { Authorization: `Bearer ${token}` } });
            setPatientToEdit(res.data.data || res.data);
            setShowEditModal(true);
        } catch (err) { alert('Failed to fetch patient details'); }
    };

    const handleCancelClick = (visit) => {
        setVisitToCancel(visit);
        setShowRefundModal(true);
    };

    const handleRefundConfirm = async (refundDetails) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/opd/cancel', {
                visit_id: visitToCancel.id,
                refundDetails
            }, { headers: { Authorization: `Bearer ${token}` } });

            fetchQueue();
            setShowRefundModal(false);
            setVisitToCancel(null);
        } catch (err) {
            console.error('Cancellation failed:', err);
            const msg = err.response?.data?.message || err.message || 'Unknown error';
            alert(`Failed to cancel appointment: ${msg}`);
        }
    };

    const handleRescheduleClick = (visit) => {
        setVisitToReschedule(visit);
        setShowRescheduleModal(true);
    };

    const handleRescheduleConfirm = async (data) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/opd/reschedule', {
                visit_id: visitToReschedule.id,
                ...data
            }, { headers: { Authorization: `Bearer ${token}` } });

            fetchQueue();
            setShowRescheduleModal(false);
            setVisitToReschedule(null);
            alert('Appointment rescheduled successfully!');
        } catch (err) {
            console.error('Reschedule failed:', err);
            alert('Failed to reschedule');
        }
    };

    // --- RENDER HELPERS ---
    const getInitials = (name) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    // Theme Helpers
    const textColor = isDark ? 'text-white' : 'text-dark';
    const subTextColor = isDark ? 'text-white-50' : 'text-muted';
    const borderColor = isDark ? 'border-white border-opacity-10' : 'border-dark border-opacity-10';

    return (
        <Container fluid className="py-4">
            {/* TOP BAR: Header & Stats */}
            <div className="d-flex justify-content-between align-items-start mb-4">
                <div>
                    <h1 className={`fw-bold display-6 mb-1 ${textColor}`}>Reception Command</h1>
                    <p className={subTextColor}>Live Operations Dashboard</p>
                </div>
                <div className="d-flex gap-3">
                    <div className={`text-end px-4 border-end ${borderColor}`}>
                        <div className="h2 fw-bold mb-0 text-warning">{stats.patientsWaiting}</div>
                        <div className={`small ${subTextColor}`}>Waiting</div>
                    </div>
                    <div className={`text-end px-4 border-end ${borderColor}`}>
                        <div className="h2 fw-bold mb-0 text-info">{stats.doctorsActive}</div>
                        <div className={`small ${subTextColor}`}>Active Docs</div>
                    </div>
                    <div className="text-end px-4">
                        <div className="h2 fw-bold mb-0 text-success">{stats.bedsAvailable}</div>
                        <div className={`small ${subTextColor}`}>Beds Free</div>
                    </div>
                </div>
            </div>

            <Row className="g-4 h-100">
                {/* LEFT: MAIN ACTION AREA */}
                <Col lg={8} className="d-flex flex-column gap-4">

                    {/* SEARCH BAR (Primary Action) */}
                    <GlassCard className="py-3" isDark={isDark}>
                        <div className="position-relative">
                            <InputGroup>
                                <InputGroup.Text className={`bg-transparent border-0 ${subTextColor}`}>
                                    <Search size={24} />
                                </InputGroup.Text>
                                <Form.Control
                                    size="lg"
                                    type="text"
                                    placeholder="Search Patient (Name, Phone, UID) or press 'New Patient'..."
                                    value={searchQuery}
                                    onChange={(e) => { setSearchQuery(e.target.value); searchPatient(e.target.value); }}
                                    className={`bg-transparent border-0 shadow-none fs-4 ${textColor}`}
                                    style={{ caretColor: isDark ? '#fff' : '#000' }}
                                    autoFocus
                                />
                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={() => setShowModal(true)}
                                    className="px-5 rounded-pill fw-bold"
                                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', border: 'none' }}
                                >
                                    <Plus size={20} className="me-2" /> New Patient
                                </Button>
                                <Button
                                    variant="outline-secondary"
                                    size="lg"
                                    onClick={() => setShowVisitorModal(true)}
                                    className={`ms-2 px-3 fw-bold ${isDark ? 'text-light border-secondary' : 'text-dark border-secondary'}`}
                                    title="Issue Visitor Link"
                                >
                                    <UserPlus size={20} />
                                </Button>
                            </InputGroup>

                            {/* SEARCH DROPDOWN */}
                            {showSearchResults && (
                                <div className={`position-absolute w-100 mt-2 rounded-4 overflow-hidden shadow-lg border ${borderColor}`}
                                    style={{ background: isDark ? '#1e293b' : '#ffffff', zIndex: 100 }}>
                                    <ListGroup variant="flush">
                                        {searchResults.map(p => (
                                            <ListGroup.Item key={p.id} action onClick={() => { setSelectedPatient(p); setShowSearchResults(false); setShowModal(true); }}
                                                className={`bg-transparent ${textColor} border-bottom ${borderColor} py-3 ${isDark ? 'hover-bg-white-10' : 'hover-bg-dark-10'}`}>
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div>
                                                        <div className="fw-bold">{p.name}</div>
                                                        <div className={`small ${subTextColor}`}>{p.phone} | {p.gender}, {p.age}y</div>
                                                    </div>
                                                    <Badge bg="secondary" pill>ID: {p.uhid || p.id.slice(0, 8)}</Badge>
                                                </div>
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                </div>
                            )}
                        </div>
                    </GlassCard>

                    {/* LIVE QUEUE LIST */}
                    <div className="flex-grow-1 overflow-hidden d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <div className="d-flex gap-2">
                                <Button
                                    variant={viewMode === 'queue' ? (isDark ? 'light' : 'dark') : (isDark ? 'outline-light' : 'outline-dark')}
                                    size="sm"
                                    onClick={() => setViewMode('queue')}
                                    className="d-flex align-items-center gap-2"
                                >
                                    <Activity size={16} /> Live Queue
                                </Button>
                                <Button
                                    variant={viewMode === 'calendar' ? (isDark ? 'light' : 'dark') : (isDark ? 'outline-light' : 'outline-dark')}
                                    size="sm"
                                    onClick={() => setViewMode('calendar')}
                                    className="d-flex align-items-center gap-2"
                                >
                                    <Clock size={16} /> Calendar
                                </Button>
                                <Button
                                    variant={viewMode === 'visitors' ? (isDark ? 'light' : 'dark') : (isDark ? 'outline-light' : 'outline-dark')}
                                    size="sm"
                                    onClick={() => setViewMode('visitors')}
                                    className="d-flex align-items-center gap-2"
                                >
                                    <Users size={16} /> Visitors
                                </Button>
                            </div>

                            {viewMode === 'queue' && (
                                <div className="d-flex gap-2">
                                    <Form.Select
                                        size="sm"
                                        style={{ width: '180px' }}
                                        value={selectedDepartment}
                                        onChange={(e) => setSelectedDepartment(e.target.value)}
                                        className={isDark ? "bg-dark text-white border-secondary" : "bg-white text-dark border-secondary"}
                                    >
                                        {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </Form.Select>
                                    <Form.Select
                                        size="sm"
                                        style={{ width: '180px' }}
                                        value={selectedDoctor}
                                        onChange={(e) => setSelectedDoctor(e.target.value)}
                                        className={isDark ? "bg-dark text-white border-secondary" : "bg-white text-dark border-secondary"}
                                    >
                                        <option value="All Doctors">All Doctors</option>
                                        {doctors.map(d => <option key={d.id} value={d.username}>{d.username}</option>)}
                                    </Form.Select>
                                    <Button
                                        variant="outline-info"
                                        size="sm"
                                        onClick={() => window.open('/queue-display', 'QueueDisplay', 'width=1024,height=768')}
                                        title="Open Queue Display for TV"
                                    >
                                        <Monitor size={16} className="me-1" /> Queue TV
                                    </Button>
                                </div>
                            )}
                        </div>

                        {viewMode === 'visitors' ? (
                             <div className="overflow-auto custom-scrollbar pe-2" style={{ maxHeight: '600px' }}>
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <h5 className={textColor}>Active Visitors ({visitors.length})</h5>
                                    <Button size="sm" variant="success" onClick={() => setShowVisitorModal(true)}>+ New Pass</Button>
                                </div>
                                <div className="row g-3">
                                    {visitors.map(v => (
                                        <div className="col-md-6" key={v.id}>
                                            <GlassCard className="p-3" isDark={isDark}>
                                                <div className="d-flex gap-3">
                                                    {v.photo_url ? (
                                                        <img src={v.photo_url} alt="Vis" className="rounded-circle" style={{ width: 50, height: 50, objectFit: 'cover' }} />
                                                    ) : (
                                                        <div className="bg-secondary rounded-circle d-flex align-items-center justify-content-center text-white" style={{ width: 50, height: 50 }}>
                                                            {getInitials(v.full_name)}
                                                        </div>
                                                    )}
                                                    <div className="flex-grow-1">
                                                        <div className={`fw-bold ${textColor}`}>{v.full_name}</div>
                                                        <div className={`small ${subTextColor}`}>{v.purpose} • Host: {v.host_employee_id || 'N/A'}</div>
                                                        <div className={`small ${subTextColor}`}>In: {new Date(v.entry_time).toLocaleTimeString()}</div>
                                                    </div>
                                                    <Badge bg="success">INSIDE</Badge>
                                                </div>
                                            </GlassCard>
                                        </div>
                                    ))}
                                    {visitors.length === 0 && <p className={`text-center ${subTextColor}`}>No active visitors</p>}
                                </div>

                                <h5 className={`mt-4 mb-3 ${textColor}`}>Recent Pre-Invites</h5>
                                <Table size="sm" hover variant={isDark ? 'dark' : 'light'} className="bg-transparent">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Guest</th>
                                            <th>Date</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invites.map(inv => (
                                            <tr key={inv.id}>
                                                <td className="font-monospace fw-bold">{inv.code}</td>
                                                <td>{inv.guest_name}</td>
                                                <td>{new Date(inv.valid_date).toLocaleDateString()}</td>
                                                <td><Badge bg="info">ACTIVE</Badge></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        ) : viewMode === 'calendar' ? (
                            <DoctorCalendar />
                        ) : (
                            <div className="overflow-auto custom-scrollbar pe-2" style={{ maxHeight: '600px' }}>
                                {queue
                                    .filter(q => selectedDepartment === 'All Departments' || !q.department || q.department === selectedDepartment)
                                    .filter(q => selectedDoctor === 'All Doctors' || !q.doctor_name || q.doctor_name === selectedDoctor)
                                    .map((visit, index) => (
                                        <GlassCard key={visit.id} className="mb-3 p-3 hover-scale transition-all" isDark={isDark}>
                                            <div className="d-flex align-items-center justify-content-between">
                                                <div className="d-flex align-items-center gap-4">
                                                    <div className={`d-flex flex-column align-items-center justify-content-center rounded-3 p-2 ${isDark ? 'bg-white bg-opacity-10' : 'bg-dark bg-opacity-10'}`} style={{ minWidth: '60px' }}>
                                                        <span className={`small fw-bold ${subTextColor}`}>TOKEN</span>
                                                        <span className={`h4 fw-bold mb-0 ${textColor}`}>{visit.token_number}</span>
                                                    </div>
                                                    <div>
                                                        <h5 className={`fw-bold mb-1 ${textColor}`}>
                                                            {visit.patient_name} 
                                                            {visit.uhid && <Badge bg="secondary" className="ms-2" style={{ fontSize: '0.7em' }}>{visit.uhid}</Badge>}
                                                        </h5>
                                                        <div className={`d-flex gap-3 small ${subTextColor}`}>
                                                            <span className="d-flex align-items-center gap-1"><User size={14} /> {visit.age}y / {visit.gender}</span>
                                                            <span className="d-flex align-items-center gap-1"><Clock size={14} /> Est. Wait: {index * 15} mins</span>
                                                            {visit.department && <Badge bg={isDark ? "dark" : "light"} text={isDark ? "light" : "dark"} className="border border-secondary">{visit.department}</Badge>}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="d-flex align-items-center gap-2">
                                                    <Button 
                                                        variant="outline-success" 
                                                        size="sm" 
                                                        className="opacity-75 hover-opacity-100"
                                                        onClick={() => {
                                                            setSelectedPatientId(visit.patient_id);
                                                            setShowProfileModal(true);
                                                        }}
                                                    >
                                                        <Eye size={16} /> View
                                                    </Button>
                                                    <Button 
                                                        variant="outline-info" 
                                                        size="sm" 
                                                        className="opacity-75 hover-opacity-100"
                                                        onClick={() => {
                                                            setSelectedReceiptData({
                                                                patientData: {
                                                                    ...visit,
                                                                    id: visit.patient_id, // Ensure ID is Patient ID, not Visit ID
                                                                    uhid: visit.uhid,     // Explicitly pass UHID
                                                                    patient_number: visit.uhid // Fallback for some components
                                                                },
                                                                appointmentData: {
                                                                    department: visit.department,
                                                                    doctor: visit.doctor_name,
                                                                    date: new Date().toLocaleDateString(),
                                                                    time: new Date().toLocaleTimeString(),
                                                                    token_number: visit.token_number,
                                                                    consultation_fee: 500 // Default or fetch from config
                                                                }
                                                            });
                                                            setShowReceiptModal(true);
                                                        }}
                                                        title="Print Receipt"
                                                    >
                                                        <Printer size={16} />
                                                    </Button>
                                                    <Button 
                                                        variant="outline-warning" 
                                                        size="sm" 
                                                        className="opacity-75 hover-opacity-100"
                                                        onClick={() => {
                                                            setSelectedPatientForInsurance({ id: visit.patient_id, name: visit.patient_name });
                                                            setShowInsuranceModal(true);
                                                        }}
                                                        title="General Insurance"
                                                    >
                                                        <Shield size={16} />
                                                    </Button>
                                                    {/* PMJAY Verification Button */}
                                                    <Button 
                                                        variant="success" 
                                                        size="sm" 
                                                        className="opacity-75 hover-opacity-100"
                                                        onClick={() => {
                                                            setSelectedPatientForPMJAY({ 
                                                                id: visit.patient_id, 
                                                                name: visit.patient_name,
                                                                phone: visit.phone 
                                                            });
                                                            setShowPMJAYModal(true);
                                                        }}
                                                        title="PMJAY Ayushman Verification"
                                                        style={{ 
                                                            background: 'linear-gradient(135deg, #059669 0%, #34d399 100%)', 
                                                            border: 'none' 
                                                        }}
                                                    >
                                                        <Heart size={16} /> PMJAY
                                                    </Button>
                                                    <Button variant={isDark ? "outline-light" : "outline-dark"} size="sm" className="opacity-50 hover-opacity-100" onClick={() => handleEditClick(visit)}>
                                                        <Edit size={16} /> Edit
                                                    </Button>
                                                    <Button variant="outline-primary" size="sm" className="opacity-50 hover-opacity-100" onClick={() => handleRescheduleClick(visit)}>
                                                        <Clock size={16} /> Reschedule
                                                    </Button>
                                                    <Button variant="outline-danger" size="sm" className="opacity-50 hover-opacity-100" onClick={() => handleCancelClick(visit)}>
                                                        <X size={16} /> Cancel
                                                    </Button>
                                                    <Badge bg={visit.status === 'Waiting' ? 'warning' : 'success'} className="px-3 py-2 rounded-pill">
                                                        {visit.status.toUpperCase()}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </GlassCard>
                                    ))}
                                {queue.length === 0 && (
                                    <div className={`text-center py-5 ${subTextColor}`}>
                                        <h4 className="fw-light">No patients waiting</h4>
                                        <p>Enjoy the calm!</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </Col>

                {/* RIGHT: ROSTER & QUICK STATS */}
                <Col lg={4} className="d-flex flex-column gap-4">
                    {/* DOCTOR ROSTER */}
                    <GlassCard className="flex-grow-1 overflow-hidden d-flex flex-column" isDark={isDark}>
                        <h5 className={`fw-bold mb-3 border-bottom pb-3 ${borderColor}`}>Doctor Availability</h5>
                        <div className="overflow-auto custom-scrollbar flex-grow-1 pe-2">
                            {doctors.map(doc => (
                                <div key={doc.id} className={`d-flex align-items-center gap-3 mb-3 p-2 rounded-3 ${isDark ? 'hover-bg-white-10' : 'hover-bg-dark-10'}`}>
                                    <div className="d-flex align-items-center justify-content-center rounded-circle bg-gradient-primary text-white fw-bold shadow-sm"
                                        style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}>
                                        {getInitials(doc.username)}
                                    </div>
                                    <div className="flex-grow-1">
                                        <div className={`fw-bold ${textColor}`}>{doc.username}</div>
                                        <div className={`small text-uppercase d-flex align-items-center gap-1 ${subTextColor}`}>
                                            <Monitor size={10} /> Room {doc.room_number || 'OPD'}
                                        </div>
                                    </div>
                                    <Badge bg="success" className="d-flex align-items-center gap-1">
                                        <span className="spinner-grow spinner-grow-sm" style={{ width: '6px', height: '6px' }} /> On Duty
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </GlassCard>

                    {/* ALERTS / NOTICES */}
                    <GlassCard isDark={isDark}>
                        <h6 className="fw-bold mb-3 text-warning"><AlertCircle size={18} className="me-2" /> Hospital Notices</h6>
                        <ul className={`list-unstyled small mb-0 d-grid gap-2 ${subTextColor}`}>
                            <li className="d-flex gap-2">
                                <span className="text-warning">•</span> Emergency Ward at 80% capacity.
                            </li>
                            <li className="d-flex gap-2">
                                <span className="text-info">•</span> Dr. Sharma (Cardio) delayed by 30 mins.
                            </li>
                        </ul>
                    </GlassCard>
                </Col>
            </Row>

            {/* MODALS */}
            <PatientRegistrationModal
                show={showModal}
                onHide={() => { setShowModal(false); setSelectedPatient(null); }}
                onRegister={handleRegister}
                existingPatient={selectedPatient}
            />
            <EditPatientModal
                show={showEditModal}
                onHide={() => setShowEditModal(false)}
                patient={patientToEdit}
                onSave={() => { fetchQueue(); alert('Patient updated!'); }}
            />
            <RefundConfirmationModal
                show={showRefundModal}
                onHide={() => setShowRefundModal(false)}
                visit={visitToCancel}
                onConfirm={handleRefundConfirm}
            />
            <RescheduleModal
                show={showRescheduleModal}
                onHide={() => setShowRescheduleModal(false)}
                visit={visitToReschedule}
                onConfirm={handleRescheduleConfirm}
            />

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.05); }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2); border-radius: 10px; }
                .hover-scale:hover { transform: translateY(-2px); border-color: rgba(0,0,0,0.1) !important; background: rgba(0,0,0,0.05) !important; }
                .hover-bg-white-10:hover { background: rgba(255,255,255,0.05); }
                .hover-bg-dark-10:hover { background: rgba(0,0,0,0.05); }
            `}</style>

            {/* Patient Profile Modal */}
            <PatientProfileModal
                show={showProfileModal}
                onHide={() => setShowProfileModal(false)}
                patientId={selectedPatientId}
            />
            
            {/* Insurance Verification Modal - Gold Standard Phase 2 */}
            <InsuranceVerificationModal
                show={showInsuranceModal}
                onHide={() => setShowInsuranceModal(false)}
                patientId={selectedPatientForInsurance?.id}
                patientName={selectedPatientForInsurance?.name}
                onVerified={(data) => console.log('Insurance verified:', data)}
            />

            {/* PMJAY Verification Modal */}
            <PMJAYVerificationModal
                show={showPMJAYModal}
                onHide={() => setShowPMJAYModal(false)}
                patientData={selectedPatientForPMJAY}
                isDark={isDark}
                onVerified={(pmjayData) => {
                    console.log('PMJAY Verified:', pmjayData);
                    alert(`✅ PMJAY Verified!\nID: ${pmjayData.pmjayId}\nBalance: ₹${(pmjayData.balance - (pmjayData.usedAmount || 0)).toLocaleString()}`);
                    fetchQueue(); // Refresh queue
                }}
            />

            {/* VMS Integration */}
            <VisitorPassModal 
                show={showVisitorModal}
                onHide={() => setShowVisitorModal(false)}
            />

            <RegistrationReceipt
                show={showReceiptModal}
                onHide={() => setShowReceiptModal(false)}
                patientData={selectedReceiptData?.patientData}
                appointmentData={selectedReceiptData?.appointmentData}
            />
        </Container>
    );
};

export default OPDReception;
