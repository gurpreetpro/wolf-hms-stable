import React from 'react';
import { Modal, Button, Row, Col, Table } from 'react-bootstrap';
import { Printer, X } from 'lucide-react';
import { HospitalPrintHeader, HospitalPrintFooter } from './print';

const formatDateTime = (dateVal) => {
    if (!dateVal) return 'N/A';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true
    });
};

const AceEchoReport = ({
    show, onHide, labResult, patientName, testName, testDate,
    sampleType, technicianName, pathologistName, uhid, age, gender, doctorName
}) => {
    if (!labResult) return null;

    const handlePrint = () => window.print();

    // Parse values from JSON, ignoring standard keys like 'status'
    const getVal = (key) => labResult[key]?.value || labResult[key] || '';

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="bg-primary text-white border-0 no-print">
                <Modal.Title>Ace Hospital - {testName || 'Echocardiography'} Report</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                <div className="p-4 font-monospace small" id="lab-report-print-area">
                    <HospitalPrintHeader title={testName || 'ECHOCARDIOGRAPHY REPORT'} />

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
                                    <td colSpan="6"><strong>DATE:</strong> {formatDateTime(testDate)}</td>
                                </tr>
                                <tr>
                                    <td colSpan="12"><strong>CLINICIAN I/C:</strong> {doctorName || 'Dr. Puneet K. Verma'}</td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>

                    <h6 className="text-center fw-bold text-decoration-underline mb-4 uppercase">{testName || 'ECHOCARDIOGRAPHY REPORT'}</h6>

                    <Row className="mb-4">
                        <Col md={12}>
                            <h6 className="fw-bold">PARAMETERS <span className="float-end">(NORMAL VALUES)</span></h6>
                            <div className="d-flex justify-content-between border-bottom pb-1 mb-1">
                                <span>Left Ventricular ED Dimension</span>
                                <span>{getVal('LVEDD')} cm <span className="text-muted ms-3">(3.7-5.6cm)</span></span>
                            </div>
                            <div className="d-flex justify-content-between border-bottom pb-1 mb-1">
                                <span>Left Ventricular ES Dimension</span>
                                <span>{getVal('LVESD')} cm <span className="text-muted ms-3">(2.2-4.0cm)</span></span>
                            </div>
                            <div className="d-flex justify-content-between border-bottom pb-1 mb-1">
                                <span>Right Ventricular ED Dimension</span>
                                <span>{getVal('RVEDD')} cm <span className="text-muted ms-3">(0.7-2.6cm)</span></span>
                            </div>
                            <div className="d-flex justify-content-between border-bottom pb-1 mb-1">
                                <span>Inter Vent. septum thickness (D)</span>
                                <span>{getVal('IVSD')} cm <span className="text-muted ms-3">(0.6-1.1cm)</span></span>
                            </div>
                            <div className="d-flex justify-content-between border-bottom pb-1 mb-1">
                                <span>LV posterior wall thickness (D)</span>
                                <span>{getVal('LVPWD')} cm <span className="text-muted ms-3">(0.6-1.1cm)</span></span>
                            </div>
                            <div className="d-flex justify-content-between border-bottom pb-1 mb-1">
                                <span>Aortic root diameter</span>
                                <span>{getVal('AoRoot')} cm <span className="text-muted ms-3">(2.0-3.7cm)</span></span>
                            </div>
                            <div className="d-flex justify-content-between border-bottom pb-1 mb-1">
                                <span>Left atrial diameter</span>
                                <span>{getVal('LA')} cm <span className="text-muted ms-3">(1.9-4.0cm)</span></span>
                            </div>
                        </Col>
                    </Row>

                    <Row className="mb-4">
                        <Col md={12}>
                            <h6 className="fw-bold">INDICES OF LEFT VENTRICULAR FUNCTION</h6>
                            <div className="d-flex justify-content-between border-bottom pb-1 mb-1">
                                <span>Ejection Fraction</span>
                                <span>{getVal('EF')} % <span className="text-muted ms-3">(54-76%)</span></span>
                            </div>
                            <div className="d-flex justify-content-between border-bottom pb-1 mb-1">
                                <span>Fractional shortening</span>
                                <span>{getVal('FS')} % <span className="text-muted ms-3">(25-46%)</span></span>
                            </div>
                        </Col>
                    </Row>

                    <Row className="mb-4">
                        <Col md={12}>
                            <h6 className="fw-bold">CARDIAC VALVES:</h6>
                            <p>{getVal('Valves') || 'Normal.'}</p>

                            <h6 className="fw-bold text-uppercase mt-3">LEFT VENTRICLE:</h6>
                            <p>{getVal('LV_Findings') || 'No hypertrophy, no regional wall motion abnormality.'}</p>

                            <h6 className="fw-bold text-uppercase mt-3">PULSE & CONTINUOUS WAVE DOPPLER:</h6>
                            <p className="mb-1" style={{ whiteSpace: 'pre-wrap' }}>
                                {getVal('Doppler') || 'No mitral regurgitation.\nNo aortic regurgitation.\nNo tricuspid regurgitation.\nNo pulmonary regurgitation.'}
                            </p>
                        </Col>
                    </Row>

                    {/* Signatures */}
                    <Row className="mt-5 pt-4">
                        <Col xs={6}>
                            <strong>{doctorName || 'Dr. Puneet K. Verma'}</strong><br />
                            <small>MD, DNB, DM<br />Senior Consultant Cardiology</small>
                        </Col>
                        <Col xs={6} className="text-end">
                            <strong>{technicianName || 'Medical Officer'}</strong><br />
                            <small>Technologist</small>
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
}

export default AceEchoReport;
