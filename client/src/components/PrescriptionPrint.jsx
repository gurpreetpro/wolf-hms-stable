import React, { useMemo } from 'react';
import { Modal, Button, Row, Col, Table } from 'react-bootstrap';
import { Printer, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { HospitalPrintHeader, HospitalPrintFooter } from './print';
import '../styles/print.css';

const PrescriptionPrint = ({ show, onHide, patient, prescriptions, diagnosis, doctor, doctorRegNo, visitDate, vitals }) => {
    // Generate prescription number - hooks must be called before early return
    // Generate prescription number - hooks must be called before early return
    const [prescriptionNumber] = React.useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const random = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
        return `RX-${year}${month}${day}-${random}`;
    });

    // QR code data
    const qrData = useMemo(() => JSON.stringify({
        rx: prescriptionNumber,
        patient: patient?.patient_name || patient?.name || 'Unknown',
        date: new Date().toISOString()
    }), [prescriptionNumber, patient]);

    // Early return after all hooks
    if (!patient || !prescriptions) return null;

    const handlePrint = () => {
        window.print();
    };

    // Calculate estimated end date for each medication
    const getMedicationSchedule = (rx) => {
        const freq = rx.freq || 'OD';
        let timings = '';
        switch (freq) {
            case 'OD': timings = 'Once daily (Morning)'; break;
            case 'BD/BID': timings = 'Twice daily (Morning & Night)'; break;
            case 'TID': timings = 'Three times daily (Morning, Afternoon, Night)'; break;
            case 'QID': timings = 'Four times daily'; break;
            case 'PRN': timings = 'As needed'; break;
            default: timings = freq;
        }
        return timings;
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className="prescription-print-modal">
            <Modal.Header closeButton className="bg-primary text-white border-0 no-print">
                <Modal.Title className="d-flex align-items-center">
                    <Printer size={24} className="me-2" />
                    Prescription Preview
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                <div className="prescription-content p-4" id="prescription-print-area">
                    {/* Standardized Hospital Header */}
                    <HospitalPrintHeader title="PRESCRIPTION" />

                    {/* Two Column: Patient Info + QR Code */}
                    <Row className="mb-4">
                        <Col md={8}>
                            {/* Patient Details */}
                            <div className="border rounded p-3 mb-3">
                                <Row>
                                    <Col xs={6} className="mb-2">
                                        <small className="text-muted d-block">Patient Name</small>
                                        <strong className="fs-5">{patient.patient_name || patient.name}</strong>
                                    </Col>
                                    <Col xs={6} className="mb-2">
                                        <small className="text-muted d-block">Patient ID</small>
                                        <strong>{patient.patient_number || patient.patient_id?.slice(0, 8) || 'N/A'}</strong>
                                    </Col>
                                    <Col xs={4} className="mb-2">
                                        <small className="text-muted d-block">Age/Gender</small>
                                        <span>{patient.age || (patient.dob ? new Date().getFullYear() - new Date(patient.dob).getFullYear() : 'N/A')} yrs / {patient.gender || 'N/A'}</span>
                                    </Col>
                                    <Col xs={4} className="mb-2">
                                        <small className="text-muted d-block">Date</small>
                                        <span>{visitDate || new Date().toLocaleDateString('en-IN', {
                                            day: '2-digit', month: 'short', year: 'numeric'
                                        })}</span>
                                    </Col>
                                    <Col xs={4} className="mb-2">
                                        <small className="text-muted d-block">Rx No.</small>
                                        <strong className="text-primary">{prescriptionNumber}</strong>
                                    </Col>
                                </Row>
                            </div>

                            {/* Vitals Section (New) */}
                            {vitals && (
                                <div className="border rounded p-2 mb-3 bg-light">
                                    <Row className="text-center small">
                                        <Col><span className="text-muted">BP:</span> <strong>{vitals.bp || 'N/A'}</strong></Col>
                                        <Col><span className="text-muted">Pulse:</span> <strong>{vitals.heart_rate || 'N/A'}</strong></Col>
                                        <Col><span className="text-muted">Temp:</span> <strong>{vitals.temp ? `${vitals.temp}°F` : 'N/A'}</strong></Col>
                                        <Col><span className="text-muted">Weight:</span> <strong>{vitals.weight ? `${vitals.weight} kg` : 'N/A'}</strong></Col>
                                        <Col><span className="text-muted">SpO2:</span> <strong>{vitals.spo2 ? `${vitals.spo2}%` : 'N/A'}</strong></Col>
                                    </Row>
                                </div>
                            )}

                            {/* Diagnosis */}
                            <div className="bg-light p-3 rounded mb-3">
                                <small className="text-muted d-block mb-1">Clinical Diagnosis</small>
                                <strong>{diagnosis || 'Under evaluation'}</strong>
                            </div>
                        </Col>

                        {/* QR Code */}
                        <Col md={4} className="text-center">
                            <div className="border rounded p-3 h-100 d-flex flex-column justify-content-center align-items-center">
                                <QRCodeSVG
                                    value={qrData}
                                    size={100}
                                    level="M"
                                    includeMargin={true}
                                />
                                <small className="text-muted mt-2">Scan for verification</small>
                            </div>
                        </Col>
                    </Row>

                    {/* Rx Symbol and Medications */}
                    <div className="mb-4">
                        <div className="d-flex align-items-center mb-3">
                            <span className="display-6 text-primary me-3" style={{ fontFamily: 'serif', fontWeight: 'bold' }}>℞</span>
                            <h5 className="fw-bold mb-0">Medications</h5>
                        </div>

                        <Table bordered className="prescription-table">
                            <thead className="table-light">
                                <tr>
                                    <th style={{ width: '5%' }}>#</th>
                                    <th style={{ width: '30%' }}>Medicine</th>
                                    <th style={{ width: '15%' }}>Dosage</th>
                                    <th style={{ width: '35%' }}>Instructions</th>
                                    <th style={{ width: '15%' }}>Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prescriptions.filter(rx => rx.name?.trim()).map((rx, index) => (
                                    <tr key={index}>
                                        <td className="text-center fw-bold">{index + 1}</td>
                                        <td>
                                            <strong>{rx.name}</strong>
                                            {rx.dose && <span className="text-muted ms-1">({rx.dose})</span>}
                                        </td>
                                        <td>{rx.dose || '-'}</td>
                                        <td className="small">{getMedicationSchedule(rx)}</td>
                                        <td>{rx.duration || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>

                    {/* Instructions */}
                    <div className="bg-light border rounded p-3 mb-4">
                        <h6 className="fw-bold mb-2">📋 General Instructions</h6>
                        <ul className="small mb-0 ps-3">
                            <li>Take medicines as prescribed with water</li>
                            <li>Complete the full course of medication</li>
                            <li>Report any adverse reactions immediately</li>
                            <li>Store medicines in a cool, dry place</li>
                            <li>Follow-up if symptoms persist after completing the course</li>
                        </ul>
                    </div>

                    {/* Doctor Signature */}
                    <Row className="mt-4">
                        <Col xs={6}>
                            <div className="border-top pt-2">
                                <small className="text-muted d-block">Next Visit / Follow-up</small>
                                <span>As advised</span>
                            </div>
                        </Col>
                        <Col xs={6} className="text-end">
                            <div className="border-top pt-2">
                                <div style={{ minHeight: '40px' }}></div>
                                <strong>{doctor || 'Consulting Physician'}</strong>
                                <small className="text-muted d-block">{doctorRegNo ? `Reg. No: ${doctorRegNo}` : 'Reg. No: _________________'}</small>
                                <small className="text-muted d-block">Signature & Stamp</small>
                            </div>
                        </Col>
                    </Row>

                    {/* Standardized Footer */}
                    <HospitalPrintFooter 
                        showTimestamp={true}
                        disclaimer="This is a computer-generated prescription. Valid for 7 days from date of issue."
                    />
                </div>
            </Modal.Body>
            <Modal.Footer className="bg-light no-print">
                <Button variant="outline-secondary" onClick={onHide}>
                    <X size={16} className="me-2" />
                    Close
                </Button>
                <Button variant="primary" onClick={handlePrint}>
                    <Printer size={16} className="me-2" />
                    Print Prescription
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default PrescriptionPrint;
