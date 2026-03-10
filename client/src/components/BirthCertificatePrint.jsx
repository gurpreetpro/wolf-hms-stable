import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col, Table } from 'react-bootstrap';
import { Printer, X, Baby } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { HospitalPrintHeader, HospitalPrintFooter } from './print';
import useHospitalProfile from '../hooks/useHospitalProfile';
import '../styles/print.css';

/**
 * BirthCertificatePrint - Birth Notification Form
 * Compliant with Form 1 under Registration of Births and Deaths Act, India
 */
const BirthCertificatePrint = ({ 
    show, 
    onHide, 
    mother,        // Patient object for mother
    admission,     // Mother's admission details
    doctorName,
    doctorRegNo 
}) => {
    const { hospitalProfile } = useHospitalProfile();
    
    // Form state for editable fields
    const [formData, setFormData] = useState({
        // Baby Details
        dateOfBirth: new Date().toISOString().split('T')[0],
        timeOfBirth: new Date().toTimeString().slice(0, 5),
        gender: 'Male',
        birthWeight: '',
        birthLength: '',
        apgarScore1: '',
        apgarScore5: '',
        birthOrder: '1',
        multipleDelivery: 'Single',
        
        // Delivery Details
        deliveryType: 'Normal Vaginal',
        presentationAtBirth: 'Cephalic',
        
        // Father Details
        fatherName: '',
        fatherAge: '',
        fatherOccupation: '',
        fatherNationality: 'Indian',
        
        // Additional
        permanentAddress: '',
        religion: '',
        informantName: '',
        informantRelation: 'Father'
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handlePrint = () => window.print();

    if (!mother) return null;

    const qrData = JSON.stringify({
        type: 'birth_certificate',
        motherName: mother.name,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        hospital: hospitalProfile?.name,
        certifiedBy: doctorName
    });

    const registrationNumber = `BR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className="birth-certificate-modal print-modal">
            <Modal.Header closeButton className="bg-info text-white border-0 no-print">
                <Modal.Title className="d-flex align-items-center">
                    <Baby size={24} className="me-2" />
                    Birth Notification Form
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                {/* Configuration Panel (No Print) */}
                <div className="p-3 bg-light border-bottom no-print" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <h6 className="text-muted mb-3">Baby Details</h6>
                    <Row className="g-2 mb-3">
                        <Col md={3}>
                            <Form.Label className="small fw-bold">Date of Birth</Form.Label>
                            <Form.Control 
                                type="date" 
                                size="sm"
                                value={formData.dateOfBirth}
                                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                            />
                        </Col>
                        <Col md={2}>
                            <Form.Label className="small fw-bold">Time of Birth</Form.Label>
                            <Form.Control 
                                type="time" 
                                size="sm"
                                value={formData.timeOfBirth}
                                onChange={(e) => handleChange('timeOfBirth', e.target.value)}
                            />
                        </Col>
                        <Col md={2}>
                            <Form.Label className="small fw-bold">Gender</Form.Label>
                            <Form.Select 
                                size="sm"
                                value={formData.gender}
                                onChange={(e) => handleChange('gender', e.target.value)}
                            >
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </Form.Select>
                        </Col>
                        <Col md={2}>
                            <Form.Label className="small fw-bold">Birth Weight (kg)</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                placeholder="e.g., 3.2"
                                value={formData.birthWeight}
                                onChange={(e) => handleChange('birthWeight', e.target.value)}
                            />
                        </Col>
                        <Col md={3}>
                            <Form.Label className="small fw-bold">Delivery Type</Form.Label>
                            <Form.Select 
                                size="sm"
                                value={formData.deliveryType}
                                onChange={(e) => handleChange('deliveryType', e.target.value)}
                            >
                                <option>Normal Vaginal</option>
                                <option>Cesarean Section (LSCS)</option>
                                <option>Assisted Vaginal (Forceps)</option>
                                <option>Assisted Vaginal (Vacuum)</option>
                            </Form.Select>
                        </Col>
                    </Row>
                    <Row className="g-2 mb-3">
                        <Col md={2}>
                            <Form.Label className="small fw-bold">APGAR (1 min)</Form.Label>
                            <Form.Control 
                                type="number" 
                                size="sm"
                                min="0" max="10"
                                value={formData.apgarScore1}
                                onChange={(e) => handleChange('apgarScore1', e.target.value)}
                            />
                        </Col>
                        <Col md={2}>
                            <Form.Label className="small fw-bold">APGAR (5 min)</Form.Label>
                            <Form.Control 
                                type="number" 
                                size="sm"
                                min="0" max="10"
                                value={formData.apgarScore5}
                                onChange={(e) => handleChange('apgarScore5', e.target.value)}
                            />
                        </Col>
                        <Col md={2}>
                            <Form.Label className="small fw-bold">Birth Order</Form.Label>
                            <Form.Select 
                                size="sm"
                                value={formData.birthOrder}
                                onChange={(e) => handleChange('birthOrder', e.target.value)}
                            >
                                {[1,2,3,4,5,6,7,8].map(n => (
                                    <option key={n} value={n}>{n}{n===1?'st':n===2?'nd':n===3?'rd':'th'}</option>
                                ))}
                            </Form.Select>
                        </Col>
                        <Col md={3}>
                            <Form.Label className="small fw-bold">Multiple Delivery?</Form.Label>
                            <Form.Select 
                                size="sm"
                                value={formData.multipleDelivery}
                                onChange={(e) => handleChange('multipleDelivery', e.target.value)}
                            >
                                <option>Single</option>
                                <option>Twin - 1st</option>
                                <option>Twin - 2nd</option>
                                <option>Triplet - 1st</option>
                                <option>Triplet - 2nd</option>
                                <option>Triplet - 3rd</option>
                            </Form.Select>
                        </Col>
                        <Col md={3}>
                            <Form.Label className="small fw-bold">Presentation</Form.Label>
                            <Form.Select 
                                size="sm"
                                value={formData.presentationAtBirth}
                                onChange={(e) => handleChange('presentationAtBirth', e.target.value)}
                            >
                                <option>Cephalic</option>
                                <option>Breech</option>
                                <option>Transverse</option>
                            </Form.Select>
                        </Col>
                    </Row>
                    
                    <h6 className="text-muted mb-3 mt-3">Father Details</h6>
                    <Row className="g-2 mb-3">
                        <Col md={4}>
                            <Form.Label className="small fw-bold">Father's Name</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                value={formData.fatherName}
                                onChange={(e) => handleChange('fatherName', e.target.value)}
                            />
                        </Col>
                        <Col md={2}>
                            <Form.Label className="small fw-bold">Age</Form.Label>
                            <Form.Control 
                                type="number" 
                                size="sm"
                                value={formData.fatherAge}
                                onChange={(e) => handleChange('fatherAge', e.target.value)}
                            />
                        </Col>
                        <Col md={3}>
                            <Form.Label className="small fw-bold">Occupation</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                value={formData.fatherOccupation}
                                onChange={(e) => handleChange('fatherOccupation', e.target.value)}
                            />
                        </Col>
                        <Col md={3}>
                            <Form.Label className="small fw-bold">Religion</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                value={formData.religion}
                                onChange={(e) => handleChange('religion', e.target.value)}
                            />
                        </Col>
                    </Row>
                    <Row className="g-2">
                        <Col md={12}>
                            <Form.Label className="small fw-bold">Permanent Address</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                value={formData.permanentAddress}
                                onChange={(e) => handleChange('permanentAddress', e.target.value)}
                            />
                        </Col>
                    </Row>
                </div>

                {/* Printable Content */}
                <div className="birth-certificate-content p-4" id="birth-certificate-print-area">
                    <HospitalPrintHeader 
                        title="BIRTH NOTIFICATION FORM" 
                        subtitle="(Form 1 - Under Section 8 of the Registration of Births and Deaths Act, 1969)"
                    />

                    {/* Registration Number and Date */}
                    <div className="d-flex justify-content-between mb-4">
                        <div>
                            <strong>Registration No:</strong> {registrationNumber}
                        </div>
                        <div>
                            <strong>Date of Issue:</strong> {new Date().toLocaleDateString('en-IN')}
                        </div>
                    </div>

                    {/* Baby Details */}
                    <div className="mb-4 p-3 border rounded bg-light">
                        <h6 className="border-bottom pb-2 mb-3 text-uppercase fw-bold" style={{ fontSize: '0.9rem' }}>
                            Child Information
                        </h6>
                        <Table borderless size="sm" className="mb-0">
                            <tbody>
                                <tr>
                                    <td width="25%"><strong>Date of Birth:</strong></td>
                                    <td width="25%">{new Date(formData.dateOfBirth).toLocaleDateString('en-IN')}</td>
                                    <td width="25%"><strong>Time of Birth:</strong></td>
                                    <td width="25%">{formData.timeOfBirth} hrs</td>
                                </tr>
                                <tr>
                                    <td><strong>Gender:</strong></td>
                                    <td>{formData.gender}</td>
                                    <td><strong>Birth Weight:</strong></td>
                                    <td>{formData.birthWeight ? `${formData.birthWeight} kg` : '_______ kg'}</td>
                                </tr>
                                <tr>
                                    <td><strong>APGAR Score:</strong></td>
                                    <td>1 min: {formData.apgarScore1 || '__'} / 5 min: {formData.apgarScore5 || '__'}</td>
                                    <td><strong>Birth Order:</strong></td>
                                    <td>{formData.birthOrder}</td>
                                </tr>
                                <tr>
                                    <td><strong>Type of Delivery:</strong></td>
                                    <td>{formData.deliveryType}</td>
                                    <td><strong>Multiple Birth:</strong></td>
                                    <td>{formData.multipleDelivery}</td>
                                </tr>
                                <tr>
                                    <td><strong>Place of Birth:</strong></td>
                                    <td colSpan={3}>{hospitalProfile?.name || 'Hospital'}</td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>

                    {/* Mother Details */}
                    <div className="mb-4 p-3 border rounded">
                        <h6 className="border-bottom pb-2 mb-3 text-uppercase fw-bold" style={{ fontSize: '0.9rem' }}>
                            Mother's Details
                        </h6>
                        <Table borderless size="sm" className="mb-0">
                            <tbody>
                                <tr>
                                    <td width="25%"><strong>Mother's Name:</strong></td>
                                    <td width="25%">{mother.name}</td>
                                    <td width="25%"><strong>Age:</strong></td>
                                    <td width="25%">{mother.age} years</td>
                                </tr>
                                <tr>
                                    <td><strong>Patient ID:</strong></td>
                                    <td>{mother.id}</td>
                                    <td><strong>Phone:</strong></td>
                                    <td>{mother.phone || '_____________'}</td>
                                </tr>
                                {admission && (
                                    <tr>
                                        <td><strong>Admission Date:</strong></td>
                                        <td>{new Date(admission.admission_date).toLocaleDateString('en-IN')}</td>
                                        <td><strong>Ward/Bed:</strong></td>
                                        <td>{admission.ward_name} / {admission.bed_number}</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>

                    {/* Father Details */}
                    <div className="mb-4 p-3 border rounded">
                        <h6 className="border-bottom pb-2 mb-3 text-uppercase fw-bold" style={{ fontSize: '0.9rem' }}>
                            Father's Details
                        </h6>
                        <Table borderless size="sm" className="mb-0">
                            <tbody>
                                <tr>
                                    <td width="25%"><strong>Father's Name:</strong></td>
                                    <td width="25%">{formData.fatherName || '_______________________'}</td>
                                    <td width="25%"><strong>Age:</strong></td>
                                    <td width="25%">{formData.fatherAge || '____'} years</td>
                                </tr>
                                <tr>
                                    <td><strong>Occupation:</strong></td>
                                    <td>{formData.fatherOccupation || '_______________________'}</td>
                                    <td><strong>Nationality:</strong></td>
                                    <td>{formData.fatherNationality}</td>
                                </tr>
                                <tr>
                                    <td><strong>Religion:</strong></td>
                                    <td colSpan={3}>{formData.religion || '_______________________'}</td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>

                    {/* Permanent Address */}
                    <div className="mb-4 p-3 border rounded">
                        <h6 className="border-bottom pb-2 mb-3 text-uppercase fw-bold" style={{ fontSize: '0.9rem' }}>
                            Permanent Address of Parents
                        </h6>
                        <p className="mb-0">{formData.permanentAddress || mother.address || '_________________________________________'}</p>
                    </div>

                    {/* Signatures */}
                    <Row className="mt-5 pt-4">
                        <Col xs={4} className="text-center">
                            <div className="border-top pt-2 mx-3">
                                <strong>{doctorName || 'Medical Officer'}</strong><br />
                                <small className="text-muted">
                                    Reg. No: {doctorRegNo || '____________'}
                                </small><br />
                                <small className="text-muted">Attending Doctor</small>
                            </div>
                        </Col>
                        <Col xs={4} className="text-center">
                            <QRCodeSVG value={qrData} size={80} />
                            <br />
                            <small className="text-muted">Scan to Verify</small>
                        </Col>
                        <Col xs={4} className="text-center">
                            <div className="border-top pt-2 mx-3">
                                <strong>Informant's Signature</strong><br />
                                <small className="text-muted">
                                    Name: {formData.fatherName || '____________'}
                                </small><br />
                                <small className="text-muted">Relation: {formData.informantRelation}</small>
                            </div>
                        </Col>
                    </Row>

                    <HospitalPrintFooter 
                        showTimestamp={true}
                        disclaimer="This is a birth notification for official registration. The child's name can be added within 12 months of birth."
                        showPageNumber={false}
                    />
                </div>
            </Modal.Body>
            <Modal.Footer className="bg-light no-print">
                <Button variant="outline-secondary" onClick={onHide}>
                    <X size={16} className="me-1" /> Close
                </Button>
                <Button variant="info" onClick={handlePrint}>
                    <Printer size={16} className="me-2" />
                    Print Birth Form
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default BirthCertificatePrint;
