import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Tab, Card, Form, Button, Row, Col, Badge, ListGroup, Table, Alert } from 'react-bootstrap';
import { Activity, Pill, FlaskConical, FileText, UserX, Brain, Printer, CheckCircle, ClipboardList, Utensils, Send } from 'lucide-react';
import axios from 'axios';
import AIAssistant from './AIAssistant';
import DischargeSummary from './DischargeSummary';
import VitalsChart from './VitalsChart';
import BedHistoryTimeline from './BedHistoryTimeline';
import SOAPNoteEditor from './SOAPNoteEditor';
import ProblemListPanel from './ProblemListPanel';
import CarePlanManager from './CarePlanManager';
import OrderSetSelector from './OrderSetSelector';
import MedicationReconciliation from './MedicationReconciliation';

import ClinicalAlertBadge from './ClinicalAlertBadge';
import EarlyWarningScore from './EarlyWarningScore';
import LabTrendView from './LabTrendView';
import VitalsTrendGraph from './VitalsTrendGraph';
import DischargeChecklist from './DischargeChecklist';
import MedicalCertificatePrint from './MedicalCertificatePrint';
import ConsentFormPrint from './ConsentFormPrint';
import ReferralLetterPrint from './ReferralLetterPrint';
import IPDMedicationModal from './IPDMedicationModal';
import IPDLabOrderModal from './IPDLabOrderModal';
import IPDVitalRequestModal from './IPDVitalRequestModal';
import IPDBloodRequestModal from './IPDBloodRequestModal';
import IPDRadiologyModal from './IPDRadiologyModal';
import NursingInstructionsModal from './NursingInstructionsModal';
import DischargeWorkflowModal from './DischargeWorkflowModal';

// [TITAN] AI Clinical Co-Pilot
import AIClinicalSummary from './ai/AIClinicalSummary';

// Diet Options
const DIET_OPTIONS = ['Normal', 'Soft', 'Liquid', 'Diabetic', 'Renal', 'Low Sodium', 'High Protein', 'NPO'];


