import React, { useMemo, useState } from 'react';
import { Modal, Button, Row, Col, Table, Badge, Spinner } from 'react-bootstrap';
import { Printer, X, Download, UserCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { HospitalPrintHeader, HospitalPrintFooter } from './print';
import useHospitalProfile from '../hooks/useHospitalProfile';
import '../styles/print.css';

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

const AceDischargeSummary = ({
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
    doctorName,
    doctorRegNo,
    dischargeType,
    presentingComplaints,
    provisionalDiagnosis,
    procedures
}) => {
    const [discharging, setDischarging] = useState(false);
    const { hospitalProfile } = useHospitalProfile();

    if (!admission) return null;

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

    const age = admission.dob
        ? new Date().getFullYear() - new Date(admission.dob).getFullYear()
        : (admission.age || 'N/A');

    const admittedDate = new Date(admission.admitted_at);
    const dischargedDate = admission.discharged_at ? new Date(admission.discharged_at) : new Date();

    const latestVitals = vitalsHistory?.[0] || {};
    const resolvedDoctorName = doctorName || admission.doctor_name || 'Dr. Puneet K. Verma';

    return (
        <Modal show={show} onHide={onHide} size="lg" centered className="discharge-summary-modal">
            <Modal.Header closeButton className="bg-primary text-white border-0 no-print">
                <Modal.Title>Ace Hospital Discharge Summary Preview</Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                <div className="discharge-summary-content p-4 font-monospace small" id="discharge-summary-print-area">
                    {/* Header Table */}
                    <div className="border border-dark mb-4">
                        <Table bordered size="sm" className="mb-0 border-dark" style={{ borderCollapse: 'collapse', borderColor: 'black' }}>
                            <tbody>
                                <tr>
                                    <td colSpan="6"><strong>NAME:</strong> {admission.patient_name}</td>
                                    <td colSpan="3"><strong>AGE:</strong> {age} YEARS</td>
                                    <td colSpan="3"><strong>SEX:</strong> {admission.gender?.toUpperCase()}</td>
                                </tr>
                                <tr>
                                    <td colSpan="5"><strong>PPIN:</strong> {admission.uhid}</td>
                                    <td colSpan="5"><strong>IPD. NO.:</strong> {admission.admission_id}</td>
                                    <td colSpan="2"><strong>CATH NO:</strong> {admission.cath_no || ''}</td>
                                </tr>
                                <tr>
                                    <td colSpan="12"><strong>ADDRESS:</strong> {admission.address || ''}</td>
                                </tr>
                                <tr>
                                    <td colSpan="8"><strong>DATE OF ADMISSION:</strong> {formatDateTime(admittedDate)}</td>
                                    <td colSpan="4"><strong>PHONE NO:</strong> {admission.phone || ''}</td>
                                </tr>
                                <tr>
                                    <td colSpan="8"><strong>DATE OF DISCHARGE:</strong> {formatDateTime(dischargedDate)}</td>
                                    <td colSpan="4"><strong>BLOOD GROUP:</strong> {admission.blood_group || ''}</td>
                                </tr>
                                <tr>
                                    <td colSpan="4"><strong>HEIGHT:</strong> {admission.height || ''} cm</td>
                                    <td colSpan="4"><strong>WEIGHT:</strong> {admission.weight || ''} Kg</td>
                                    <td colSpan="4"></td>
                                </tr>
                                <tr>
                                    <td colSpan="12"><strong>CONSULTANTS:</strong> {resolvedDoctorName?.toUpperCase()} (MD, DNB, DM)</td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>

                    <h5 className="text-center text-decoration-underline fw-bold mb-4">DISCHARGE SUMMARY</h5>

                    {/* DIAGNOSIS */}
                    <div className="mb-3">
                        <span className="fw-bold text-decoration-underline">DIAGNOSIS</span>
                        <div className="ps-3 mt-1" style={{ whiteSpace: 'pre-wrap' }}>
                            {diagnosis || admission.diagnosis || 'To be filled'}
                            {provisionalDiagnosis && <><br/>{provisionalDiagnosis}</>}
                        </div>
                    </div>

                    {/* PROCEDURE DONE */}
                    <div className="mb-3">
                        <span className="fw-bold text-decoration-underline">PROCEDURE DONE</span>
                        <ul className="list-unstyled ps-3 mt-1 mb-0">
                            {procedures && procedures.length > 0 ? (
                                procedures.map((proc, index) => (
                                    <li key={index}>{proc.name || proc.procedure_name} on {formatDateTime(proc.performed_at || proc.date)}</li>
                                ))
                            ) : (
                                <li>As per clinical records</li>
                            )}
                        </ul>
                    </div>

                    {/* RESUME OF HISTORY */}
                    <div className="mb-3">
                        <span className="fw-bold text-decoration-underline">RESUME OF HISTORY</span>
                        <div className="ps-3 mt-1" style={{ whiteSpace: 'pre-wrap' }}>
                            {admission.gender === 'Male' ? 'Mr.' : 'Ms.'} {admission.patient_name}, {age} years old {admission.gender?.toLowerCase()}, {presentingComplaints || admission.presenting_complaints || 'admitted with complaints of ...'}
                        </div>
                    </div>

                    {/* COURSE IN THE HOSPITAL */}
                    <div className="mb-3">
                        <span className="fw-bold text-decoration-underline">COURSE IN THE HOSPITAL</span>
                        <div className="ps-3 mt-1" style={{ whiteSpace: 'pre-wrap' }}>
                            {hospitalCourse || 'Detailed course to be filled.'}
                            <br /><br />
                            <strong>Discharge vitals:-</strong> Temp. {latestVitals.temp || '--'}º F, PR {latestVitals.heart_rate || '--'}/min, BP {latestVitals.bp || '--'} mm Hg & RR {latestVitals.respiratory_rate || '--'}/min. Condition: {conditionAtDischarge || 'Stable'}
                        </div>
                    </div>

                    {/* INVESTIGATIONS */}
                    <div className="mb-3">
                        <span className="fw-bold text-decoration-underline">INVESTIGATIONS</span>
                        <div className="ps-3 mt-1">
                            {labResults && labResults.length > 0 ? 'Attached' : 'N/A'}
                        </div>
                    </div>

                    {/* ECG */}
                    <div className="mb-3">
                        <span className="fw-bold text-decoration-underline">ECG</span>
                        <div className="ps-3 mt-1">
                            At admission → <br />
                            At discharge →
                        </div>
                    </div>

                    {/* TREATMENT */}
                    <div className="mb-4">
                        <span className="fw-bold text-decoration-underline">TREATMENT</span>
                        <div className="ps-3 mt-1">
                            {dischargeMedications && dischargeMedications.length > 0 ? (
                                dischargeMedications.map((med, index) => (
                                    <div key={index}>{med}</div>
                                ))
                            ) : medications && medications.length > 0 ? (
                                medications.map((med, index) => (
                                    <div key={index}>{med.description || med.name || med.drug_name} {med.dosage || med.dose || ''} {med.frequency || ''}</div>
                                ))
                            ) : (
                                <div>As prescribed</div>
                            )}
                            {followUpInstructions && followUpInstructions.length > 0 && (
                                <div className="mt-3">
                                    <strong>Follow Up:</strong>
                                    {followUpInstructions.map((inst, index) => (
                                        <div key={index}>{inst}</div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Signatures */}
                    <Row className="mt-5 pt-4">
                        <Col xs={6} className="text-start">
                            <strong>{resolvedDoctorName}</strong><br />
                            <small>MD, DNB, DM<br />FCSI, FSCAI, FACC, FESC<br />Senior Consultant<br />Clinical & Interventional Cardiology</small>
                        </Col>
                        <Col xs={6} className="text-end d-flex justify-content-end align-items-end">
                            {/* QR Code */}
                            <QRCodeSVG
                                value={JSON.stringify({
                                    patient: admission.patient_name,
                                    uhid: admission.uhid,
                                    discharge: dischargedDate.toISOString()
                                })}
                                size={60}
                                level="M"
                            />
                        </Col>
                    </Row>
                </div>
            </Modal.Body>
            <Modal.Footer className="bg-light no-print">
                <Button variant="outline-secondary" onClick={onHide}>
                    <X size={16} className="me-2" />
                    Close
                </Button>
                <Button variant="outline-primary" onClick={handlePrint}>
                     <Printer size={16} className="me-2" />
                     Print
                </Button>
                {onConfirmDischarge && (
                    <Button
                        variant="danger"
                        onClick={handleDischarge}
                        disabled={discharging}
                    >
                        {discharging ? (
                            <><Spinner animation="border" size="sm" className="me-2" />Processing...</>
                        ) : (
                            <><UserCheck size={16} className="me-2" />Confirm & Discharge</>
                        )}
                    </Button>
                )}
            </Modal.Footer>
        </Modal>
    );
};

export default AceDischargeSummary;
