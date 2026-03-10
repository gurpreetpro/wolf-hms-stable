import React, { useState, useMemo } from 'react';
import { Modal, Button, Row, Col, Table, Badge } from 'react-bootstrap';
import { Printer, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import useHospitalProfile from '../hooks/useHospitalProfile';
import AceEchoReport from './AceEchoReport';
import AceProcedureReport from './AceProcedureReport';
import '../styles/print.css';

// Normal ranges for common lab tests
const normalRanges = {
    hemoglobin: { min: 12, max: 16, unit: 'g/dL' },
    wbc: { min: 4500, max: 11000, unit: '/µL' },
    rbc: { min: 4.5, max: 5.5, unit: 'million/µL' },
    platelets: { min: 150000, max: 400000, unit: '/µL' },
    blood_sugar: { min: 70, max: 100, unit: 'mg/dL' },
    creatinine: { min: 0.7, max: 1.3, unit: 'mg/dL' },
    urea: { min: 7, max: 20, unit: 'mg/dL' },
    sgpt: { min: 7, max: 56, unit: 'U/L' },
    sgot: { min: 10, max: 40, unit: 'U/L' },
    cholesterol: { min: 0, max: 200, unit: 'mg/dL' },
    triglycerides: { min: 0, max: 150, unit: 'mg/dL' },
    sodium: { min: 136, max: 145, unit: 'mEq/L' },
    potassium: { min: 3.5, max: 5.0, unit: 'mEq/L' }
};

const LabReportPrint = ({ show, onHide, labResult, patientName, testName, testDate, sampleType, technicianName, pathologistName }) => {
    // We expect the JSON result in `labResult` (could be object or flat array)
    const [parsedResult, setParsedResult] = useState(null);
    const { hospitalProfile, getFormattedAddress, getContactString } = useHospitalProfile();

    // Generate report number - hooks must be called before early return
    // Generate report number - use useState for stable ID (pure)
    const [reportNumber] = useState(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const random = String(Date.now() % 9999).toString().padStart(4, '0');
        return `LAB-${year}${month}${day}-${random}`;
    });



    // Check if value is within normal range
    const getValueStatus = (key, value) => {
        const range = normalRanges[key.toLowerCase()];
        if (!range) return 'normal';

        const numValue = parseFloat(value);
        if (isNaN(numValue)) return 'normal';

        if (numValue < range.min) return 'low';
        if (numValue > range.max) return 'high';
        return 'normal';
    };

    // Format test name for display
    const formatTestName = (key) => {
        const nameMap = {
            hemoglobin: 'Hemoglobin',
            wbc: 'WBC Count',
            rbc: 'RBC Count',
            platelets: 'Platelet Count',
            blood_sugar: 'Blood Sugar (Fasting)',
            creatinine: 'Serum Creatinine',
            urea: 'Blood Urea',
            sgpt: 'SGPT (ALT)',
            sgot: 'SGOT (AST)',
            cholesterol: 'Total Cholesterol',
            triglycerides: 'Triglycerides',
            sodium: 'Sodium',
            potassium: 'Potassium',
            impression: 'Impression/Notes'
        };
        return nameMap[key.toLowerCase()] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
    };

    // Get normal range text
    const getNormalRangeText = (key) => {
        const range = normalRanges[key.toLowerCase()];
        if (!range) return '-';
        return `${range.min} - ${range.max} ${range.unit}`;
    };

    const handlePrint = () => {
        window.print();
    };

    // Parse result data
    const resultEntries = useMemo(() => {
        if (!labResult) return [];
        if (typeof labResult === 'object' && labResult !== null) return Object.entries(labResult);
        if (typeof labResult === 'string') {
            try {
                const parsed = JSON.parse(labResult);
                if (parsed && typeof parsed === 'object') return Object.entries(parsed);
            } catch (e) {
                console.error('Invalid labResult JSON:', e);
            }
        }
        return [];
    }, [labResult]);


    // QR code data
    const qrData = JSON.stringify({
        patient: patientName,
        reportNo: reportNumber,
        date: testDate,
        url: `${window.location.origin}/verify/report/${reportNumber}`
    });

    if (!labResult) return null;

    if (hospitalProfile?.theme === 'ace-cardiac') {
        const tName = testName?.toLowerCase() || '';
        if (tName.includes('echo')) {
            return (
                <AceEchoReport
                    show={show} onHide={onHide} labResult={labResult}
                    patientName={patientName} testName={testName} testDate={testDate}
                    sampleType={sampleType} technicianName={technicianName}
                    pathologistName={pathologistName} uhid={labResult?.uhid || ''}
                    age={labResult?.age || ''} gender={labResult?.gender || ''}
                    doctorName={labResult?.doctorName || ''}
                />
            );
        }
        
        if (tName.includes('angio') || tName.includes('ppi') || tName.includes('mitraclip') || tName.includes('pacemaker') || tName.includes('cath')) {
            return (
                <AceProcedureReport
                    show={show} onHide={onHide} resultData={labResult}
                    patientName={patientName} procedureName={testName} procedureDate={testDate}
                    uhid={labResult?.uhid || ''} age={labResult?.age || ''} gender={labResult?.gender || ''}
                    doctorName={labResult?.doctorName || ''}
                />
            );
        }
    }

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className="lab-report-print-modal">
            <Modal.Header closeButton className="bg-info text-white border-0 no-print">
                <Modal.Title className="d-flex align-items-center">
                    <Printer size={24} className="me-2" />
                    Lab Report Preview
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                <div className="lab-report-content p-4" id="lab-report-print-area">
                    {/* Hospital Header */}
                    <div className="text-center border-bottom pb-3 mb-3">
                        {hospitalProfile?.logo_url && (
                            <img src={hospitalProfile.logo_url} alt="Hospital Logo" style={{ maxHeight: '60px', marginBottom: '10px' }} />
                        )}
                        <h2 className="fw-bold text-primary mb-1">🏥 {hospitalProfile?.name || 'Hospital Name'}</h2>
                        <p className="text-muted small mb-0">{getFormattedAddress()}</p>
                        <p className="text-muted small mb-0">{getContactString()}</p>
                        <div className="mt-2 pt-2 border-top">
                            <span className="badge bg-info fs-6">LABORATORY REPORT</span>
                        </div>
                    </div>

                    {/* Two Column: Patient Info + QR Code */}
                    <Row className="mb-4">
                        <Col md={8}>
                            <div className="border rounded p-3">
                                <Row>
                                    <Col xs={6} className="mb-2">
                                        <small className="text-muted d-block">Patient Name</small>
                                        <strong className="fs-5">{patientName || 'N/A'}</strong>
                                    </Col>
                                    <Col xs={6} className="mb-2">
                                        <small className="text-muted d-block">Report No.</small>
                                        <strong className="text-info">{reportNumber}</strong>
                                    </Col>
                                    <Col xs={6} className="mb-2">
                                        <small className="text-muted d-block">Test Name</small>
                                        <strong>{testName || 'Laboratory Test'}</strong>
                                    </Col>
                                    <Col xs={6} className="mb-2">
                                        <small className="text-muted d-block">Report Date</small>
                                        <span>{testDate ? new Date(testDate).toLocaleDateString('en-IN', {
                                            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                        }) : new Date().toLocaleDateString('en-IN')}</span>
                                    </Col>
                                    <Col xs={6} className="mb-2">
                                        <small className="text-muted d-block">Sample Type</small>
                                        <span>{sampleType || 'Blood Sample'}</span>
                                    </Col>
                                    <Col xs={6} className="mb-2">
                                        <small className="text-muted d-block">Collection Time</small>
                                        <span>{testDate ? new Date(new Date(testDate).getTime() - 7200000).toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'}) : '--:--'}</span>
                                    </Col>
                                </Row>
                            </div>
                        </Col>

                        {/* QR Code */}
                        <Col md={4} className="text-center">
                            <div className="border rounded p-3 h-100 d-flex flex-column justify-content-center align-items-center">
                                <QRCodeSVG
                                    value={qrData}
                                    size={80}
                                    level="M"
                                    includeMargin={true}
                                />
                                <small className="text-muted mt-2">Scan for verification</small>
                            </div>
                        </Col>
                    </Row>

                    {/* Test Results Table */}
                    <div className="mb-4">
                        <h5 className="fw-bold mb-3 border-bottom pb-2">Test Results</h5>
                        <Table bordered className="lab-results-table">
                            <thead className="table-light">
                                <tr>
                                    <th style={{ width: '5%' }}>#</th>
                                    <th style={{ width: '30%' }}>Parameter</th>
                                    <th style={{ width: '15%' }}>Method</th>
                                    <th style={{ width: '20%' }}>Result</th>
                                    <th style={{ width: '20%' }}>Normal Range</th>
                                    <th style={{ width: '10%' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {resultEntries
                                    .filter(([key]) => key !== 'impression')
                                    .map(([key, value], index) => {
                                        const status = getValueStatus(key, value);
                                        const range = normalRanges[key.toLowerCase()];
                                        // Mock method based on test type
                                        const method = ['hemoglobin', 'wbc', 'rbc', 'platelets'].includes(key.toLowerCase()) ? 'Cell Counter' : 'Spectrophotometry';
                                        
                                        return (
                                            <tr key={key}>
                                                <td className="text-center">{index + 1}</td>
                                                <td><strong>{formatTestName(key)}</strong></td>
                                                <td className="small text-muted">{method}</td>
                                                <td className={status !== 'normal' ? 'fw-bold' : ''}>
                                                    {value} {range?.unit || ''}
                                                </td>
                                                <td className="text-muted small">{getNormalRangeText(key)}</td>
                                                <td>
                                                    {status === 'low' && (
                                                        <Badge bg="warning" className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
                                                            <AlertTriangle size={12} /> Low
                                                        </Badge>
                                                    )}
                                                    {status === 'high' && (
                                                        <Badge bg="danger" className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
                                                            <AlertTriangle size={12} /> High
                                                        </Badge>
                                                    )}
                                                    {status === 'normal' && (
                                                        <Badge bg="success" className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
                                                            <CheckCircle size={12} /> Normal
                                                        </Badge>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </Table>
                    </div>

                    {/* Impression/Notes */}
                    {labResult.impression && (
                        <div className="bg-light p-3 rounded mb-4">
                            <h6 className="fw-bold mb-2">📋 Impression / Notes</h6>
                            <p className="mb-0">{labResult.impression}</p>
                        </div>
                    )}

                    {/* Legend */}
                    <div className="d-flex gap-4 mb-4 small">
                        <span><Badge bg="success">Normal</Badge> Value within normal range</span>
                        <span><Badge bg="warning">Low</Badge> Below normal range</span>
                        <span><Badge bg="danger">High</Badge> Above normal range</span>
                    </div>

                    {/* Signature Section */}
                    <Row className="mt-4 pt-3 border-top">
                        <Col xs={6}>
                            <div>
                                <small className="text-muted d-block">Sample Collected By</small>
                                <div style={{ minHeight: '30px' }}></div>
                                <span>{technicianName || 'Lab Technician'}</span>
                            </div>
                        </Col>
                        <Col xs={6} className="text-end">
                            <div>
                                <small className="text-muted d-block">Verified By</small>
                                <div style={{ minHeight: '30px' }}></div>
                                <span>{pathologistName || 'Pathologist'}</span>
                            </div>
                        </Col>
                    </Row>

                    {/* Footer */}
                    <div className="text-center mt-4 pt-3 border-top">
                        <p className="text-muted small mb-0">
                            This is a computer-generated report. Interpretation should be done in clinical context.
                        </p>
                        <p className="text-muted small mb-0">
                            {hospitalProfile?.name || 'Laboratory'} {hospitalProfile?.lab_nabl_number ? `| NABL: ${hospitalProfile.lab_nabl_number}` : ''} {hospitalProfile?.registration_number ? `| Reg. No: ${hospitalProfile.registration_number}` : ''}
                        </p>
                    </div>
                </div>
            </Modal.Body>
            <Modal.Footer className="bg-light no-print">
                <Button variant="outline-secondary" onClick={onHide}>
                    <X size={16} className="me-2" />
                    Close
                </Button>
                <Button variant="info" onClick={handlePrint}>
                    <Printer size={16} className="me-2" />
                    Print Report
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default LabReportPrint;
