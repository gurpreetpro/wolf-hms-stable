import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, ProgressBar } from 'react-bootstrap';

const RegulatoryReporting = () => {
  const [activeTab, setActiveTab] = useState('nabh');

  const nabhIndicators = [
    { code: 'NABH-QI-01', name: 'Hand Hygiene Compliance', target: '>=85%', current: '92%', status: 'Met', trend: 'Up' },
    { code: 'NABH-QI-02', name: 'Hospital-Acquired Infection Rate', target: '<=2%', current: '1.4%', status: 'Met', trend: 'Stable' },
    { code: 'NABH-QI-03', name: 'Medication Error Rate', target: '<=1%', current: '0.6%', status: 'Met', trend: 'Down' },
    { code: 'NABH-QI-04', name: 'Patient Fall Rate (per 1000 days)', target: '<=3.0', current: '2.1', status: 'Met', trend: 'Down' },
    { code: 'NABH-QI-05', name: 'Pressure Ulcer Incidence', target: '<=2%', current: '1.8%', status: 'Met', trend: 'Stable' },
    { code: 'NABH-QI-06', name: 'Surgical Site Infection Rate', target: '<=3%', current: '2.2%', status: 'Met', trend: 'Down' },
    { code: 'NABH-QI-07', name: 'Blood Transfusion Reaction Rate', target: '<=0.5%', current: '0.2%', status: 'Met', trend: 'Stable' },
    { code: 'NABH-QI-08', name: 'ICU Ventilator-Associated Pneumonia', target: '<=5/1000', current: '3.8/1000', status: 'Met', trend: 'Down' },
    { code: 'NABH-QI-09', name: 'Return to OR within 24h', target: '<=2%', current: '2.5%', status: 'Not Met', trend: 'Up' },
    { code: 'NABH-QI-10', name: 'Patient Satisfaction Score', target: '>=80%', current: '86%', status: 'Met', trend: 'Up' },
  ];

  const jciStandards = [
    { chapter: 'IPSG', name: 'International Patient Safety Goals', standards: 6, compliant: 6, score: 100 },
    { chapter: 'ACC', name: 'Access to Care & Continuity', standards: 8, compliant: 7, score: 88 },
    { chapter: 'PFR', name: 'Patient & Family Rights', standards: 11, compliant: 10, score: 91 },
    { chapter: 'AOP', name: 'Assessment of Patients', standards: 10, compliant: 10, score: 100 },
    { chapter: 'COP', name: 'Care of Patients', standards: 9, compliant: 8, score: 89 },
    { chapter: 'MMU', name: 'Medication Management & Use', standards: 7, compliant: 7, score: 100 },
    { chapter: 'QPS', name: 'Quality & Patient Safety', standards: 11, compliant: 10, score: 91 },
    { chapter: 'PCI', name: 'Prevention & Control of Infections', standards: 8, compliant: 8, score: 100 },
    { chapter: 'GLD', name: 'Governance, Leadership & Direction', standards: 6, compliant: 5, score: 83 },
    { chapter: 'FMS', name: 'Facility Management & Safety', standards: 7, compliant: 6, score: 86 },
  ];

  const accreditationStatus = {
    nabh: { status: 'Accredited', validTill: '2027-06-30', lastAudit: '2025-06-15', nextAudit: '2027-03-15', score: 92 },
    jci: { status: 'Accredited', validTill: '2028-01-15', lastAudit: '2025-01-10', nextAudit: '2027-10-10', score: 94 },
  };

  const metCount = nabhIndicators.filter(n => n.status === 'Met').length;

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Regulatory Reporting (NABH / JCI)</h4>
          <small className="text-muted">Phase 9 S-Tier -- Automated KPI reporting, accreditation readiness & quality indicators</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary">Generate NABH Report</Button>
          <Button variant="outline-info">JCI Self-Assessment</Button>
        </div>
      </div>

      <Row className="mb-3">
        <Col md={3}>
          <Card className="text-center border-success h-100">
            <Card.Body>
              <Badge bg="success" className="mb-2 p-2">NABH Accredited</Badge>
              <h2 className="text-success">{accreditationStatus.nabh.score}%</h2>
              <small>Valid till: {accreditationStatus.nabh.validTill}</small><br/>
              <small className="text-muted">Next Audit: {accreditationStatus.nabh.nextAudit}</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-primary h-100">
            <Card.Body>
              <Badge bg="primary" className="mb-2 p-2">JCI Accredited</Badge>
              <h2 className="text-primary">{accreditationStatus.jci.score}%</h2>
              <small>Valid till: {accreditationStatus.jci.validTill}</small><br/>
              <small className="text-muted">Next Audit: {accreditationStatus.jci.nextAudit}</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-info h-100">
            <Card.Body>
              <h2 className="text-info">{metCount}/{nabhIndicators.length}</h2>
              <small>NABH QIs Met</small>
              <ProgressBar now={metCount * 10} variant="info" className="mt-2" />
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-warning h-100">
            <Card.Body>
              <h2 className="text-warning">{jciStandards.reduce((s,j) => s + j.compliant, 0)}/{jciStandards.reduce((s,j) => s + j.standards, 0)}</h2>
              <small>JCI Standards Met</small>
              <ProgressBar now={94} variant="warning" className="mt-2" />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="nabh" title="NABH Quality Indicators">
          <Card>
            <Card.Body>
              <Table bordered hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>Code</th><th>Indicator</th><th>Target</th><th>Current</th><th>Status</th><th>Trend</th></tr>
                </thead>
                <tbody>
                  {nabhIndicators.map((n, i) => (
                    <tr key={i} className={n.status !== 'Met' ? 'table-danger' : ''}>
                      <td><code>{n.code}</code></td>
                      <td><strong>{n.name}</strong></td>
                      <td>{n.target}</td>
                      <td><strong>{n.current}</strong></td>
                      <td><Badge bg={n.status === 'Met' ? 'success' : 'danger'}>{n.status}</Badge></td>
                      <td><Badge bg={n.trend === 'Down' ? 'success' : n.trend === 'Stable' ? 'info' : 'warning'}>{n.trend === 'Down' ? 'Improving' : n.trend === 'Up' ? 'Needs Attention' : 'Stable'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="jci" title="JCI Standards">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Chapter</th><th>Full Name</th><th>Standards</th><th>Compliant</th><th>Score</th><th>Progress</th></tr>
                </thead>
                <tbody>
                  {jciStandards.map((j, i) => (
                    <tr key={i}>
                      <td><Badge bg="primary">{j.chapter}</Badge></td>
                      <td><strong>{j.name}</strong></td>
                      <td>{j.standards}</td>
                      <td className={j.compliant < j.standards ? 'text-warning fw-bold' : 'text-success'}>{j.compliant}</td>
                      <td><Badge bg={j.score >= 95 ? 'success' : j.score >= 85 ? 'info' : 'warning'}>{j.score}%</Badge></td>
                      <td><ProgressBar now={j.score} variant={j.score >= 95 ? 'success' : j.score >= 85 ? 'info' : 'warning'} style={{height: 10}} /></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="reports" title="Generated Reports">
          <Card>
            <Card.Body>
              <Table striped hover responsive>
                <thead className="table-dark">
                  <tr><th>Report</th><th>Period</th><th>Generated</th><th>Format</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {[
                    { name: 'NABH Monthly Quality Report', period: 'Feb 2026', date: '2026-03-01', format: 'PDF', status: 'Submitted' },
                    { name: 'JCI Quarterly Self-Assessment', period: 'Q4 2025', date: '2026-01-15', format: 'PDF', status: 'Submitted' },
                    { name: 'Infection Control Surveillance', period: 'Feb 2026', date: '2026-03-01', format: 'Excel', status: 'Ready' },
                    { name: 'Patient Safety Incident Summary', period: 'Feb 2026', date: '2026-03-02', format: 'PDF', status: 'Draft' },
                    { name: 'Mortality Review Report', period: 'Jan 2026', date: '2026-02-15', format: 'PDF', status: 'Submitted' },
                  ].map((r, i) => (
                    <tr key={i}>
                      <td><strong>{r.name}</strong></td>
                      <td>{r.period}</td>
                      <td>{r.date}</td>
                      <td><Badge bg="secondary">{r.format}</Badge></td>
                      <td><Badge bg={r.status === 'Submitted' ? 'success' : r.status === 'Ready' ? 'info' : 'warning'}>{r.status}</Badge></td>
                      <td><Button size="sm" variant="outline-primary">Download</Button></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default RegulatoryReporting;
