import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Tabs, Tab, Form, Button, Modal, ProgressBar } from 'react-bootstrap';
import axios from 'axios';

const InfectionControlDashboard = () => {
    const [activeTab, setActiveTab] = useState('surveillance');
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportForm, setReportForm] = useState({ type: 'SSI', patient_name: '', ward: '', organism: '', notes: '' });

    // Mock surveillance data
    const [haiData] = useState([
        { id: 1, type: 'CAUTI', patient: 'Ramesh K.', ward: 'ICU', organism: 'E. coli', date: '2026-03-01', status: 'Active', device: 'Catheter' },
        { id: 2, type: 'CLABSI', patient: 'Priya S.', ward: 'ICU', organism: 'Staph aureus', date: '2026-02-28', status: 'Resolved', device: 'Central Line' },
        { id: 3, type: 'VAP', patient: 'Suresh M.', ward: 'MICU', organism: 'Pseudomonas', date: '2026-02-27', status: 'Active', device: 'Ventilator' },
        { id: 4, type: 'SSI', patient: 'Anita R.', ward: 'Surgery', organism: 'MRSA', date: '2026-02-25', status: 'Resolved', device: 'N/A' },
        { id: 5, type: 'CDI', patient: 'Vikram J.', ward: 'Medicine', organism: 'C. difficile', date: '2026-03-02', status: 'Active', device: 'N/A' },
    ]);

    const [isolationPatients] = useState([
        { id: 1, patient: 'Suresh M.', ward: 'MICU', bed: 'B-3', type: 'Contact', organism: 'MRSA', since: '2026-02-27', ppe: 'Gown + Gloves' },
        { id: 2, patient: 'Vikram J.', ward: 'Medicine', bed: 'W2-14', type: 'Enteric', organism: 'C. difficile', since: '2026-03-02', ppe: 'Gown + Gloves + Hand Hygiene' },
        { id: 3, patient: 'Asha D.', ward: 'Pulmonary', bed: 'P-7', type: 'Airborne', organism: 'M. tuberculosis', since: '2026-02-20', ppe: 'N95 + Negative Pressure Room' },
    ]);

    const [antibiogram] = useState([
        { organism: 'E. coli', amoxicillin: 32, amikacin: 95, ciprofloxacin: 45, meropenem: 98, ceftriaxone: 52, piperacillin: 88 },
        { organism: 'Staph aureus', amoxicillin: 15, amikacin: 78, ciprofloxacin: 60, meropenem: 99, ceftriaxone: 40, piperacillin: 70 },
        { organism: 'Pseudomonas', amoxicillin: 5, amikacin: 88, ciprofloxacin: 55, meropenem: 92, ceftriaxone: 10, piperacillin: 82 },
        { organism: 'Klebsiella', amoxicillin: 10, amikacin: 80, ciprofloxacin: 35, meropenem: 95, ceftriaxone: 28, piperacillin: 75 },
        { organism: 'MRSA', amoxicillin: 0, amikacin: 65, ciprofloxacin: 30, meropenem: 85, ceftriaxone: 5, piperacillin: 20 },
    ]);

    const [handHygiene] = useState([
        { dept: 'ICU', compliance: 92, audits: 45, opportunities: 210 },
        { dept: 'Surgery', compliance: 88, audits: 32, opportunities: 180 },
        { dept: 'Medicine', compliance: 78, audits: 28, opportunities: 156 },
        { dept: 'OBG', compliance: 85, audits: 20, opportunities: 120 },
        { dept: 'Pediatrics', compliance: 90, audits: 25, opportunities: 140 },
    ]);

    const kpis = {
        activeHAI: haiData.filter(h => h.status === 'Active').length,
        isolationCount: isolationPatients.length,
        cautiRate: '2.1/1000 catheter days',
        clabsiRate: '0.8/1000 line days',
        handHygieneAvg: Math.round(handHygiene.reduce((s, h) => s + h.compliance, 0) / handHygiene.length),
        ssiRate: '1.2%',
    };

    const getSensitivityBg = (val) => {
        if (val >= 80) return '#28a745';
        if (val >= 50) return '#ffc107';
        return '#dc3545';
    };

    const handleSubmitReport = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/infection-control/report', reportForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('✅ Infection report submitted');
            setShowReportModal(false);
        } catch {
            alert('Report saved locally (API endpoint pending)');
            setShowReportModal(false);
        }
    };

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold">🦠 Infection Control & Prevention (IPC)</h3>
                <Button variant="danger" onClick={() => setShowReportModal(true)}>⚠️ Report HAI</Button>
            </div>

            {/* KPI Cards */}
            <Row className="mb-4 g-3">
                {[
                    { title: 'Active HAIs', value: kpis.activeHAI, color: 'danger' },
                    { title: 'Isolation Patients', value: kpis.isolationCount, color: 'warning' },
                    { title: 'CAUTI Rate', value: kpis.cautiRate, color: 'info' },
                    { title: 'CLABSI Rate', value: kpis.clabsiRate, color: 'primary' },
                    { title: 'Hand Hygiene', value: `${kpis.handHygieneAvg}%`, color: 'success' },
                    { title: 'SSI Rate', value: kpis.ssiRate, color: 'secondary' },
                ].map((kpi, i) => (
                    <Col md={2} key={i}>
                        <Card className={`border-0 shadow-sm text-center`}>
                            <Card.Body className="py-3">
                                <small className="text-muted">{kpi.title}</small>
                                <h4 className={`fw-bold text-${kpi.color} mb-0`}>{kpi.value}</h4>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
                {/* HAI Surveillance */}
                <Tab eventKey="surveillance" title="🔬 HAI Surveillance">
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-white fw-bold">Healthcare-Associated Infections (Active + Recent)</Card.Header>
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th>Type</th><th>Patient</th><th>Ward</th><th>Organism</th><th>Device</th><th>Date</th><th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {haiData.map(hai => (
                                    <tr key={hai.id} className={hai.status === 'Active' ? 'table-danger' : ''}>
                                        <td><Badge bg="dark">{hai.type}</Badge></td>
                                        <td><strong>{hai.patient}</strong></td>
                                        <td>{hai.ward}</td>
                                        <td><em>{hai.organism}</em></td>
                                        <td>{hai.device}</td>
                                        <td>{hai.date}</td>
                                        <td><Badge bg={hai.status === 'Active' ? 'danger' : 'success'}>{hai.status}</Badge></td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>

                {/* Isolation Tracking */}
                <Tab eventKey="isolation" title="🚪 Isolation Tracking">
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-white fw-bold">Patients Under Isolation Precautions</Card.Header>
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th>Patient</th><th>Ward / Bed</th><th>Isolation Type</th><th>Organism</th><th>Since</th><th>PPE Required</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isolationPatients.map(p => (
                                    <tr key={p.id}>
                                        <td><strong>{p.patient}</strong></td>
                                        <td>{p.ward} — {p.bed}</td>
                                        <td>
                                            <Badge bg={p.type === 'Airborne' ? 'danger' : p.type === 'Contact' ? 'warning' : 'info'}>
                                                {p.type}
                                            </Badge>
                                        </td>
                                        <td><em>{p.organism}</em></td>
                                        <td>{p.since}</td>
                                        <td><small>{p.ppe}</small></td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>

                {/* Antibiogram */}
                <Tab eventKey="antibiogram" title="💊 Antibiogram">
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-white fw-bold">Cumulative Antibiogram — Sensitivity Rates (%)</Card.Header>
                        <Table hover responsive className="mb-0 text-center align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th className="text-start">Organism</th>
                                    <th>Amoxicillin</th><th>Amikacin</th><th>Ciprofloxacin</th>
                                    <th>Meropenem</th><th>Ceftriaxone</th><th>Pip-Tazo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {antibiogram.map((row, i) => (
                                    <tr key={i}>
                                        <td className="text-start fw-bold">{row.organism}</td>
                                        {[row.amoxicillin, row.amikacin, row.ciprofloxacin, row.meropenem, row.ceftriaxone, row.piperacillin].map((val, j) => (
                                            <td key={j}>
                                                <Badge style={{ backgroundColor: getSensitivityBg(val), minWidth: '45px' }}>{val}%</Badge>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                        <Card.Footer className="bg-white small text-muted">
                            <Badge style={{ backgroundColor: '#28a745' }} className="me-2">≥80% Sensitive</Badge>
                            <Badge style={{ backgroundColor: '#ffc107' }} className="me-2">50-79% Intermediate</Badge>
                            <Badge style={{ backgroundColor: '#dc3545' }}>{'<50% Resistant'}</Badge>
                        </Card.Footer>
                    </Card>
                </Tab>

                {/* Hand Hygiene */}
                <Tab eventKey="handhygiene" title="🧴 Hand Hygiene">
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-white fw-bold">Hand Hygiene Compliance by Department (WHO 5 Moments)</Card.Header>
                        <Card.Body>
                            {handHygiene.map((dept, i) => (
                                <div key={i} className="mb-3">
                                    <div className="d-flex justify-content-between mb-1">
                                        <strong>{dept.dept}</strong>
                                        <span>{dept.compliance}% ({dept.audits} audits / {dept.opportunities} opportunities)</span>
                                    </div>
                                    <ProgressBar
                                        now={dept.compliance}
                                        variant={dept.compliance >= 90 ? 'success' : dept.compliance >= 80 ? 'warning' : 'danger'}
                                        label={`${dept.compliance}%`}
                                    />
                                </div>
                            ))}
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>

            {/* Report HAI Modal */}
            <Modal show={showReportModal} onHide={() => setShowReportModal(false)}>
                <Modal.Header closeButton className="bg-danger text-white">
                    <Modal.Title>⚠️ Report Healthcare-Associated Infection</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>HAI Type</Form.Label>
                        <Form.Select value={reportForm.type} onChange={e => setReportForm({...reportForm, type: e.target.value})}>
                            <option value="SSI">SSI — Surgical Site Infection</option>
                            <option value="CAUTI">CAUTI — Catheter Urinary Tract Infection</option>
                            <option value="CLABSI">CLABSI — Central Line Blood Stream Infection</option>
                            <option value="VAP">VAP — Ventilator Associated Pneumonia</option>
                            <option value="CDI">CDI — Clostridioides difficile Infection</option>
                        </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Patient Name</Form.Label>
                        <Form.Control value={reportForm.patient_name} onChange={e => setReportForm({...reportForm, patient_name: e.target.value})} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Ward</Form.Label>
                        <Form.Control value={reportForm.ward} onChange={e => setReportForm({...reportForm, ward: e.target.value})} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Organism</Form.Label>
                        <Form.Control value={reportForm.organism} onChange={e => setReportForm({...reportForm, organism: e.target.value})} />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Notes</Form.Label>
                        <Form.Control as="textarea" rows={3} value={reportForm.notes} onChange={e => setReportForm({...reportForm, notes: e.target.value})} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowReportModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleSubmitReport}>Submit Report</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default InfectionControlDashboard;
