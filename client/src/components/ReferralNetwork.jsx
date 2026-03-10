import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Badge, Row, Col, Table, Modal, Alert } from 'react-bootstrap';
import { Send, Users, ArrowRight, Clock, CheckCircle, XCircle, FileText, Phone } from 'lucide-react';

/**
 * ReferralNetwork - Phase 7 Enterprise Feature
 * Cross-department and external specialist referrals with tracking
 */

// Hospital departments for internal referrals
const DEPARTMENTS = [
    'Cardiology', 'Orthopedics', 'Neurology', 'Gastroenterology',
    'Pulmonology', 'Nephrology', 'Oncology', 'Endocrinology',
    'Dermatology', 'Ophthalmology', 'ENT', 'Psychiatry',
    'General Surgery', 'Gynecology', 'Pediatrics', 'Radiology'
];

// External specialists network (mock data)
const EXTERNAL_SPECIALISTS = [
    { id: 1, name: 'Dr. Anil Sharma', specialty: 'Cardiac Surgery', hospital: 'AIIMS Delhi', phone: '9876543210' },
    { id: 2, name: 'Dr. Priya Mehta', specialty: 'Neurosurgery', hospital: 'Fortis Gurgaon', phone: '9876543211' },
    { id: 3, name: 'Dr. Rajesh Kumar', specialty: 'Oncology', hospital: 'TMH Mumbai', phone: '9876543212' },
    { id: 4, name: 'Dr. Sunita Verma', specialty: 'Nephrology', hospital: 'Medanta', phone: '9876543213' },
    { id: 5, name: 'Dr. Vikram Singh', specialty: 'Joint Replacement', hospital: 'Max Hospital', phone: '9876543214' }
];

