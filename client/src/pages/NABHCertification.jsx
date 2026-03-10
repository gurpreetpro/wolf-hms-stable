import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Tabs, Tab, ProgressBar, Button, Modal, Form } from 'react-bootstrap';

const NABHCertification = () => {
    const [activeTab, setActiveTab] = useState('checklist');
    const [showEvidence, setShowEvidence] = useState(false);

    const chapters = [
        {
            name: 'Access, Assessment and Continuity of Care (AAC)',
            standards: 12, compliant: 10, partial: 2, gap: 0,
            items: [
                { id: 'AAC.1', desc: 'Defined admission process with documented criteria', status: 'Compliant', evidence: 'SOP-ADM-001' },
                { id: 'AAC.3', desc: 'Initial assessment within 24 hours of admission', status: 'Compliant', evidence: 'EMR Template' },
                { id: 'AAC.5', desc: 'Reassessment at regular intervals', status: 'Partial', evidence: 'Needs frequency documentation' },
                { id: 'AAC.8', desc: 'Discharge planning initiated at admission', status: 'Partial', evidence: 'In-progress in EMR' },
            ]
        },
        {
            name: 'Care of Patients (COP)',
            standards: 15, compliant: 11, partial: 3, gap: 1,
            items: [
                { id: 'COP.1', desc: 'Clinical care guided by standard treatment guidelines', status: 'Compliant', evidence: 'Clinical Pathways' },
                { id: 'COP.4', desc: 'Consent obtained for all procedures', status: 'Compliant', evidence: 'Consent Module' },
                { id: 'COP.7', desc: 'Pain assessment and management protocol', status: 'Partial', evidence: 'NRS scale in vitals' },
                { id: 'COP.12', desc: 'End-of-life care policy documented', status: 'Gap', evidence: 'Policy needed' },
            ]
        },
        {
            name: 'Management of Medication (MOM)',
            standards: 10, compliant: 8, partial: 1, gap: 1,
            items: [
                { id: 'MOM.1', desc: 'Formulary available and reviewed annually', status: 'Compliant', evidence: 'Pharmacy Module' },
                { id: 'MOM.5', desc: 'High-alert medication protocols', status: 'Partial', evidence: 'Partial — needs LASA list' },
                { id: 'MOM.8', desc: 'Adverse drug reaction reporting system', status: 'Gap', evidence: 'ADR form needed' },
            ]
        },
        {
            name: 'Patient Rights and Education (PRE)',
            standards: 8, compliant: 7, partial: 1, gap: 0,
            items: [
                { id: 'PRE.1', desc: 'Patient rights charter displayed', status: 'Compliant', evidence: 'Displayed in wards' },
                { id: 'PRE.4', desc: 'Informed consent in patient language', status: 'Partial', evidence: 'Multi-language forms needed' },
            ]
        },
        {
            name: 'Hospital Infection Control (HIC)',
            standards: 10, compliant: 7, partial: 2, gap: 1,
            items: [
                { id: 'HIC.1', desc: 'Infection control committee established', status: 'Compliant', evidence: 'ICC Minutes' },
                { id: 'HIC.5', desc: 'HAI surveillance with antibiogram', status: 'Partial', evidence: 'Infection Control Module' },
                { id: 'HIC.8', desc: 'Needle-stick injury protocol', status: 'Gap', evidence: 'SOP needed' },
            ]
        },
        {
            name: 'Continuous Quality Improvement (CQI)',
            standards: 8, compliant: 6, partial: 2, gap: 0,
            items: [
                { id: 'CQI.1', desc: 'Quality indicators monitored monthly', status: 'Compliant', evidence: 'Quality Dashboard' },
                { id: 'CQI.5', desc: 'Sentinel event reporting and RCA', status: 'Partial', evidence: 'Sentinel Module exists' },
            ]
        },
    ];

    const totalStandards = chapters.reduce((s, c) => s + c.standards, 0);
    const totalCompliant = chapters.reduce((s, c) => s + c.compliant, 0);
    const totalPartial = chapters.reduce((s, c) => s + c.partial, 0);
    const totalGaps = chapters.reduce((s, c) => s + c.gap, 0);
    const readiness = Math.round((totalCompliant / totalStandards) * 100);

    const statusColor = (s) => ({ Compliant: 'success', Partial: 'warning', Gap: 'danger' }[s] || 'secondary');

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold">🏥 NABH Certification Readiness</h3>
                <Button variant="primary" onClick={() => setShowEvidence(true)}>📄 Generate Report</Button>
            </div>

            <Row className="mb-4 g-3">
                {[
                    { t: 'Total Standards', v: totalStandards, c: 'primary' },
                    { t: 'Compliant', v: totalCompliant, c: 'success' },
                    { t: 'Partial', v: totalPartial, c: 'warning' },
                    { t: 'Gaps', v: totalGaps, c: 'danger' },
                ].map((k, i) => (
                    <Col md={3} key={i}><Card className="border-0 shadow-sm text-center"><Card.Body className="py-3"><small className="text-muted">{k.t}</small><h4 className={`fw-bold text-${k.c} mb-0`}>{k.v}</h4></Card.Body></Card></Col>
                ))}
            </Row>

            <Card className="shadow-sm border-0 mb-4"><Card.Body className="text-center">
                <h6>Overall Readiness</h6>
                <ProgressBar style={{ height: 30 }}>
                    <ProgressBar variant="success" now={(totalCompliant / totalStandards) * 100} label={`${totalCompliant} Compliant`} />
                    <ProgressBar variant="warning" now={(totalPartial / totalStandards) * 100} label={`${totalPartial} Partial`} />
                    <ProgressBar variant="danger" now={(totalGaps / totalStandards) * 100} label={`${totalGaps} Gaps`} />
                </ProgressBar>
                <h4 className={`mt-2 fw-bold ${readiness >= 80 ? 'text-success' : readiness >= 60 ? 'text-warning' : 'text-danger'}`}>{readiness}% Ready</h4>
            </Card.Body></Card>

            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
                <Tab eventKey="checklist" title="📋 Self-Assessment">
                    {chapters.map(ch => (
                        <Card key={ch.name} className="shadow-sm border-0 mb-3">
                            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                                <strong>{ch.name}</strong>
                                <div className="d-flex gap-1">
                                    <Badge bg="success">{ch.compliant} ✅</Badge>
                                    <Badge bg="warning">{ch.partial} ⚠️</Badge>
                                    {ch.gap > 0 && <Badge bg="danger">{ch.gap} ❌</Badge>}
                                </div>
                            </Card.Header>
                            <Table responsive className="mb-0" size="sm">
                                <tbody>{ch.items.map(item => (
                                    <tr key={item.id}>
                                        <td style={{ width: 80 }}><code>{item.id}</code></td>
                                        <td>{item.desc}</td>
                                        <td style={{ width: 100 }}><Badge bg={statusColor(item.status)}>{item.status}</Badge></td>
                                        <td style={{ width: 180 }}><small className="text-muted">{item.evidence}</small></td>
                                    </tr>
                                ))}</tbody>
                            </Table>
                        </Card>
                    ))}
                </Tab>

                <Tab eventKey="gaps" title="🔴 Gap Analysis">
                    <Card className="shadow-sm border-0"><Table hover responsive className="mb-0 align-middle">
                        <thead className="bg-light"><tr><th>Chapter</th><th>Standard</th><th>Description</th><th>Status</th><th>Action Required</th></tr></thead>
                        <tbody>{chapters.flatMap(ch => ch.items.filter(i => i.status !== 'Compliant').map(item => (
                            <tr key={item.id} className={item.status === 'Gap' ? 'table-danger' : 'table-warning'}>
                                <td><small>{ch.name.split(' (')[0]}</small></td>
                                <td><code>{item.id}</code></td>
                                <td>{item.desc}</td>
                                <td><Badge bg={statusColor(item.status)}>{item.status}</Badge></td>
                                <td><small>{item.evidence}</small></td>
                            </tr>
                        )))}</tbody>
                    </Table></Card>
                </Tab>
            </Tabs>

            <Modal show={showEvidence} onHide={() => setShowEvidence(false)} size="lg">
                <Modal.Header closeButton className="bg-primary text-white"><Modal.Title>📄 NABH Readiness Report</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                    <p><strong>Readiness:</strong> <Badge bg={readiness >= 80 ? 'success' : 'warning'}>{readiness}%</Badge></p>
                    <hr />
                    <h6>Chapter-wise Summary</h6>
                    <Table size="sm"><thead><tr><th>Chapter</th><th>✅</th><th>⚠️</th><th>❌</th><th>Score</th></tr></thead>
                        <tbody>{chapters.map(ch => (
                            <tr key={ch.name}><td><small>{ch.name.split(' (')[0]}</small></td><td>{ch.compliant}</td><td>{ch.partial}</td><td>{ch.gap}</td><td>{Math.round((ch.compliant / ch.standards) * 100)}%</td></tr>
                        ))}</tbody>
                    </Table>
                    <hr />
                    <p className="small text-muted">This report can be exported as PDF for submission to the NABH assessment team.</p>
                </Modal.Body>
                <Modal.Footer><Button variant="secondary" onClick={() => setShowEvidence(false)}>Close</Button><Button variant="primary" onClick={() => alert('📄 PDF generated (demo)')}>📥 Export PDF</Button></Modal.Footer>
            </Modal>
        </Container>
    );
};

export default NABHCertification;
