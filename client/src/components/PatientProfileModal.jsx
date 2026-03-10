import React, { useState, useEffect } from 'react';
import { Modal, Tab, Tabs, Table, Badge, Button, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { User, Phone, Calendar, MapPin, Heart, FileText, CreditCard, Printer, Clock, Activity } from 'lucide-react';
import api from '../utils/axiosInstance';
import RegistrationReceipt from './RegistrationReceipt';

/**
 * PatientProfileModal - View patient details, visit history, and reprint receipts
 */
const PatientProfileModal = ({ show, onHide, patientId, visitId }) => {
    const [loading, setLoading] = useState(true);
    const [patient, setPatient] = useState(null);
    const [visits, setVisits] = useState([]);
    const [payments, setPayments] = useState([]);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('profile');
    const [showReceipt, setShowReceipt] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState(null);

    useEffect(() => {
        if (show && patientId) {
            fetchPatientData();
        }
    }, [show, patientId]);

    const fetchPatientData = async () => {
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch patient details
            const patientRes = await api.get(`/api/patients/${patientId}`, { headers });
            setPatient(patientRes.data.data || patientRes.data);

            // Fetch visit history
            const visitsRes = await api.get(`/api/patients/${patientId}/visits`, { headers });
            setVisits(visitsRes.data.data || visitsRes.data || []);

            // Fetch payment history
            const paymentsRes = await api.get(`/api/patients/${patientId}/payments`, { headers });
            setPayments(paymentsRes.data.data || paymentsRes.data || []);

        } catch (err) {
            console.error('Error fetching patient data:', err);
            setError('Failed to load patient data');
        } finally {
            setLoading(false);
        }
    };

    const calculateAge = (dob) => {
        if (!dob) return 'N/A';
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    };

    const handlePrintReceipt = (visit) => {
        setSelectedVisit(visit);
        setShowReceipt(true);
    };

    if (!show) return null;

    return (
        <>
            <Modal show={show} onHide={onHide} size="lg" centered scrollable>
                <Modal.Header closeButton className="bg-gradient" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                    <Modal.Title className="text-white d-flex align-items-center gap-2">
                        <User size={24} />
                        Patient Profile
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                            <p className="mt-2 text-muted">Loading patient data...</p>
                        </div>
                    ) : error ? (
                        <Alert variant="danger" className="m-3">{error}</Alert>
                    ) : patient ? (
                        <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-0 px-3 pt-3">
                            {/* Profile Tab */}
                            <Tab eventKey="profile" title="👤 Profile">
                                <div className="p-4">
                                    <Row>
                                        <Col md={6}>
                                            <div className="mb-3">
                                                <small className="text-muted d-block">Patient ID</small>
                                                <Badge bg="primary" className="fs-6">{patient.patient_number || `PT-${patient.id}`}</Badge>
                                            </div>
                                            <div className="mb-3">
                                                <small className="text-muted d-block">Full Name</small>
                                                <strong className="fs-5">{patient.name}</strong>
                                            </div>
                                            <div className="mb-3">
                                                <small className="text-muted d-block">Age / Gender</small>
                                                <span>{calculateAge(patient.dob)} yrs / {patient.gender || 'N/A'}</span>
                                            </div>
                                            <div className="mb-3">
                                                <small className="text-muted d-block">Date of Birth</small>
                                                <span>{patient.dob ? new Date(patient.dob).toLocaleDateString() : 'N/A'}</span>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="mb-3">
                                                <small className="text-muted d-block"><Phone size={14} className="me-1" />Phone</small>
                                                <span>{patient.phone || 'N/A'}</span>
                                            </div>
                                            <div className="mb-3">
                                                <small className="text-muted d-block"><MapPin size={14} className="me-1" />Address</small>
                                                <span>{patient.address || 'N/A'}</span>
                                            </div>
                                            <div className="mb-3">
                                                <small className="text-muted d-block"><Heart size={14} className="me-1" />Blood Group</small>
                                                <Badge bg="danger">{patient.blood_group || 'N/A'}</Badge>
                                            </div>
                                            <div className="mb-3">
                                                <small className="text-muted d-block"><Activity size={14} className="me-1" />Total Visits</small>
                                                <Badge bg="info" className="fs-6">{patient.visit_count || visits.length}</Badge>
                                            </div>
                                        </Col>
                                    </Row>
                                    {patient.history_json?.allergies && (
                                        <Alert variant="warning" className="mt-3 py-2">
                                            <strong>⚠️ Allergies:</strong> {patient.history_json.allergies}
                                        </Alert>
                                    )}
                                </div>
                            </Tab>

                            {/* Visit History Tab */}
                            <Tab eventKey="visits" title={`📋 Visits (${visits.length})`}>
                                <div className="p-3">
                                    {visits.length === 0 ? (
                                        <p className="text-muted text-center py-4">No visit history found</p>
                                    ) : (
                                        <Table hover responsive size="sm">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Token</th>
                                                    <th>Date</th>
                                                    <th>Doctor</th>
                                                    <th>Status</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {visits.map(visit => (
                                                    <tr key={visit.id}>
                                                        <td><Badge bg="dark">{visit.token_number}</Badge></td>
                                                        <td>{new Date(visit.visit_date).toLocaleDateString()}</td>
                                                        <td>{visit.doctor_name || 'N/A'}</td>
                                                        <td>
                                                            <Badge bg={visit.status === 'Completed' ? 'success' : visit.status === 'Cancelled' ? 'danger' : 'warning'}>
                                                                {visit.status}
                                                            </Badge>
                                                        </td>
                                                        <td>
                                                            <Button size="sm" variant="outline-primary" onClick={() => handlePrintReceipt(visit)}>
                                                                <Printer size={14} className="me-1" /> Receipt
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    )}
                                </div>
                            </Tab>

                            {/* Payment History Tab */}
                            <Tab eventKey="payments" title={`💳 Payments (${payments.length})`}>
                                <div className="p-3">
                                    {payments.length === 0 ? (
                                        <p className="text-muted text-center py-4">No payment history found</p>
                                    ) : (
                                        <Table hover responsive size="sm">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Date</th>
                                                    <th>Amount</th>
                                                    <th>Mode</th>
                                                    <th>Status</th>
                                                    <th>Ref</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {payments.map(payment => (
                                                    <tr key={payment.id}>
                                                        <td>{new Date(payment.created_at).toLocaleDateString()}</td>
                                                        <td className="fw-bold text-success">₹ {parseFloat(payment.amount).toFixed(2)}</td>
                                                        <td><Badge bg="secondary">{payment.payment_mode}</Badge></td>
                                                        <td>
                                                            <Badge bg={payment.status === 'Completed' ? 'success' : 'warning'}>
                                                                {payment.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="small text-muted">{payment.transaction_id || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    )}
                                </div>
                            </Tab>
                        </Tabs>
                    ) : null}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>Close</Button>
                </Modal.Footer>
            </Modal>

            {/* Receipt Print Modal */}
            {showReceipt && selectedVisit && (
                <RegistrationReceipt
                    show={showReceipt}
                    onHide={() => setShowReceipt(false)}
                    patientData={{
                        ...patient,
                        visit_count: patient.visit_count || visits.length
                    }}
                    appointmentData={{
                        department: 'OPD',
                        doctor: selectedVisit.doctor_name,
                        date: new Date(selectedVisit.visit_date).toLocaleDateString(),
                        time: 'Token: ' + selectedVisit.token_number,
                        payment_mode: selectedVisit.payment_mode || 'Cash',
                        consultation_fee: selectedVisit.amount || 500
                    }}
                    token={selectedVisit.token_number}
                />
            )}
        </>
    );
};

export default PatientProfileModal;
