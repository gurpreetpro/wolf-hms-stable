import React, { useMemo } from 'react';
import { Modal, Button, Row, Col, Badge, Table } from 'react-bootstrap';
import { Printer, Download, CheckCircle, Calendar, Phone, User, Clock, MapPin, CreditCard } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import useHospitalProfile from '../hooks/useHospitalProfile';
import '../styles/print.css';

// Generate deterministic token based on patient data
const generateToken = (patientId, timestamp) => {
    const date = new Date(timestamp || Date.now());
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const unique = patientId ? String(patientId).replace(/\//g, '').slice(-4).padStart(4, '0') : '0001';
    return `TKN-${year}${month}${day}-${unique}`;
};

const RegistrationReceipt = ({ show, onHide, patientData, appointmentData }) => {
    // Get hospital profile for dynamic branding
    const { hospitalProfile, getFormattedAddress, getContactString } = useHospitalProfile();

    // Generate token deterministically based on patient data
    const tokenNumber = useMemo(() => {
        if (!patientData) return '';
        return appointmentData?.token_number || generateToken(patientData.id || patientData.patient_number);
    }, [patientData, appointmentData?.token_number]);

    const currentDate = useMemo(() => new Date(), []);

    // QR code will encode patient ID for scanning
    const qrData = useMemo(() => {
        if (!patientData) return '';
        const pid = patientData.uhid || patientData.patient_number || patientData.id;
        return JSON.stringify({
            patientId: pid,
            name: patientData.name,
            token: tokenNumber,
            hospital: hospitalProfile?.name || 'Hospital'
        });
    }, [patientData, tokenNumber, hospitalProfile?.name]);

    const handlePrint = () => window.print();

    if (!patientData) return null;

    // Calculate age from DOB
    const age = patientData.dob
        ? Math.floor((new Date() - new Date(patientData.dob)) / (365.25 * 24 * 60 * 60 * 1000))
        : patientData.age || 'N/A';

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className="registration-receipt-modal">
            <Modal.Header closeButton className="bg-success text-white border-0">
                <Modal.Title className="d-flex align-items-center">
                    <CheckCircle size={24} className="me-2" />
                    Registration Successful
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                <div className="receipt-content p-4" id="receipt-print-area">
                    {/* Hospital Header */}
                    <div className="text-center border-bottom pb-3 mb-3">
                        {hospitalProfile?.logo_url && (
                            <img src={hospitalProfile.logo_url} alt="Hospital Logo" style={{ maxHeight: '50px', marginBottom: '10px' }} />
                        )}
                        <h3 className="fw-bold text-primary mb-1">🏥 {hospitalProfile?.name || 'Hospital Name'}</h3>
                        {hospitalProfile?.tagline && <p className="text-muted small mb-0 fst-italic">{hospitalProfile.tagline}</p>}
                        <p className="text-muted small mb-0">{getFormattedAddress()}</p>
                        <p className="text-muted small mb-0">
                            <Phone size={12} className="me-1" />{getContactString()}
                        </p>
                    </div>

                    {/* Receipt Title with Token Highlight */}
                    <Row className="align-items-center mb-4">
                        <Col md={8}>
                            <h5 className="fw-bold text-uppercase mb-1" style={{ letterSpacing: '2px' }}>
                                OPD {patientData.visit_count > 0 ? 'Visit' : 'Registration'} Receipt
                            </h5>
                            <small className="text-muted">
                                <Calendar size={12} className="me-1" />
                                {currentDate.toLocaleDateString('en-IN', {
                                    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
                                })}
                                <span className="mx-2">|</span>
                                <Clock size={12} className="me-1" />
                                {currentDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </small>
                        </Col>
                        <Col md={4} className="text-end">
                            <div className="bg-success bg-opacity-10 border border-success rounded p-2 d-inline-block">
                                <small className="text-success d-block">TOKEN NUMBER</small>
                                <strong className="fs-4 text-success">{appointmentData?.token_number || tokenNumber}</strong>
                                <div className="mt-2 border-top border-success pt-1">
                                    {(() => {
                                        const mode = appointmentData?.payment_mode?.toLowerCase() || '';
                                        const isFreeMode = mode === 'free' || mode.includes('charity');
                                        return isFreeMode 
                                            ? <Badge bg="info" className="text-uppercase px-2" style={{ letterSpacing: '1px' }}>FREE</Badge>
                                            : <Badge bg="success" className="text-uppercase px-2" style={{ letterSpacing: '1px' }}>PAID</Badge>;
                                    })()}
                                </div>
                            </div>
                        </Col>
                    </Row>

                    <Row>
                        {/* Patient Details */}
                        <Col md={8}>
                            <div className="border rounded p-3 mb-3">
                                <h6 className="text-muted border-bottom pb-2 mb-3 d-flex align-items-center">
                                    <User size={16} className="me-2" />Patient Information
                                </h6>
                                <Row className="g-3">
                                    <Col xs={6}>
                                        <small className="text-muted d-block">Patient ID</small>
                                        <Badge bg="primary" className="fs-6 px-3 py-2">
                                            {patientData.uhid || patientData.patient_number || (patientData.id ? `PT-${patientData.id}` : 'N/A')}
                                        </Badge>
                                    </Col>
                                    <Col xs={6}>
                                        <small className="text-muted d-block">Registration Type</small>
                                        <Badge bg="info" className="px-2 py-1">
                                            {patientData.visit_count > 0 ? 'Follow-up' : 'New Patient'}
                                        </Badge>
                                    </Col>
                                    <Col xs={12}>
                                        <small className="text-muted d-block">Patient Name</small>
                                        <strong className="fs-5">{patientData.name || patientData.patient_name || 'N/A'}</strong>
                                    </Col>
                                    <Col xs={4}>
                                        <small className="text-muted d-block">Age / Gender</small>
                                        <span>{age} yrs / {patientData.gender || 'N/A'}</span>
                                    </Col>
                                    <Col xs={4}>
                                        <small className="text-muted d-block">Phone</small>
                                        <span>{patientData.phone || 'N/A'}</span>
                                    </Col>
                                    <Col xs={4}>
                                        <small className="text-muted d-block">Blood Group</small>
                                        <Badge bg="danger" className="px-2">{patientData.blood_group || 'N/A'}</Badge>
                                    </Col>
                                    {patientData.address && (
                                        <Col xs={12}>
                                            <small className="text-muted d-block">
                                                <MapPin size={12} className="me-1" />Address
                                            </small>
                                            <span className="small">{patientData.address}</span>
                                        </Col>
                                    )}
                                </Row>
                            </div>

                            {/* Appointment Details */}
                            <div className="border rounded p-3 mb-3">
                                <h6 className="text-muted border-bottom pb-2 mb-3 d-flex align-items-center">
                                    <Calendar size={16} className="me-2" />Appointment Details
                                </h6>
                                <Row className="g-3">
                                    <Col xs={6}>
                                        <small className="text-muted d-block">Department</small>
                                        <strong>{appointmentData?.department || 'General OPD'}</strong>
                                    </Col>
                                    <Col xs={6}>
                                        <small className="text-muted d-block">Consulting Doctor</small>
                                        <strong>{appointmentData?.doctor || appointmentData?.doctor_name || 'To be assigned'}</strong>
                                    </Col>
                                    <Col xs={6}>
                                        <small className="text-muted d-block">Visit Date</small>
                                        <span>{appointmentData?.date || currentDate.toLocaleDateString()}</span>
                                    </Col>
                                    <Col xs={6}>
                                        <small className="text-muted d-block">Visit Time</small>
                                        <span>{appointmentData?.time || 'As per queue'}</span>
                                    </Col>
                                </Row>
                            </div>

                            {/* Fee Summary */}
                            <div className="border rounded p-3">
                                <h6 className="text-muted border-bottom pb-2 mb-3 d-flex align-items-center">
                                    <CreditCard size={16} className="me-2" />Payment Summary
                                </h6>
                                {(() => {
                                    const mode = appointmentData?.payment_mode?.toLowerCase() || '';
                                    const isFree = mode === 'free' || mode.includes('charity') || mode.includes('free');
                                    // Use configurable fees from hospital settings
                                    const defaultRegFee = parseFloat(hospitalProfile?.default_registration_fee) || 0;
                                    const defaultConsultFee = parseFloat(hospitalProfile?.default_consultation_fee) || 0;
                                    const regFee = isFree ? 0 : (patientData.visit_count > 0 ? 0 : defaultRegFee);
                                    const consultFee = isFree ? 0 : parseFloat(appointmentData?.consultation_fee || defaultConsultFee);
                                    const totalPaid = regFee + consultFee;
                                    
                                    return (
                                        <Table size="sm" borderless className="mb-0">
                                            <tbody>
                                                <tr>
                                                    <td>Registration Fee</td>
                                                    <td className="text-end">
                                                        {isFree ? <span className="text-muted">FREE</span> : `₹ ${regFee.toFixed(2)}`}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td>Consultation Fee</td>
                                                    <td className="text-end">
                                                        {isFree ? <span className="text-muted">FREE</span> : `₹ ${consultFee.toFixed(2)}`}
                                                    </td>
                                                </tr>
                                                <tr className="border-top">
                                                    <td className="fw-bold">Total {isFree ? '(Charity/Free)' : 'Paid'}</td>
                                                    <td className="text-end fw-bold text-success">
                                                        {isFree ? 'FREE' : `₹ ${totalPaid.toFixed(2)}`}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td className="text-muted small">Payment Mode</td>
                                                    <td className="text-end">
                                                        <Badge bg={isFree ? "info" : "light"} text={isFree ? "white" : "dark"}>
                                                            {isFree ? '🆓 Free / Charity' : (appointmentData?.payment_mode || 'Cash')}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </Table>
                                    );
                                })()}
                            </div>
                        </Col>

                        {/* QR Code */}
                        <Col md={4} className="text-center">
                            <div className="border rounded p-3 h-100 d-flex flex-column justify-content-between">
                                <div>
                                    <h6 className="text-muted mb-3">Scan for Quick Access</h6>
                                    <div className="bg-white p-2 rounded shadow-sm d-inline-block mb-2">
                                        <QRCodeSVG
                                            value={qrData}
                                            size={140}
                                            level="H"
                                            includeMargin={true}
                                        />
                                    </div>
                                    <div className="small text-muted">
                                        ID: {patientData.uhid || patientData.patient_number || (patientData.id ? `PT-${patientData.id}` : 'N/A')}
                                    </div>
                                </div>

                                {/* Visit Counter */}
                                <div className="mt-3 p-2 bg-info bg-opacity-10 rounded">
                                    <small className="text-info d-block">Visit #</small>
                                    <strong className="fs-4 text-info">{patientData.visit_count || 1}</strong>
                                </div>
                            </div>
                        </Col>
                    </Row>

                    {/* Instructions */}
                    <div className="bg-warning bg-opacity-10 border border-warning rounded p-3 mt-3">
                        <h6 className="text-warning mb-2">📋 Important Instructions</h6>
                        <Row>
                            <Col md={6}>
                                <ul className="small mb-0 ps-3">
                                    <li>Please bring this receipt on appointment day</li>
                                    <li>Arrive 15 minutes before scheduled time</li>
                                    <li>Carry valid photo ID (Aadhaar/PAN)</li>
                                </ul>
                            </Col>
                            <Col md={6}>
                                <ul className="small mb-0 ps-3">
                                    <li>Bring previous medical records if any</li>
                                    <li>For queries: {hospitalProfile?.phone || 'Contact Reception'}</li>
                                    <li>Emergency: {hospitalProfile?.phone_secondary || '108'}</li>
                                </ul>
                            </Col>
                        </Row>
                    </div>

                    {/* Footer */}
                    <div className="text-center mt-4 pt-3 border-top">
                        <p className="text-muted small mb-0">
                            Thank you for choosing <strong>{hospitalProfile?.name || 'our hospital'}</strong> 🙏
                        </p>
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer className="bg-light justify-content-between">
                <div>
                    <small className="text-muted">Receipt #{tokenNumber}</small>
                </div>
                <div className="d-flex gap-2">
                    <Button variant="outline-secondary" onClick={onHide}>Close</Button>
                    <Button variant="outline-primary">
                        <Download size={16} className="me-1" />Download PDF
                    </Button>
                    <Button variant="success" onClick={handlePrint}>
                        <Printer size={16} className="me-1" />Print Receipt
                    </Button>
                </div>
            </Modal.Footer>
        </Modal>
    );
};

export default RegistrationReceipt;
