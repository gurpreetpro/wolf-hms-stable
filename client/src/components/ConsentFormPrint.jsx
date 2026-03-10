import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { Printer, X, FileSignature } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { HospitalPrintHeader, HospitalPrintFooter } from './print';
import useHospitalProfile from '../hooks/useHospitalProfile';
import '../styles/print.css';

const ConsentFormPrint = ({ show, onHide, patient, doctorName }) => {
    const { hospitalProfile } = useHospitalProfile();
    const [formType, setFormType] = useState('general_admission');
    // Common fields
    const [witnessName, setWitnessName] = useState('');
    const [procedureName, setProcedureName] = useState('');

    const handlePrint = () => window.print();

    if (!patient) return null;

    const getTitle = () => {
        switch (formType) {
            case 'general_admission': return 'GENERAL INFORMED CONSENT FOR ADMISSION';
            case 'surgery': return 'INFORMED CONSENT FOR SURGERY / PROCEDURE';
            case 'anesthesia': return 'INFORMED CONSENT FOR ANESTHESIA';
            case 'high_risk': return 'HIGH RISK CONSENT';
            default: return 'CONSENT FORM';
        }
    };

    const qrData = JSON.stringify({
        type: formType,
        patient: patient.name,
        date: new Date().toISOString(),
        hospital: hospitalProfile?.name
    });

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className="consent-print-modal">
            <Modal.Header closeButton className="bg-primary text-white border-0 no-print">
                <Modal.Title className="d-flex align-items-center">
                    <FileSignature size={24} className="me-2" />
                    Print Consent Form
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                {/* Configuration (No Print) */}
                <div className="p-3 bg-light border-bottom no-print">
                    <Row className="g-3 align-items-end">
                        <Col md={4}>
                            <Form.Label className="small fw-bold">Consent Type</Form.Label>
                            <Form.Select value={formType} onChange={(e) => setFormType(e.target.value)} size="sm">
                                <option value="general_admission">General Admission Consent</option>
                                <option value="surgery">Surgery / Procedure Consent</option>
                                <option value="anesthesia">Anesthesia Consent</option>
                                <option value="high_risk">High Risk Consent</option>
                            </Form.Select>
                        </Col>
                        {formType === 'surgery' && (
                            <Col md={4}>
                                <Form.Label className="small fw-bold">Procedure Name</Form.Label>
                                <Form.Control 
                                    type="text" 
                                    size="sm" 
                                    placeholder="e.g. Appendectomy"
                                    value={procedureName}
                                    onChange={(e) => setProcedureName(e.target.value)}
                                />
                            </Col>
                        )}
                        <Col md={4}>
                            <Form.Label className="small fw-bold">Witness Name (Optional)</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm" 
                                placeholder="Staff or Relative Name"
                                value={witnessName}
                                onChange={(e) => setWitnessName(e.target.value)}
                            />
                        </Col>
                    </Row>
                </div>

                {/* Printable Content */}
                <div className="consent-content p-5" id="consent-print-area">
                    <HospitalPrintHeader title={getTitle()} />

                    {/* Patient Context */}
                    <div className="border rounded p-3 mb-4 bg-light">
                        <Row>
                            <Col xs={6}><strong>Patient:</strong> {patient.name}</Col>
                            <Col xs={3}><strong>Age/Sex:</strong> {patient.age} / {patient.gender}</Col>
                            <Col xs={3}><strong>ID:</strong> {patient.id || patient.patient_number || 'N/A'}</Col>
                        </Row>
                        <Row className="mt-2">
                             <Col xs={12}><strong>Doctor:</strong> {doctorName || '_____________________'}</Col>
                        </Row>
                    </div>

                    {/* Content Body */}
                    <div className="mb-5 text-justify" style={{ lineHeight: '1.8' }}>
                        
                        {formType === 'general_admission' && (
                            <div>
                                <p>1. I, the undersigned, hereby give my voluntary consent for admission and treatment at <strong>{hospitalProfile?.name}</strong>.</p>
                                <p>2. I authorize the doctors, nurses, and medical staff to perform necessary examinations, investigations (X-ray, Lab tests, etc.), and administer medications as prescribed.</p>
                                <p>3. I understand that the practice of medicine is not an exact science and no guarantees have been made to me regarding the result of examination or treatment.</p>
                                <p>4. I agree to abide by the rules and regulations of the hospital regarding visitors, visiting hours, and patient conduct.</p>
                                <p>5. I authorize the release of medical information to my insurance company or third-party payer as required for billing purposes.</p>
                            </div>
                        )}

                        {formType === 'surgery' && (
                            <div>
                                <p>1. I hereby authorize Dr. <strong>{doctorName || '________________'}</strong> and/or such assistants as may be selected to perform the following procedure/operation: <strong>{procedureName || '________________________________________________'}</strong>.</p>
                                <p>2. The nature and purpose of the operation, possible alternative methods of treatment, restrictions on lifestyle, and the risks involved have been fully explained to me.</p>
                                <p>3. I understand that during the course of the operation, unforeseen conditions may arise which necessitate procedures different from those contemplated. I therefore consent to the performance of such other procedures as the surgeon may deem necessary in the exercise of their professional judgment.</p>
                                <p>4. I consent to the administration of anesthesia as may be considered necessary perform the procedure.</p>
                                <p>5. I consent to the disposal of any tissue or parts that may be removed during the procedure.</p>
                            </div>
                        )}

                        {formType === 'high_risk' && (
                            <div>
                                <p className="fw-bold">WARNING: HIGH RISK PROCEDURE / CONDITION</p>
                                <p>1. I have been informed that the condition of the patient / the proposed procedure carries a <strong>HIGH RISK</strong> to life/limb.</p>
                                <p>2. The critical nature of the illness and the potential complications, including but not limited to cardiac arrest, respiratory failure, or death, have been explained to me in a language I understand.</p>
                                <p>3. Despite understanding these risks, I request the medical team to proceed with the necessary life-saving treatment/procedure.</p>
                                <p>4. I will not hold the hospital or the medical team liable for any unfortunate outcome arising from the severity of the underlying condition.</p>
                            </div>
                        )}

                    </div>

                    {/* Signature Block */}
                    <div className="mt-5 pt-4">
                        <Row className="mb-5">
                            <Col xs={6}>
                                <div className="border-top border-dark pt-2" style={{ width: '80%' }}>
                                    <strong>Signature of Patient / Guardian</strong>
                                    <br/><small className="text-muted">Name: ______________________</small>
                                    <br/><small className="text-muted">Relation: ___________________</small>
                                </div>
                            </Col>
                            <Col xs={6} className="text-end">
                                <div className="d-flex flex-column align-items-end">
                                    <div className="border-top border-dark pt-2 text-start" style={{ width: '80%' }}>
                                        <strong>Signature of Doctor</strong>
                                        <br/><small className="text-muted">Date: {new Date().toLocaleDateString('en-IN')}</small>
                                        <br/><small className="text-muted">Time: _________________</small>
                                    </div>
                                </div>
                            </Col>
                        </Row>

                        <div className="border-top border-dark pt-4 w-50">
                             <strong>Witness</strong>
                             <br/>
                             {witnessName ? <span>{witnessName}</span> : '______________________'}
                        </div>
                    </div>

                    <div className="text-center mt-5">
                        <QRCodeSVG value={qrData} size={60} />
                    </div>

                    <HospitalPrintFooter showTimestamp={true} />
                </div>
            </Modal.Body>
            <Modal.Footer className="bg-light no-print">
                <Button variant="outline-secondary" onClick={onHide}>Close</Button>
                <Button variant="primary" onClick={handlePrint}>
                    <Printer size={16} className="me-2" />
                    Print Consent Form
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ConsentFormPrint;
