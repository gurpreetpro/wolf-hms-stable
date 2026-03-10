import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Tabs, Tab, Row, Col, Alert, InputGroup, Badge, Spinner } from 'react-bootstrap';
import { Search, User, CheckCircle, Upload, FileText, Sparkles, ScanLine, Shield, CreditCard } from 'lucide-react';
import api from '../utils/axiosInstance';
import RegistrationReceipt from './RegistrationReceipt';
import InsuranceVerifier from './InsuranceVerifier';
import ABHALinker from './ABHALinker';
import PaymentModal from './PaymentModal';

const PatientRegistrationModal = ({ show, onHide, onRegister, existingPatient = null }) => {
    const [doctors, setDoctors] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        dob: '',
        gender: 'Male',
        phone: '',
        address: '',
        complaint: '',
        allergies: '',
        insuranceProvider: '',
        policyNumber: '',
        doctor_id: ''
    });
    const [vitalsData, setVitalsData] = useState({
        bp: '',
        temp: '',
        spo2: '',
        heart_rate: ''
    });
    // Payment State (Phase 7)
    const [paymentData, setPaymentData] = useState({
        amount: '500', // Default consultation fee
        mode: 'Cash',
        transactionId: ''
    });
    // Document State (Phase 3)
    const [selectedFile, setSelectedFile] = useState(null);
    const [docType, setDocType] = useState('ID Proof');

    // AI Feature States (Phase 4)
    const [aiTriageLoading, setAiTriageLoading] = useState(false);
    const [aiTriageResult, setAiTriageResult] = useState(null);
    const [aiOcrLoading, setAiOcrLoading] = useState(false);
    const [ocrFile, setOcrFile] = useState(null);

    const [error, setError] = useState('');

    // Smart Search States
    const [uidSearch, setUidSearch] = useState('');
    const [isExistingPatient, setIsExistingPatient] = useState(false);
    const [foundPatientId, setFoundPatientId] = useState(null);
    const [searchStatus, setSearchStatus] = useState(''); // 'searching', 'found', 'not-found'

    // Receipt Modal States
    const [showReceipt, setShowReceipt] = useState(false);
    const [registeredPatient, setRegisteredPatient] = useState(null);
    const [appointmentDetails, setAppointmentDetails] = useState(null);

    // Phase 7+ Integration States
    const [showInsuranceVerifier, setShowInsuranceVerifier] = useState(false);
    const [showABHALinker, setShowABHALinker] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [verifiedInsurance, setVerifiedInsurance] = useState(null);
    const [linkedABHA, setLinkedABHA] = useState(null);

    // Fetch doctors on mount
    // useEffect moved to bottom

    const fetchDoctors = async () => {
        try {
            console.log('Fetching doctors...');
            const res = await api.get('/api/auth/users');
            console.log('Users response:', res.data);

            const rawList = res.data.data || res.data;
            const userList = Array.isArray(rawList) ? rawList : [];

            let doctorList = userList.filter(u => u.role === 'doctor' && u.is_active);
            console.log('Filtered doctors:', doctorList);

            if (doctorList.length === 0) {
                console.warn('No doctors found directly. Checking for string mismatches...');
                // Fallback: Check if role contains 'doctor' (case insensitive or slight variation)
                doctorList = userList.filter(u => u.role && u.role.toLowerCase().includes('doctor') && u.is_active);

                // DEMO MODE FALLBACK: If still empty and demo mode active, inject Dr. Demo
                if (doctorList.length === 0 && localStorage.getItem('demoActive') === 'true') {
                    console.log('Injecting Dr. Demo fallback');
                    // Try to find Dr. Demo in response even if role mismatch
                    const knownDemo = userList.find(u => u.username.includes('Dr. Demo'));
                    if (knownDemo) {
                        doctorList = [knownDemo];
                    } else {
                        // Manual injection as last resort
                        doctorList = [{
                            id: 405, // Assuming generic ID, or we fetch from API response ideally
                            username: 'Dr. Demo (Medicine)',
                            role: 'doctor',
                            is_active: true
                        }];
                    }
                }
            }

            setDoctors(doctorList);
        } catch (err) {
            console.error('Failed to fetch doctors:', err);
            setDoctors([]);
        }
    };

    const loadExistingPatient = (patient) => {
        setFormData(prev => ({
            ...prev,
            name: patient.name,
            dob: patient.dob ? new Date(patient.dob).toISOString().split('T')[0] : '',
            gender: patient.gender || 'Male',
            phone: patient.phone,
            address: patient.address || '',
            allergies: patient.history_json?.allergies || ''
        }));
        setIsExistingPatient(true);
        setFoundPatientId(patient.id);
        setSearchStatus('found');
    };

    const resetForm = () => {
        setFormData({
            name: '', dob: '', gender: 'Male', phone: '', address: '',
            complaint: '', allergies: '', insuranceProvider: '', policyNumber: '', doctor_id: ''
        });
        setUidSearch('');
        setIsExistingPatient(false);
        setFoundPatientId(null);
        setSearchStatus('');
        setError('');
        setVitalsData({ bp: '', temp: '', spo2: '', heart_rate: '' });
        setPaymentData({ amount: '500', mode: 'Cash', transactionId: '' });
        setSelectedFile(null);
        setDocType('ID Proof');
    };

    const handleSmartSearch = async () => {
        if (!uidSearch || uidSearch.length < 3) {
            setError('Please enter at least 3 characters (Phone, UID, or Name)');
            return;
        }

        setSearchStatus('searching');
        setError('');

        try {
            const res = await api.get(`/api/patients/search?q=${uidSearch}`);

            // Handle API response format: { success: true, data: [...] } or direct array
            const patients = res.data?.data || res.data || [];
            const patientList = Array.isArray(patients) ? patients : [];

            if (patientList.length > 0) {
                // Patient Found - Auto-Fill
                const patient = patientList[0]; // Take first match
                loadExistingPatient(patient);
                setError(''); // Clear any errors
            } else {
                // Not Found - Allow Manual Entry
                setSearchStatus('not-found');
                setIsExistingPatient(false);
                setFoundPatientId(null);
                setFormData(prev => ({
                    ...prev,
                    phone: uidSearch.match(/^\d{10}$/) ? uidSearch : prev.phone // Auto-fill phone if 10 digits
                }));
            }
        } catch (err) {
            console.error('Search error:', err);
            setError('Search failed. Please try again.');
            setSearchStatus('');
        }
    };


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
        setError('');
        
        // Auto-update consultation fee when doctor is selected
        if (name === 'doctor_id' && value) {
            const selectedDoctor = doctors.find(d => d.id === parseInt(value));
            if (selectedDoctor && selectedDoctor.consultation_fee) {
                setPaymentData(prev => ({ ...prev, amount: String(selectedDoctor.consultation_fee) }));
            }
        }
    };

    const handleVitalsChange = (e) => {
        setVitalsData({ ...vitalsData, [e.target.name]: e.target.value });
    };

    // Remediation Phase 1: Emergency & Visit Types
    const [isEmergency, setIsEmergency] = useState(false);
    const [visitType, setVisitType] = useState('New Visit'); // 'New Visit', 'Follow-up', 'Emergency'

    const handleVisitTypeChange = (e) => {
        const type = e.target.value;
        setVisitType(type);
        
        // Auto-update Amount logic
        if (type === 'Follow-up') {
            setPaymentData(prev => ({ ...prev, amount: '0', mode: 'Free' }));
        } else if (type === 'Emergency') {
            setIsEmergency(true);
            setPaymentData(prev => ({ ...prev, amount: '1000' })); // Emergency Flat Fee example
        } else {
             // Reset to Doctor Fee
             if (formData.doctor_id) {
                const doc = doctors.find(d => d.id === parseInt(formData.doctor_id));
                if (doc) setPaymentData(prev => ({ ...prev, amount: String(doc.consultation_fee || 500), mode: 'Cash' }));
             }
             setIsEmergency(false);
        }
    };

    const toggleEmergency = () => {
        const newState = !isEmergency;
        setIsEmergency(newState);
        if (newState) {
            setVisitType('Emergency');
            setPaymentData(prev => ({ ...prev, amount: '1000', mode: 'Cash' }));
            setFormData(prev => ({ ...prev, complaint: 'EMERGENCY TRAUMA' }));
        } else {
            setVisitType('New Visit');
            setFormData(prev => ({ ...prev, complaint: '' }));
        }
    };

    const handlePaymentChange = (e) => {
        const { name, value } = e.target;
        // Auto-set amount to 0 when Free mode is selected
        if (name === 'mode' && value.toLowerCase() === 'free') {
            setPaymentData({ ...paymentData, mode: value, amount: '0' });
        } else {
            setPaymentData({ ...paymentData, [name]: value });
        }
    };

    // AI Triage Handler
    const handleAiTriage = async () => {
        if (!formData.complaint || formData.complaint.length < 5) {
            setError('Please enter a complaint (at least 5 characters) for AI analysis.');
            return;
        }
        setAiTriageLoading(true);
        setError('');
        try {
            const res = await api.post('/api/ai/triage', { complaint: formData.complaint });
            setAiTriageResult(res.data);
            // Auto-select doctor based on suggested department
            const suggestedDoc = doctors.find(d => d.department?.toLowerCase().includes(res.data.department?.toLowerCase()));
            if (suggestedDoc) {
                setFormData(prev => ({ ...prev, doctor_id: suggestedDoc.id.toString() }));
            }
        } catch (err) {
            console.error('AI Triage Error:', err);
            setError('AI analysis failed. Please try again.');
        } finally {
            setAiTriageLoading(false);
        }
    };

    // AI OCR Handler
    const handleAiOcr = async () => {
        if (!ocrFile) {
            setError('Please select an ID card image for OCR.');
            return;
        }
        setAiOcrLoading(true);
        setError('');
        try {
            const formDataUpload = new FormData();
            formDataUpload.append('idCard', ocrFile);
            const res = await api.post('/api/ai/extract-id', formDataUpload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            // Auto-fill extracted data
            if (res.data) {
                setFormData(prev => ({
                    ...prev,
                    name: res.data.name || prev.name,
                    phone: res.data.phone || prev.phone,
                    address: res.data.address || prev.address,
                    gender: res.data.gender || prev.gender
                }));
                // Calculate age from DOB if present
                if (res.data.dob) {
                    const birthYear = new Date(res.data.dob).getFullYear();
                    const currentYear = new Date().getFullYear();
                    setFormData(prev => ({ ...prev, age: (currentYear - birthYear).toString() }));
                }
            }
        } catch (err) {
            console.error('AI OCR Error:', err);
            setError('OCR failed. Ensure image is clear and try again.');
        } finally {
            setAiOcrLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.doctor_id) {
            setError('Please select a doctor');
            return;
        }

        try {

            const payload = {
                name: formData.name,
                dob: formData.dob,
                gender: formData.gender,
                phone: formData.phone,
                complaint: formData.complaint,
                doctor_id: parseInt(formData.doctor_id),
                paymentDetails: paymentData, // Send payment info
                consultation_type: visitType // Remediation Phase 1
            };

            // If existing patient, include patient_id
            if (isExistingPatient && foundPatientId) {
                payload.patient_id = foundPatientId;
            }

            const res = await api.post('/api/opd/register', payload);

            // Use data from API response (includes UHID and doctor_name)
            // [FIX] Unwrap correctly: res.data is the axios body, res.data.data is the actual payload from ResponseHandler
            const responseData = res.data.data || res.data; 
            const apiPatient = responseData.patient || {};
            const apiVisit = responseData.visit || {};
            const apiToken = responseData.token;

            // Prepare patient data for receipt - prioritize API response data
            const patientForReceipt = {
                id: apiPatient.id,
                uhid: apiPatient.uhid,  // UHID from backend
                patient_number: apiPatient.uhid, // Fallback field
                name: apiPatient.name || formData.name,
                gender: apiPatient.gender || formData.gender,
                phone: apiPatient.phone || formData.phone,
                dob: apiPatient.dob || formData.dob
            };

            // Find selected doctor name from local list as fallback
            const selectedDoctor = doctors.find(d => d.id === parseInt(formData.doctor_id));

            // Prepare appointment details for receipt - use API response for doctor_name
            const appointmentForReceipt = {
                department: 'OPD',
                doctor: apiVisit.doctor_name || selectedDoctor?.username || 'Assigned Doctor',
                doctor_name: apiVisit.doctor_name || selectedDoctor?.username, // Alternative field
                token_number: apiToken,
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                complaint: formData.complaint,
                consultation_fee: paymentData.amount,
                payment_mode: paymentData.mode,
                visit_type: visitType // Remediation Phase 1
            };

            setRegisteredPatient(patientForReceipt);
            setAppointmentDetails(appointmentForReceipt);
            setShowReceipt(true);

            onRegister(res.data);


            // 2. Log Vitals if provider (Optional)
            const hasVitals = Object.values(vitalsData).some(val => val !== '');
            if (hasVitals && res.data.patient?.id) {
                try {
                    await api.post('/api/clinical/vitals', {
                        patient_id: res.data.patient.id,
                        admission_id: null,
                        ...vitalsData
                    });
                    console.log('Vitals logged via reception triage');
                } catch (vitalsErr) {
                    console.error('Failed to log triage vitals:', vitalsErr);
                    // Don't block the main success flow, just warn
                }
            }

            // 3. Upload Document (Phase 3)
            if (selectedFile && res.data.patient?.id) {
                try {
                    const docFormData = new FormData();
                    docFormData.append('patient_id', res.data.patient.id);
                    docFormData.append('document_type', docType);
                    docFormData.append('document', selectedFile);

                    await api.post('/api/opd/upload-document', docFormData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    console.log('Document uploaded successfully');
                } catch (docErr) {
                    console.error('Failed to upload document:', docErr);
                    // Non-blocking warning
                }
            }

            // Don't hide yet - let user print receipt first
            resetForm();
        } catch (err) {
            console.error('Registration error:', err);
            setError(err.response?.data?.message || 'Registration Failed. Please check all fields.');
        }
    };

    const handleReceiptClose = () => {
        setShowReceipt(false);
        setRegisteredPatient(null);
        setAppointmentDetails(null);
        onHide();
    };


    // Moved to bottom to fix no-use-before-define
    useEffect(() => {
        if (show) {
            fetchDoctors();
            if (existingPatient) {
                loadExistingPatient(existingPatient);
            } else {
                resetForm();
            }
        }
    }, [show, existingPatient]);

    return (
        <>
            <Modal show={show && !showReceipt} onHide={onHide} fullscreen={true} aria-labelledby="patient-registration-modal">
                <Modal.Header closeButton>
                    <Modal.Title>
                        {isExistingPatient ? (
                            <span className="d-flex align-items-center gap-2">
                                <CheckCircle size={24} className="text-success" />
                                Returning Patient - Generate Token
                            </span>
                        ) : (
                            'New Patient Registration'
                        )}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        {error && <Alert variant="danger">{error}</Alert>}

                        {/* Smart Search Section */}
                        <div className="mb-4 p-3 bg-light rounded border">
                            <h6 className="fw-bold mb-3">
                                <Search size={18} className="me-2" />
                                Quick Patient Retrieval
                            </h6>
                            <InputGroup>
                                <Form.Control
                                    placeholder="Search by Phone Number or UID..."
                                    value={uidSearch}
                                    onChange={(e) => setUidSearch(e.target.value)}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSmartSearch();
                                        }
                                    }}
                                    disabled={isExistingPatient}
                                />
                                <Button
                                    variant="primary"
                                    onClick={handleSmartSearch}
                                    disabled={searchStatus === 'searching' || isExistingPatient}
                                >
                                    <Search size={16} className="me-1" />
                                    {searchStatus === 'searching' ? 'Searching...' : 'Search'}
                                </Button>
                                {isExistingPatient && (
                                    <Button
                                        variant="outline-secondary"
                                        onClick={resetForm}
                                    >
                                        Clear
                                    </Button>
                                )}
                            </InputGroup>
                            {searchStatus === 'not-found' && (
                                <small className="text-muted d-block mt-2">
                                    ⚠️ No patient found. You can proceed with new registration below.
                                </small>
                            )}
                            {isExistingPatient && (
                                <Alert variant="success" className="mt-2 mb-0 py-2">
                                    <strong>Patient Found!</strong> Details auto-filled. Name and DOB are locked (permanent records).
                                </Alert>
                            )}
                        </div>

                        {/* Phase 1: Emergency Toggle & Visit Type */}
                        <div className="d-flex justify-content-between align-items-center mb-4 p-3 rounded" style={{ background: isEmergency ? '#fee2e2' : '#f8f9fa' }}>
                            <div className="d-flex align-items-center gap-3">
                                <Form.Check 
                                    type="switch"
                                    id="emergency-switch"
                                    label={<span className={`fw-bold ${isEmergency ? 'text-danger' : 'text-dark'}`}>🚨 EMERGENCY MODE</span>}
                                    checked={isEmergency}
                                    onChange={toggleEmergency}
                                    className="fs-5"
                                />
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <span className="small fw-bold text-muted">Visit Type:</span>
                                <Form.Select 
                                    size="sm" 
                                    style={{ width: '150px' }}
                                    value={visitType}
                                    onChange={handleVisitTypeChange}
                                    className={isEmergency ? 'border-danger text-danger fw-bold' : ''}
                                >
                                    <option value="New Visit">New Visit (Paid)</option>
                                    <option value="Follow-up">Follow-up (Free)</option>
                                    <option value="Review">Review (Partial)</option>
                                    <option value="Emergency">Emergency</option>
                                </Form.Select>
                            </div>
                        </div>

                        <Tabs defaultActiveKey="demographics" className="mb-3">
                            <Tab eventKey="demographics" title="Demographics">
                                <Row>
                                    <Col md={8}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Full Name *</Form.Label>
                                            <Form.Control
                                                name="name"
                                                value={formData.name}
                                                onChange={handleChange}
                                                required
                                                disabled={isExistingPatient}
                                                className={isExistingPatient ? 'bg-light' : ''}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Date of Birth *</Form.Label>
                                            <Form.Control
                                                type="date"
                                                name="dob"
                                                value={formData.dob}
                                                onChange={handleChange}
                                                required
                                                disabled={isExistingPatient}
                                                className={isExistingPatient ? 'bg-light' : ''}
                                                max={new Date().toISOString().split('T')[0]}
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Gender *</Form.Label>
                                            <Form.Select
                                                name="gender"
                                                value={formData.gender}
                                                onChange={handleChange}
                                                disabled={isExistingPatient}
                                                className={isExistingPatient ? 'bg-light' : ''}
                                            >
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Other">Other</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Phone Number *</Form.Label>
                                            <Form.Control
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                required
                                                disabled={isExistingPatient}
                                                className={isExistingPatient ? 'bg-light' : ''}
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                {/* Doctor Selection - Moved here for visibility */}
                                <Form.Group className="mb-3">
                                    <Form.Label className="fw-bold text-primary">Assign Doctor * <Badge bg="danger" className="ms-1">Required</Badge></Form.Label>
                                    <Form.Select
                                        name="doctor_id"
                                        value={formData.doctor_id}
                                        onChange={handleChange}
                                        required
                                        className={!formData.doctor_id ? 'border-danger' : 'border-success'}
                                    >
                                        <option value="">-- Select Doctor --</option>
                                        {doctors.map(doc => (
                                            <option key={doc.id} value={doc.id}>{doc.username}</option>
                                        ))}
                                    </Form.Select>
                                    {!formData.doctor_id && (
                                        <Form.Text className="text-danger">
                                            ⚠️ Please select a doctor to proceed
                                        </Form.Text>
                                    )}
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Address</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        name="address"
                                        value={formData.address}
                                        onChange={handleChange}
                                        disabled={isExistingPatient}
                                        className={isExistingPatient ? 'bg-light' : ''}
                                    />
                                </Form.Group>
                            </Tab>

                            <Tab eventKey="medical" title="Medical Info (Optional)">
                                <Form.Group className="mb-3">
                                    <Form.Label>Chief Complaint</Form.Label>
                                    <Form.Control
                                        as="textarea"
                                        rows={3}
                                        name="complaint"
                                        value={formData.complaint}
                                        onChange={handleChange}
                                        placeholder="Describe the reason for visit (optional)..."
                                    />
                                </Form.Group>

                                {/* AI Triage Button */}
                                <div className="d-flex align-items-center gap-2 mb-3">
                                    <Button
                                        variant="outline-info"
                                        size="sm"
                                        onClick={handleAiTriage}
                                        disabled={aiTriageLoading || !formData.complaint}
                                    >
                                        {aiTriageLoading ? (
                                            <><Spinner size="sm" className="me-1" /> Analyzing...</>
                                        ) : (
                                            <><Sparkles size={14} className="me-1" /> AI Suggest Doctor</>
                                        )}
                                    </Button>
                                    {aiTriageResult && (
                                        <Badge bg={aiTriageResult.priority === 'High' || aiTriageResult.priority === 'Critical' ? 'danger' : 'success'}>
                                            {aiTriageResult.department} ({aiTriageResult.priority})
                                        </Badge>
                                    )}
                                </div>

                                <Form.Group className="mb-3">
                                    <Form.Label>Known Allergies</Form.Label>
                                    <Form.Control
                                        name="allergies"
                                        value={formData.allergies}
                                        onChange={handleChange}
                                        placeholder="e.g., Penicillin, Peanuts"
                                    />
                                </Form.Group>
                            </Tab>

                            {!isEmergency && (
                                <Tab eventKey="insurance" title="🛡️ Insurance & ABHA">
                                <Alert variant="info" className="py-2 mb-3">
                                    <small><Shield size={14} className="me-1" /> Link insurance policy or ABHA for cashless treatment and health record sharing.</small>
                                </Alert>

                                {/* ABHA Section */}
                                <div className="p-3 bg-light rounded mb-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span className="fw-bold">
                                            <Shield size={16} className="me-2 text-primary" />
                                            ABHA (Ayushman Bharat Health Account)
                                        </span>
                                        {linkedABHA && (
                                            <Badge bg="success">
                                                <CheckCircle size={12} className="me-1" />
                                                Linked
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="small text-muted mb-2">
                                        Link ABHA number for digital health records and interoperability.
                                    </p>
                                    <Button
                                        variant={linkedABHA ? "outline-success" : "outline-primary"}
                                        size="sm"
                                        onClick={() => setShowABHALinker(true)}
                                        disabled={!isExistingPatient && !foundPatientId}
                                    >
                                        <Shield size={14} className="me-1" />
                                        {linkedABHA ? 'View ABHA' : 'Link ABHA Number'}
                                    </Button>
                                    {!isExistingPatient && !foundPatientId && (
                                        <small className="text-muted d-block mt-1">Save patient first to link ABHA</small>
                                    )}
                                </div>

                                {/* Insurance Section */}
                                <div className="p-3 bg-light rounded mb-3">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span className="fw-bold">
                                            <CreditCard size={16} className="me-2 text-success" />
                                            Insurance / TPA Verification
                                        </span>
                                        {verifiedInsurance && (
                                            <Badge bg="success">
                                                <CheckCircle size={12} className="me-1" />
                                                Verified
                                            </Badge>
                                        )}
                                    </div>
                                    <Row className="mb-2">
                                        <Col md={6}>
                                            <Form.Group className="mb-2">
                                                <Form.Label className="small">Insurance Provider</Form.Label>
                                                <Form.Control
                                                    size="sm"
                                                    name="insuranceProvider"
                                                    value={formData.insuranceProvider}
                                                    onChange={handleChange}
                                                    placeholder="e.g., Medi Assist, Paramount"
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group className="mb-2">
                                                <Form.Label className="small">Policy Number</Form.Label>
                                                <Form.Control
                                                    size="sm"
                                                    name="policyNumber"
                                                    value={formData.policyNumber}
                                                    onChange={handleChange}
                                                    placeholder="Policy number"
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                    <Button
                                        variant={verifiedInsurance ? "outline-success" : "success"}
                                        size="sm"
                                        onClick={() => setShowInsuranceVerifier(true)}
                                        disabled={!isExistingPatient && !foundPatientId}
                                    >
                                        <CreditCard size={14} className="me-1" />
                                        {verifiedInsurance ? 'View Policy Details' : 'Verify & Link Insurance'}
                                    </Button>
                                </div>

                                {verifiedInsurance && (
                                    <Alert variant="success" className="py-2">
                                        <strong>Insurance Verified:</strong> {verifiedInsurance.providerName}<br />
                                        <small>Sum Insured: ₹{verifiedInsurance.sumInsured?.toLocaleString()} | Balance: ₹{verifiedInsurance.availableBalance?.toLocaleString()}</small>
                                    </Alert>
                                )}
                            </Tab>
                            )}

                            <Tab eventKey="vitals" title="⚡ Triage Vitals (Optional)">
                                <Alert variant="info" className="py-2">
                                    <small>Enter triage values if available. These will be sent directly to the doctor.</small>
                                </Alert>
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Blood Pressure (Beats/Min)</Form.Label>
                                            <Form.Control
                                                name="bp"
                                                value={vitalsData.bp}
                                                onChange={handleVitalsChange}
                                                placeholder="e.g. 120/80"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Temperature (°F)</Form.Label>
                                            <Form.Control
                                                type="number"
                                                name="temp"
                                                value={vitalsData.temp}
                                                onChange={handleVitalsChange}
                                                placeholder="e.g. 98.6"
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>SpO2 (%)</Form.Label>
                                            <Form.Control
                                                type="number"
                                                name="spo2"
                                                value={vitalsData.spo2}
                                                onChange={handleVitalsChange}
                                                placeholder="e.g. 98"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Heart Rate (BPM)</Form.Label>
                                            <Form.Control
                                                type="number"
                                                name="heart_rate"
                                                value={vitalsData.heart_rate}
                                                onChange={handleVitalsChange}
                                                placeholder="e.g. 72"
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                            </Tab>

                            <Tab eventKey="billing" title="💳 Billing (Required)">
                                <Alert variant="success" className="py-2 mb-3">
                                    <small>Collect consultation fee before generating token.</small>
                                </Alert>
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="fw-bold">Consultation Fee (₹)</Form.Label>
                                            <Form.Control
                                                type="number"
                                                name="amount"
                                                value={paymentData.amount}
                                                onChange={handlePaymentChange}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="fw-bold">Payment Mode</Form.Label>
                                            <Form.Select
                                                name="mode"
                                                value={paymentData.mode}
                                                onChange={handlePaymentChange}
                                            >
                                                <option value="Cash">Cash 💵</option>
                                                <option value="Card">Card 💳</option>
                                                <option value="UPI">UPI 📱</option>
                                                <option value="Insurance">Insurance 🛡️</option>
                                                <option value="Free">Free / Charity 🆓</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    {(paymentData.mode === 'Card' || paymentData.mode === 'UPI') && (
                                        <Col md={12}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Transaction Ref / ID</Form.Label>
                                                <Form.Control
                                                    name="transactionId"
                                                    value={paymentData.transactionId}
                                                    onChange={handlePaymentChange}
                                                    placeholder="e.g. UPI Ref Number"
                                                />
                                            </Form.Group>
                                        </Col>
                                    )}
                                </Row>
                            </Tab>
                            <Tab eventKey="documents" title="📂 Documents">
                                <Alert variant="secondary" className="py-2 mb-3">
                                    <small>Upload ID Proof, Insurance Card, or Previous Reports.</small>
                                </Alert>
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Document Type</Form.Label>
                                            <Form.Select
                                                value={docType}
                                                onChange={(e) => setDocType(e.target.value)}
                                            >
                                                <option>ID Proof (Aadhar/PAN)</option>
                                                <option>Insurance Card</option>
                                                <option>Previous Report</option>
                                                <option>Referral Letter</option>
                                                <option>Other</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Select File</Form.Label>
                                            <Form.Control
                                                type="file"
                                                onChange={(e) => setSelectedFile(e.target.files[0])}
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                {selectedFile && (
                                    <div className="text-success small mb-3">
                                        <FileText size={14} className="me-1" />
                                        Selected: {selectedFile.name}
                                    </div>
                                )}

                                {/* AI OCR Section */}
                                <hr className="my-3" />
                                <Alert variant="info" className="py-2">
                                    <small><ScanLine size={14} className="me-1" /> <strong>AI Auto-Fill:</strong> Upload an ID card and let AI extract patient details.</small>
                                </Alert>
                                <Row>
                                    <Col md={7}>
                                        <Form.Control
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setOcrFile(e.target.files[0])}
                                        />
                                    </Col>
                                    <Col md={5}>
                                        <Button
                                            variant="success"
                                            onClick={handleAiOcr}
                                            disabled={aiOcrLoading || !ocrFile}
                                            className="w-100"
                                        >
                                            {aiOcrLoading ? (
                                                <><Spinner size="sm" className="me-1" /> Extracting...</>
                                            ) : (
                                                <><ScanLine size={16} className="me-1" /> Auto-fill from ID</>
                                            )}
                                        </Button>
                                    </Col>
                                </Row>
                            </Tab>
                        </Tabs>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={onHide}>Cancel</Button>
                        <Button variant="primary" type="submit">
                            {isExistingPatient ? '🎫 Generate Token for Existing Patient' : '📝 Register & Generate Token'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Registration Receipt Modal */}
            <RegistrationReceipt
                show={showReceipt}
                onHide={handleReceiptClose}
                patientData={registeredPatient}
                appointmentData={appointmentDetails}
            />

            {/* Insurance Verifier Modal */}
            <InsuranceVerifier
                show={showInsuranceVerifier}
                onHide={() => setShowInsuranceVerifier(false)}
                patient={isExistingPatient ? { patient_id: foundPatientId, name: formData.name } : null}
                onInsuranceLinked={(insurance) => {
                    setVerifiedInsurance(insurance);
                    setShowInsuranceVerifier(false);
                }}
            />

            {/* ABHA Linker Modal */}
            <ABHALinker
                show={showABHALinker}
                onHide={() => setShowABHALinker(false)}
                patient={isExistingPatient ? { patient_id: foundPatientId, name: formData.name } : null}
                onABHALinked={(abha) => {
                    setLinkedABHA(abha);
                    setShowABHALinker(false);
                }}
            />

            {/* Payment Modal */}
            <PaymentModal
                show={showPaymentModal}
                onHide={() => setShowPaymentModal(false)}
                invoiceData={{
                    amount: parseFloat(paymentData.amount),
                    description: `OPD Consultation - ${formData.name}`
                }}
                onPaymentComplete={(payment) => {
                    setPaymentData(prev => ({
                        ...prev,
                        mode: 'Online',
                        transactionId: payment.payment_id
                    }));
                    setShowPaymentModal(false);
                }}
            />
        </>
    );
};

export default PatientRegistrationModal;