const ReferralNetwork = ({ patient, onReferralSent, internalDoctors = [], initialSelectedDoctor = null }) => {
    const [showModal, setShowModal] = useState(false);
    const [referralType, setReferralType] = useState('internal'); // internal, external
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [selectedSpecialist, setSelectedSpecialist] = useState(null);
    const [selectedInternalDoctor, setSelectedInternalDoctor] = useState(null); // New
    const [priority, setPriority] = useState('routine'); // routine, urgent, stat
    const [reason, setReason] = useState('');
    const [clinicalNotes, setClinicalNotes] = useState('');
    const [referrals, setReferrals] = useState([]);
    const [sending, setSending] = useState(false);

    // Auto-select doctor if provided
    useEffect(() => {
        if (initialSelectedDoctor) {
            setReferralType('internal');
            setSelectedInternalDoctor(initialSelectedDoctor);
            setSelectedDepartment(initialSelectedDoctor.department || '');
            if (!showModal) setShowModal(true);
        }
    }, [initialSelectedDoctor]);

    const handleSubmitReferral = async () => {
        if (!patient) {
            alert('Please select a patient first');
            return;
        }

        if (referralType === 'internal' && !selectedDepartment && !selectedInternalDoctor) {
            alert('Please select a doctor or department');
            return;
        }

        if (referralType === 'external' && !selectedSpecialist) {
            alert('Please select a specialist');
            return;
        }

        setSending(true);

        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        const newReferral = {
            id: Date.now(),
            patientName: patient.patient_name,
            patientId: patient.id,
            type: referralType,
            department: referralType === 'internal' ? (selectedInternalDoctor?.department || selectedDepartment) : selectedSpecialist.specialty,
            doctor: referralType === 'internal' ? selectedInternalDoctor : null, // Store doctor info
            specialist: referralType === 'external' ? selectedSpecialist : null,
            priority,
            reason,
            clinicalNotes,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        setReferrals(prev => [newReferral, ...prev]);

        // Reset form
        setSelectedDepartment('');
        setSelectedSpecialist(null);
        setSelectedInternalDoctor(null);
        setReason('');
        setClinicalNotes('');
        setPriority('routine');
        setSending(false);
        setShowModal(false);

        if (onReferralSent) onReferralSent(newReferral);
    };

    const getPriorityBadge = (priority) => {
        const colors = { routine: 'secondary', urgent: 'warning', stat: 'danger' };
        return <Badge bg={colors[priority]}>{priority.toUpperCase()}</Badge>;
    };

    const getStatusBadge = (status) => {
        const config = {
            pending: { bg: 'warning', icon: Clock, text: 'Pending' },
            accepted: { bg: 'success', icon: CheckCircle, text: 'Accepted' },
            declined: { bg: 'danger', icon: XCircle, text: 'Declined' },
            completed: { bg: 'info', icon: CheckCircle, text: 'Completed' }
        };
        const { bg, icon: Icon, text } = config[status] || config.pending;
        return <Badge bg={bg}><Icon size={12} className="me-1" />{text}</Badge>;
    };

    return (
        <>
            <Card className="shadow-sm mb-3">
                <Card.Header className="bg-purple text-white d-flex justify-content-between align-items-center py-2" style={{ backgroundColor: '#6f42c1' }}>
                    <div className="d-flex align-items-center gap-2">
                        <Users size={20} />
                        <strong>Referral Network</strong>
                    </div>
                    <Button
                        variant="light"
                        size="sm"
                        onClick={() => setShowModal(true)}
                        disabled={!patient}
                    >
                        <Send size={14} className="me-1" />
                        New Referral
                    </Button>
                </Card.Header>
                <Card.Body className="p-2">
                    {referrals.length === 0 ? (
                        <Alert variant="light" className="mb-0 py-2 text-center small">
                            <Users size={16} className="me-1" />
                            No referrals yet. Click "New Referral" to refer this patient.
                        </Alert>
                    ) : (
                        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                            <Table size="sm" className="small mb-0">
                                <thead>
                                    <tr>
                                        <th>Patient</th>
                                        <th>To</th>
                                        <th>Priority</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {referrals.map(ref => (
                                        <tr key={ref.id}>
                                            <td>{ref.patientName}</td>
                                            <td>
                                                {ref.type === 'internal'
                                                    ? (ref.doctor ? `Dr. ${ref.doctor.username} (${ref.doctor.department})` : ref.department)
                                                    : `${ref.specialist.name} (${ref.specialist.hospital})`
                                                }
                                            </td>
                                            <td>{getPriorityBadge(ref.priority)}</td>
                                            <td>{getStatusBadge(ref.status)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* Referral Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
                <Modal.Header closeButton className="bg-purple text-white" style={{ backgroundColor: '#6f42c1' }}>
                    <Modal.Title className="d-flex align-items-center gap-2">
                        <Send size={20} />
                        Create Referral
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {patient && (
                        <Alert variant="info" className="py-2">
                            <strong>Patient:</strong> {patient.patient_name} |
                            <strong> Complaint:</strong> {patient.complaint || 'N/A'}
                        </Alert>
                    )}

                    <Row className="mb-3">
                        <Col>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Referral Type</Form.Label>
                                <div>
                                    <Form.Check
                                        inline
                                        type="radio"
                                        label="Internal (Within Hospital)"
                                        checked={referralType === 'internal'}
                                        onChange={() => setReferralType('internal')}
                                    />
                                    <Form.Check
                                        inline
                                        type="radio"
                                        label="External (Specialist Network)"
                                        checked={referralType === 'external'}
                                        onChange={() => setReferralType('external')}
                                    />
                                </div>
                            </Form.Group>
                        </Col>
                    </Row>

                    {referralType === 'internal' ? (
                        <Row className="mb-3">
                            <Col>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">Select Doctor (Internal)</Form.Label>
                                    {internalDoctors.length > 0 ? (
                                        <Form.Select
                                            value={selectedInternalDoctor ? selectedInternalDoctor.id : ''}
                                            onChange={(e) => {
                                                const doc = internalDoctors.find(d => d.id === parseInt(e.target.value));
                                                setSelectedInternalDoctor(doc);
                                                setSelectedDepartment(doc?.department || '');
                                            }}
                                        >
                                            <option value="">Select Doctor...</option>
                                            {internalDoctors.map(doc => (
                                                <option key={doc.id} value={doc.id}>
                                                    Dr. {doc.username} - {doc.department}
                                                </option>
                                            ))}
                                        </Form.Select>
                                    ) : (
                                        <Form.Select
                                            value={selectedDepartment}
                                            onChange={(e) => setSelectedDepartment(e.target.value)}
                                        >
                                            <option value="">Select Department...</option>
                                            {DEPARTMENTS.map(dept => (
                                                <option key={dept} value={dept}>{dept}</option>
                                            ))}
                                        </Form.Select>
                                    )}
                                    {internalDoctors.length === 0 && <Form.Text className="text-muted">Loading doctors...</Form.Text>}
                                </Form.Group>
                            </Col>
                        </Row>
                    ) : (
                        <Row className="mb-3">
                            <Col>
                                <Form.Group>
                                    <Form.Label className="small fw-bold">External Specialist</Form.Label>
                                    <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: 4 }}>
                                        {EXTERNAL_SPECIALISTS.map(spec => (
                                            <div
                                                key={spec.id}
                                                className={`p-2 border-bottom cursor-pointer ${selectedSpecialist?.id === spec.id ? 'bg-primary text-white' : ''}`}
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => setSelectedSpecialist(spec)}
                                            >
                                                <div className="fw-bold small">{spec.name}</div>
                                                <div className="small">
                                                    {spec.specialty} • {spec.hospital}
                                                    <Phone size={10} className="ms-2" /> {spec.phone}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </Form.Group>
                            </Col>
                        </Row>
                    )}

                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Priority</Form.Label>
                                <Form.Select
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value)}
                                >
                                    <option value="routine">Routine</option>
                                    <option value="urgent">Urgent</option>
                                    <option value="stat">STAT (Emergency)</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={8}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Reason for Referral</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="e.g., Suspected cardiac involvement, needs echo"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group>
                        <Form.Label className="small fw-bold">Clinical Notes (shared with specialist)</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            placeholder="Patient history, current medications, relevant findings..."
                            value={clinicalNotes}
                            onChange={(e) => setClinicalNotes(e.target.value)}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmitReferral}
                        disabled={sending}
                    >
                        {sending ? 'Sending...' : (
                            <>
                                <Send size={14} className="me-1" />
                                Send Referral
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default ReferralNetwork;
