import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col, Table } from 'react-bootstrap';
import { Printer, X, ClipboardList } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { HospitalPrintHeader, HospitalPrintFooter } from './print';
import useHospitalProfile from '../hooks/useHospitalProfile';
import '../styles/print.css';

/**
 * AdmissionFormPrint - IPD Admission Sheet
 * Standard NABH-compliant admission form for inpatient department
 */
const AdmissionFormPrint = ({ 
    show, 
    onHide, 
    patient,
    admission,
    doctor,
    vitals
}) => {
    const { hospitalProfile } = useHospitalProfile();
    
    // Form state for editable fields
    const [formData, setFormData] = useState({
        admissionType: 'Elective',
        admissionReason: '',
        provisionalDiagnosis: admission?.diagnosis || '',
        allergies: patient?.allergies || 'None Known',
        mlcCase: 'No',
        referredFrom: '',
        emergencyContactName: patient?.emergency_contact || '',
        emergencyContactPhone: patient?.emergency_phone || '',
        emergencyContactRelation: 'Spouse',
        insuranceProvider: '',
        insurancePolicyNo: '',
        consentObtained: true
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handlePrint = () => window.print();

    if (!patient) return null;

    const qrData = JSON.stringify({
        type: 'admission',
        patientId: patient.id,
        admissionId: admission?.id,
        admissionDate: admission?.admission_date,
        hospital: hospitalProfile?.name
    });

    const admissionNumber = admission?.id 
        ? `ADM-${new Date().getFullYear()}-${String(admission.id).padStart(6, '0')}`
        : `ADM-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className="admission-form-modal print-modal">
            <Modal.Header closeButton className="bg-success text-white border-0 no-print">
                <Modal.Title className="d-flex align-items-center">
                    <ClipboardList size={24} className="me-2" />
                    IPD Admission Form
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                {/* Configuration Panel (No Print) */}
                <div className="p-3 bg-light border-bottom no-print">
                    <Row className="g-2 mb-2">
                        <Col md={3}>
                            <Form.Label className="small fw-bold">Admission Type</Form.Label>
                            <Form.Select 
                                size="sm"
                                value={formData.admissionType}
                                onChange={(e) => handleChange('admissionType', e.target.value)}
                            >
                                <option>Elective</option>
                                <option>Emergency</option>
                                <option>Day Care</option>
                                <option>Transfer</option>
                            </Form.Select>
                        </Col>
                        <Col md={3}>
                            <Form.Label className="small fw-bold">MLC Case?</Form.Label>
                            <Form.Select 
                                size="sm"
                                value={formData.mlcCase}
                                onChange={(e) => handleChange('mlcCase', e.target.value)}
                            >
                                <option>No</option>
                                <option>Yes</option>
                            </Form.Select>
                        </Col>
                        <Col md={6}>
                            <Form.Label className="small fw-bold">Referred From</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                placeholder="e.g., Self / Dr. Name / Hospital Name"
                                value={formData.referredFrom}
                                onChange={(e) => handleChange('referredFrom', e.target.value)}
                            />
                        </Col>
                    </Row>
                    <Row className="g-2 mb-2">
                        <Col md={6}>
                            <Form.Label className="small fw-bold">Reason for Admission</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                placeholder="Chief complaint / Reason"
                                value={formData.admissionReason}
                                onChange={(e) => handleChange('admissionReason', e.target.value)}
                            />
                        </Col>
                        <Col md={6}>
                            <Form.Label className="small fw-bold">Provisional Diagnosis</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                value={formData.provisionalDiagnosis}
                                onChange={(e) => handleChange('provisionalDiagnosis', e.target.value)}
                            />
                        </Col>
                    </Row>
                    <Row className="g-2 mb-2">
                        <Col md={4}>
                            <Form.Label className="small fw-bold">Known Allergies</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                value={formData.allergies}
                                onChange={(e) => handleChange('allergies', e.target.value)}
                            />
                        </Col>
                        <Col md={4}>
                            <Form.Label className="small fw-bold">Insurance Provider</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                value={formData.insuranceProvider}
                                onChange={(e) => handleChange('insuranceProvider', e.target.value)}
                            />
                        </Col>
                        <Col md={4}>
                            <Form.Label className="small fw-bold">Policy Number</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                value={formData.insurancePolicyNo}
                                onChange={(e) => handleChange('insurancePolicyNo', e.target.value)}
                            />
                        </Col>
                    </Row>
                    <Row className="g-2">
                        <Col md={4}>
                            <Form.Label className="small fw-bold">Emergency Contact Name</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                value={formData.emergencyContactName}
                                onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                            />
                        </Col>
                        <Col md={4}>
                            <Form.Label className="small fw-bold">Emergency Contact Phone</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                value={formData.emergencyContactPhone}
                                onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
                            />
                        </Col>
                        <Col md={4}>
                            <Form.Label className="small fw-bold">Relation</Form.Label>
                            <Form.Select 
                                size="sm"
                                value={formData.emergencyContactRelation}
                                onChange={(e) => handleChange('emergencyContactRelation', e.target.value)}
                            >
                                <option>Spouse</option>
                                <option>Parent</option>
                                <option>Child</option>
                                <option>Sibling</option>
                                <option>Friend</option>
                                <option>Other</option>
                            </Form.Select>
                        </Col>
                    </Row>
                </div>

                {/* Printable Content */}
                <div className="admission-form-content p-4" id="admission-form-print-area">
                    <HospitalPrintHeader 
                        title="INPATIENT ADMISSION FORM" 
                    />

                    {/* Admission Header */}
                    <div className="d-flex justify-content-between mb-4 p-2 bg-light border rounded">
                        <div>
                            <strong>Admission No:</strong> {admissionNumber}
                        </div>
                        <div>
                            <strong>Admission Date:</strong> {admission?.admission_date 
                                ? new Date(admission.admission_date).toLocaleDateString('en-IN')
                                : new Date().toLocaleDateString('en-IN')
                            }
                        </div>
                        <div>
                            <strong>Time:</strong> {admission?.admission_date 
                                ? new Date(admission.admission_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                                : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                            }
                        </div>
                        <div>
                            <strong>Type:</strong> <span className="badge bg-primary">{formData.admissionType}</span>
                        </div>
                    </div>

                    {/* Patient Details */}
                    <div className="mb-4 p-3 border rounded">
                        <h6 className="border-bottom pb-2 mb-3 text-uppercase fw-bold" style={{ fontSize: '0.9rem' }}>
                            Patient Information
                        </h6>
                        <Table borderless size="sm" className="mb-0">
                            <tbody>
                                <tr>
                                    <td width="20%"><strong>Patient Name:</strong></td>
                                    <td width="30%">{patient.name}</td>
                                    <td width="20%"><strong>Patient ID:</strong></td>
                                    <td width="30%">{patient.id}</td>
                                </tr>
                                <tr>
                                    <td><strong>Age / Gender:</strong></td>
                                    <td>{patient.age} yrs / {patient.gender}</td>
                                    <td><strong>Blood Group:</strong></td>
                                    <td>{patient.blood_group || '________'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Phone:</strong></td>
                                    <td>{patient.phone || '________'}</td>
                                    <td><strong>Aadhaar No:</strong></td>
                                    <td>{patient.aadhaar || '________'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Address:</strong></td>
                                    <td colSpan={3}>{patient.address || '_______________________________'}</td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>

                    {/* Ward Details */}
                    <div className="mb-4 p-3 border rounded">
                        <h6 className="border-bottom pb-2 mb-3 text-uppercase fw-bold" style={{ fontSize: '0.9rem' }}>
                            Ward Assignment
                        </h6>
                        <Table borderless size="sm" className="mb-0">
                            <tbody>
                                <tr>
                                    <td width="20%"><strong>Ward:</strong></td>
                                    <td width="30%">{admission?.ward_name || '________'}</td>
                                    <td width="20%"><strong>Bed No:</strong></td>
                                    <td width="30%">{admission?.bed_number || '________'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Room Type:</strong></td>
                                    <td>{admission?.room_type || 'General'}</td>
                                    <td><strong>Daily Rate:</strong></td>
                                    <td>₹{admission?.daily_rate || '________'}</td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>

                    {/* Clinical Details */}
                    <div className="mb-4 p-3 border rounded">
                        <h6 className="border-bottom pb-2 mb-3 text-uppercase fw-bold" style={{ fontSize: '0.9rem' }}>
                            Clinical Information
                        </h6>
                        <Table borderless size="sm" className="mb-0">
                            <tbody>
                                <tr>
                                    <td width="25%"><strong>Attending Doctor:</strong></td>
                                    <td width="75%">{doctor?.name || admission?.doctor_name || '________'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Reason for Admission:</strong></td>
                                    <td>{formData.admissionReason || '_______________________________'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Provisional Diagnosis:</strong></td>
                                    <td>{formData.provisionalDiagnosis || '_______________________________'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Known Allergies:</strong></td>
                                    <td className={formData.allergies !== 'None Known' ? 'text-danger fw-bold' : ''}>
                                        {formData.allergies}
                                    </td>
                                </tr>
                                <tr>
                                    <td><strong>MLC Case:</strong></td>
                                    <td>{formData.mlcCase}</td>
                                </tr>
                                <tr>
                                    <td><strong>Referred From:</strong></td>
                                    <td>{formData.referredFrom || 'Self'}</td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>

                    {/* Vitals on Admission */}
                    {vitals && (
                        <div className="mb-4 p-3 border rounded">
                            <h6 className="border-bottom pb-2 mb-3 text-uppercase fw-bold" style={{ fontSize: '0.9rem' }}>
                                Vitals at Admission
                            </h6>
                            <Row>
                                <Col md={3} className="text-center p-2">
                                    <div className="small text-muted">Blood Pressure</div>
                                    <div className="fw-bold">{vitals.bp_systolic}/{vitals.bp_diastolic} mmHg</div>
                                </Col>
                                <Col md={2} className="text-center p-2">
                                    <div className="small text-muted">Pulse</div>
                                    <div className="fw-bold">{vitals.pulse} bpm</div>
                                </Col>
                                <Col md={2} className="text-center p-2">
                                    <div className="small text-muted">Temp</div>
                                    <div className="fw-bold">{vitals.temperature}°F</div>
                                </Col>
                                <Col md={2} className="text-center p-2">
                                    <div className="small text-muted">SpO2</div>
                                    <div className="fw-bold">{vitals.spo2}%</div>
                                </Col>
                                <Col md={3} className="text-center p-2">
                                    <div className="small text-muted">Weight</div>
                                    <div className="fw-bold">{vitals.weight} kg</div>
                                </Col>
                            </Row>
                        </div>
                    )}

                    {/* Emergency Contact */}
                    <div className="mb-4 p-3 border rounded">
                        <h6 className="border-bottom pb-2 mb-3 text-uppercase fw-bold" style={{ fontSize: '0.9rem' }}>
                            Emergency Contact
                        </h6>
                        <Table borderless size="sm" className="mb-0">
                            <tbody>
                                <tr>
                                    <td width="20%"><strong>Name:</strong></td>
                                    <td width="30%">{formData.emergencyContactName || '________'}</td>
                                    <td width="20%"><strong>Phone:</strong></td>
                                    <td width="30%">{formData.emergencyContactPhone || '________'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Relation:</strong></td>
                                    <td colSpan={3}>{formData.emergencyContactRelation}</td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>

                    {/* Insurance (if any) */}
                    {(formData.insuranceProvider || formData.insurancePolicyNo) && (
                        <div className="mb-4 p-3 border rounded">
                            <h6 className="border-bottom pb-2 mb-3 text-uppercase fw-bold" style={{ fontSize: '0.9rem' }}>
                                Insurance Details
                            </h6>
                            <Table borderless size="sm" className="mb-0">
                                <tbody>
                                    <tr>
                                        <td width="25%"><strong>Provider:</strong></td>
                                        <td width="25%">{formData.insuranceProvider}</td>
                                        <td width="25%"><strong>Policy No:</strong></td>
                                        <td width="25%">{formData.insurancePolicyNo}</td>
                                    </tr>
                                </tbody>
                            </Table>
                        </div>
                    )}

                    {/* Consent */}
                    <div className="mb-4 p-3 bg-light border rounded">
                        <p className="mb-0 small" style={{ lineHeight: 1.6 }}>
                            I hereby consent to the admission and agree to abide by the hospital rules and regulations. 
                            I understand that admission does not guarantee a cure, and the treatment plan will be 
                            determined by the attending physician. I authorize the hospital to take necessary 
                            emergency measures if required.
                        </p>
                    </div>

                    {/* Signatures */}
                    <Row className="mt-5 pt-4">
                        <Col xs={4} className="text-center">
                            <div className="border-top pt-2 mx-3">
                                <strong>Patient / Attendant</strong><br />
                                <small className="text-muted">Signature</small>
                            </div>
                        </Col>
                        <Col xs={4} className="text-center">
                            <QRCodeSVG value={qrData} size={70} />
                            <br />
                            <small className="text-muted">Scan to Verify</small>
                        </Col>
                        <Col xs={4} className="text-center">
                            <div className="border-top pt-2 mx-3">
                                <strong>Admission Desk</strong><br />
                                <small className="text-muted">Signature & Stamp</small>
                            </div>
                        </Col>
                    </Row>

                    <HospitalPrintFooter 
                        showTimestamp={true}
                        disclaimer="This is an official admission document. Please keep this copy for your records."
                        showPageNumber={false}
                    />
                </div>
            </Modal.Body>
            <Modal.Footer className="bg-light no-print">
                <Button variant="outline-secondary" onClick={onHide}>
                    <X size={16} className="me-1" /> Close
                </Button>
                <Button variant="success" onClick={handlePrint}>
                    <Printer size={16} className="me-2" />
                    Print Admission Form
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default AdmissionFormPrint;
