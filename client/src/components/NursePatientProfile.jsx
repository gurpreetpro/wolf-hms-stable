import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Tab, Card, Form, Button, Row, Col, Badge, ListGroup, ProgressBar, Alert } from 'react-bootstrap';
import { Heart, Activity, Droplet, Syringe, CheckCircle, XCircle, Edit3, Save, Pill, FlaskConical, Sparkles, Package, FileText, Printer, Zap } from 'lucide-react';
import api from '../utils/axiosInstance';
import VitalsTrendGraph from './VitalsTrendGraph';
import { NEWSCard } from './NEWSScore';
import WoundAssessmentTab from './WoundAssessmentTab';
import FallRiskAssessmentTab from './FallRiskAssessmentTab';
// Document Print Components
import AdmissionFormPrint from './AdmissionFormPrint';
import AMAFormPrint from './AMAFormPrint';
import DeathCertificatePrint from './DeathCertificatePrint';
import BirthCertificatePrint from './BirthCertificatePrint';
import MLCReportPrint from './MLCReportPrint';
import DischargeSummary from './DischargeSummary';
import EMAR from './nursing/eMAR';

const NursePatientProfile = ({ show, onHide, admission }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [carePlan, setCarePlan] = useState(null);
    const [painScores, setPainScores] = useState([]);
    const [fluidBalance, setFluidBalance] = useState({ entries: [], intake: 0, output: 0, netBalance: 0 });
    const [ivLines, setIvLines] = useState([]);
    const [medications, setMedications] = useState([]);
    const [vitalsHistory, setVitalsHistory] = useState([]);
    const [labResults, setLabResults] = useState([]);
    const [consumablesList, setConsumablesList] = useState([]); // Catalog
    const [patientConsumables, setPatientConsumables] = useState([]); // Usage History
    const [consumableForm, setConsumableForm] = useState({ consumable_id: '', quantity: 1, notes: '' });
    
    // Services State
    const [servicesList, setServicesList] = useState([]); // Catalog
    const [patientServices, setPatientServices] = useState([]); // Usage History
    const [serviceForm, setServiceForm] = useState({ service_id: '', quantity: 1, notes: '' });

    const [isEditing, setIsEditing] = useState(false);
    const [generatingAI, setGeneratingAI] = useState(false);

    // Document Print Modal States
    const [showAdmissionPrint, setShowAdmissionPrint] = useState(false);
    const [showAMAPrint, setShowAMAPrint] = useState(false);
    const [showDeathCertPrint, setShowDeathCertPrint] = useState(false);
    const [showBirthCertPrint, setShowBirthCertPrint] = useState(false);
    const [showMLCPrint, setShowMLCPrint] = useState(false);
    const [showDischargeSummary, setShowDischargeSummary] = useState(false);

    // Form States
    const [carePlanForm, setCarePlanForm] = useState({ diagnosis: '', goal: '', interventions: '' });
    const [painForm, setPainForm] = useState({ score: 5, location: '', notes: '' });
    const [fluidForm, setFluidForm] = useState({ type: 'Intake', subtype: '', volume_ml: '' });
    const [ivForm, setIvForm] = useState({ site: '', gauge: '', notes: '' });

    useEffect(() => {
        if (show && admission) {
            fetchData();
        }
    }, [show, admission]);


    const fetchData = async () => {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };
        
        // Helper to safely extract data from ResponseHandler objects ({ success: true, data: ... })
        const getData = (res) => res.data && res.data.data ? res.data.data : res.data;

        // Wrapper for safe API calls - each call is independent, one failure won't stop others
        const safeCall = async (apiCall, fallback, name) => {
            try {
                return await apiCall();
            } catch (err) {
                console.warn(`[NurseProfile] ${name} fetch failed:`, err.message);
                return fallback;
            }
        };

        // Fetch Care Plan
        const carePlanRes = await safeCall(
            () => api.get(`/api/nurse/care-plan/${admission.admission_id}`, { headers }),
            { data: { carePlan: null } },
            'CarePlan'
        );
        const carePlanData = getData(carePlanRes);
        const carePlanObj = carePlanData?.carePlan !== undefined ? carePlanData.carePlan : carePlanData;
        setCarePlan(carePlanObj || null);
        if (carePlanObj) {
            setCarePlanForm({
                diagnosis: carePlanObj.diagnosis || '',
                goal: carePlanObj.goal || '',
                interventions: carePlanObj.interventions || ''
            });
        }

        // Fetch Pain Scores
        const painRes = await safeCall(
            () => api.get(`/api/nurse/pain/${admission.admission_id}`, { headers }),
            { data: { painScores: [] } },
            'PainScores'
        );
        const painData = getData(painRes);
        setPainScores(painData?.painScores || []);

        // Fetch Fluid Balance
        const fluidRes = await safeCall(
            () => api.get(`/api/nurse/fluid-balance/${admission.admission_id}`, { headers }),
            { data: { entries: [], intake: 0, output: 0, netBalance: 0 } },
            'FluidBalance'
        );
        const fluidData = getData(fluidRes);
        setFluidBalance(fluidData?.entries ? fluidData : { entries: [], intake: 0, output: 0, netBalance: 0 });

        // Fetch IV Lines
        const ivRes = await safeCall(
            () => api.get(`/api/nurse/iv-line/${admission.admission_id}`, { headers }),
            { data: { ivLines: [] } },
            'IVLines'
        );
        const ivData = getData(ivRes);
        setIvLines(ivData?.ivLines || []);

        // Fetch Medications
        const medsRes = await safeCall(
            () => api.get(`/api/clinical/tasks?admission_id=${admission.admission_id}`, { headers }),
            { data: [] },
            'Medications'
        );
        const medsData = getData(medsRes);
        setMedications(Array.isArray(medsData) ? medsData.filter(t => t.type === 'Medication') : []);

        // Fetch Vitals History
        const vitalsRes = await safeCall(
            () => api.get(`/api/clinical/vitals/${admission.patient_id}`, { headers }),
            { data: [] },
            'Vitals'
        );
        const vitalsData = getData(vitalsRes);
        setVitalsHistory(Array.isArray(vitalsData) ? vitalsData : []);

        // Fetch Lab Results
        const labsRes = await safeCall(
            () => api.get(`/api/lab/patient/${admission.patient_id}`, { headers }),
            { data: [] },
            'Labs'
        );
        const labsData = getData(labsRes);
        setLabResults(Array.isArray(labsData) ? labsData : []);

        // Fetch Consumables Catalog (Ward Consumables) - ALWAYS fetch these
        const consCatalogRes = await safeCall(
            () => api.get('/api/ward/consumables', { headers }),
            { data: [] },
            'ConsumablesCatalog'
        );
        const catalogData = getData(consCatalogRes);
        setConsumablesList(Array.isArray(catalogData) ? catalogData.filter(c => c.active !== false) : []);

        // Fetch Patient Consumables Usage
        if (admission.admission_id) {
            const consUsageRes = await safeCall(
                () => api.get(`/api/nurse/consumables/${admission.admission_id}`, { headers }),
                { data: { consumables: [] } },
                'ConsumablesUsage'
            );
            const usageData = getData(consUsageRes);
            setPatientConsumables(usageData?.consumables || []);
        }

        // Fetch Services Catalog (Ward Charges)
        const servCatalogRes = await safeCall(
            () => api.get('/api/ward/charges', { headers }),
            { data: [] },
            'ServicesCatalog'
        );
        const servCatalogData = getData(servCatalogRes);
        setServicesList(Array.isArray(servCatalogData) ? servCatalogData : []);

        // Fetch Patient Services Usage
        if (admission.admission_id) {
            const servUsageRes = await safeCall(
                () => api.get(`/api/nurse/services/${admission.admission_id}`, { headers }),
                { data: { services: [] } },
                'ServicesUsage'
            );
            const servUsageData = getData(servUsageRes);
            setPatientServices(servUsageData?.services || []);
        }
    };

    const handleSaveCarePlan = async () => {
        const token = localStorage.getItem('token');
        try {
            if (carePlan) {
                await api.put(`/api/nurse/care-plan/${carePlan.id}`, { 
                    ...carePlanForm, 
                    status: 'Active' 
                }, { headers: { Authorization: `Bearer ${token}` } });
            } else {
                await api.post('/api/nurse/care-plan', {
                    admission_id: admission.admission_id,
                    patient_id: admission.patient_id,
                    ...carePlanForm
                }, { headers: { Authorization: `Bearer ${token}` } });
            }
            setIsEditing(false);
            fetchData();
            alert('Care plan saved successfully');
        } catch (err) {
            console.error(err);
            alert('Failed to save care plan');
        }
    };

    const handleGenerateAICarePlan = async () => {
        // Use current form diagnosis or fallback
        const currentDiagnosis = carePlanForm.diagnosis || (carePlan && carePlan.diagnosis) || (admission && admission.diagnosis);

        if (!currentDiagnosis) {
            alert('Please enter a Medical Diagnosis first to generate a care plan.');
            return;
        }

        setGeneratingAI(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.post('/api/ai/care-plan', {
                diagnosis: currentDiagnosis,
                age: admission.age,
                gender: admission.gender,
                vitals: vitalsHistory.length > 0 ? vitalsHistory[0] : null
            }, { headers: { Authorization: `Bearer ${token}` } });

            if (res.data.fallback) {
                console.warn('AI Fallback used');
            }

            setCarePlanForm({
                diagnosis: res.data.diagnosis,
                goal: res.data.goal, // AI returns 'goal'
                interventions: res.data.interventions // AI returns 'interventions'
            });
        } catch (err) {
            console.error(err);
            alert('Failed to generate AI care plan');
        } finally {
            setGeneratingAI(false);
        }
    };

    const handleLogPain = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            await api.post('/api/nurse/pain', {
                admission_id: admission.admission_id,
                patient_id: admission.patient_id,
                ...painForm
            }, { headers: { Authorization: `Bearer ${token}` } });
            setPainForm({ score: 5, location: '', notes: '' });
            fetchData();
            alert('Pain score logged');
        } catch (err) {
            console.error(err);
            alert('Failed to log pain score');
        }
    };

    const handleLogFluid = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            await api.post('/api/nurse/fluid-balance', {
                admission_id: admission.admission_id,
                patient_id: admission.patient_id,
                ...fluidForm
            }, { headers: { Authorization: `Bearer ${token}` } });
            setFluidForm({ type: 'Intake', subtype: '', volume_ml: '' });
            fetchData();
            alert('Fluid balance logged');
        } catch (err) {
            console.error(err);
            alert('Failed to log fluid balance');
        }
    };

    const handleInsertIV = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        try {
            await api.post('/api/nurse/iv-line', {
                admission_id: admission.admission_id,
                patient_id: admission.patient_id,
                ...ivForm
            }, { headers: { Authorization: `Bearer ${token}` } });
            setIvForm({ site: '', gauge: '', notes: '' });
            fetchData();
            alert('IV line inserted');
        } catch (err) {
            console.error(err);
            alert('Failed to insert IV line');
        }
    };

    const handleRemoveIV = async (id) => {
        const token = localStorage.getItem('token');
        try {
            await api.put(`/api/nurse/iv-line/${id}/remove`, {}, { headers: { Authorization: `Bearer ${token}` } });
            fetchData();
            alert('IV line removed');
        } catch (err) {
            console.error(err);
            alert('Failed to remove IV line');
        }
    };

    const handleAdministerMed = async (taskId) => {
        const token = localStorage.getItem('token');
        try {
            await api.put('/api/clinical/task/complete', { task_id: taskId }, { headers: { Authorization: `Bearer ${token}` } });
            fetchData();
            alert('Medication administered');
        } catch (err) {
            console.error(err);
            alert('Failed to administer medication');
        }
    };

    const handleRecordConsumable = async (e) => {
        e.preventDefault();
        if (!consumableForm.consumable_id) return;
        const token = localStorage.getItem('token');
        try {
            await api.post('/api/nurse/consumables', {
                admission_id: admission.admission_id,
                patient_id: admission.patient_id,
                ...consumableForm
            }, { headers: { Authorization: `Bearer ${token}` } });

            setConsumableForm({ consumable_id: '', quantity: 1, notes: '' });
            fetchData(); // Refresh history
            alert('Consumable recorded successfully');
        } catch (err) {
            console.error(err);
            alert('Failed to record consumable');
        }
    };

    const handleRecordService = async (e) => {
        e.preventDefault();
        if (!serviceForm.service_id) return;
        const token = localStorage.getItem('token');
        try {
            await api.post('/api/nurse/services', {
                admission_id: admission.admission_id,
                service_id: serviceForm.service_id,
                quantity: serviceForm.quantity,
                notes: serviceForm.notes
            }, { headers: { Authorization: `Bearer ${token}` } });

            setServiceForm({ service_id: '', quantity: 1, notes: '' });
            fetchData(); // Refresh history
            alert('Service charge recorded successfully');
        } catch (err) {
            console.error(err);
            alert('Failed to record service charge');
        }
    };

    if (!admission) return null;

    return (
        <Modal show={show} onHide={onHide} size="xl" centered>
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title>
                    <strong>{admission.patient_name}</strong> - {admission.bed_number}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="p-0">
                <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-0">
                    {/* Overview Tab */}
                    <Tab eventKey="overview" title={<span><Activity size={16} className="me-1" />Overview</span>}>
                        <div className="p-4">
                            <Row>
                                <Col md={6}>
                                    <Card className="mb-3 border-0 shadow-sm">
                                        <Card.Header className="bg-light fw-bold">Patient Demographics</Card.Header>
                                        <Card.Body>
                                            <p><strong>Name:</strong> {admission.patient_name}</p>
                                            <p><strong>Ward:</strong> {admission.ward}</p>
                                            <p><strong>Bed:</strong> {admission.bed_number}</p>
                                            <p><strong>Admitted:</strong> {new Date(admission.admission_date).toLocaleDateString()}</p>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={6}>
                                    <Card className="mb-3 border-0 shadow-sm">
                                        <Card.Header className="bg-light fw-bold">Quick Stats</Card.Header>
                                        <Card.Body>
                                            <p><strong>Latest Pain Score:</strong> {painScores.length > 0 ? `${painScores[0].score}/10` : 'N/A'}</p>
                                            <p><strong>24hr Fluid Balance:</strong> {fluidBalance.netBalance > 0 ? '+' : ''}{fluidBalance.netBalance} ml</p>
                                            <p><strong>Active IV Lines:</strong> {ivLines.filter(iv => iv.status === 'Active').length}</p>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                            {/* NEWS Early Warning Score - Gold Standard Phase 3 */}
                            {vitalsHistory.length > 0 && (
                                <NEWSCard vitals={vitalsHistory[0]} />
                            )}
                        </div>
                    </Tab>

                    {/* Care Plan Tab */}
                    <Tab eventKey="care-plan" title={<span><Edit3 size={16} className="me-1" />Care Plan</span>}>
                        <div className="p-4">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="fw-bold mb-0">Nursing Care Plan</h5>
                                {!isEditing && (
                                    <Button size="sm" variant="outline-primary" onClick={() => setIsEditing(true)}>
                                        <Edit3 size={14} className="me-1" /> Edit
                                    </Button>
                                )}
                            </div>
                            {isEditing ? (
                                <Form>
                                    <div className="d-flex justify-content-end mb-2">
                                        <Button
                                            variant="outline-info"
                                            size="sm"
                                            onClick={handleGenerateAICarePlan}
                                            disabled={generatingAI}
                                        >
                                            {generatingAI ? (
                                                <><span className="spinner-border spinner-border-sm me-2" />Generating...</>
                                            ) : (
                                                <><Sparkles size={14} className="me-1" /> Auto-Generate with AI</>
                                            )}
                                        </Button>
                                    </div>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Nursing Diagnosis</Form.Label>
                                        <Form.Control as="textarea" rows={2} value={carePlanForm.diagnosis} onChange={e => setCarePlanForm({ ...carePlanForm, diagnosis: e.target.value })} />
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Goal</Form.Label>
                                        <Form.Control as="textarea" rows={2} value={carePlanForm.goal} onChange={e => setCarePlanForm({ ...carePlanForm, goal: e.target.value })} />
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Interventions</Form.Label>
                                        <Form.Control as="textarea" rows={3} value={carePlanForm.interventions} onChange={e => setCarePlanForm({ ...carePlanForm, interventions: e.target.value })} />
                                    </Form.Group>
                                    <div className="d-flex gap-2">
                                        <Button variant="success" onClick={handleSaveCarePlan}><Save size={14} className="me-1" /> Save</Button>
                                        <Button variant="secondary" onClick={() => setIsEditing(false)}>Cancel</Button>
                                    </div>
                                </Form>
                            ) : (
                                <>
                                    {carePlan ? (
                                        <>
                                            <p><strong>Diagnosis:</strong> {carePlan.diagnosis}</p>
                                            <p><strong>Goal:</strong> {carePlan.goal}</p>
                                            <p><strong>Interventions:</strong> {carePlan.interventions}</p>
                                            <Badge bg="success">Active</Badge>
                                            <small className="text-muted ms-2">Last updated: {new Date(carePlan.updated_at).toLocaleString()}</small>
                                        </>
                                    ) : (
                                        <Alert variant="warning">No care plan created yet. Click "Edit" to create one.</Alert>
                                    )}
                                </>
                            )}
                        </div>
                    </Tab>

                    {/* Pain Score Tab */}
                    <Tab eventKey="pain" title={<span><Heart size={16} className="me-1" />Pain</span>}>
                        <div className="p-4">
                            <h5 className="fw-bold mb-3">Pain Assessment</h5>
                            <Form onSubmit={handleLogPain} className="mb-4">
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Pain Score (0-10)</Form.Label>
                                            <Form.Range min={0} max={10} value={painForm.score} onChange={e => setPainForm({ ...painForm, score: e.target.value })} />
                                            <div className="text-center mt-2">
                                                <Badge bg={painForm.score < 4 ? 'success' : painForm.score < 7 ? 'warning' : 'danger'} className="fs-3">{painForm.score}/10</Badge>
                                            </div>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Location</Form.Label>
                                            <Form.Control value={painForm.location} onChange={e => setPainForm({ ...painForm, location: e.target.value })} placeholder="e.g., Lower Back" />
                                        </Form.Group>
                                    </Col>
                                    <Col md={12}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Notes</Form.Label>
                                            <Form.Control value={painForm.notes} onChange={e => setPainForm({ ...painForm, notes: e.target.value })} placeholder="Additional observations" />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Button type="submit" variant="primary">Log Pain Score</Button>
                            </Form>

                            <h6 className="fw-bold mb-2">Recent Pain Scores</h6>
                            <ListGroup>
                                {painScores.length > 0 ? painScores.map(ps => (
                                    <ListGroup.Item key={ps.id} className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <Badge bg={ps.score < 4 ? 'success' : ps.score < 7 ? 'warning' : 'danger'}>{ps.score}/10</Badge>
                                            <span className="ms-2">{ps.location}</span>
                                            {ps.notes && <small className="text-muted d-block">{ps.notes}</small>}
                                        </div>
                                        <small className="text-muted">{new Date(ps.recorded_at).toLocaleString()}</small>
                                    </ListGroup.Item>
                                )) : <ListGroup.Item>No pain scores recorded</ListGroup.Item>}
                            </ListGroup>
                        </div>
                    </Tab>

                    {/* Fluid Balance Tab */}
                    <Tab eventKey="fluid" title={<span><Droplet size={16} className="me-1" />I/O</span>}>
                        <div className="p-4">
                            <h5 className="fw-bold mb-3">Fluid Balance (24hr)</h5>
                            <Row className="mb-4">
                                <Col md={4} className="text-center">
                                    <Card className="border-success">
                                        <Card.Body>
                                            <h6>Intake</h6>
                                            <Badge bg="success" className="fs-5">{fluidBalance.intake} ml</Badge>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={4} className="text-center">
                                    <Card className="border-danger">
                                        <Card.Body>
                                            <h6>Output</h6>
                                            <Badge bg="danger" className="fs-5">{fluidBalance.output} ml</Badge>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={4} className="text-center">
                                    <Card className="border-primary">
                                        <Card.Body>
                                            <h6>Net Balance</h6>
                                            <Badge bg={fluidBalance.netBalance > 0 ? 'success' : 'warning'} className="fs-5">
                                                {fluidBalance.netBalance > 0 ? '+' : ''}{fluidBalance.netBalance} ml
                                            </Badge>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            <Form onSubmit={handleLogFluid} className="mb-4">
                                <Row>
                                    <Col md={4}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Type</Form.Label>
                                            <Form.Select value={fluidForm.type} onChange={e => setFluidForm({ ...fluidForm, type: e.target.value })}>
                                                <option value="Intake">Intake</option>
                                                <option value="Output">Output</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Subtype</Form.Label>
                                            <Form.Control value={fluidForm.subtype} onChange={e => setFluidForm({ ...fluidForm, subtype: e.target.value })} placeholder="e.g., IV, Oral, Urine" required />
                                        </Form.Group>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Volume (ml)</Form.Label>
                                            <Form.Control type="number" value={fluidForm.volume_ml} onChange={e => setFluidForm({ ...fluidForm, volume_ml: e.target.value })} required />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Button type="submit" variant="primary">Log Entry</Button>
                            </Form>

                            <h6 className="fw-bold mb-2">Recent Entries</h6>
                            <ListGroup style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                {fluidBalance.entries.length > 0 ? fluidBalance.entries.map(entry => (
                                    <ListGroup.Item key={entry.id} className="d-flex justify-content-between">
                                        <div>
                                            <Badge bg={entry.type === 'Intake' ? 'success' : 'danger'}>{entry.type}</Badge>
                                            <span className="ms-2">{entry.subtype}: {entry.volume_ml} ml</span>
                                        </div>
                                        <small className="text-muted">{new Date(entry.recorded_at).toLocaleString()}</small>
                                    </ListGroup.Item>
                                )) : <ListGroup.Item>No entries recorded</ListGroup.Item>}
                            </ListGroup>
                        </div>
                    </Tab>

                    {/* IV Lines Tab */}
                    <Tab eventKey="iv" title={<span><Syringe size={16} className="me-1" />IV Lines</span>}>
                        <div className="p-4">
                            <h5 className="fw-bold mb-3">IV Line Management</h5>
                            <Form onSubmit={handleInsertIV} className="mb-4 bg-light p-3 rounded">
                                <h6 className="mb-3">Insert New IV Line</h6>
                                <Row>
                                    <Col md={4}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Site</Form.Label>
                                            <Form.Control value={ivForm.site} onChange={e => setIvForm({ ...ivForm, site: e.target.value })} placeholder="e.g., Right Hand" required />
                                        </Form.Group>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Gauge</Form.Label>
                                            <Form.Select value={ivForm.gauge} onChange={e => setIvForm({ ...ivForm, gauge: e.target.value })} required>
                                                <option value="">Select...</option>
                                                <option value="18G">18G</option>
                                                <option value="20G">20G</option>
                                                <option value="22G">22G</option>
                                                <option value="24G">24G</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Notes</Form.Label>
                                            <Form.Control value={ivForm.notes} onChange={e => setIvForm({ ...ivForm, notes: e.target.value })} placeholder="Optional" />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Button type="submit" variant="success">Insert IV Line</Button>
                            </Form>

                            <h6 className="fw-bold mb-2">Current IV Lines</h6>
                            <ListGroup>
                                {ivLines.length > 0 ? ivLines.map(iv => (
                                    <ListGroup.Item key={iv.id} className={`d-flex justify-content-between align-items-center ${iv.status === 'Removed' ? 'bg-light text-muted' : ''}`}>
                                        <div>
                                            {iv.status === 'Active' ? <CheckCircle size={18} className="text-success me-2" /> : <XCircle size={18} className="text-danger me-2" />}
                                            <strong>{iv.site}</strong> ({iv.gauge})
                                            <small className="text-muted d-block">Inserted: {new Date(iv.inserted_at).toLocaleString()}</small>
                                            {iv.removed_at && <small className="text-muted d-block">Removed: {new Date(iv.removed_at).toLocaleString()}</small>}
                                        </div>
                                        {iv.status === 'Active' && (
                                            <Button size="sm" variant="danger" onClick={() => handleRemoveIV(iv.id)}>Remove</Button>
                                        )}
                                    </ListGroup.Item>
                                )) : <ListGroup.Item>No IV lines recorded</ListGroup.Item>}
                            </ListGroup>
                        </div>
                    </Tab>

                    {/* Medications Tab - Enhanced with eMAR */}
                    <Tab eventKey="meds" title={<span><Pill size={16} className="me-1" />eMAR</span>}>
                        <div className="p-4">
                            <eMAR 
                                admissionId={admission.admission_id}
                                patientName={admission.patient_name}
                            />
                        </div>
                    </Tab>

                    {/* Vitals History Tab */}
                    <Tab eventKey="vitals" title={<span><Activity size={16} className="me-1" />Vitals</span>}>
                        <div className="p-4">
                            {/* Vitals Trend Graph - Gold Standard Phase 3 */}
                            <VitalsTrendGraph vitalsHistory={vitalsHistory} />
                            
                            <h5 className="fw-bold mb-3">Vitals History</h5>
                            <div className="table-responsive">
                                <table className="table table-hover">
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
                                </table>
                            </div>
                        </div>
                    </Tab>

                    {/* Lab Results Tab */}
                    <Tab eventKey="labs" title={<span><FlaskConical size={16} className="me-1" />Labs</span>}>
                        <div className="p-4">
                            <h5 className="fw-bold mb-3">Lab Results</h5>
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
                        </div>
                    </Tab>
                    {/* Consumables Tab */}
                    <Tab eventKey="consumables" title={<span><Package size={16} className="me-1" />Consumables</span>}>
                        <div className="p-4">
                            <h5 className="fw-bold mb-3">Record Consumable Usage</h5>
                            <Form onSubmit={handleRecordConsumable} className="mb-4 bg-light p-3 rounded">
                                <Row className="align-items-end">
                                    <Col md={5}>
                                        <Form.Group>
                                            <Form.Label>Item</Form.Label>
                                            <Form.Select
                                                value={consumableForm.consumable_id}
                                                onChange={e => setConsumableForm({ ...consumableForm, consumable_id: e.target.value })}
                                                required
                                            >
                                                <option value="">Select Item...</option>
                                                {consumablesList.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.name} (Stock: {c.stock_quantity})
                                                    </option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={2}>
                                        <Form.Group>
                                            <Form.Label>Quantity</Form.Label>
                                            <Form.Control
                                                type="number"
                                                min="1"
                                                value={consumableForm.quantity}
                                                onChange={e => setConsumableForm({ ...consumableForm, quantity: parseInt(e.target.value) })}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Notes</Form.Label>
                                            <Form.Control
                                                value={consumableForm.notes}
                                                onChange={e => setConsumableForm({ ...consumableForm, notes: e.target.value })}
                                                placeholder="Optional"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={2}>
                                        <Button type="submit" variant="primary" className="w-100">Record</Button>
                                    </Col>
                                </Row>
                            </Form>

                            <h6 className="fw-bold mb-2">Usage History</h6>
                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Item</th>
                                            <th>Qty</th>
                                            <th>Category</th>
                                            <th>Cost</th>
                                            <th>Recorded By</th>
                                            <th>Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {patientConsumables.length > 0 ? patientConsumables.map(pc => (
                                            <tr key={pc.id}>
                                                <td className="fw-bold">{pc.name}</td>
                                                <td>{pc.quantity}</td>
                                                <td><Badge bg="secondary" className="fw-normal">{pc.category}</Badge></td>
                                                <td>₹{pc.price * pc.quantity}</td>
                                                <td>{pc.recorded_by_name || 'Unknown'}</td>
                                                <td className="text-muted small">{new Date(pc.recorded_at).toLocaleString()}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="6" className="text-center text-muted py-3">No consumables recorded for this admission.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Tab>
                     {/* Services (Misc Charges) Tab */}
                    <Tab eventKey="services" title={<span><Zap size={16} className="me-1" />Services</span>}>
                        <div className="p-4">
                            <h5 className="fw-bold mb-3">Record Service Charge</h5>
                            <Form onSubmit={handleRecordService} className="mb-4 bg-light p-3 rounded">
                                <Row className="align-items-end">
                                    <Col md={5}>
                                        <Form.Group>
                                            <Form.Label>Service</Form.Label>
                                            <Form.Select
                                                value={serviceForm.service_id}
                                                onChange={e => setServiceForm({ ...serviceForm, service_id: e.target.value })}
                                                required
                                            >
                                                <option value="">Select Service...</option>
                                                {servicesList.map(s => (
                                                    <option key={s.id} value={s.id}>
                                                        {s.name} (₹{s.price})
                                                    </option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={2}>
                                        <Form.Group>
                                            <Form.Label>Quantity</Form.Label>
                                            <Form.Control
                                                type="number"
                                                min="1"
                                                value={serviceForm.quantity}
                                                onChange={e => setServiceForm({ ...serviceForm, quantity: parseInt(e.target.value) })}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group>
                                            <Form.Label>Notes</Form.Label>
                                            <Form.Control
                                                value={serviceForm.notes}
                                                onChange={e => setServiceForm({ ...serviceForm, notes: e.target.value })}
                                                placeholder="Optional"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={2}>
                                        <Button type="submit" variant="primary" className="w-100">Record</Button>
                                    </Col>
                                </Row>
                            </Form>

                            <h6 className="fw-bold mb-2">Service History</h6>
                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Service</th>
                                            <th>Qty</th>
                                            <th>Unit Cost</th>
                                            <th>Total</th>
                                            <th>Recorded By</th>
                                            <th>Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {patientServices.length > 0 ? patientServices.map(ps => (
                                            <tr key={ps.id}>
                                                <td className="fw-bold">{ps.name}</td>
                                                <td>{ps.quantity}</td>
                                                <td>₹{ps.price}</td>
                                                <td className="fw-bold">₹{ps.price * ps.quantity}</td>
                                                <td>{ps.recorded_by_name || 'Unknown'}</td>
                                                <td className="text-muted small">{new Date(ps.recorded_at).toLocaleString()}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="6" className="text-center text-muted py-3">No services recorded for this admission.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </Tab>
                    
                    {/* Wound Assessment Tab - Gold Standard Phase 3 */}
                    <Tab eventKey="wounds" title={<span>🩹 Wounds</span>}>
                        <WoundAssessmentTab admissionId={admission.admission_id} patientId={admission.patient_id} />
                    </Tab>
                    
                    {/* Fall Risk Tab - Gold Standard Phase 3 */}
                    <Tab eventKey="fall-risk" title={<span>⚠️ Fall Risk</span>}>
                        <FallRiskAssessmentTab admissionId={admission.admission_id} patientId={admission.patient_id} />
                    </Tab>
                    
                    {/* Documents Tab - Print Documents */}
                    <Tab eventKey="documents" title={<span><FileText size={16} className="me-1" />Documents</span>}>
                        <div className="p-4">
                            <h5 className="fw-bold mb-4">🖨️ Print Documents</h5>
                            <Row className="g-3">
                                {/* Admission Form */}
                                <Col md={4}>
                                    <Card className="h-100 border-primary" style={{ cursor: 'pointer' }} onClick={() => setShowAdmissionPrint(true)}>
                                        <Card.Body className="text-center">
                                            <div className="fs-1 mb-2">📋</div>
                                            <h6 className="fw-bold">Admission Form</h6>
                                            <small className="text-muted">IPD Admission Sheet</small>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                {/* AMA/LAMA Form */}
                                <Col md={4}>
                                    <Card className="h-100 border-warning" style={{ cursor: 'pointer' }} onClick={() => setShowAMAPrint(true)}>
                                        <Card.Body className="text-center">
                                            <div className="fs-1 mb-2">⚠️</div>
                                            <h6 className="fw-bold">AMA/LAMA Form</h6>
                                            <small className="text-muted">Against Medical Advice</small>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                {/* Discharge Summary */}
                                <Col md={4}>
                                    <Card className="h-100 border-success" style={{ cursor: 'pointer' }} onClick={() => setShowDischargeSummary(true)}>
                                        <Card.Body className="text-center">
                                            <div className="fs-1 mb-2">✅</div>
                                            <h6 className="fw-bold">Discharge Summary</h6>
                                            <small className="text-muted">NABH Compliant</small>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                {/* MLC Report */}
                                <Col md={4}>
                                    <Card className="h-100 border-danger" style={{ cursor: 'pointer' }} onClick={() => setShowMLCPrint(true)}>
                                        <Card.Body className="text-center">
                                            <div className="fs-1 mb-2">🚨</div>
                                            <h6 className="fw-bold">MLC Report</h6>
                                            <small className="text-muted">Medico-Legal Case</small>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                {/* Death Certificate */}
                                <Col md={4}>
                                    <Card className="h-100 border-secondary" style={{ cursor: 'pointer' }} onClick={() => setShowDeathCertPrint(true)}>
                                        <Card.Body className="text-center">
                                            <div className="fs-1 mb-2">⚰️</div>
                                            <h6 className="fw-bold">Death Certificate</h6>
                                            <small className="text-muted">Form 4/4A</small>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                {/* Birth Certificate */}
                                <Col md={4}>
                                    <Card className="h-100 border-info" style={{ cursor: 'pointer' }} onClick={() => setShowBirthCertPrint(true)}>
                                        <Card.Body className="text-center">
                                            <div className="fs-1 mb-2">👶</div>
                                            <h6 className="fw-bold">Birth Certificate</h6>
                                            <small className="text-muted">Form 1</small>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                            <div className="mt-4 p-3 bg-light rounded border">
                                <small className="text-muted">
                                    <strong>Note:</strong> Click any document card above to open the print preview. 
                                    Fill in required fields, then click Print to generate the document.
                                </small>
                            </div>
                        </div>
                    </Tab>
                </Tabs>

                {/* Document Print Modals */}
                <AdmissionFormPrint
                    show={showAdmissionPrint}
                    onHide={() => setShowAdmissionPrint(false)}
                    patient={{
                        id: admission.patient_id,
                        name: admission.patient_name,
                        age: admission.age,
                        gender: admission.gender,
                        phone: admission.phone,
                        address: admission.address
                    }}
                    admission={{
                        id: admission.admission_id,
                        ward: admission.ward,
                        bed: admission.bed_number,
                        admittedAt: admission.admitted_at,
                        diagnosis: admission.diagnosis,
                        doctor: admission.doctor_name
                    }}
                />
                <AMAFormPrint
                    show={showAMAPrint}
                    onHide={() => setShowAMAPrint(false)}
                    patient={{
                        id: admission.patient_id,
                        name: admission.patient_name,
                        age: admission.age,
                        gender: admission.gender
                    }}
                    admission={{
                        id: admission.admission_id,
                        ward: admission.ward,
                        bed: admission.bed_number,
                        diagnosis: admission.diagnosis
                    }}
                    doctor={{ name: admission.doctor_name }}
                />
                <DeathCertificatePrint
                    show={showDeathCertPrint}
                    onHide={() => setShowDeathCertPrint(false)}
                    patient={{
                        id: admission.patient_id,
                        name: admission.patient_name,
                        age: admission.age,
                        gender: admission.gender,
                        address: admission.address
                    }}
                    doctor={{ name: admission.doctor_name }}
                    doctorRegNo={admission.doctor_reg_no}
                />
                <BirthCertificatePrint
                    show={showBirthCertPrint}
                    onHide={() => setShowBirthCertPrint(false)}
                    mother={{
                        id: admission.patient_id,
                        name: admission.patient_name,
                        age: admission.age,
                        address: admission.address
                    }}
                    doctor={{ name: admission.doctor_name }}
                    doctorRegNo={admission.doctor_reg_no}
                />
                <MLCReportPrint
                    show={showMLCPrint}
                    onHide={() => setShowMLCPrint(false)}
                    patient={{
                        id: admission.patient_id,
                        name: admission.patient_name,
                        age: admission.age,
                        gender: admission.gender,
                        phone: admission.phone,
                        address: admission.address
                    }}
                    doctor={{ name: admission.doctor_name }}
                    doctorRegNo={admission.doctor_reg_no}
                />
                <DischargeSummary
                    show={showDischargeSummary}
                    onHide={() => setShowDischargeSummary(false)}
                    admission={admission}
                    medications={medications}
                    vitalsHistory={vitalsHistory}
                    labResults={labResults}
                    doctorName={admission.doctor_name}
                    doctorRegNo={admission.doctor_reg_no}
                    presentingComplaints={admission.presenting_complaints || admission.chief_complaints}
                    provisionalDiagnosis={admission.provisional_diagnosis}
                />
            </Modal.Body>
        </Modal>
    );
};

export default NursePatientProfile;