const DoctorPatientProfile = ({ show, onHide, admission, onDischarge }) => {
    const [medications, setMedications] = useState([]);
    const [vitalsHistory, setVitalsHistory] = useState([]);
    const [labResults, setLabResults] = useState([]);
    const [notes, setNotes] = useState([]);


    // Discharge Summary Modal
    const [showDischargeSummary, setShowDischargeSummary] = useState(false);
    // Medical Certificate Modal
    const [showMedicalCertificate, setShowMedicalCertificate] = useState(false);
    // Consent Form Modal
    const [showConsentForm, setShowConsentForm] = useState(false);
    // Referral Letter Modal
    const [showReferralLetter, setShowReferralLetter] = useState(false);
    // IPD CPOE Modals
    const [showMedOrderModal, setShowMedOrderModal] = useState(false);
    const [showLabOrderModal, setShowLabOrderModal] = useState(false);
    const [showVitalRequestModal, setShowVitalRequestModal] = useState(false);
    const [showBloodRequestModal, setShowBloodRequestModal] = useState(false);
    const [showRadiologyModal, setShowRadiologyModal] = useState(false);
    const [showNursingInstructionsModal, setShowNursingInstructionsModal] = useState(false);
    const [showDischargeWorkflow, setShowDischargeWorkflow] = useState(false);

    const fetchData = async () => {
        if (!admission) return;

        // [FIX] Helper to unwrap response (handles {success: true, data: []} vs [])
        const unwrap = (res) => {
            const raw = res.data;
            if (Array.isArray(raw)) return raw;
            if (raw && Array.isArray(raw.data)) return raw.data;
            return [];
        };

        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch Medications (Care Tasks of type 'Medication')
            const medsRes = await axios.get(`/api/clinical/tasks?admission_id=${admission.admission_id}`, { headers });
            setMedications(unwrap(medsRes).filter(t => t.type === 'Medication'));

            // Fetch Vitals History
            const vitalsRes = await axios.get(`/api/clinical/vitals/${admission.patient_id}`, { headers });
            setVitalsHistory(unwrap(vitalsRes));

            // Fetch Lab Results
            const labsRes = await axios.get(`/api/lab/patient/${admission.patient_id}`, { headers });
            setLabResults(unwrap(labsRes));

            // Fetch SOAP Notes (replaces old history)
            const notesRes = await axios.get(`/api/clinical/soap-notes/${admission.admission_id}`, { headers });
            const soapNotes = unwrap(notesRes);
            
            // If no SOAP notes, fallback to old history for backward compatibility
            if (soapNotes.length === 0) {
                const historyRes = await axios.get(`/api/clinical/history/${admission.patient_id}`, { headers });
                setNotes(unwrap(historyRes));
            } else {
                setNotes(soapNotes);
            }

        } catch (err) {
            console.error('Error fetching patient data:', err);
        }
    };

    useEffect(() => {
        if (show && admission) {
            fetchData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show, admission]);

    const handleDischarge = async () => {
        if (!window.confirm('Are you sure you want to discharge this patient?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/admissions/discharge', {
                admission_id: admission.admission_id
            }, { headers: { Authorization: `Bearer ${token}` } });

            alert('Patient discharged successfully!');
            setShowDischargeSummary(false);
            onDischarge && onDischarge();
            onHide();
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 400) {
                alert(`Discharge failed: ${err.response.data.message}`);
            } else {
                alert('Discharge failed');
            }
        }
    };

    // Show discharge summary first before actual discharge
    const handleShowDischargeSummary = () => {
        setShowDischargeSummary(true);
    };

    const handleMarkSeen = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/admissions/rounds/seen', { admission_id: admission.admission_id }, { headers: { Authorization: `Bearer ${token}` } });
            alert('Round marked as complete!');
            onDischarge && onDischarge(); // Refresh list
        } catch (err) {
            console.error(err);
        }
    };

    const handleDietChange = async (diet) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put('/api/admissions/diet', { admission_id: admission.admission_id, diet }, { headers: { Authorization: `Bearer ${token}` } });
            alert(`Diet updated to ${diet}`);
        } catch (err) {
            console.error('Diet update failed', err);
        }
    };

    if (!admission) return null;

    const age = admission.dob ? new Date().getFullYear() - new Date(admission.dob).getFullYear() : 'N/A';

    return (
        <Modal show={show} onHide={onHide} size="xl" centered>
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title className="d-flex align-items-center w-100">
                    <span className="fw-bold me-2">{admission.patient_name}</span>
                    <Badge bg="light" text="dark" className="me-2">{admission.ward} - Bed {admission.bed_number}</Badge>
                    <div className="ms-auto me-3 d-flex align-items-center gap-2">
                        <Button variant="outline-success" size="sm" onClick={handleMarkSeen}>
                            <CheckCircle size={14} className="me-1" /> Mark Round Seen
                        </Button>
                        <ClinicalAlertBadge patientId={admission.patient_id} />
                    </div>
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                <Tabs defaultActiveKey="overview" className="px-3 pt-2">
                    {/* Overview Tab */}
                    <Tab eventKey="overview" title={<span><Activity size={16} className="me-1" />Overview</span>}>
                        <div className="p-4">
                            <Row className="mb-4">
                                <Col md={6}>
                                    <Card className="border-0 bg-light">
                                        <Card.Body>
                                            <h6 className="fw-bold mb-3">Patient Demographics</h6>
                                            <div className="d-flex flex-column gap-2">
                                                <div><strong>Name:</strong> {admission.patient_name}</div>
                                                <div><strong>Age:</strong> {age} years</div>
                                                <div><strong>Gender:</strong> {admission.gender}</div>
                                                <div><strong>Phone:</strong> {admission.phone || 'N/A'}</div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card className="border-0 bg-light">
                                        <Card.Body>
                                            <h6 className="fw-bold mb-3">Admission Details</h6>
                                            <div className="d-flex flex-column gap-2">
                                                <div><strong>Ward:</strong> {admission.ward}</div>
                                                <div><strong>Bed:</strong> {admission.bed_number}</div>
                                                <div><strong>Admitted:</strong> {new Date(admission.admitted_at).toLocaleString()}</div>
                                                <div><strong>Status:</strong> <Badge bg="success">{admission.status}</Badge></div>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            {/* [TITAN] AI Clinical Summary - Phase 3 */}
                            <AIClinicalSummary 
                                patientId={admission.patient_id} 
                                admissionId={admission.admission_id}
                                show={show}
                            />

                            {/* Problem List (Phase 1) */}
                            <div className="mb-3">
                                <ProblemListPanel
                                    patientId={admission.patient_id}
                                    patientName={admission.patient_name}
                                />
                                <EarlyWarningScore vitals={vitalsHistory[0]} />
                            </div>

                            {/* Bed History Timeline */}
                            <Card className="border-0 bg-light mb-3">
                                <Card.Body>
                                    <BedHistoryTimeline admissionId={admission?.admission_id} />
                                </Card.Body>
                            </Card>

                            {/* Latest Vitals */}
                            <Card className="border-0 bg-light">
                                <Card.Body>
                                    <h6 className="fw-bold mb-3">Latest Vitals</h6>
                                    {vitalsHistory.length > 0 ? (
                                        <Row className="text-center">
                                            <Col><div className="text-muted small">BP</div><div className="fw-bold">{vitalsHistory[0]?.bp || 'N/A'}</div></Col>
                                            <Col><div className="text-muted small">Pulse</div><div className="fw-bold">{vitalsHistory[0]?.heart_rate || 'N/A'}</div></Col>
                                            <Col><div className="text-muted small">Temp</div><div className="fw-bold">{vitalsHistory[0]?.temp || 'N/A'}</div></Col>
                                            <Col><div className="text-muted small">SpO2</div><div className="fw-bold">{vitalsHistory[0]?.spo2 || 'N/A'}%</div></Col>
                                        </Row>
                                    ) : (
                                        <div className="text-muted text-center">No vitals recorded</div>
                                    )}
                                </Card.Body>
                            </Card>

                            {/* Vitals Trend Chart */}
                            <Card className="border-0 bg-light mt-3">
                                <Card.Body>
                                    <VitalsTrendGraph vitalsHistory={vitalsHistory} />
                                </Card.Body>
                            </Card>


                            <div className="mt-4">
                                <h6 className="fw-bold mb-3"><ClipboardList size={16} className="me-2"/>Discharge Readiness Audit</h6>
                                <DischargeChecklist admissionId={admission.admission_id} />
                            </div>
                        </div>
                    </Tab>

                    {/* Medications Tab */}
                    <Tab eventKey="meds" title={<span><Pill size={16} className="me-1" />Meds & Orders</span>}>
                        <div className="p-4">
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <h5 className="fw-bold mb-0">Medication Management</h5>
                                <div className="d-flex gap-2">
                                    <div className="d-flex align-items-center bg-light border rounded px-2">
                                        <Utensils size={16} className="text-muted me-2" />
                                        <span className="small fw-bold me-2">Diet:</span>
                                        <Form.Select 
                                            size="sm" 
                                            style={{ width: '120px', border: 'none', background: 'transparent' }}
                                            defaultValue={admission.current_diet || 'Normal'}
                                            onChange={(e) => handleDietChange(e.target.value)}
                                        >
                                            {DIET_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </Form.Select>
                                    </div>
                                <div style={{ width: '200px' }}>
                                    <OrderSetSelector
                                        admissionId={admission.admission_id}
                                        patientId={admission.patient_id}
                                        onOrdersPlaced={fetchData}
                                    />
                                </div>
                            </div>
                            </div>

                            {/* Order Medication Button */}
                            <div className="d-flex justify-content-end mb-3">
                                <Button variant="success" size="sm" onClick={() => setShowMedOrderModal(true)}>
                                    <Pill size={16} className="me-1" /> + Order Medication
                                </Button>
                            </div>

                            <MedicationReconciliation hospitalMeds={medications} />

                            <hr className="my-4" />

                            <h5 className="fw-bold mb-3">Active Prescriptions</h5>
                            <ListGroup>
                                {medications.length > 0 ? medications.map(med => (
                                    <ListGroup.Item key={med.id} className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <div className="fw-bold">{med.description}</div>
                                            <small className="text-muted">Scheduled: {new Date(med.scheduled_time).toLocaleString()}</small>
                                        </div>
                                        <Badge bg={med.status === 'Completed' ? 'success' : 'warning'}>{med.status}</Badge>
                                    </ListGroup.Item>
                                )) : <ListGroup.Item>No active prescriptions</ListGroup.Item>}
                            </ListGroup>
                        </div>
                    </Tab>

                    {/* Care Plans Tab (Phase 2) */}
                    <Tab eventKey="care_plans" title={<span><ClipboardList size={16} className="me-1" />Care Pathways</span>}>
                        <div className="p-4">
                            <CarePlanManager
                                admissionId={admission.admission_id}
                                patientId={admission.patient_id}
                            />
                        </div>
                    </Tab>

                    {/* Vitals History Tab */}
                    <Tab eventKey="vitals" title={<span><Activity size={16} className="me-1" />Vitals</span>}>
                        <div className="p-4">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="fw-bold mb-0">Vitals History</h5>
                                <Button variant="success" size="sm" onClick={() => setShowVitalRequestModal(true)}>
                                    <Activity size={16} className="me-1" /> + Request Vital Check
                                </Button>
                            </div>
                            <div className="table-responsive">
                                <Table hover>
                                    <thead>
                                        <tr>
                                            <th>Time</th>
                                            <th>BP</th>
                                            <th>Pulse</th>
                                            <th>Temp</th>
                                            <th>SpO2</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {vitalsHistory.length > 0 ? vitalsHistory.map(v => (
                                            <tr key={v.id}>
                                                <td>{new Date(v.created_at).toLocaleString()}</td>
                                                <td>{v.bp}</td>
                                                <td>{v.heart_rate}</td>
                                                <td>{v.temp}</td>
                                                <td>{v.spo2}%</td>
                                            </tr>
                                        )) : <tr><td colSpan="5" className="text-center">No vitals recorded</td></tr>}
                                    </tbody>
                                </Table>
                            </div>
                        </div>
                    </Tab>

                    {/* Lab Results Tab */}
                    <Tab eventKey="labs" title={<span><FlaskConical size={16} className="me-1" />Labs</span>}>
                        <div className="p-4">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="fw-bold mb-0">Lab Results</h5>
                                <div className="d-flex gap-2">
                                    <Button variant="info" size="sm" onClick={() => setShowLabOrderModal(true)}>
                                        <FlaskConical size={16} className="me-1" /> + Order Lab Test
                                    </Button>
                                    <Button variant="secondary" size="sm" onClick={() => setShowRadiologyModal(true)} style={{ backgroundColor: '#6f42c1', borderColor: '#6f42c1' }}>
                                        📷 Radiology/Imaging
                                    </Button>
                                    <Button variant="danger" size="sm" onClick={() => setShowBloodRequestModal(true)}>
                                        🩸 Request Blood
                                    </Button>
                                </div>
                            </div>
                            <ListGroup>
                                {labResults.length > 0 ? labResults.map(lab => (
                                    <ListGroup.Item key={lab.id}>
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <strong>{lab.test_name}</strong>
                                            <Badge bg={lab.status === 'Completed' ? 'success' : 'warning'}>{lab.status}</Badge>
                                        </div>
                                        <small className="text-muted d-block mb-2">Requested: {new Date(lab.requested_at).toLocaleString()}</small>
                                        {lab.result_json ? (
                                            <div className="bg-light p-2 rounded small">
                                                <pre className="mb-0">{JSON.stringify(lab.result_json, null, 2)}</pre>
                                            </div>
                                        ) : (
                                            <div className="text-muted small fst-italic">Results pending...</div>
                                        )}
                                    </ListGroup.Item>
                                )) : <ListGroup.Item>No lab requests found</ListGroup.Item>}
                            </ListGroup>

                            <LabTrendView labResults={labResults} />
                        </div>
                    </Tab>

                    {/* AI Assistant Tab */}
                    <Tab eventKey="ai" title={<span><Brain size={16} className="me-1" />AI Assistant</span>}>
                        <div className="p-4">
                            <AIAssistant
                                patientInfo={{
                                    age: age,
                                    gender: admission.gender,
                                    weight: admission.weight,
                                    medical_history: admission.diagnosis
                                }}
                                currentMedications={medications}
                            />
                        </div>
                    </Tab>

                    {/* Progress Notes Tab (Updated for SOAP) */}
                    <Tab eventKey="notes" title={<span><FileText size={16} className="me-1" />SOAP Notes</span>}>
                        <div className="p-4">
                            <SOAPNoteEditor
                                admissionId={admission.admission_id}
                                patientId={admission.patient_id}
                                patientName={admission.patient_name}
                                vitals={vitalsHistory[0]}
                                onSave={() => fetchData()}
                            />

                            <h5 className="fw-bold mt-4 mb-3">Clinical Notes History</h5>
                            <ListGroup>
                                {notes.length > 0 ? notes.map((note, idx) => (
                                    <ListGroup.Item key={idx} className="mb-2 shadow-sm border-0">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <Badge bg="info">{note.note_type || 'Progress Note'}</Badge>
                                            <small className="text-muted">{new Date(note.created_at || note.date).toLocaleString()}</small>
                                        </div>
                                        {note.subjective && (
                                            <div className="mb-1"><strong>S:</strong> {note.subjective}</div>
                                        )}
                                        {note.objective && (
                                            <div className="mb-1"><strong>O:</strong> {note.objective}</div>
                                        )}
                                        {note.assessment && (
                                            <div className="mb-1"><strong>A:</strong> {note.assessment}</div>
                                        )}
                                        {note.plan && (
                                            <div className="mb-1"><strong>P:</strong> {note.plan}</div>
                                        )}
                                        {/* Fallback for old notes */}
                                        {note.diagnosis && !note.subjective && (
                                            <div>{note.diagnosis}</div>
                                        )}
                                        <div className="text-end text-muted small mt-2">
                                            - {note.doctor_name || 'Doctor'}
                                        </div>
                                    </ListGroup.Item>
                                )) : <ListGroup.Item>No notes recorded</ListGroup.Item>}
                            </ListGroup>
                        </div>
                    </Tab>
                </Tabs>
            </Modal.Body>
            <Modal.Footer className="bg-light">
                <Button variant="outline-secondary" onClick={onHide}>Close</Button>
                <Button variant="outline-info" onClick={() => setShowMedicalCertificate(true)}>
                    <FileText size={16} className="me-1" /> Certificates
                </Button>
                <Button variant="outline-warning" onClick={() => setShowConsentForm(true)}>
                    <FileText size={16} className="me-1" /> Consents
                </Button>
                <Button variant="outline-primary" onClick={() => setShowReferralLetter(true)}>
                    <Send size={16} className="me-1" /> Referral
                </Button>
                <Button variant="success" onClick={() => setShowNursingInstructionsModal(true)}>
                    📋 Nursing Instructions
                </Button>
                <Button variant="outline-success" onClick={handleShowDischargeSummary}>
                    <Printer size={16} className="me-1" /> Print Discharge Summary
                </Button>
                <Button variant="danger" onClick={() => setShowDischargeWorkflow(true)}>
                    <UserX size={16} className="me-1" /> Discharge Workflow
                </Button>
            </Modal.Footer>

            {/* Discharge Summary Print Modal */}
            <DischargeSummary
                show={showDischargeSummary}
                onHide={() => setShowDischargeSummary(false)}
                admission={admission}
                medications={medications}
                vitalsHistory={vitalsHistory}
                labResults={labResults}
                diagnosis={notes[0]?.assessment || notes[0]?.diagnosis || admission.diagnosis}
                onConfirmDischarge={handleDischarge}
                doctorName={admission.doctor_name || notes[0]?.doctor_name}
                doctorRegNo={admission.doctor_reg_no}
                presentingComplaints={admission.presenting_complaints || admission.chief_complaints || notes[0]?.subjective}
                provisionalDiagnosis={admission.provisional_diagnosis}
            />

            {/* Medical Certificate Print Modal */}
            <MedicalCertificatePrint
                show={showMedicalCertificate}
                onHide={() => setShowMedicalCertificate(false)}
                patient={{
                    name: admission.patient_name,
                    age: age,
                    gender: admission.gender,
                    address: admission.address
                }}
                doctorName={notes[0]?.doctor_name}
            />

            {/* Consent Form Print Modal */}
            <ConsentFormPrint
                show={showConsentForm}
                onHide={() => setShowConsentForm(false)}
                patient={{
                    name: admission.patient_name,
                    age: age,
                    gender: admission.gender,
                    id: admission.patient_number || admission.patient_id
                }}
                doctorName={notes[0]?.doctor_name}
            />

            {/* Referral Letter Print Modal */}
            <ReferralLetterPrint
                show={showReferralLetter}
                onHide={() => setShowReferralLetter(false)}
                patient={{
                    name: admission.patient_name,
                    age: age,
                    gender: admission.gender,
                    id: admission.patient_number || admission.patient_id
                }}
                doctorName={notes[0]?.doctor_name}
                diagnosis={notes[0]?.diagnosis}
            />

            {/* IPD Medication Order Modal - Enhanced with Clinical Decision Support */}
            <IPDMedicationModal
                show={showMedOrderModal}
                onHide={() => setShowMedOrderModal(false)}
                admissionId={admission.admission_id}
                patientId={admission.patient_id}
                patientName={admission.patient_name}
                onMedicationAdded={fetchData}
                patientAllergies={admission.allergies ? admission.allergies.split(',').map(a => a.trim()) : []}
                currentMedications={medications}
            />

            {/* IPD Lab Order Modal */}
            <IPDLabOrderModal
                show={showLabOrderModal}
                onHide={() => setShowLabOrderModal(false)}
                admissionId={admission.admission_id}
                patientId={admission.patient_id}
                patientName={admission.patient_name}
                onLabOrdered={fetchData}
            />

            {/* IPD Vital Request Modal */}
            <IPDVitalRequestModal
                show={showVitalRequestModal}
                onHide={() => setShowVitalRequestModal(false)}
                admissionId={admission.admission_id}
                patientId={admission.patient_id}
                patientName={admission.patient_name}
                onVitalRequested={fetchData}
            />

            {/* IPD Blood Request Modal */}
            <IPDBloodRequestModal
                show={showBloodRequestModal}
                onHide={() => setShowBloodRequestModal(false)}
                patient={{ id: admission.patient_id, name: admission.patient_name, blood_group: admission.blood_group, bed_number: admission.bed_number }}
                admissionId={admission.admission_id}
                onSuccess={fetchData}
            />

            {/* IPD Radiology/Imaging Modal */}
            <IPDRadiologyModal
                show={showRadiologyModal}
                onHide={() => setShowRadiologyModal(false)}
                admissionId={admission.admission_id}
                patientId={admission.patient_id}
                patientName={admission.patient_name}
                onImagingOrdered={fetchData}
            />

            {/* Nursing Instructions Modal */}
            <NursingInstructionsModal
                show={showNursingInstructionsModal}
                onHide={() => setShowNursingInstructionsModal(false)}
                admissionId={admission.admission_id}
                patientId={admission.patient_id}
                patientName={admission.patient_name}
                onInstructionSent={fetchData}
            />

            {/* Discharge Workflow Modal */}
            <DischargeWorkflowModal
                show={showDischargeWorkflow}
                onHide={() => setShowDischargeWorkflow(false)}
                admission={admission}
                onDischargeComplete={() => {
                    onDischarge?.();
                    onHide();
                }}
            />
        </Modal>
    );
};

export default DoctorPatientProfile;
