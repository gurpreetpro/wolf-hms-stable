import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Modal, Tabs, Tab, ProgressBar, Alert } from 'react-bootstrap';

const CDIDashboard = () => {
  const [activeTab, setActiveTab] = useState('queries');
  const [showQueryModal, setShowQueryModal] = useState(false);

  const cdiQueries = [
    { id: 'CDI-301', patient: 'Rajesh Kumar', mrn: 'MRN-1045', query: 'Sepsis — clinical indicators present but not documented', type: 'Clarification', priority: 'High', status: 'Pending', age: '2h', drgImpact: '+₹45,000', physician: 'Dr. Sharma' },
    { id: 'CDI-302', patient: 'Anita Desai', mrn: 'MRN-1078', query: 'Acute kidney injury vs CKD— specify severity stage', type: 'Specificity', priority: 'Medium', status: 'Sent', age: '4h', drgImpact: '+₹28,000', physician: 'Dr. Patel' },
    { id: 'CDI-303', patient: 'Suresh Menon', mrn: 'MRN-1023', query: 'Malnutrition — BMI 16.5, consider documenting severity', type: 'Capture', priority: 'High', status: 'Pending', age: '1h', drgImpact: '+₹35,000', physician: 'Dr. Reddy' },
    { id: 'CDI-304', patient: 'Priya Singh', mrn: 'MRN-1056', query: 'Heart failure — document EF% and NYHA class', type: 'Specificity', priority: 'Medium', status: 'Responded', age: '6h', drgImpact: '+₹22,000', physician: 'Dr. Sharma' },
    { id: 'CDI-305', patient: 'Amit Verma', mrn: 'MRN-1090', query: 'Pneumonia — organism and type (CAP/HAP) not specified', type: 'Clarification', priority: 'Low', status: 'Resolved', age: '1d', drgImpact: '+₹18,000', physician: 'Dr. Khan' },
  ];

  const gapAlerts = [
    { category: 'Missing HCC Codes', count: 12, impact: 'Revenue risk ₹3.2L/month', action: 'Review diagnoses for chronic conditions' },
    { category: 'Incomplete Procedures', count: 5, impact: 'Unbilled ₹1.8L', action: 'Procedure notes missing for 5 surgeries' },
    { category: 'Unspecified Diabetes', count: 8, impact: 'DRG downgrade risk', action: 'Specify Type 1/2 and complications' },
    { category: 'Missing Laterality', count: 15, impact: 'Coding compliance risk', action: 'Add left/right specification to diagnoses' },
    { category: 'PSI/HAC Opportunities', count: 3, impact: 'Quality score impact', action: 'POA indicators needed for 3 conditions' },
  ];

  const codingMetrics = {
    cmi: 1.42, targetCmi: 1.55, ccMccRate: 68, queryResponseRate: 78, avgQueryAge: '3.2h', reviewRate: 92
  };

  const statusColor = (s) => s === 'Pending' ? 'warning' : s === 'Sent' ? 'info' : s === 'Responded' ? 'primary' : 'success';

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">📋 Clinical Documentation Improvement (CDI)</h4>
          <small className="text-muted">Phase 6 S-Tier — Documentation gap analysis, coding optimization, revenue capture</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary" onClick={() => setShowQueryModal(true)}>➕ New Query</Button>
          <Button variant="outline-info">📊 Reports</Button>
        </div>
      </div>

      <Row className="mb-3">
        <Col md={2}><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{cdiQueries.filter(q => q.status === 'Pending').length}</h3><small>Pending Queries</small></Card.Body></Card></Col>
        <Col md={2}><Card className="text-center border-info"><Card.Body><h3 className="text-info">{codingMetrics.queryResponseRate}%</h3><small>Response Rate</small></Card.Body></Card></Col>
        <Col md={2}><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{codingMetrics.cmi}</h3><small>Case Mix Index</small></Card.Body></Card></Col>
        <Col md={2}><Card className="text-center border-success"><Card.Body><h3 className="text-success">{codingMetrics.ccMccRate}%</h3><small>CC/MCC Rate</small></Card.Body></Card></Col>
        <Col md={2}><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">{gapAlerts.reduce((s,g) => s+g.count, 0)}</h3><small>Doc Gaps</small></Card.Body></Card></Col>
        <Col md={2}><Card className="text-center border-secondary"><Card.Body><h3>{codingMetrics.reviewRate}%</h3><small>Review Rate</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="queries" title="📝 CDI Queries">
          <Card>
            <Card.Body>
              <Table striped hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>Query ID</th><th>Patient</th><th>Query</th><th>Type</th><th>Priority</th><th>Status</th><th>Age</th><th>DRG Impact</th><th>Physician</th></tr>
                </thead>
                <tbody>
                  {cdiQueries.map(q => (
                    <tr key={q.id}>
                      <td><strong>{q.id}</strong></td>
                      <td>{q.patient}<br/><small className="text-muted">{q.mrn}</small></td>
                      <td style={{maxWidth: 300}}>{q.query}</td>
                      <td><Badge bg="secondary">{q.type}</Badge></td>
                      <td><Badge bg={q.priority === 'High' ? 'danger' : q.priority === 'Medium' ? 'warning' : 'secondary'}>{q.priority}</Badge></td>
                      <td><Badge bg={statusColor(q.status)}>{q.status}</Badge></td>
                      <td>{q.age}</td>
                      <td className="text-success fw-bold">{q.drgImpact}</td>
                      <td>{q.physician}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="gaps" title="⚠️ Documentation Gaps">
          <Card>
            <Card.Body>
              <h5 className="mb-3">Active Documentation Gap Alerts</h5>
              {gapAlerts.map((g, i) => (
                <Alert key={i} variant={i < 2 ? 'danger' : i < 4 ? 'warning' : 'info'}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{g.category}</strong> — {g.count} cases
                      <br/><small className="text-muted">{g.impact}</small>
                    </div>
                    <div>
                      <small className="me-3">{g.action}</small>
                      <Button size="sm" variant="outline-primary">Review</Button>
                    </div>
                  </div>
                </Alert>
              ))}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="metrics" title="📊 Coding Metrics">
          <Card>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <h5>Case Mix Index (CMI)</h5>
                  <div className="d-flex align-items-center mb-2">
                    <h2 className="me-3 mb-0">{codingMetrics.cmi}</h2>
                    <small className="text-muted">Target: {codingMetrics.targetCmi}</small>
                  </div>
                  <ProgressBar now={(codingMetrics.cmi / codingMetrics.targetCmi) * 100} variant="warning" label={`${((codingMetrics.cmi / codingMetrics.targetCmi) * 100).toFixed(0)}%`} />
                  <p className="mt-2 text-muted">CMI gap: {(codingMetrics.targetCmi - codingMetrics.cmi).toFixed(2)} — estimated revenue impact ₹8.2L/month</p>
                </Col>
                <Col md={6}>
                  <h5>CC/MCC Capture Rate</h5>
                  <div className="d-flex align-items-center mb-2">
                    <h2 className="me-3 mb-0">{codingMetrics.ccMccRate}%</h2>
                    <small className="text-muted">Target: 75%</small>
                  </div>
                  <ProgressBar now={codingMetrics.ccMccRate} variant="info" label={`${codingMetrics.ccMccRate}%`} />
                  <p className="mt-2 text-muted">7% below target — focus on complication/comorbidity documentation</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      <Modal show={showQueryModal} onHide={() => setShowQueryModal(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>➕ New CDI Query</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="mb-3">
              <Col md={6}><Form.Group><Form.Label>Patient</Form.Label><Form.Select><option>Select Patient...</option><option>Rajesh Kumar (MRN-1045)</option></Form.Select></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label>Attending Physician</Form.Label><Form.Select><option>Dr. Sharma</option><option>Dr. Patel</option></Form.Select></Form.Group></Col>
            </Row>
            <Row className="mb-3">
              <Col md={6}><Form.Group><Form.Label>Query Type</Form.Label><Form.Select><option>Clarification</option><option>Specificity</option><option>Capture</option><option>Conflicting</option></Form.Select></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label>Priority</Form.Label><Form.Select><option>High</option><option>Medium</option><option>Low</option></Form.Select></Form.Group></Col>
            </Row>
            <Form.Group className="mb-3"><Form.Label>Query Description</Form.Label><Form.Control as="textarea" rows={3} placeholder="Describe the clinical documentation gap..." /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Clinical Indicators</Form.Label><Form.Control as="textarea" rows={2} placeholder="Lab values, vitals, medications supporting the query..." /></Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer><Button variant="primary">Submit Query</Button></Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CDIDashboard;
