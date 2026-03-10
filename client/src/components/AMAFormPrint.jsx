import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col, Table } from 'react-bootstrap';
import { Printer, X, AlertTriangle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { HospitalPrintHeader, HospitalPrintFooter } from './print';
import useHospitalProfile from '../hooks/useHospitalProfile';
import '../styles/print.css';

/**
 * AMAFormPrint - Against Medical Advice / LAMA / DAMA Form
 * Legal protection document for when patients leave against medical advice
 */
const AMAFormPrint = ({ 
    show, 
    onHide, 
    patient,
    admission,
    doctor,
    diagnosis
}) => {
    const { hospitalProfile } = useHospitalProfile();
    
    // Form state for editable fields
    const [formData, setFormData] = useState({
        dischargeType: 'LAMA', // LAMA, DAMA, Absconded
        currentCondition: '',
        risksExplained: [
            'Condition may worsen',
            'Risk of complications',
            'May require emergency readmission',
            'Could be life-threatening'
        ],
        reasonForLeaving: '',
        witnessName1: '',
        witnessName2: '',
        counsellingDone: true,
        alternativeTreatmentOffered: true
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleRiskToggle = (risk) => {
        setFormData(prev => ({
            ...prev,
            risksExplained: prev.risksExplained.includes(risk)
                ? prev.risksExplained.filter(r => r !== risk)
                : [...prev.risksExplained, risk]
        }));
    };

    const handlePrint = () => window.print();

    if (!patient) return null;

    const qrData = JSON.stringify({
        type: 'ama_discharge',
        patientId: patient.id,
        admissionId: admission?.id,
        dischargeType: formData.dischargeType,
        date: new Date().toISOString(),
        hospital: hospitalProfile?.name
    });

    const formNumber = `AMA-${new Date().getFullYear()}-${String(admission?.id || Date.now()).slice(-6)}`;

    const dischargeTypeLabels = {
        'LAMA': 'Leave Against Medical Advice',
        'DAMA': 'Discharge Against Medical Advice',
        'Absconded': 'Patient Absconded'
    };

    const allRisks = [
        'Condition may worsen',
        'Risk of complications',
        'May require emergency readmission',
        'Could be life-threatening',
        'Treatment will be incomplete',
        'Symptoms may return',
        'Risk of permanent disability',
        'Risk of infection'
    ];

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className="ama-form-modal print-modal">
            <Modal.Header closeButton className="bg-warning text-dark border-0 no-print">
                <Modal.Title className="d-flex align-items-center">
                    <AlertTriangle size={24} className="me-2" />
                    Against Medical Advice (AMA) Form
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                {/* Configuration Panel (No Print) */}
                <div className="p-3 bg-light border-bottom no-print">
                    <Row className="g-2 mb-2">
                        <Col md={4}>
                            <Form.Label className="small fw-bold">Discharge Type</Form.Label>
                            <Form.Select 
                                size="sm"
                                value={formData.dischargeType}
                                onChange={(e) => handleChange('dischargeType', e.target.value)}
                            >
                                <option value="LAMA">LAMA - Leave Against Medical Advice</option>
                                <option value="DAMA">DAMA - Discharge Against Medical Advice</option>
                                <option value="Absconded">Absconded</option>
                            </Form.Select>
                        </Col>
                        <Col md={8}>
                            <Form.Label className="small fw-bold">Current Condition</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                placeholder="e.g., Stable but requires continued monitoring"
                                value={formData.currentCondition}
                                onChange={(e) => handleChange('currentCondition', e.target.value)}
                            />
                        </Col>
                    </Row>
                    <Row className="g-2 mb-2">
                        <Col md={12}>
                            <Form.Label className="small fw-bold">Reason for Leaving</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                placeholder="e.g., Personal reasons, Financial constraints, Family emergency"
                                value={formData.reasonForLeaving}
                                onChange={(e) => handleChange('reasonForLeaving', e.target.value)}
                            />
                        </Col>
                    </Row>
                    <Row className="g-2 mb-2">
                        <Col md={12}>
                            <Form.Label className="small fw-bold">Risks Explained (check all that apply)</Form.Label>
                            <div className="d-flex flex-wrap gap-2">
                                {allRisks.map(risk => (
                                    <Form.Check
                                        key={risk}
                                        type="checkbox"
                                        label={risk}
                                        checked={formData.risksExplained.includes(risk)}
                                        onChange={() => handleRiskToggle(risk)}
                                        className="small"
                                    />
                                ))}
                            </div>
                        </Col>
                    </Row>
                    <Row className="g-2">
                        <Col md={6}>
                            <Form.Label className="small fw-bold">Witness 1 Name</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                value={formData.witnessName1}
                                onChange={(e) => handleChange('witnessName1', e.target.value)}
                            />
                        </Col>
                        <Col md={6}>
                            <Form.Label className="small fw-bold">Witness 2 Name</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                value={formData.witnessName2}
                                onChange={(e) => handleChange('witnessName2', e.target.value)}
                            />
                        </Col>
                    </Row>
                </div>

                {/* Printable Content */}
                <div className="ama-form-content p-4" id="ama-form-print-area">
                    <HospitalPrintHeader 
                        title={dischargeTypeLabels[formData.dischargeType] || 'AGAINST MEDICAL ADVICE FORM'}
                    />

                    {/* Form Header */}
                    <div className="d-flex justify-content-between mb-4">
                        <div>
                            <strong>Form No:</strong> {formNumber}
                        </div>
                        <div>
                            <strong>Date:</strong> {new Date().toLocaleDateString('en-IN')}
                        </div>
                        <div>
                            <strong>Time:</strong> {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
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
                                    <td><strong>Ward / Bed:</strong></td>
                                    <td>{admission?.ward_name} / {admission?.bed_number}</td>
                                </tr>
                                <tr>
                                    <td><strong>Admission Date:</strong></td>
                                    <td>{admission?.admission_date ? new Date(admission.admission_date).toLocaleDateString('en-IN') : '________'}</td>
                                    <td><strong>Attending Doctor:</strong></td>
                                    <td>{doctor?.name || admission?.doctor_name || '________'}</td>
                                </tr>
                                <tr>
                                    <td><strong>Diagnosis:</strong></td>
                                    <td colSpan={3}>{diagnosis || admission?.diagnosis || '________________________________'}</td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>

                    {/* Current Condition */}
                    <div className="mb-4 p-3 border rounded">
                        <h6 className="border-bottom pb-2 mb-3 text-uppercase fw-bold" style={{ fontSize: '0.9rem' }}>
                            Current Clinical Status
                        </h6>
                        <p className="mb-0">
                            {formData.currentCondition || 'Patient is currently under treatment and requires continued medical care.'}
                        </p>
                    </div>

                    {/* Risks Explained */}
                    <div className="mb-4 p-3 border rounded bg-warning bg-opacity-10">
                        <h6 className="border-bottom pb-2 mb-3 text-uppercase fw-bold text-danger" style={{ fontSize: '0.9rem' }}>
                            ⚠️ Risks Explained to Patient/Attendant
                        </h6>
                        <ul className="mb-0">
                            {formData.risksExplained.map((risk, index) => (
                                <li key={index} className="mb-1">{risk}</li>
                            ))}
                        </ul>
                    </div>

                    {/* Patient Declaration */}
                    <div className="mb-4 p-3 border border-dark rounded" style={{ backgroundColor: '#fff5f5' }}>
                        <h6 className="border-bottom pb-2 mb-3 text-uppercase fw-bold" style={{ fontSize: '0.9rem' }}>
                            Patient / Attendant Declaration
                        </h6>
                        <p style={{ lineHeight: 1.8, textAlign: 'justify' }}>
                            I, <strong>{patient.name}</strong> / Attendant, hereby declare that I am leaving the hospital 
                            <strong> of my own free will and against the advice of the treating doctors</strong>. 
                            I have been fully informed about my medical condition and the risks involved in leaving 
                            the hospital before completion of treatment.
                        </p>
                        <p style={{ lineHeight: 1.8, textAlign: 'justify' }}>
                            I understand that:
                        </p>
                        <ul>
                            <li>My condition may deteriorate and become life-threatening.</li>
                            <li>I may require emergency readmission.</li>
                            <li>The hospital and doctors are not responsible for any consequences.</li>
                            <li>I am taking this decision voluntarily without any pressure.</li>
                        </ul>
                        <p style={{ lineHeight: 1.8, textAlign: 'justify' }} className="mb-0">
                            <strong>Reason for leaving:</strong> {formData.reasonForLeaving || '________________________________'}
                        </p>
                    </div>

                    {/* Counselling Confirmation */}
                    <div className="mb-4 p-3 bg-light border rounded">
                        <Row>
                            <Col md={6}>
                                <Form.Check
                                    type="checkbox"
                                    label="Counselling done by doctor"
                                    checked={formData.counsellingDone}
                                    readOnly
                                    className="fw-bold"
                                />
                            </Col>
                            <Col md={6}>
                                <Form.Check
                                    type="checkbox"
                                    label="Alternative treatment options discussed"
                                    checked={formData.alternativeTreatmentOffered}
                                    readOnly
                                    className="fw-bold"
                                />
                            </Col>
                        </Row>
                    </div>

                    {/* Signatures */}
                    <Row className="mt-5 pt-3">
                        <Col xs={6} className="text-center mb-4">
                            <div className="border-top pt-2 mx-3">
                                <strong>Patient Signature</strong><br />
                                <small className="text-muted">Name: {patient.name}</small>
                            </div>
                        </Col>
                        <Col xs={6} className="text-center mb-4">
                            <div className="border-top pt-2 mx-3">
                                <strong>Attendant Signature</strong><br />
                                <small className="text-muted">Name: ________________</small><br />
                                <small className="text-muted">Relation: ________________</small>
                            </div>
                        </Col>
                    </Row>
                    
                    <Row className="mb-4">
                        <Col xs={4} className="text-center">
                            <div className="border-top pt-2 mx-3">
                                <strong>Witness 1</strong><br />
                                <small className="text-muted">{formData.witnessName1 || '________________'}</small>
                            </div>
                        </Col>
                        <Col xs={4} className="text-center">
                            <QRCodeSVG value={qrData} size={70} />
                            <br />
                            <small className="text-muted">Verification</small>
                        </Col>
                        <Col xs={4} className="text-center">
                            <div className="border-top pt-2 mx-3">
                                <strong>Witness 2</strong><br />
                                <small className="text-muted">{formData.witnessName2 || '________________'}</small>
                            </div>
                        </Col>
                    </Row>

                    <Row>
                        <Col xs={12} className="text-center">
                            <div className="border-top pt-2 mx-5">
                                <strong>Treating Doctor</strong><br />
                                <small className="text-muted">{doctor?.name || admission?.doctor_name || '________________'}</small><br />
                                <small className="text-muted">Signature & Stamp</small>
                            </div>
                        </Col>
                    </Row>

                    <HospitalPrintFooter 
                        showTimestamp={true}
                        disclaimer="This is a legal document. Patient copy to be retained. Hospital copy to be filed in medical records."
                        showPageNumber={false}
                    />
                </div>
            </Modal.Body>
            <Modal.Footer className="bg-light no-print">
                <Button variant="outline-secondary" onClick={onHide}>
                    <X size={16} className="me-1" /> Close
                </Button>
                <Button variant="warning" onClick={handlePrint}>
                    <Printer size={16} className="me-2" />
                    Print AMA Form
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default AMAFormPrint;
