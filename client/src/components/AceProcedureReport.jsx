import React from 'react';
import { Modal, Button, Row, Col, Table } from 'react-bootstrap';
import { Printer, X } from 'lucide-react';
import { HospitalPrintHeader, HospitalPrintFooter } from './print';

const formatDateTime = (dateVal) => {
    if (!dateVal) return 'N/A';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
};

const AceProcedureReport = ({
    show, onHide, resultData, patientName, procedureName, procedureDate,
    uhid, age, gender, doctorName
}) => {
    if (!resultData) return null;

    const handlePrint = () => window.print();

    const getVal = (key) => resultData[key]?.value || resultData[key] || '';

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="bg-primary text-white border-0 no-print">
                <Modal.Title>Ace Hospital - {procedureName || 'Procedure'} Report</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                <div className="p-4 font-monospace" id="lab-report-print-area" style={{ fontSize: '13px' }}>
                    <HospitalPrintHeader title="" />

                    {/* Header Table */}
                    <div className="border border-dark mb-4 mt-3">
                        <Table bordered size="sm" className="mb-0 border-dark" style={{ borderCollapse: 'collapse', borderColor: 'black' }}>
                            <tbody>
                                <tr>
                                    <td colSpan="6"><strong>NAME:</strong> {patientName}</td>
                                    <td colSpan="3"><strong>AGE:</strong> {age || 'N/A'}</td>
                                    <td colSpan="3"><strong>SEX:</strong> {gender || 'N/A'}</td>
                                </tr>
                                <tr>
                                    <td colSpan="6"><strong>PPIN:</strong> {uhid}</td>
                                    <td colSpan="6"><strong>DATE:</strong> {formatDateTime(procedureDate)}</td>
                                </tr>
                                <tr>
                                    <td colSpan="12"><strong>CLINICIAN I/C:</strong> {doctorName || 'Dr. Puneet K. Verma'}</td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>

                    <h5 className="text-center fw-bold mb-1">INVASIVE AND INTERVENTIONAL CARDIOLOGY</h5>
                    <h6 className="text-center text-decoration-underline fw-bold mb-4 uppercase">{procedureName || 'PROCEDURE NOTE'}</h6>

                    <Row className="mb-3">
                        <Col md={12}>
                            <Table borderless size="sm" className="mb-0">
                                <tbody>
                                    <tr>
                                        <td style={{ width: '25%' }}><strong>Diagnosis</strong></td>
                                        <td style={{ width: '5%' }}>:</td>
                                        <td>{getVal('Diagnosis') || 'To be filled'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Procedure</strong></td>
                                        <td>:</td>
                                        <td>{getVal('Procedure') || procedureName}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Route / Access</strong></td>
                                        <td>:</td>
                                        <td>{getVal('Route') || 'Femoral / Radial'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Hardware / Device Used</strong></td>
                                        <td>:</td>
                                        <td>{getVal('Hardware') || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Catheters & Sheath</strong></td>
                                        <td>:</td>
                                        <td>{getVal('Catheters') || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Guide Wire</strong></td>
                                        <td>:</td>
                                        <td>{getVal('GuideWire') || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Fluoro Time</strong></td>
                                        <td>:</td>
                                        <td>{getVal('FluoroTime') || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Radiation Dose</strong></td>
                                        <td>:</td>
                                        <td>{getVal('RadiationDose') || '-'}</td>
                                    </tr>
                                </tbody>
                            </Table>
                        </Col>
                    </Row>

                    <Row className="mb-4 mt-3 border-top pt-3">
                        <Col md={12}>
                            <h6 className="fw-bold text-decoration-underline">PROCEDURE DETAILS:</h6>
                            <div className="ps-2 mt-2" style={{ whiteSpace: 'pre-wrap' }}>
                                {getVal('ProcedureDetails') || getVal('impression') || 'Detailed procedure notes to be documented.'}
                            </div>
                        </Col>
                    </Row>

                    {/* Signatures */}
                    <Row className="mt-5 pt-4">
                        <Col xs={6}>
                            <strong>{doctorName || 'Dr. Puneet K. Verma'}</strong><br />
                            <small>MD, DNB, DM<br />FCSI, FSCAI, FACC, FESC<br />Senior Consultant<br />Clinical & Interventional Cardiology</small>
                        </Col>
                    </Row>
                    
                    <HospitalPrintFooter showTimestamp={true} />
                </div>
            </Modal.Body>
            <Modal.Footer className="bg-light no-print">
                <Button variant="outline-secondary" onClick={onHide}>
                    <X size={16} className="me-2" /> Close
                </Button>
                <Button variant="primary" onClick={handlePrint}>
                    <Printer size={16} className="me-2" /> Print Report
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default AceProcedureReport;
