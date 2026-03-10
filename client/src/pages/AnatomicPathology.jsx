import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Tabs, Tab, Button, Modal, Form } from 'react-bootstrap';

const AnatomicPathology = () => {
    const [activeTab, setActiveTab] = useState('cases');
    const [showNewCase, setShowNewCase] = useState(false);

    const cases = [
        { id: 'PATH-2026-0121', patient: 'Ramesh K.', type: 'Biopsy', specimen: 'Colon polyp', site: 'Sigmoid colon', received: '2026-03-01', status: 'Grossing', assigned: 'Dr. Mehra', priority: 'Routine', tat: '2d' },
        { id: 'PATH-2026-0120', patient: 'Priya S.', type: 'Excision', specimen: 'Breast lump', site: 'Right breast UOQ', received: '2026-02-28', status: 'Microscopy', assigned: 'Dr. Kapoor', priority: 'Urgent', tat: '3d' },
        { id: 'PATH-2026-0119', patient: 'Suresh M.', type: 'FNAC', specimen: 'Thyroid nodule', site: 'Right lobe thyroid', received: '2026-02-28', status: 'Reporting', assigned: 'Dr. Mehra', priority: 'Routine', tat: '3d' },
        { id: 'PATH-2026-0118', patient: 'Anita R.', type: 'Frozen Section', specimen: 'Ovarian mass', site: 'Left ovary', received: '2026-03-02', status: 'STAT', assigned: 'Dr. Kapoor', priority: 'STAT', tat: '30min' },
        { id: 'PATH-2026-0117', patient: 'Vikram J.', type: 'Biopsy', specimen: 'Skin lesion', site: 'Left forearm', received: '2026-02-27', status: 'Finalized', assigned: 'Dr. Mehra', priority: 'Routine', tat: '4d' },
        { id: 'PATH-2026-0116', patient: 'Meera L.', type: 'Resection', specimen: 'Appendix', site: 'Appendix', received: '2026-02-26', status: 'Finalized', assigned: 'Dr. Sharma', priority: 'Routine', tat: '5d' },
    ];

    const slides = [
        { id: 'SL-0891', caseId: 'PATH-2026-0120', stain: 'H&E', blocks: 4, status: 'Cut', quality: 'Good' },
        { id: 'SL-0890', caseId: 'PATH-2026-0120', stain: 'IHC - ER/PR', blocks: 2, status: 'Staining', quality: 'Pending' },
        { id: 'SL-0889', caseId: 'PATH-2026-0119', stain: 'H&E', blocks: 2, status: 'Ready', quality: 'Good' },
        { id: 'SL-0888', caseId: 'PATH-2026-0119', stain: 'PAP', blocks: 1, status: 'Ready', quality: 'Good' },
        { id: 'SL-0887', caseId: 'PATH-2026-0118', stain: 'H&E (Frozen)', blocks: 3, status: 'STAT Read', quality: 'Adequate' },
        { id: 'SL-0886', caseId: 'PATH-2026-0121', stain: 'H&E', blocks: 6, status: 'Embedding', quality: 'Pending' },
    ];

    const statusColor = (s) => ({ 'Grossing': 'warning', 'Microscopy': 'info', 'Reporting': 'primary', 'STAT': 'danger', 'Finalized': 'success', 'Cut': 'info', 'Staining': 'warning', 'Ready': 'success', 'STAT Read': 'danger', 'Embedding': 'secondary' }[s] || 'secondary');

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold">🔬 Anatomic Pathology</h3>
                <Button variant="primary" onClick={() => setShowNewCase(true)}>➕ New Specimen</Button>
            </div>

            <Row className="mb-4 g-3">
                {[
                    { t: 'Active Cases', v: cases.filter(c => c.status !== 'Finalized').length, c: 'primary' },
                    { t: 'STAT Pending', v: cases.filter(c => c.priority === 'STAT').length, c: 'danger' },
                    { t: 'Slides in Process', v: slides.filter(s => s.status !== 'Ready').length, c: 'warning' },
                    { t: 'Avg TAT', v: '3.2 days', c: 'info' },
                ].map((k, i) => (
                    <Col md={3} key={i}><Card className="border-0 shadow-sm text-center"><Card.Body className="py-3"><small className="text-muted">{k.t}</small><h4 className={`fw-bold text-${k.c} mb-0`}>{k.v}</h4></Card.Body></Card></Col>
                ))}
            </Row>

            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
                <Tab eventKey="cases" title="📋 Cases">
                    <Card className="shadow-sm border-0"><Table hover responsive className="mb-0 align-middle">
                        <thead className="bg-light"><tr><th>Case ID</th><th>Patient</th><th>Type</th><th>Specimen</th><th>Site</th><th>Pathologist</th><th>Priority</th><th>TAT</th><th>Status</th></tr></thead>
                        <tbody>{cases.map(c => (
                            <tr key={c.id} className={c.priority === 'STAT' ? 'table-danger' : ''}>
                                <td><code>{c.id}</code></td><td><strong>{c.patient}</strong></td>
                                <td><Badge bg="secondary">{c.type}</Badge></td>
                                <td>{c.specimen}</td><td><small>{c.site}</small></td>
                                <td>{c.assigned}</td>
                                <td><Badge bg={c.priority === 'STAT' ? 'danger' : c.priority === 'Urgent' ? 'warning' : 'secondary'}>{c.priority}</Badge></td>
                                <td>{c.tat}</td>
                                <td><Badge bg={statusColor(c.status)}>{c.status}</Badge></td>
                            </tr>
                        ))}</tbody>
                    </Table></Card>
                </Tab>

                <Tab eventKey="slides" title="🧫 Slide Management">
                    <Card className="shadow-sm border-0"><Table hover responsive className="mb-0 align-middle">
                        <thead className="bg-light"><tr><th>Slide ID</th><th>Case</th><th>Stain</th><th>Blocks</th><th>Status</th><th>Quality</th></tr></thead>
                        <tbody>{slides.map(s => (
                            <tr key={s.id} className={s.status === 'STAT Read' ? 'table-danger' : ''}>
                                <td><code>{s.id}</code></td>
                                <td><Badge bg="light" text="dark">{s.caseId}</Badge></td>
                                <td>{s.stain}</td><td>{s.blocks}</td>
                                <td><Badge bg={statusColor(s.status)}>{s.status}</Badge></td>
                                <td>{s.quality}</td>
                            </tr>
                        ))}</tbody>
                    </Table></Card>
                </Tab>

                <Tab eventKey="workflow" title="📊 Workflow">
                    <Card className="shadow-sm border-0"><Card.Body>
                        <h6 className="fw-bold mb-3">Specimen Processing Pipeline</h6>
                        <div className="d-flex justify-content-between text-center">
                            {['Accessioning', 'Grossing', 'Processing', 'Embedding', 'Cutting', 'Staining', 'Microscopy', 'Reporting', 'Finalized'].map((step, i) => (
                                <div key={i} className="flex-fill">
                                    <div className={`rounded-circle mx-auto d-flex align-items-center justify-content-center mb-1 ${i < 7 ? 'bg-primary text-white' : 'bg-light'}`} style={{ width: 36, height: 36, fontSize: '0.7rem' }}>{i + 1}</div>
                                    <small style={{ fontSize: '0.65rem' }}>{step}</small>
                                </div>
                            ))}
                        </div>
                        <hr />
                        <Row>
                            <Col md={4}><Card className="border-0 bg-light p-3 text-center"><small className="text-muted">Biopsy TAT (Target: ≤72h)</small><h5 className="text-success fw-bold mb-0">68h ✅</h5></Card></Col>
                            <Col md={4}><Card className="border-0 bg-light p-3 text-center"><small className="text-muted">Frozen Section TAT (Target: ≤30min)</small><h5 className="text-success fw-bold mb-0">22min ✅</h5></Card></Col>
                            <Col md={4}><Card className="border-0 bg-light p-3 text-center"><small className="text-muted">IHC TAT (Target: ≤5 days)</small><h5 className="text-warning fw-bold mb-0">4.5d ⚠️</h5></Card></Col>
                        </Row>
                    </Card.Body></Card>
                </Tab>
            </Tabs>

            <Modal show={showNewCase} onHide={() => setShowNewCase(false)} size="lg">
                <Modal.Header closeButton className="bg-primary text-white"><Modal.Title>🔬 Log New Specimen</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Row>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Patient</Form.Label><Form.Control placeholder="Search patient..." /></Form.Group></Col>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Specimen Type</Form.Label><Form.Select><option>Biopsy</option><option>Excision</option><option>Resection</option><option>FNAC</option><option>Frozen Section</option><option>Cytology</option></Form.Select></Form.Group></Col>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Specimen Description</Form.Label><Form.Control placeholder="e.g. Colon polyp, sigmoid" /></Form.Group></Col>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Anatomic Site</Form.Label><Form.Control placeholder="e.g. Sigmoid colon" /></Form.Group></Col>
                        <Col md={4}><Form.Group className="mb-3"><Form.Label>Priority</Form.Label><Form.Select><option>Routine</option><option>Urgent</option><option>STAT (Frozen)</option></Form.Select></Form.Group></Col>
                        <Col md={4}><Form.Group className="mb-3"><Form.Label>Requesting Dr</Form.Label><Form.Control placeholder="Surgeon name" /></Form.Group></Col>
                        <Col md={4}><Form.Group className="mb-3"><Form.Label>Assign Pathologist</Form.Label><Form.Select><option>Dr. Mehra</option><option>Dr. Kapoor</option><option>Dr. Sharma</option></Form.Select></Form.Group></Col>
                        <Col md={12}><Form.Group className="mb-3"><Form.Label>Clinical History</Form.Label><Form.Control as="textarea" rows={2} placeholder="Relevant clinical information..." /></Form.Group></Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer><Button variant="secondary" onClick={() => setShowNewCase(false)}>Cancel</Button><Button variant="primary" onClick={() => { alert('✅ Specimen logged'); setShowNewCase(false); }}>📥 Log Specimen</Button></Modal.Footer>
            </Modal>
        </Container>
    );
};

export default AnatomicPathology;
