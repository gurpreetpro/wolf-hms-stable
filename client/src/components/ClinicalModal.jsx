import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Tabs, Tab, Table, Form, Row, Col, Alert, Badge, Card } from 'react-bootstrap';
import { Activity, Pill, Clock } from 'lucide-react';
import api from '../utils/axiosInstance';

const ClinicalModal = ({ show, onHide, bed }) => {
    const [activeTab, setActiveTab] = useState('vitals');
    const [vitalsList, setVitalsList] = useState([]);
    const [emarData, setEmarData] = useState({ prescription: null, logs: [] });
    
    // Vitals Form State
    const [vitalsForm, setVitalsForm] = useState({
        temperature: '', systolic_bp: '', diastolic_bp: '', heart_rate: '',
        spo2: '', respiratory_rate: '', consciousness_level: 'Alert', notes: ''
    });

    // eMAR Form State
    const [emarForm, setEmarForm] = useState({
        medication_name: '', dosage: '', status: 'Given', notes: ''
    });
    const [selectedPrescriptionMed, setSelectedPrescriptionMed] = useState(null);

    const fetchVitals = useCallback(async () => {
        if (!bed?.admission_id) return;
        try {
            const res = await api.get(`/api/ward/vitals/${bed.admission_id}`);
            setVitalsList(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (err) {
            console.error(err);
        }
    }, [bed]);

    const fetchEMAR = useCallback(async () => {
        if (!bed?.admission_id) return;
        try {
            const res = await api.get(`/api/ward/emar/${bed.admission_id}`);
            setEmarData(res.data.data || res.data || { prescription: null, logs: [] });
        } catch (err) {
            console.error(err);
        }
    }, [bed]);

    useEffect(() => {
        if (show && bed?.admission_id) {
            fetchVitals();
            fetchEMAR();
        }
    }, [show, bed, fetchVitals, fetchEMAR]);

    const handleSaveVitals = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/ward/vitals', {
                admission_id: bed.admission_id,
                patient_id: bed.patient_id,
                ...vitalsForm
            });
            alert('✅ Vitals recorded successfully');
            setVitalsForm({
                temperature: '', systolic_bp: '', diastolic_bp: '', heart_rate: '',
                spo2: '', respiratory_rate: '', consciousness_level: 'Alert', notes: ''
            });
            fetchVitals();
        } catch (err) {
            alert('Failed to save vitals');
        }
    };

    const handleSaveEMAR = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/ward/emar', {
                admission_id: bed.admission_id,
                patient_id: bed.patient_id,
                ...emarForm
            });
            alert('✅ Medication administration logged');
            setEmarForm({ medication_name: '', dosage: '', status: 'Given', notes: '' });
            setSelectedPrescriptionMed(null);
            fetchEMAR();
        } catch (err) {
            alert('Failed to log medication');
        }
    };

    const parseMedications = (json) => {
        try {
            return typeof json === 'string' ? JSON.parse(json) : (json || []);
        } catch {
            return [];
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title><Activity size={20} className="me-2" /> Clinical View: {bed?.patient_name}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {bed && (
                    <Alert variant="info" className="py-2">
                        <strong>Bed:</strong> {bed.bed_number} | <strong>Admission ID:</strong> {bed.admission_id}
                    </Alert>
                )}

                <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
                    {/* VITALS TAB */}
                    <Tab eventKey="vitals" title={<span><Activity size={16} className="me-1" /> Vitals Monitoring</span>}>
                        <Row>
                            <Col md={4} className="border-end">
                                <h6 className="fw-bold mb-3">Record New Vitals</h6>
                                <Form onSubmit={handleSaveVitals}>
                                    <Row className="g-2 mb-2">
                                        <Col xs={6}>
                                            <Form.Label className="small">Temp (°F)</Form.Label>
                                            <Form.Control size="sm" type="number" step="0.1" value={vitalsForm.temperature} onChange={e => setVitalsForm({...vitalsForm, temperature: e.target.value})} required />
                                        </Col>
                                        <Col xs={6}>
                                            <Form.Label className="small">Heart Rate</Form.Label>
                                            <Form.Control size="sm" type="number" value={vitalsForm.heart_rate} onChange={e => setVitalsForm({...vitalsForm, heart_rate: e.target.value})} required />
                                        </Col>
                                        <Col xs={6}>
                                            <Form.Label className="small">BP (Sys/Dia)</Form.Label>
                                            <div className="d-flex gap-1">
                                                <Form.Control size="sm" placeholder="120" value={vitalsForm.systolic_bp} onChange={e => setVitalsForm({...vitalsForm, systolic_bp: e.target.value})} required />
                                                <span className="text-muted">/</span>
                                                <Form.Control size="sm" placeholder="80" value={vitalsForm.diastolic_bp} onChange={e => setVitalsForm({...vitalsForm, diastolic_bp: e.target.value})} required />
                                            </div>
                                        </Col>
                                        <Col xs={6}>
                                            <Form.Label className="small">SpO2 (%)</Form.Label>
                                            <Form.Control size="sm" type="number" value={vitalsForm.spo2} onChange={e => setVitalsForm({...vitalsForm, spo2: e.target.value})} required />
                                        </Col>
                                        <Col xs={6}>
                                            <Form.Label className="small">Resp. Rate</Form.Label>
                                            <Form.Control size="sm" type="number" value={vitalsForm.respiratory_rate} onChange={e => setVitalsForm({...vitalsForm, respiratory_rate: e.target.value})} />
                                        </Col>
                                        <Col xs={6}>
                                            <Form.Label className="small">Consciousness</Form.Label>
                                            <Form.Select size="sm" value={vitalsForm.consciousness_level} onChange={e => setVitalsForm({...vitalsForm, consciousness_level: e.target.value})}>
                                                <option>Alert</option>
                                                <option>Voice</option>
                                                <option>Pain</option>
                                                <option>Unresponsive</option>
                                            </Form.Select>
                                        </Col>
                                    </Row>
                                    <Form.Control as="textarea" rows={2} size="sm" placeholder="Notes (optional)" value={vitalsForm.notes} onChange={e => setVitalsForm({...vitalsForm, notes: e.target.value})} className="mb-2" />
                                    <Button type="submit" size="sm" variant="success" className="w-100">Record Vitals</Button>
                                </Form>
                            </Col>
                            <Col md={8}>
                                <h6 className="fw-bold mb-3">Recent Vitals</h6>
                                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    <Table hover size="sm" bordered>
                                        <thead className="bg-light sticky-top">
                                            <tr>
                                                <th>Time</th>
                                                <th>BP</th>
                                                <th>HR</th>
                                                <th>SpO2</th>
                                                <th>Temp</th>
                                                <th>Recorded By</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {vitalsList.map(v => (
                                                <tr key={v.id}>
                                                    <td className="small">{new Date(v.recorded_at).toLocaleString()}</td>
                                                    <td style={{ color: v.systolic_bp > 140 || v.diastolic_bp > 90 ? 'red' : 'inherit' }}>{v.systolic_bp}/{v.diastolic_bp}</td>
                                                    <td style={{ color: v.heart_rate > 100 ? 'red' : 'inherit' }}>{v.heart_rate}</td>
                                                    <td style={{ color: v.spo2 < 95 ? 'red' : 'inherit' }}>{v.spo2}%</td>
                                                    <td>{v.temperature}°F</td>
                                                    <td className="small text-muted">{v.recorded_by_name}</td>
                                                </tr>
                                            ))}
                                            {vitalsList.length === 0 && <tr><td colSpan="6" className="text-center text-muted">No vitals recorded yet.</td></tr>}
                                        </tbody>
                                    </Table>
                                </div>
                            </Col>
                        </Row>
                    </Tab>

                    {/* eMAR TAB */}
                    <Tab eventKey="emar" title={<span><Pill size={16} className="me-1" /> eMAR (Medications)</span>}>
                        <Row>
                            <Col md={6}>
                                <Card className="mb-3 border-0 shadow-sm">
                                    <Card.Header className="bg-light fw-bold small">Active Prescriptions</Card.Header>
                                    <Card.Body className="p-0">
                                        <Table hover size="sm" className="mb-0">
                                            <thead>
                                                <tr>
                                                    <th>Medication</th>
                                                    <th>Dosage</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {emarData.prescription ? parseMedications(emarData.prescription.medications).map((med, idx) => (
                                                    <tr key={idx}>
                                                        <td>{med.name}</td>
                                                        <td>{med.dosage} {med.freq} <span className="badge bg-secondary">{med.duration}</span></td>
                                                        <td>
                                                            <Button size="sm" variant="outline-primary" 
                                                                onClick={() => {
                                                                    setEmarForm({ ...emarForm, medication_name: med.name, dosage: med.dosage });
                                                                    setSelectedPrescriptionMed(med);
                                                                }}
                                                            >
                                                                Administer
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr><td colSpan="3" className="text-center text-muted p-3">No active prescriptions found.</td></tr>
                                                )}
                                            </tbody>
                                        </Table>
                                    </Card.Body>
                                </Card>
                                
                                <Card className="border-0 shadow-sm bg-light">
                                    <Card.Body>
                                        <h6 className="fw-bold small mb-2">Record {selectedPrescriptionMed ? `Administration: ${selectedPrescriptionMed.name}` : 'Ad-hoc Medication'}</h6>
                                        <Form onSubmit={handleSaveEMAR}>
                                            <Row className="g-2 mb-2">
                                                <Col xs={12}>
                                                    <Form.Control size="sm" placeholder="Medication Name" value={emarForm.medication_name} onChange={e => setEmarForm({...emarForm, medication_name: e.target.value})} required />
                                                </Col>
                                                <Col xs={6}>
                                                    <Form.Control size="sm" placeholder="Dosage" value={emarForm.dosage} onChange={e => setEmarForm({...emarForm, dosage: e.target.value})} required />
                                                </Col>
                                                <Col xs={6}>
                                                    <Form.Select size="sm" value={emarForm.status} onChange={e => setEmarForm({...emarForm, status: e.target.value})}>
                                                        <option value="Given">Given</option>
                                                        <option value="Refused">Refused</option>
                                                        <option value="Held">Held (Contraindicated)</option>
                                                    </Form.Select>
                                                </Col>
                                            </Row>
                                            <Form.Control size="sm" as="textarea" rows={1} placeholder="Notes" value={emarForm.notes} onChange={e => setEmarForm({...emarForm, notes: e.target.value})} className="mb-2" />
                                            <Button type="submit" size="sm" variant="primary" className="w-100">Log Administration</Button>
                                        </Form>
                                    </Card.Body>
                                </Card>
                            </Col>
                            <Col md={6}>
                                <h6 className="fw-bold mb-2 small">Administration History</h6>
                                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    {emarData.logs.map(log => (
                                        <Card key={log.id} className="mb-2 border-start border-4" style={{ borderColor: log.status === 'Given' ? 'green' : 'red' }}>
                                            <Card.Body className="p-2">
                                                <div className="d-flex justify-content-between">
                                                    <strong>{log.medication_name}</strong>
                                                    <Badge bg={log.status === 'Given' ? 'success' : 'danger'}>{log.status}</Badge>
                                                </div>
                                                <div className="small text-muted d-flex justify-content-between mt-1">
                                                    <span>{log.dosage}</span>
                                                    <span><Clock size={10} /> {new Date(log.administered_at).toLocaleString()}</span>
                                                </div>
                                                <div className="small text-muted mt-1">By: {log.administered_by_name}</div>
                                            </Card.Body>
                                        </Card>
                                    ))}
                                    {emarData.logs.length === 0 && <div className="text-center text-muted small mt-4">No medication logs yet.</div>}
                                </div>
                            </Col>
                        </Row>
                    </Tab>
                </Tabs>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Close</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default ClinicalModal;
