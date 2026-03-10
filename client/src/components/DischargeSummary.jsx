import React, { useMemo, useState } from 'react';
import { Modal, Button, Row, Col, Table, Badge, Spinner } from 'react-bootstrap';
import { Printer, X, CheckCircle, Download, UserCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { HospitalPrintHeader, HospitalPrintFooter } from './print';
import useHospitalProfile from '../hooks/useHospitalProfile';
import AceDischargeSummary from './AceDischargeSummary';
import '../styles/print.css';

/**
 * Enterprise-grade Discharge Summary (NABH / JCAHO Compliant)
 * 
 * Includes:
 * - Full Date + Time stamps on all temporal fields
 * - Treating Doctor name auto-filled
 * - Presenting Complaints & Provisional vs Final Diagnosis
 * - Procedures / Surgeries section
 * - Enhanced Medication table (Dosage, Route, Frequency, Duration)
 * - Enhanced Lab Results table (with actual values)
 * - Discharge Type badge
 * - Patient Address, Blood Group, Aadhaar/ABHA
 * - Vitals with recording timestamp
 */

// Utility: Format a date to "02 Mar 2026, 09:45 AM" style
const formatDateTime = (dateVal) => {
    if (!dateVal) return 'N/A';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

// Utility: Format date-only "02 Mar 2026"
const formatDateOnly = (dateVal) => {
    if (!dateVal) return 'N/A';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

// Discharge type color mapping
const DISCHARGE_TYPE_COLORS = {
    'Normal': 'success',
    'Against Medical Advice': 'warning',
    'AMA': 'warning',
    'LAMA': 'warning',
    'Transfer': 'info',
    'Absconded': 'danger',
    'Death': 'dark',
    'Referred': 'primary'
};

const DischargeSummary = ({
    show,
    onHide,
    admission,
    medications,
    vitalsHistory,
    labResults,
    diagnosis,
    followUpInstructions,
    dischargeMedications,
    conditionAtDischarge,
    hospitalCourse,
    onConfirmDischarge,
    // --- NEW ENTERPRISE PROPS ---
    doctorName,
    doctorRegNo,
    dischargeType,
    presentingComplaints,
    provisionalDiagnosis,
    procedures
}) => {
    const [discharging, setDischarging] = useState(false);
    const { hospitalProfile } = useHospitalProfile();

    // Generate deterministic discharge summary number
    const summaryNumber = useMemo(() => {
        if (!admission) return '';
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const unique = admission.admission_id
            ? String(admission.admission_id).slice(-4).padStart(4, '0')
            : '0001';
        return `DS-${year}${month}${day}-${unique}`;
    }, [admission]);

    if (!admission) return null;

    if (hospitalProfile?.theme === 'ace-cardiac') {
        return (
            <AceDischargeSummary
                show={show} onHide={onHide} admission={admission} medications={medications}
                vitalsHistory={vitalsHistory} labResults={labResults} diagnosis={diagnosis}
                followUpInstructions={followUpInstructions} dischargeMedications={dischargeMedications}
                conditionAtDischarge={conditionAtDischarge} hospitalCourse={hospitalCourse}
                onConfirmDischarge={onConfirmDischarge} doctorName={doctorName}
                doctorRegNo={doctorRegNo} dischargeType={dischargeType}
                presentingComplaints={presentingComplaints} provisionalDiagnosis={provisionalDiagnosis}
                procedures={procedures}
            />
        );
    }

    const handlePrint = () => window.print();

    const handleDischarge = async () => {
        if (!onConfirmDischarge) return;
        setDischarging(true);
        try {
            await onConfirmDischarge();
        } finally {
            setDischarging(false);
        }
    };

    // Calculate length of stay
    const admittedDate = new Date(admission.admitted_at);
    const dischargedDate = admission.discharged_at ? new Date(admission.discharged_at) : new Date();
    const lengthOfStay = Math.max(1, Math.ceil((dischargedDate - admittedDate) / (1000 * 60 * 60 * 24)));

    // Calculate age
    const age = admission.dob
        ? new Date().getFullYear() - new Date(admission.dob).getFullYear()
        : (admission.age || 'N/A');

    // Latest vitals
    const latestVitals = vitalsHistory?.[0] || {};

    // Resolve doctor name: prop > admission.doctor_name > fallback
    const resolvedDoctorName = doctorName || admission.doctor_name || '';
    const resolvedDoctorRegNo = doctorRegNo || admission.doctor_reg_no || '';

    // Resolve discharge type
    const resolvedDischargeType = dischargeType || admission.discharge_type || 'Normal';

    // QR code data
    const qrData = JSON.stringify({
        summary: summaryNumber,
        patient: admission.patient_name,
        uhid: admission.patient_number || admission.uhid,
        discharge: dischargedDate.toISOString()
    });

    // Parse lab result values from result_json
    const parseLabValue = (lab) => {
        if (!lab.result_json) return 'Pending';
        if (typeof lab.result_json === 'string') {
            try { return JSON.parse(lab.result_json)?.value || lab.result_json; } catch { return lab.result_json; }
        }
        if (typeof lab.result_json === 'object') {
            return lab.result_json.value || lab.result_json.result || JSON.stringify(lab.result_json);
        }
        return String(lab.result_json);
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className="discharge-summary-modal">
            <Modal.Header closeButton className="bg-success text-white border-0 no-print">
                <Modal.Title className="d-flex align-items-center">
                    <CheckCircle size={24} className="me-2" />
                    Discharge Summary Preview
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                <div className="discharge-summary-content p-4" id="discharge-summary-print-area">
                    {/* Standardized Hospital Header */}
                    <HospitalPrintHeader title="DISCHARGE SUMMARY" />

                    {/* Summary Number, Discharge Type, and QR Row */}
                    <Row className="mb-4">
                        <Col md={8}>
                            <div className="border rounded p-3">
                                <Row>
                                    <Col xs={6} className="mb-2">
                                        <small className="text-muted d-block">Patient Name</small>
                                        <strong className="fs-5">{admission.patient_name}</strong>
                                    </Col>
                                    <Col xs={3} className="mb-2">
                                        <small className="text-muted d-block">Summary No.</small>
                                        <strong className="text-success">{summaryNumber}</strong>
                                    </Col>
                                    <Col xs={3} className="mb-2">
                                        <small className="text-muted d-block">Discharge Type</small>
                                        <Badge bg={DISCHARGE_TYPE_COLORS[resolvedDischargeType] || 'secondary'}>
                                            {resolvedDischargeType}
                                        </Badge>
                                    </Col>
                                    <Col xs={3} className="mb-2">
                                        <small className="text-muted d-block">Age / Gender</small>
                                        <span>{age} yrs / {admission.gender}</span>
                                    </Col>
                                    <Col xs={3} className="mb-2">
                                        <small className="text-muted d-block">Patient ID (UHID)</small>
                                        <span>{admission.patient_number || admission.uhid || admission.patient_id?.slice(0, 8)}</span>
                                    </Col>
                                    <Col xs={3} className="mb-2">
                                        <small className="text-muted d-block">Blood Group</small>
                                        <span>{admission.blood_group || 'N/A'}</span>
                                    </Col>
                                    <Col xs={3} className="mb-2">
                                        <small className="text-muted d-block">Phone</small>
                                        <span>{admission.phone || 'N/A'}</span>
                                    </Col>
                                    {(admission.address) && (
                                        <Col xs={12} className="mb-2">
                                            <small className="text-muted d-block">Address</small>
                                            <span>{admission.address}</span>
                                        </Col>
                                    )}
                                    {(admission.abha_id) && (
                                        <Col xs={6} className="mb-2">
                                            <small className="text-muted d-block">ABHA ID</small>
                                            <span>{admission.abha_id}</span>
                                        </Col>
                                    )}
                                </Row>
                            </div>
                        </Col>
                        <Col md={4} className="text-center">
                            <div className="border rounded p-3 h-100 d-flex flex-column justify-content-center align-items-center">
                                <QRCodeSVG
                                    value={qrData}
                                    size={80}
                                    level="M"
                                    includeMargin={true}
                                />
                                <small className="text-muted mt-1">Scan for verification</small>
                            </div>
                        </Col>
                    </Row>

                    {/* Admission Details — WITH FULL DATE+TIME STAMPS */}
                    <div className="border rounded p-3 mb-4">
                        <h6 className="fw-bold mb-3 border-bottom pb-2">📋 Admission Details</h6>
                        <Row>
                            <Col md={3}>
                                <small className="text-muted d-block">Ward / Bed</small>
                                <strong>{admission.ward} - Bed {admission.bed_number}</strong>
                            </Col>
                            <Col md={3}>
                                <small className="text-muted d-block">Date & Time of Admission</small>
                                <strong>{formatDateTime(admission.admitted_at)}</strong>
                            </Col>
                            <Col md={3}>
                                <small className="text-muted d-block">Date & Time of Discharge</small>
                                <strong>{formatDateTime(dischargedDate)}</strong>
                            </Col>
                            <Col md={3}>
                                <small className="text-muted d-block">Length of Stay</small>
                                <strong>{lengthOfStay} day(s)</strong>
                            </Col>
                        </Row>
                        {resolvedDoctorName && (
                            <Row className="mt-2">
                                <Col md={6}>
                                    <small className="text-muted d-block">Treating Doctor</small>
                                    <strong>Dr. {resolvedDoctorName}</strong>
                                    {resolvedDoctorRegNo && <small className="text-muted ms-2">(Reg: {resolvedDoctorRegNo})</small>}
                                </Col>
                            </Row>
                        )}
                    </div>

                    {/* Presenting Complaints (NEW — NABH Requirement) */}
                    {(presentingComplaints || admission.presenting_complaints || admission.chief_complaints) && (
                        <div className="bg-light border rounded p-3 mb-4">
                            <h6 className="fw-bold mb-2">🗣️ Presenting Complaints</h6>
                            <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                                {presentingComplaints || admission.presenting_complaints || admission.chief_complaints}
                            </p>
                        </div>
                    )}

                    {/* Provisional Diagnosis (NEW — NABH Requirement) */}
                    {(provisionalDiagnosis || admission.provisional_diagnosis) && (
                        <div className="border rounded p-3 mb-4">
                            <h6 className="fw-bold mb-2">📝 Provisional Diagnosis (At Admission)</h6>
                            <p className="mb-0">{provisionalDiagnosis || admission.provisional_diagnosis}</p>
                        </div>
                    )}

                    {/* Final Diagnosis */}
                    <div className="bg-light border rounded p-3 mb-4">
                        <h6 className="fw-bold mb-2">🩺 Final Diagnosis</h6>
                        <p className="mb-0">{diagnosis || admission.diagnosis || 'As per clinical evaluation'}</p>
                    </div>

                    {/* Hospital Course */}
                    <div className="mb-4">
                        <h6 className="fw-bold mb-2 border-bottom pb-2">🏥 Course in Hospital</h6>
                        <p className="small text-muted mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                            {hospitalCourse || 'Patient was admitted with complaints of... treated with... and is now being discharged in a stable condition.'}
                        </p>
                    </div>

                    {/* Procedures / Surgeries Done (NEW — JCAHO Requirement) */}
                    {procedures && procedures.length > 0 && (
                        <div className="mb-4">
                            <h6 className="fw-bold mb-3 border-bottom pb-2">🔪 Procedures / Surgeries Performed</h6>
                            <Table bordered size="sm">
                                <thead className="table-light">
                                    <tr>
                                        <th>#</th>
                                        <th>Procedure Name</th>
                                        <th>Date & Time</th>
                                        <th>Surgeon / Performed By</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {procedures.map((proc, index) => (
                                        <tr key={proc.id || index}>
                                            <td>{index + 1}</td>
                                            <td>{proc.name || proc.procedure_name || proc.description}</td>
                                            <td>{formatDateTime(proc.performed_at || proc.date)}</td>
                                            <td>{proc.surgeon || proc.performed_by || 'N/A'}</td>
                                            <td>{proc.notes || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}

                    {/* Condition at Discharge */}
                    <div className="mb-4">
                        <h6 className="fw-bold mb-2 border-bottom pb-2">🚦 Condition at Discharge</h6>
                        <div className="p-3 bg-light rounded border">
                            <strong>{conditionAtDischarge || 'Stable, Hemodynamically stable, Ambulatory'}</strong>
                        </div>
                    </div>

                    {/* Treatment Given During Stay — ENHANCED WITH DOSAGE/ROUTE/FREQUENCY/DURATION */}
                    <div className="mb-4">
                        <h6 className="fw-bold mb-3 border-bottom pb-2">💊 Treatment Given During Stay</h6>
                        {medications && medications.length > 0 ? (
                            <Table bordered size="sm">
                                <thead className="table-light">
                                    <tr>
                                        <th>#</th>
                                        <th>Medication</th>
                                        <th>Dosage</th>
                                        <th>Route</th>
                                        <th>Frequency</th>
                                        <th>Duration</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {medications.map((med, index) => (
                                        <tr key={med.id || index}>
                                            <td>{index + 1}</td>
                                            <td>{med.description || med.name || med.drug_name}</td>
                                            <td>{med.dosage || med.dose || '-'}</td>
                                            <td>{med.route || 'Oral'}</td>
                                            <td>{med.frequency || '-'}</td>
                                            <td>{med.duration || '-'}</td>
                                            <td>
                                                <Badge bg={med.status === 'Completed' ? 'success' : 'warning'}>
                                                    {med.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        ) : (
                            <p className="text-muted small">Treatment details as per clinical records</p>
                        )}
                    </div>

                    {/* Vitals at Discharge — WITH TIMESTAMP */}
                    <div className="border rounded p-3 mb-4">
                        <h6 className="fw-bold mb-3">
                            📊 Vitals at Discharge
                            {latestVitals.created_at && (
                                <small className="fw-normal text-muted ms-2">
                                    (Recorded: {formatDateTime(latestVitals.created_at)})
                                </small>
                            )}
                        </h6>
                        <Row className="text-center">
                            <Col><small className="text-muted d-block">BP</small><strong>{latestVitals.bp || 'N/A'}</strong></Col>
                            <Col><small className="text-muted d-block">Pulse</small><strong>{latestVitals.heart_rate || 'N/A'}</strong></Col>
                            <Col><small className="text-muted d-block">Temp</small><strong>{latestVitals.temp ? `${latestVitals.temp}°F` : 'N/A'}</strong></Col>
                            <Col><small className="text-muted d-block">SpO2</small><strong>{latestVitals.spo2 ? `${latestVitals.spo2}%` : 'N/A'}</strong></Col>
                            <Col><small className="text-muted d-block">RR</small><strong>{latestVitals.respiratory_rate || 'N/A'}</strong></Col>
                        </Row>
                    </div>

                    {/* Lab Results — ENHANCED: Now a table with actual values */}
                    {labResults && labResults.length > 0 && (
                        <div className="mb-4">
                            <h6 className="fw-bold mb-3 border-bottom pb-2">🧪 Investigations Done</h6>
                            <Table bordered size="sm">
                                <thead className="table-light">
                                    <tr>
                                        <th>#</th>
                                        <th>Test Name</th>
                                        <th>Result / Value</th>
                                        <th>Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {labResults.map((lab, index) => (
                                        <tr key={lab.id || index}>
                                            <td>{index + 1}</td>
                                            <td>{lab.test_name}</td>
                                            <td>{parseLabValue(lab)}</td>
                                            <td>{formatDateTime(lab.completed_at || lab.requested_at || lab.created_at)}</td>
                                            <td>
                                                <Badge bg={lab.status === 'Completed' ? 'success' : 'secondary'}>
                                                    {lab.status}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}

                    {/* Discharge Medications */}
                    <div className="bg-light border rounded p-3 mb-4">
                        <h6 className="fw-bold mb-2">💊 Medications at Discharge</h6>
                        {dischargeMedications && dischargeMedications.length > 0 ? (
                            <ol className="mb-0">
                                {dischargeMedications.map((med, index) => (
                                    <li key={index}>{med}</li>
                                ))}
                            </ol>
                        ) : (
                            <p className="mb-0 text-muted small">As prescribed by the treating physician</p>
                        )}
                    </div>

                    {/* Follow-up Instructions */}
                    <div className="border border-primary rounded p-3 mb-4">
                        <h6 className="fw-bold mb-2 text-primary">📋 Follow-up Instructions</h6>
                        <ul className="mb-0 small">
                            {followUpInstructions && followUpInstructions.length > 0 ? (
                                followUpInstructions.map((instruction, index) => (
                                    <li key={index}>{instruction}</li>
                                ))
                            ) : (
                                <>
                                    <li>Follow-up visit after 7 days or as advised</li>
                                    <li>Take medications as prescribed</li>
                                    <li>Maintain rest and proper diet</li>
                                    <li>Contact hospital immediately if symptoms worsen</li>
                                    <li>Bring this discharge summary on follow-up visit</li>
                                </>
                            )}
                        </ul>
                    </div>

                    {/* Emergency Contact */}
                    <div className="bg-danger bg-opacity-10 border border-danger rounded p-3 mb-4">
                        <h6 className="fw-bold text-danger mb-2">🚨 Emergency Contact</h6>
                        <p className="mb-0 small">
                            In case of emergency, contact: <strong>{hospitalProfile?.phone_secondary || hospitalProfile?.phone || 'Hospital Emergency'}</strong> (24x7 Helpline)
                        </p>
                    </div>

                    {/* Signature Section — AUTO-FILLED DOCTOR NAME */}
                    <Row className="mt-4 pt-3 border-top">
                        <Col xs={6}>
                            <div>
                                <small className="text-muted d-block">Treated By</small>
                                <div style={{ minHeight: '40px' }}></div>
                                <strong>{resolvedDoctorName ? `Dr. ${resolvedDoctorName}` : 'Dr. ________________'}</strong>
                                {resolvedDoctorRegNo && (
                                    <small className="text-muted d-block">Reg. No: {resolvedDoctorRegNo}</small>
                                )}
                                <small className="text-muted d-block">Treating Physician</small>
                            </div>
                        </Col>
                        <Col xs={6} className="text-end">
                            <div>
                                <small className="text-muted d-block">Authorized By</small>
                                <div style={{ minHeight: '40px' }}></div>
                                <strong>________________</strong>
                                <small className="text-muted d-block">Medical Records Dept.</small>
                            </div>
                        </Col>
                    </Row>

                    {/* Standardized Footer */}
                    <HospitalPrintFooter 
                        showTimestamp={true}
                        disclaimer="This is a computer-generated discharge summary. Please retain for future reference."
                    />
                </div>
            </Modal.Body>
            <Modal.Footer className="bg-light no-print">
                <Button variant="outline-secondary" onClick={onHide}>
                    <X size={16} className="me-2" />
                    Close
                </Button>
                <Button variant="outline-primary">
                    <Download size={16} className="me-2" />
                    Download PDF
                </Button>
                <Button variant="success" onClick={handlePrint}>
                    <Printer size={16} className="me-2" />
                    Print Summary
                </Button>
                {onConfirmDischarge && (
                    <Button
                        variant="danger"
                        onClick={handleDischarge}
                        disabled={discharging}
                    >
                        {discharging ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Processing...
                            </>
                        ) : (
                            <>
                                <UserCheck size={16} className="me-2" />
                                Confirm & Discharge
                            </>
                        )}
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default DischargeSummary;
