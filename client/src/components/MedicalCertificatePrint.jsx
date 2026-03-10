import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col } from 'react-bootstrap';
import { Printer, X, FileText, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { HospitalPrintHeader, HospitalPrintFooter } from './print';
import useHospitalProfile from '../hooks/useHospitalProfile';
import '../styles/print.css';

const MedicalCertificatePrint = ({ show, onHide, patient, doctorName }) => {
    const { hospitalProfile } = useHospitalProfile();
    const [certificateType, setCertificateType] = useState('sick_leave'); // 'sick_leave' | 'fitness'

    // Helper function to get default dates
    const getDefaultStartDate = () => new Date().toISOString().split('T')[0];
    const getDefaultResumeDate = () => {
        const d = new Date();
        d.setDate(d.getDate() + 2);
        return d.toISOString().split('T')[0];
    };

    const [formData, setFormData] = useState({
        diagnosis: '',
        startDate: getDefaultStartDate(),
        days: 3,
        remarks: '',
        resumeDate: getDefaultResumeDate()
    });

    const handlePrint = () => window.print();

    // QR Data
    const qrData = JSON.stringify({
        type: certificateType,
        patient: patient?.name || patient?.patient_name,
        date: new Date().toISOString(),
        issuer: hospitalProfile?.name
    });

    // Dynamic Title
    const getTitle = () => certificateType === 'sick_leave' ? 'MEDICAL SICK LEAVE CERTIFICATE' : 'MEDICAL FITNESS CERTIFICATE';

    if (!patient) return null;

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className="medical-certificate-modal">
            <Modal.Header closeButton className="bg-primary text-white border-0 no-print">
                <Modal.Title className="d-flex align-items-center">
                    <FileText size={24} className="me-2" />
                    Print Medical Certificate
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                {/* Configuration Form (No Print) */}
                <div className="p-3 bg-light border-bottom no-print">
                    <Row className="g-3">
                        <Col md={3}>
                            <Form.Label className="small fw-bold">Certificate Type</Form.Label>
                            <Form.Select 
                                value={certificateType}
                                onChange={(e) => setCertificateType(e.target.value)}
                                size="sm"
                            >
                                <option value="sick_leave">Sick Leave</option>
                                <option value="fitness">Fitness / Return to Work</option>
                            </Form.Select>
                        </Col>
                        <Col md={3}>
                            <Form.Label className="small fw-bold">Diagnosis / Reason</Form.Label>
                            <Form.Control 
                                type="text" 
                                size="sm"
                                placeholder="e.g. Viral Fever"
                                value={formData.diagnosis}
                                onChange={(e) => setFormData({...formData, diagnosis: e.target.value})}
                            />
                        </Col>
                        {certificateType === 'sick_leave' ? (
                            <>
                                <Col md={3}>
                                    <Form.Label className="small fw-bold">Start Date</Form.Label>
                                    <Form.Control 
                                        type="date" 
                                        size="sm"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                    />
                                </Col>
                                <Col md={3}>
                                    <Form.Label className="small fw-bold">Duration (Days)</Form.Label>
                                    <Form.Control 
                                        type="number" 
                                        size="sm"
                                        value={formData.days}
                                        onChange={(e) => setFormData({...formData, days: e.target.value})}
                                    />
                                </Col>
                            </>
                        ) : (
                            <Col md={3}>
                                <Form.Label className="small fw-bold">Fit to Resume From</Form.Label>
                                <Form.Control 
                                    type="date" 
                                    size="sm"
                                    value={formData.resumeDate}
                                    onChange={(e) => setFormData({...formData, resumeDate: e.target.value})}
                                />
                            </Col>
                        )}
                    </Row>
                </div>

                {/* Printable Content */}
                <div className="certificate-content p-5" id="certificate-print-area">
                    <HospitalPrintHeader title={getTitle()} />

                    <div className="mt-5 mb-5" style={{ lineHeight: '2.5', fontSize: '1.1rem' }}>
                        {certificateType === 'sick_leave' ? (
                            <p className="text-justify">
                                This is to certify that <strong>{patient.name || patient.patient_name}</strong>, 
                                Age <strong>{patient.age || 'N/A'}</strong> Years, 
                                Gender <strong>{patient.gender || 'N/A'}</strong>, 
                                R/o <strong>{patient.address || '____________________'}</strong>, 
                                was under my treatment/observation for <strong>{formData.diagnosis || '____________________'}</strong> 
                                from <strong>{new Date(formData.startDate).toLocaleDateString('en-IN')}</strong>.
                                <br /><br />
                                He/She is advised to take rest for <strong>{formData.days}</strong> days 
                                w.e.f. <strong>{new Date(formData.startDate).toLocaleDateString('en-IN')}</strong>.
                            </p>
                        ) : (
                            <p className="text-justify">
                                This is to certify that <strong>{patient.name || patient.patient_name}</strong>, 
                                Age <strong>{patient.age || 'N/A'}</strong> Years, 
                                Gender <strong>{patient.gender || 'N/A'}</strong>, 
                                was under my treatment for <strong>{formData.diagnosis || '____________________'}</strong>.
                                <br /><br />
                                Based on my examination, he/she has recovered and is medically fit to resume 
                                duties/work from <strong>{new Date(formData.resumeDate).toLocaleDateString('en-IN')}</strong>.
                            </p>
                        )}
                    </div>

                    <Row className="mt-5 pt-5">
                       <Col md={8}>
                            <div className="d-flex align-items-center gap-3">
                                <QRCodeSVG value={qrData} size={80} level="M" />
                                <div className="text-muted small lh-1">
                                    Scan to verify<br/>
                                    authenticity
                                </div>
                            </div>
                       </Col>
                       <Col md={4} className="text-end">
                            <div style={{ minHeight: '60px' }}></div>
                            <h6 className="fw-bold mb-0">{doctorName || 'Medical Officer'}</h6>
                            <small className="text-muted">Signature & Stamp</small>
                            <br/>
                            <small className="text-muted">{hospitalProfile?.name}</small>
                       </Col>
                    </Row>

                    <HospitalPrintFooter 
                        showTimestamp={true} 
                        disclaimer="This certificate is issued for medical purposes only."
                    />
                </div>
            </Modal.Body>
            <Modal.Footer className="bg-light no-print">
                <Button variant="outline-secondary" onClick={onHide}>Close</Button>
                <Button variant="primary" onClick={handlePrint}>
                    <Printer size={16} className="me-2" />
                    Print Certificate
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default MedicalCertificatePrint;
