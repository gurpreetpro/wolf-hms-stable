import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, ProgressBar, Alert } from 'react-bootstrap';

const DataPrivacy = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const privacyScore = 91;
  const complianceFrameworks = [
    { name: 'HIPAA', region: 'USA', score: 94, status: 'Compliant', lastAudit: '2026-02-15' },
    { name: 'GDPR', region: 'EU', score: 88, status: 'Compliant', lastAudit: '2026-01-20' },
    { name: 'DISHA', region: 'India', score: 92, status: 'Compliant', lastAudit: '2026-02-01' },
    { name: 'PDPB', region: 'India', score: 90, status: 'Compliant', lastAudit: '2026-01-15' },
  ];

  const anonymizationJobs = [
    { id: 'ANON-101', dataset: 'Research Export - Cardiac Study', records: 2500, method: 'K-Anonymity (k=5)', status: 'Completed', date: '2026-03-01', fields: ['Name', 'DOB', 'Address', 'Phone', 'Email'], retained: ['Age Group', 'Gender', 'Diagnosis', 'Lab Results'] },
    { id: 'ANON-102', dataset: 'Insurance Claims Batch', records: 1800, method: 'Pseudonymization', status: 'Completed', date: '2026-02-28', fields: ['Name', 'SSN', 'Address'], retained: ['MRN-Hash', 'Diagnosis', 'Procedures', 'Charges'] },
    { id: 'ANON-103', dataset: 'Training Data - AI Model', records: 15000, method: 'Differential Privacy', status: 'In Progress', date: '2026-03-02', fields: ['All PII', 'All PHI'], retained: ['Clinical Patterns', 'Statistical Features'] },
    { id: 'ANON-104', dataset: 'Public Health Report', records: 5000, method: 'Data Masking', status: 'Queued', date: '2026-03-03', fields: ['Name', 'DOB', 'Address', 'Phone'], retained: ['Demographics (agg)', 'Outcomes'] },
  ];

  const retentionPolicies = [
    { category: 'Active Patient Records', retention: 'Indefinite', review: 'Annual', records: 12450, status: 'Active', compliance: 100 },
    { category: 'Discharged Patient Records', retention: '10 years', review: 'Bi-annual', records: 45600, status: 'Active', compliance: 98 },
    { category: 'Lab Results', retention: '7 years', review: 'Annual', records: 89200, status: 'Active', compliance: 100 },
    { category: 'Billing Records', retention: '7 years', review: 'Annual', records: 34500, status: 'Active', compliance: 96 },
    { category: 'Audit Logs', retention: '7 years', review: 'Quarterly', records: 156000, status: 'Active', compliance: 100 },
    { category: 'Consent Forms', retention: 'Until revoked + 3 years', review: 'Annual', records: 8900, status: 'Active', compliance: 95 },
    { category: 'Research Data', retention: '5 years post-study', review: 'Per study', records: 3200, status: 'Active', compliance: 100 },
  ];

  const dsarRequests = [
    { id: 'DSAR-01', patient: 'Rajesh Kumar', type: 'Data Access', status: 'Completed', received: '2026-02-20', completed: '2026-02-25', tat: '5 days' },
    { id: 'DSAR-02', patient: 'Priya Singh', type: 'Data Deletion', status: 'Under Review', received: '2026-02-28', completed: '--', tat: '2 days' },
    { id: 'DSAR-03', patient: 'Arun Das', type: 'Data Portability', status: 'In Progress', received: '2026-03-01', completed: '--', tat: '1 day' },
  ];

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Data Privacy & Anonymization</h4>
          <small className="text-muted">Phase 9 S-Tier -- De-identification engine, retention policies & GDPR/DISHA compliance</small>
        </div>
        <div className="d-flex gap-2">
          <Badge bg="success" className="p-2 fs-6">Privacy Score: {privacyScore}%</Badge>
          <Button variant="outline-primary">Privacy Impact Assessment</Button>
        </div>
      </div>

      <Row className="mb-3">
        <Col md={3}>
          <Card className="text-center border-success h-100">
            <Card.Body>
              <h1 className="display-4 text-success">{privacyScore}%</h1>
              <h6>Privacy Score</h6>
              <ProgressBar now={privacyScore} variant="success" className="mt-2" />
            </Card.Body>
          </Card>
        </Col>
        <Col md={9}>
          <Card>
            <Card.Body>
              <Table bordered hover size="sm">
                <thead className="table-dark">
                  <tr><th>Framework</th><th>Region</th><th>Score</th><th>Status</th><th>Last Audit</th></tr>
                </thead>
                <tbody>
                  {complianceFrameworks.map((f, i) => (
                    <tr key={i}>
                      <td><strong>{f.name}</strong></td>
                      <td><Badge bg="secondary">{f.region}</Badge></td>
                      <td><Badge bg={f.score >= 90 ? 'success' : 'warning'}>{f.score}%</Badge></td>
                      <td><Badge bg="success">{f.status}</Badge></td>
                      <td>{f.lastAudit}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="overview" title="Anonymization Engine">
          <Card>
            <Card.Body>
              {anonymizationJobs.filter(j => j.status === 'In Progress').map(j => (
                <Alert key={j.id} variant="info">
                  <strong>Processing:</strong> {j.dataset} -- {j.records.toLocaleString()} records via {j.method}
                </Alert>
              ))}
              <Table striped hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>ID</th><th>Dataset</th><th>Records</th><th>Method</th><th>Fields Removed</th><th>Fields Retained</th><th>Status</th><th>Date</th></tr>
                </thead>
                <tbody>
                  {anonymizationJobs.map(j => (
                    <tr key={j.id}>
                      <td><code>{j.id}</code></td>
                      <td><strong>{j.dataset}</strong></td>
                      <td>{j.records.toLocaleString()}</td>
                      <td><Badge bg="info">{j.method}</Badge></td>
                      <td>{j.fields.map((f,i) => <Badge key={i} bg="danger" className="me-1 mb-1" style={{fontSize:'0.65rem'}}>{f}</Badge>)}</td>
                      <td>{j.retained.map((r,i) => <Badge key={i} bg="success" className="me-1 mb-1" style={{fontSize:'0.65rem'}}>{r}</Badge>)}</td>
                      <td><Badge bg={j.status === 'Completed' ? 'success' : j.status === 'In Progress' ? 'primary' : 'secondary'}>{j.status}</Badge></td>
                      <td><small>{j.date}</small></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="retention" title="Retention Policies">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Data Category</th><th>Retention Period</th><th>Review Cycle</th><th>Records</th><th>Status</th><th>Compliance</th></tr>
                </thead>
                <tbody>
                  {retentionPolicies.map((p, i) => (
                    <tr key={i}>
                      <td><strong>{p.category}</strong></td>
                      <td>{p.retention}</td>
                      <td>{p.review}</td>
                      <td>{p.records.toLocaleString()}</td>
                      <td><Badge bg="success">{p.status}</Badge></td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <ProgressBar now={p.compliance} variant={p.compliance >= 98 ? 'success' : 'warning'} style={{width: 80, height: 8}} />
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

        <Tab eventKey="dsar" title="DSAR / Right to Access">
          <Card>
            <Card.Body>
              <Alert variant="info">
                Data Subject Access Requests must be completed within <strong>30 days</strong> (GDPR) / <strong>30 days</strong> (DISHA). Current avg TAT: <strong>3.2 days</strong>.
              </Alert>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>ID</th><th>Patient</th><th>Request Type</th><th>Received</th><th>Completed</th><th>TAT</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {dsarRequests.map(d => (
                    <tr key={d.id}>
                      <td><code>{d.id}</code></td>
                      <td><strong>{d.patient}</strong></td>
                      <td><Badge bg="info">{d.type}</Badge></td>
                      <td>{d.received}</td>
                      <td>{d.completed}</td>
                      <td>{d.tat}</td>
                      <td><Badge bg={d.status === 'Completed' ? 'success' : d.status === 'Under Review' ? 'warning' : 'primary'}>{d.status}</Badge></td>
                      <td>{d.status !== 'Completed' && <Button size="sm" variant="outline-primary">Process</Button>}</td>
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

export default DataPrivacy;
