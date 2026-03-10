import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Tabs, Tab, ProgressBar, Button, Form, Modal } from 'react-bootstrap';

const PopulationHealth = () => {
    const [activeTab, setActiveTab] = useState('registry');
    const [showEnroll, setShowEnroll] = useState(false);

    const diseaseRegistry = [
        { disease: 'Type 2 Diabetes', icd: 'E11', cohort: 342, controlled: 68, uncontrolled: 32, avgHbA1c: '7.2%', complications: 45, lastUpdated: '2026-03-01' },
        { disease: 'Hypertension', icd: 'I10', cohort: 528, controlled: 72, uncontrolled: 28, avgHbA1c: '—', complications: 38, lastUpdated: '2026-03-01' },
        { disease: 'COPD', icd: 'J44', cohort: 89, controlled: 55, uncontrolled: 45, avgHbA1c: '—', complications: 22, lastUpdated: '2026-02-28' },
        { disease: 'Chronic Kidney Disease', icd: 'N18', cohort: 67, controlled: 48, uncontrolled: 52, avgHbA1c: '—', complications: 31, lastUpdated: '2026-02-28' },
        { disease: 'Coronary Artery Disease', icd: 'I25', cohort: 156, controlled: 65, uncontrolled: 35, avgHbA1c: '—', complications: 28, lastUpdated: '2026-03-01' },
        { disease: 'Asthma', icd: 'J45', cohort: 203, controlled: 78, uncontrolled: 22, avgHbA1c: '—', complications: 12, lastUpdated: '2026-03-02' },
    ];

    const careGaps = [
        { patient: 'Ramesh K.', disease: 'Diabetes', gap: 'HbA1c not done in 6 months', priority: 'High', due: '2026-02-15', status: 'Overdue' },
        { patient: 'Priya M.', disease: 'Hypertension', gap: 'Renal function test overdue', priority: 'High', due: '2026-02-20', status: 'Overdue' },
        { patient: 'Suresh D.', disease: 'COPD', gap: 'Pulmonary function test due', priority: 'Medium', due: '2026-03-05', status: 'Due Soon' },
        { patient: 'Anita R.', disease: 'CKD', gap: 'Nephrology referral pending', priority: 'High', due: '2026-02-28', status: 'Overdue' },
        { patient: 'Vikram J.', disease: 'CAD', gap: 'Stress test not scheduled', priority: 'Medium', due: '2026-03-10', status: 'Due Soon' },
        { patient: 'Meera L.', disease: 'Diabetes', gap: 'Annual eye exam missing', priority: 'Low', due: '2026-03-15', status: 'Upcoming' },
    ];

    const outcomesData = [
        { metric: 'All-cause Mortality (30-day)', value: '2.1%', benchmark: '3.0%', status: 'better' },
        { metric: 'Readmission Rate (30-day)', value: '8.5%', benchmark: '12.0%', status: 'better' },
        { metric: 'Avg ED Visits / Chronic Patient / Year', value: '1.8', benchmark: '2.5', status: 'better' },
        { metric: 'Diabetes: % HbA1c < 7', value: '68%', benchmark: '60%', status: 'better' },
        { metric: 'Hypertension: % BP < 140/90', value: '72%', benchmark: '65%', status: 'better' },
        { metric: 'COPD: Exacerbation Rate', value: '1.2/yr', benchmark: '1.5/yr', status: 'better' },
        { metric: 'Care Gap Closure Rate', value: '74%', benchmark: '70%', status: 'better' },
        { metric: 'Patient Satisfaction (Chronic)', value: '4.2/5', benchmark: '3.8/5', status: 'better' },
    ];

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold">🌍 Population Health Management</h3>
                <Button variant="primary" onClick={() => setShowEnroll(true)}>➕ Enroll Patient</Button>
            </div>

            <Row className="mb-4 g-3">
                {[
                    { t: 'Total Cohort', v: '1,385', c: 'primary' },
                    { t: 'Disease Registries', v: diseaseRegistry.length, c: 'info' },
                    { t: 'Care Gaps (Open)', v: careGaps.filter(g => g.status === 'Overdue').length, c: 'danger' },
                    { t: 'Avg Control Rate', v: '64%', c: 'success' },
                ].map((k, i) => (
                    <Col md={3} key={i}><Card className="border-0 shadow-sm text-center"><Card.Body className="py-3"><small className="text-muted">{k.t}</small><h4 className={`fw-bold text-${k.c} mb-0`}>{k.v}</h4></Card.Body></Card></Col>
                ))}
            </Row>

            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
                <Tab eventKey="registry" title="📋 Disease Registries">
                    <Card className="shadow-sm border-0">
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light"><tr><th>Disease</th><th>ICD-10</th><th>Cohort Size</th><th>Controlled</th><th>Uncontrolled</th><th>Complications</th><th>Updated</th></tr></thead>
                            <tbody>
                                {diseaseRegistry.map(d => (
                                    <tr key={d.icd}>
                                        <td><strong>{d.disease}</strong></td>
                                        <td><Badge bg="secondary">{d.icd}</Badge></td>
                                        <td className="fw-bold">{d.cohort}</td>
                                        <td><div className="d-flex align-items-center gap-2"><ProgressBar now={d.controlled} variant="success" style={{ width: 60, height: 8 }} /><span className="text-success">{d.controlled}%</span></div></td>
                                        <td><span className="text-danger fw-bold">{d.uncontrolled}%</span></td>
                                        <td>{d.complications}</td>
                                        <td><small>{d.lastUpdated}</small></td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>

                <Tab eventKey="gaps" title="⚠️ Care Gaps">
                    <Card className="shadow-sm border-0">
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light"><tr><th>Patient</th><th>Disease</th><th>Care Gap</th><th>Priority</th><th>Due</th><th>Status</th><th>Action</th></tr></thead>
                            <tbody>
                                {careGaps.map((g, i) => (
                                    <tr key={i} className={g.status === 'Overdue' ? 'table-danger' : ''}>
                                        <td><strong>{g.patient}</strong></td>
                                        <td>{g.disease}</td>
                                        <td>{g.gap}</td>
                                        <td><Badge bg={g.priority === 'High' ? 'danger' : g.priority === 'Medium' ? 'warning' : 'secondary'}>{g.priority}</Badge></td>
                                        <td>{g.due}</td>
                                        <td><Badge bg={g.status === 'Overdue' ? 'danger' : g.status === 'Due Soon' ? 'warning' : 'info'}>{g.status}</Badge></td>
                                        <td><Button size="sm" variant="outline-primary">📞 Recall</Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>

                <Tab eventKey="outcomes" title="📊 Outcomes & Benchmarks">
                    <Card className="shadow-sm border-0">
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light"><tr><th>Quality Metric</th><th>Our Value</th><th>National Benchmark</th><th>Status</th></tr></thead>
                            <tbody>
                                {outcomesData.map((o, i) => (
                                    <tr key={i}>
                                        <td><strong>{o.metric}</strong></td>
                                        <td className="fw-bold text-primary">{o.value}</td>
                                        <td>{o.benchmark}</td>
                                        <td><Badge bg="success">✅ Above Benchmark</Badge></td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>
            </Tabs>

            <Modal show={showEnroll} onHide={() => setShowEnroll(false)}>
                <Modal.Header closeButton><Modal.Title>➕ Enroll in Chronic Care Program</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3"><Form.Label>Patient</Form.Label><Form.Control placeholder="Search patient..." /></Form.Group>
                    <Form.Group className="mb-3"><Form.Label>Disease Registry</Form.Label><Form.Select><option>Select</option>{diseaseRegistry.map(d => <option key={d.icd}>{d.disease}</option>)}</Form.Select></Form.Group>
                    <Form.Group className="mb-3"><Form.Label>Care Coordinator</Form.Label><Form.Control placeholder="Assign coordinator..." /></Form.Group>
                </Modal.Body>
                <Modal.Footer><Button variant="secondary" onClick={() => setShowEnroll(false)}>Cancel</Button><Button variant="primary" onClick={() => { alert('✅ Patient enrolled'); setShowEnroll(false); }}>Enroll</Button></Modal.Footer>
            </Modal>
        </Container>
    );
};

export default PopulationHealth;
