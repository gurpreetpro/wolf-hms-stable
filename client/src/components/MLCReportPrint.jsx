import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col, Table } from 'react-bootstrap';
import { Printer, X, Shield } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { HospitalPrintHeader, HospitalPrintFooter } from './print';
import useHospitalProfile from '../hooks/useHospitalProfile';
import '../styles/print.css';

/**
 * MLCReportPrint - Medico-Legal Case Report
 * For documenting injuries, accidents, assaults for police/court purposes
 */
const MLCReportPrint = ({ 
    show, 
    onHide, 
    patient,
    doctor,
    doctorRegNo
}) => {
    const { hospitalProfile } = useHospitalProfile();
    
    // Form state for editable fields
    const [formData, setFormData] = useState({
        mlcNumber: `MLC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`,
        dateTime: new Date().toISOString().slice(0, 16),
        broughtBy: 'Police',
        policeStation: '',
        policeOfficerName: '',
        policeOfficerRank: 'Constable',
        fir_number: '',
        
        caseType: 'Road Traffic Accident',
        incidentDateTime: '',
        incidentPlace: '',
        
        // Injuries
        injuryDescription: '',
        bodyPartsAffected: [],
        woundType: 'Abrasion',
        weaponUsed: 'Not Applicable',
        natureOfInjury: 'Simple',
        
        // Clinical
        consciousnessLevel: 'Conscious and Oriented',
        alcoholSmell: 'No',
        pupilReaction: 'Normal',
        vitalsBP: '',
        vitalsPulse: '',
        
        // Treatment
        treatmentGiven: '',
        investigations: '',
        disposition: 'Treated and Discharged',
        prognosis: 'Good',
        
        // Opinion
        probableCause: '',
        ageOfInjury: 'Fresh (within 24 hours)'
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleBodyPartToggle = (part) => {
        setFormData(prev => ({
            ...prev,
            bodyPartsAffected: prev.bodyPartsAffected.includes(part)
                ? prev.bodyPartsAffected.filter(p => p !== part)
                : [...prev.bodyPartsAffected, part]
        }));
    };

    const handlePrint = () => window.print();

    if (!patient) return null;

    const qrData = JSON.stringify({
        type: 'mlc_report',
        mlcNumber: formData.mlcNumber,
        patientId: patient.id,
        date: formData.dateTime,
        hospital: hospitalProfile?.name,
        doctor: doctor?.name
    });

    const bodyParts = [
        'Head', 'Face', 'Neck', 'Chest', 'Abdomen', 
        'Back', 'Left Upper Limb', 'Right Upper Limb', 
        'Left Lower Limb', 'Right Lower Limb', 'Genitals'
    ];

    const caseTypes = [
        'Road Traffic Accident',
        'Assault',
        'Burns',
        'Poisoning',
        'Fall from Height',
        'Industrial Accident',
        'Dog/Animal Bite',
        'Snake Bite',
        'Sexual Assault',
        'Self-Harm',
        'Unknown/Brought Dead'
    ];

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className="mlc-report-modal print-modal">
            <Modal.Header closeButton className="bg-danger text-white border-0 no-print">
                <Modal.Title className="d-flex align-items-center">
                    <Shield size={24} className="me-2" />
                    Medico-Legal Case (MLC) Report
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                {/* Configuration Panel (No Print) */}
                <div className="p-3 bg-light border-bottom no-print" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    <h6 className="text-muted mb-2">Case Information</h6>
                    <Row className="g-2 mb-3">
                        <Col md={3}>
                            <Form.Label className="small fw-bold">MLC Number</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                value={formData.mlcNumber}
                                onChange={(e) => handleChange('mlcNumber', e.target.value)}
                            />
                        </Col>
                        <Col md={3}>
                            <Form.Label className="small fw-bold">Date & Time</Form.Label>
                            <Form.Control 
                                type="datetime-local" 
                                size="sm"
                                value={formData.dateTime}
                                onChange={(e) => handleChange('dateTime', e.target.value)}
                            />
                        </Col>
                        <Col md={3}>
                            <Form.Label className="small fw-bold">Case Type</Form.Label>
                            <Form.Select 
                                size="sm"
                                value={formData.caseType}
                                onChange={(e) => handleChange('caseType', e.target.value)}
                            >
                                {caseTypes.map(type => (
                                    <option key={type}>{type}</option>
                                ))}
                            </Form.Select>
                        </Col>
                        <Col md={3}>
                            <Form.Label className="small fw-bold">Brought By</Form.Label>
                            <Form.Select 
                                size="sm"
                                value={formData.broughtBy}
                                onChange={(e) => handleChange('broughtBy', e.target.value)}
                            >
                                <option>Police</option>
                                <option>Ambulance (108)</option>
                                <option>Private Vehicle</option>
                                <option>Self</option>
                                <option>Relatives</option>
                                <option>Unknown</option>
                            </Form.Select>
                        </Col>
                    </Row>
                    <Row className="g-2 mb-3">
                        <Col md={4}>
                            <Form.Label className="small fw-bold">Police Station</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                value={formData.policeStation}
                                onChange={(e) => handleChange('policeStation', e.target.value)}
                            />
                        </Col>
                        <Col md={3}>
                            <Form.Label className="small fw-bold">Officer Name</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                value={formData.policeOfficerName}
                                onChange={(e) => handleChange('policeOfficerName', e.target.value)}
                            />
                        </Col>
                        <Col md={2}>
                            <Form.Label className="small fw-bold">Rank</Form.Label>
                            <Form.Select 
                                size="sm"
                                value={formData.policeOfficerRank}
                                onChange={(e) => handleChange('policeOfficerRank', e.target.value)}
                            >
                                <option>Constable</option>
                                <option>Head Constable</option>
                                <option>ASI</option>
                                <option>SI</option>
                                <option>Inspector</option>
                            </Form.Select>
                        </Col>
                        <Col md={3}>
                            <Form.Label className="small fw-bold">FIR Number</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                placeholder="If available"
                                value={formData.fir_number}
                                onChange={(e) => handleChange('fir_number', e.target.value)}
                            />
                        </Col>
                    </Row>

                    <h6 className="text-muted mb-2 mt-3">Injury Details</h6>
                    <Row className="g-2 mb-3">
                        <Col md={12}>
                            <Form.Label className="small fw-bold">Body Parts Affected</Form.Label>
                            <div className="d-flex flex-wrap gap-2">
                                {bodyParts.map(part => (
                                    <Form.Check
                                        key={part}
                                        type="checkbox"
                                        label={part}
                                        checked={formData.bodyPartsAffected.includes(part)}
                                        onChange={() => handleBodyPartToggle(part)}
                                        className="small"
                                    />
                                ))}
                            </div>
                        </Col>
                    </Row>
                    <Row className="g-2 mb-3">
                        <Col md={4}>
                            <Form.Label className="small fw-bold">Wound Type</Form.Label>
                            <Form.Select 
                                size="sm"
                                value={formData.woundType}
                                onChange={(e) => handleChange('woundType', e.target.value)}
                            >
                                <option>Abrasion</option>
                                <option>Laceration</option>
                                <option>Contusion</option>
                                <option>Incised Wound</option>
                                <option>Stab Wound</option>
                                <option>Fracture</option>
                                <option>Burns</option>
                                <option>Multiple</option>
                            </Form.Select>
                        </Col>
                        <Col md={4}>
                            <Form.Label className="small fw-bold">Weapon/Cause</Form.Label>
                            <Form.Select 
                                size="sm"
                                value={formData.weaponUsed}
                                onChange={(e) => handleChange('weaponUsed', e.target.value)}
                            >
                                <option>Not Applicable</option>
                                <option>Blunt Object</option>
                                <option>Sharp Object</option>
                                <option>Firearm</option>
                                <option>Vehicle</option>
                                <option>Fire/Flames</option>
                                <option>Chemical</option>
                                <option>Unknown</option>
                            </Form.Select>
                        </Col>
                        <Col md={4}>
                            <Form.Label className="small fw-bold">Nature of Injury</Form.Label>
                            <Form.Select 
                                size="sm"
                                value={formData.natureOfInjury}
                                onChange={(e) => handleChange('natureOfInjury', e.target.value)}
                            >
                                <option>Simple</option>
                                <option>Grievous</option>
                                <option>Dangerous to Life</option>
                                <option>Fatal</option>
                            </Form.Select>
                        </Col>
                    </Row>
                    <Row className="g-2 mb-3">
                        <Col md={12}>
                            <Form.Label className="small fw-bold">Detailed Injury Description</Form.Label>
                            <Form.Control 
                                as="textarea" 
                                rows={2}
                                size="sm"
                                placeholder="Size, shape, location, margins, depth of injuries..."
                                value={formData.injuryDescription}
                                onChange={(e) => handleChange('injuryDescription', e.target.value)}
                            />
                        </Col>
                    </Row>

                    <h6 className="text-muted mb-2 mt-3">Clinical Assessment</h6>
                    <Row className="g-2 mb-3">
                        <Col md={3}>
                            <Form.Label className="small fw-bold">Consciousness</Form.Label>
                            <Form.Select 
                                size="sm"
                                value={formData.consciousnessLevel}
                                onChange={(e) => handleChange('consciousnessLevel', e.target.value)}
                            >
                                <option>Conscious and Oriented</option>
                                <option>Drowsy</option>
                                <option>Unconscious</option>
                                <option>GCS: 15</option>
                                <option>GCS: 10-14</option>
                                <option>GCS: &lt;10</option>
                            </Form.Select>
                        </Col>
                        <Col md={3}>
                            <Form.Label className="small fw-bold">Smell of Alcohol</Form.Label>
                            <Form.Select 
                                size="sm"
                                value={formData.alcoholSmell}
                                onChange={(e) => handleChange('alcoholSmell', e.target.value)}
                            >
                                <option>No</option>
                                <option>Yes - Mild</option>
                                <option>Yes - Strong</option>
                                <option>Cannot Assess</option>
                            </Form.Select>
                        </Col>
                        <Col md={3}>
                            <Form.Label className="small fw-bold">BP (mmHg)</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                placeholder="e.g., 120/80"
                                value={formData.vitalsBP}
                                onChange={(e) => handleChange('vitalsBP', e.target.value)}
                            />
                        </Col>
                        <Col md={3}>
                            <Form.Label className="small fw-bold">Pulse (bpm)</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                value={formData.vitalsPulse}
                                onChange={(e) => handleChange('vitalsPulse', e.target.value)}
                            />
                        </Col>
                    </Row>
                    <Row className="g-2">
                        <Col md={6}>
                            <Form.Label className="small fw-bold">Treatment Given</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                value={formData.treatmentGiven}
                                onChange={(e) => handleChange('treatmentGiven', e.target.value)}
                            />
                        </Col>
                        <Col md={3}>
                            <Form.Label className="small fw-bold">Disposition</Form.Label>
                            <Form.Select 
                                size="sm"
                                value={formData.disposition}
                                onChange={(e) => handleChange('disposition', e.target.value)}
                            >
                                <option>Treated and Discharged</option>
                                <option>Admitted</option>
                                <option>Referred</option>
                                <option>Brought Dead</option>
                                <option>Expired During Treatment</option>
                            </Form.Select>
                        </Col>
                        <Col md={3}>
                            <Form.Label className="small fw-bold">Prognosis</Form.Label>
                            <Form.Select 
                                size="sm"
                                value={formData.prognosis}
                                onChange={(e) => handleChange('prognosis', e.target.value)}
                            >
                                <option>Good</option>
                                <option>Guarded</option>
                                <option>Poor</option>
                                <option>Cannot Assess</option>
                            </Form.Select>
                        </Col>
                    </Row>
                </div>

                {/* Printable Content */}
                <div className="mlc-report-content p-4" id="mlc-report-print-area">
                    <HospitalPrintHeader 
                        title="MEDICO-LEGAL CASE REPORT"
                        subtitle="(Confidential - For Police/Court Use Only)"
                    />

                    {/* MLC Header */}
                    <div className="d-flex justify-content-between mb-4 p-2 bg-danger bg-opacity-10 border border-danger rounded">
                        <div>
                            <strong>MLC No:</strong> {formData.mlcNumber}
                        </div>
                        <div>
                            <strong>Date:</strong> {new Date(formData.dateTime).toLocaleDateString('en-IN')}
                        </div>
                        <div>
                            <strong>Time:</strong> {new Date(formData.dateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div>
                            <strong>Type:</strong> <span className="badge bg-danger">{formData.caseType}</span>
                        </div>
                    </div>

                    {/* Patient Details */}
                    <div className="mb-4 p-3 border rounded">
                        <h6 className="border-bottom pb-2 mb-3 text-uppercase fw-bold" style={{ fontSize: '0.9rem' }}>
                            Patient Particulars
                        </h6>
                        <Table borderless size="sm" className="mb-0">
                            <tbody>
                                <tr>
                                    <td width="20%"><strong>Name:</strong></td>
                                    <td width="30%">{patient.name}</td>
                                    <td width="20%"><strong>Patient ID:</strong></td>
                                    <td width="30%">{patient.id}</td>
                                </tr>
                                <tr>
                                    <td><strong>Age / Gender:</strong></td>
                                    <td>{patient.age} yrs / {patient.gender}</td>
                                    <td><strong>Phone:</strong></td>
                                    <td>{patient.phone || '________'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Address:</strong></td>
                                    <td colSpan={3}>{patient.address || '________________________________'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Brought By:</strong></td>
                                    <td>{formData.broughtBy}</td>
                                    <td><strong>ID Proof:</strong></td>
                                    <td>{patient.aadhaar || '________'}</td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>

                    {/* Police Details */}
                    <div className="mb-4 p-3 border rounded">
                        <h6 className="border-bottom pb-2 mb-3 text-uppercase fw-bold" style={{ fontSize: '0.9rem' }}>
                            Police Particulars
                        </h6>
                        <Table borderless size="sm" className="mb-0">
                            <tbody>
                                <tr>
                                    <td width="20%"><strong>Police Station:</strong></td>
                                    <td width="30%">{formData.policeStation || '________________'}</td>
                                    <td width="20%"><strong>FIR No:</strong></td>
                                    <td width="30%">{formData.fir_number || 'Not Available'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Officer Name:</strong></td>
                                    <td>{formData.policeOfficerName || '________________'}</td>
                                    <td><strong>Rank:</strong></td>
                                    <td>{formData.policeOfficerRank}</td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>

                    {/* Injury Details */}
                    <div className="mb-4 p-3 border rounded">
                        <h6 className="border-bottom pb-2 mb-3 text-uppercase fw-bold" style={{ fontSize: '0.9rem' }}>
                            Examination Findings
                        </h6>
                        <Table borderless size="sm" className="mb-0">
                            <tbody>
                                <tr>
                                    <td width="25%"><strong>Consciousness:</strong></td>
                                    <td width="25%">{formData.consciousnessLevel}</td>
                                    <td width="25%"><strong>Alcohol Smell:</strong></td>
                                    <td width="25%">{formData.alcoholSmell}</td>
                                </tr>
                                <tr>
                                    <td><strong>Blood Pressure:</strong></td>
                                    <td>{formData.vitalsBP || '____'} mmHg</td>
                                    <td><strong>Pulse:</strong></td>
                                    <td>{formData.vitalsPulse || '____'} bpm</td>
                                </tr>
                                <tr>
                                    <td><strong>Body Parts Affected:</strong></td>
                                    <td colSpan={3}>{formData.bodyPartsAffected.join(', ') || 'None specified'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Type of Wound:</strong></td>
                                    <td>{formData.woundType}</td>
                                    <td><strong>Weapon/Object:</strong></td>
                                    <td>{formData.weaponUsed}</td>
                                </tr>
                            </tbody>
                        </Table>
                        <div className="mt-3 p-2 bg-light rounded">
                            <strong>Detailed Description of Injuries:</strong>
                            <p className="mb-0 mt-2">{formData.injuryDescription || '_________________________________________________________'}</p>
                        </div>
                    </div>

                    {/* Opinion */}
                    <div className="mb-4 p-3 border border-dark rounded">
                        <h6 className="border-bottom pb-2 mb-3 text-uppercase fw-bold" style={{ fontSize: '0.9rem' }}>
                            Medical Opinion
                        </h6>
                        <Table borderless size="sm" className="mb-0">
                            <tbody>
                                <tr>
                                    <td width="25%"><strong>Nature of Injury:</strong></td>
                                    <td width="25%" className={formData.natureOfInjury === 'Simple' ? 'text-success fw-bold' : 'text-danger fw-bold'}>
                                        {formData.natureOfInjury}
                                    </td>
                                    <td width="25%"><strong>Age of Injury:</strong></td>
                                    <td width="25%">{formData.ageOfInjury}</td>
                                </tr>
                                <tr>
                                    <td><strong>Prognosis:</strong></td>
                                    <td>{formData.prognosis}</td>
                                    <td><strong>Disposition:</strong></td>
                                    <td>{formData.disposition}</td>
                                </tr>
                                <tr>
                                    <td><strong>Treatment Given:</strong></td>
                                    <td colSpan={3}>{formData.treatmentGiven || '________________________________'}</td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>

                    {/* Signatures */}
                    <Row className="mt-5 pt-4">
                        <Col xs={4} className="text-center">
                            <div className="border-top pt-2 mx-3">
                                <strong>{doctor?.name || 'Medical Officer'}</strong><br />
                                <small className="text-muted">Reg. No: {doctorRegNo || '________'}</small><br />
                                <small className="text-muted">Signature & Seal</small>
                            </div>
                        </Col>
                        <Col xs={4} className="text-center">
                            <QRCodeSVG value={qrData} size={70} />
                            <br />
                            <small className="text-muted">Verification</small>
                        </Col>
                        <Col xs={4} className="text-center">
                            <div className="border-top pt-2 mx-3">
                                <strong>Police Officer</strong><br />
                                <small className="text-muted">{formData.policeOfficerName || '________________'}</small><br />
                                <small className="text-muted">Signature</small>
                            </div>
                        </Col>
                    </Row>

                    <HospitalPrintFooter 
                        showTimestamp={true}
                        disclaimer="This MLC report is prepared for medico-legal purposes. Contents are confidential."
                        showPageNumber={false}
                    />
                </div>
            </Modal.Body>
            <Modal.Footer className="bg-light no-print">
                <Button variant="outline-secondary" onClick={onHide}>
                    <X size={16} className="me-1" /> Close
                </Button>
                <Button variant="danger" onClick={handlePrint}>
                    <Printer size={16} className="me-2" />
                    Print MLC Report
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default MLCReportPrint;
