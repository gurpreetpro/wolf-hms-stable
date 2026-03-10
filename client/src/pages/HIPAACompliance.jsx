import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, ProgressBar, Alert, ListGroup } from 'react-bootstrap';

const HIPAACompliance = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const overallScore = 94;
  const categories = [
    { name: 'Administrative Safeguards', score: 96, items: 12, compliant: 11, findings: 1, status: 'Compliant' },
    { name: 'Physical Safeguards', score: 92, items: 8, compliant: 7, findings: 1, status: 'Compliant' },
    { name: 'Technical Safeguards', score: 98, items: 15, compliant: 15, findings: 0, status: 'Fully Compliant' },
    { name: 'Organizational Requirements', score: 90, items: 10, compliant: 9, findings: 1, status: 'Compliant' },
    { name: 'Breach Notification', score: 95, items: 6, compliant: 6, findings: 0, status: 'Fully Compliant' },
  ];

  const phiAccessLog = [
    { time: '10:42 AM', user: 'Dr. Sharma', role: 'Physician', patient: 'Rajesh Kumar (MRN-1045)', action: 'Viewed Medical Record', ip: '192.168.1.45', justified: true },
    { time: '10:38 AM', user: 'Nurse Priya', role: 'Nurse', patient: 'Anita Desai (MRN-1078)', action: 'Updated Vitals', ip: '192.168.1.52', justified: true },
    { time: '10:15 AM', user: 'Admin Ravi', role: 'Admin', patient: 'Suresh Menon (MRN-1023)', action: 'Exported Lab Report', ip: '192.168.1.10', justified: true },
    { time: '09:55 AM', user: 'Dr. Patel', role: 'Physician', patient: 'Kavita Mehta (MRN-1067)', action: 'Viewed Billing Record', ip: '192.168.1.48', justified: false },
    { time: '09:30 AM', user: 'Receptionist Anil', role: 'Front Desk', patient: 'Mohammed Ali (MRN-1089)', action: 'Accessed Clinical Notes', ip: '192.168.1.22', justified: false },
  ];

  const breachAlerts = [
    { id: 'BR-001', date: '2026-02-28', type: 'Unauthorized Access', severity: 'High', user: 'Receptionist Anil', details: 'Accessed clinical notes outside role scope', status: 'Under Investigation', action: 'Access revoked, HR notified' },
    { id: 'BR-002', date: '2026-02-20', type: 'Data Export', severity: 'Medium', user: 'Admin Ravi', details: 'Bulk patient data export detected (200+ records)', status: 'Resolved', action: 'Justified for audit report, documented' },
  ];

  const policies = [
    { name: 'Password Policy', lastReview: '2026-01-15', nextReview: '2026-07-15', status: 'Active', compliance: 100 },
    { name: 'Access Control Policy', lastReview: '2026-02-01', nextReview: '2026-08-01', status: 'Active', compliance: 96 },
    { name: 'Data Encryption Standard', lastReview: '2026-01-01', nextReview: '2026-07-01', status: 'Active', compliance: 100 },
    { name: 'Incident Response Plan', lastReview: '2025-12-15', nextReview: '2026-06-15', status: 'Active', compliance: 95 },
    { name: 'BAA Management', lastReview: '2026-02-15', nextReview: '2026-08-15', status: 'Active', compliance: 100 },
    { name: 'Employee Training', lastReview: '2026-02-20', nextReview: '2026-05-20', status: 'Active', compliance: 88 },
  ];

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">HIPAA Compliance Dashboard</h4>
          <small className="text-muted">Phase 9 S-Tier -- PHI protection, breach detection & compliance monitoring</small>
        </div>
        <div className="d-flex gap-2">
          <Badge bg="success" className="p-2 fs-6">Score: {overallScore}%</Badge>
          <Button variant="outline-primary">Generate Report</Button>
        </div>
      </div>

      <Row className="mb-3">
        <Col md={3}>
          <Card className="text-center border-success h-100">
            <Card.Body>
              <h1 className="display-4 text-success">{overallScore}%</h1>
              <h6>Overall HIPAA Score</h6>
              <ProgressBar now={overallScore} variant="success" className="mt-2" />
              <small className="text-muted">Benchmark: 90%</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={9}>
          <Card>
            <Card.Body>
              <Table bordered hover size="sm">
                <thead className="table-dark">
                  <tr><th>Safeguard Category</th><th>Score</th><th>Items</th><th>Compliant</th><th>Findings</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {categories.map((c, i) => (
                    <tr key={i}>
                      <td><strong>{c.name}</strong></td>
                      <td><Badge bg={c.score >= 95 ? 'success' : c.score >= 85 ? 'warning' : 'danger'}>{c.score}%</Badge></td>
                      <td>{c.items}</td>
                      <td className="text-success">{c.compliant}</td>
                      <td className={c.findings > 0 ? 'text-danger fw-bold' : 'text-success'}>{c.findings}</td>
                      <td><Badge bg={c.status === 'Fully Compliant' ? 'success' : 'info'}>{c.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="overview" title="PHI Access Monitor">
          {phiAccessLog.filter(p => !p.justified).length > 0 && (
            <Alert variant="danger">
              <strong>{phiAccessLog.filter(p => !p.justified).length} Unjustified PHI Access(es) Detected!</strong> Review required within 24 hours per HIPAA policy.
            </Alert>
          )}
          <Card>
            <Card.Body>
              <Table striped hover responsive>
                <thead className="table-dark">
                  <tr><th>Time</th><th>User</th><th>Role</th><th>Patient</th><th>Action</th><th>IP Address</th><th>Justified</th></tr>
                </thead>
                <tbody>
                  {phiAccessLog.map((p, i) => (
                    <tr key={i} className={!p.justified ? 'table-danger' : ''}>
                      <td>{p.time}</td>
                      <td><strong>{p.user}</strong></td>
                      <td><Badge bg="secondary">{p.role}</Badge></td>
                      <td>{p.patient}</td>
                      <td>{p.action}</td>
                      <td><code>{p.ip}</code></td>
                      <td>{p.justified ? <Badge bg="success">Yes</Badge> : <Badge bg="danger">NO - Review</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="breaches" title="Breach Detection">
          <Card>
            <Card.Body>
              {breachAlerts.map(b => (
                <Alert key={b.id} variant={b.severity === 'High' ? 'danger' : 'warning'} className="mb-2">
                  <div className="d-flex justify-content-between">
                    <div>
                      <strong>{b.id} | {b.type}</strong> -- {b.user}<br/>
                      <small>{b.details}</small><br/>
                      <small className="text-muted">Action: {b.action}</small>
                    </div>
                    <div className="text-end">
                      <Badge bg={b.severity === 'High' ? 'danger' : 'warning'}>{b.severity}</Badge><br/>
                      <Badge bg={b.status === 'Resolved' ? 'success' : 'warning'} className="mt-1">{b.status}</Badge><br/>
                      <small className="text-muted">{b.date}</small>
                    </div>
                  </div>
                </Alert>
              ))}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="policies" title="Policy Management">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Policy</th><th>Last Review</th><th>Next Review</th><th>Status</th><th>Compliance</th></tr>
                </thead>
                <tbody>
                  {policies.map((p, i) => (
                    <tr key={i}>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.lastReview}</td>
                      <td>{p.nextReview}</td>
                      <td><Badge bg="success">{p.status}</Badge></td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <ProgressBar now={p.compliance} variant={p.compliance >= 95 ? 'success' : 'warning'} style={{width: 80, height: 8}} />
                          <span>{p.compliance}%</span>
                        </div>
                      </td>
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

export default HIPAACompliance;
