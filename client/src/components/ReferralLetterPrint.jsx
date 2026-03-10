import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { Printer, X, Send } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { HospitalPrintHeader, HospitalPrintFooter } from './print';
import useHospitalProfile from '../hooks/useHospitalProfile';
import '../styles/print.css';

const ReferralLetterPrint = ({ show, onHide, patient, doctorName, diagnosis }) => {
    const { hospitalProfile } = useHospitalProfile();
    
    const [referTo, setReferTo] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [reason, setReason] = useState('');
    const [remarks, setRemarks] = useState('');

    const handlePrint = () => window.print();

    if (!patient) return null;

    const qrData = JSON.stringify({
        type: 'referral',
        patient: patient.name,
        to: referTo,
        date: new Date().toISOString()
    });

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className="referral-print-modal">
            <Modal.Header closeButton className="bg-primary text-white border-0 no-print">
                <Modal.Title className="d-flex align-items-center">
                    <Send size={24} className="me-2" />
                    Print Referral Letter
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                {/* Configuration (No Print) */}
                <div className="p-3 bg-light border-bottom no-print">
                    <Row className="g-3">
                        <Col md={4}>
                            <Form.Label className="small fw-bold">Refer To (Doctor/Hospital)</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm" 
                                placeholder="e.g. Dr. Smith / City Hospital"
                                value={referTo}
                                onChange={(e) => setReferTo(e.target.value)}
                            />
                        </Col>
                        <Col md={3}>
                            <Form.Label className="small fw-bold">Department / Specialty</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm" 
                                placeholder="e.g. Cardiology"
                                value={specialty}
                                onChange={(e) => setSpecialty(e.target.value)}
                            />
                        </Col>
                        <Col md={5}>
                             <Form.Label className="small fw-bold">Reason for Referral</Form.Label>
                             <Form.Control 
                                type="text" 
                                size="sm" 
                                placeholder="e.g. Further management of..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </Col>
                        <Col md={12}>
                             <Form.Label className="small fw-bold">Clinical Findings / Remarks</Form.Label>
                             <Form.Control 
                                as="textarea" 
                                rows={2}
                                size="sm" 
                                placeholder="Summary of findings..."
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                            />
                        </Col>
                    </Row>
                </div>

                {/* Printable Content */}
                <div className="referral-content p-5" id="referral-print-area">
                    <HospitalPrintHeader title="REFERRAL LETTER" />

                    <div className="mb-4 d-flex justify-content-between">
                        <div>
                             <strong>Date: </strong> {new Date().toLocaleDateString('en-IN')}
                        </div>
                        <div className="text-end">
                             <strong>Ref No: </strong> REF-{new Date().getTime().toString().slice(-6)}
                        </div>
                    </div>

                    <div className="mb-4">
                        <p className="mb-1">To,</p>
                        <strong className="fs-5">{referTo || '________________________'}</strong>
                        <div className="text-muted">{specialty || '________________________'}</div>
                    </div>

                    <div className="mb-4">
                        <strong>Re: Referral for patient {patient.name}</strong>
                    </div>

                    <div className="mb-5" style={{ lineHeight: '1.8' }}>
                         <p>Dear Doctor / Colleague,</p>
                         <p>
                             I am referring this patient, <strong>{patient.name}</strong>, 
                             Age <strong>{patient.age}</strong> / <strong>{patient.gender}</strong>, 
                             Patient ID <strong>{patient.id}</strong>, 
                             under your care for <strong>{reason || 'further evaluation and management'}</strong>.
                         </p>

                         {diagnosis && (
                             <div className="mb-3">
                                 <strong>Provisional Diagnosis: </strong> {diagnosis}
                             </div>
                         )}

                         {remarks && (
                             <div className="mb-3">
                                 <strong>Clinical Notes: </strong>
                                 <p className="mt-1">{remarks}</p>
                             </div>
                         )}

                         <p>
                             Kindly do the needful and oblige.
                         </p>
                    </div>

                    <div className="mt-5 pt-5">
                         <Row>
                            <Col xs={6}>
                                <div className="d-flex align-items-center gap-3">
                                    <QRCodeSVG value={qrData} size={70} />
                                </div>
                            </Col>
                            <Col xs={6} className="text-end">
                                <h6 className="fw-bold mb-0">{doctorName || 'Medical Officer'}</h6>
                                <small className="text-muted">Signature & Stamp</small>
                                <br/>
                                <small className="text-muted">{hospitalProfile?.name}</small>
                            </Col>
                         </Row>
                    </div>

                    <HospitalPrintFooter 
                        showTimestamp={true} 
                        disclaimer="Referral letter issued for continuity of care."
                    />
                </div>
            </Modal.Body>
             <Modal.Footer className="bg-light no-print">
                <Button variant="outline-secondary" onClick={onHide}>Close</Button>
                <Button variant="primary" onClick={handlePrint}>
                    <Printer size={16} className="me-2" />
                    Print Referral
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ReferralLetterPrint;
