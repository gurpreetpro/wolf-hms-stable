import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, ProgressBar, Alert } from 'react-bootstrap';

const RevenueCycleAI = () => {
  const [activeTab, setActiveTab] = useState('denials');

  const denialPredictions = [];

  const deniedClaims = [];

  const leakageDetection = [
    { category: 'Unbilled Procedures', count: 12, amount: '₹4,80,000', detail: 'OR procedures not linked to billing' },
    { category: 'Missed Charges', count: 28, amount: '₹2,10,000', detail: 'Consumables used but not charged' },
    { category: 'Under-coded DRGs', count: 8, amount: '₹1,90,000', detail: 'CC/MCC not captured in coding' },
    { category: 'Expired Pre-auths', count: 5, amount: '₹3,50,000', detail: 'Pre-auths expired before claim submission' },
    { category: 'Timely Filing Risk', count: 3, amount: '₹1,20,000', detail: 'Claims approaching filing deadline' },
  ];

  const metrics = {
    totalAR: '₹2.4 Cr', denialRate: 8.2, avgDaysAR: 42, cleanClaimRate: 91,
    aiRecoveries: '₹18.5L', appealSuccessRate: 68, leakagePrevented: '₹13.5L'
  };

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">💰 Revenue Cycle AI</h4>
          <small className="text-muted">Claim denial prediction, auto-appeal, revenue leakage detection</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary">🔄 Scan All Claims</Button>
          <Button variant="outline-success">📊 Revenue Report</Button>
        </div>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-primary"><Card.Body><h4 className="text-primary">{metrics.totalAR}</h4><small>Total A/R</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h4 className="text-warning">{metrics.denialRate}%</h4><small>Denial Rate</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h4 className="text-info">{metrics.cleanClaimRate}%</h4><small>Clean Claim Rate</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h4 className="text-success">{metrics.aiRecoveries}</h4><small>AI Recoveries</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-danger"><Card.Body><h4 className="text-danger">{metrics.leakagePrevented}</h4><small>Leakage Prevented</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="denials" title="🔮 Denial Predictions">
          <Card>
            <Card.Body>
              <h5 className="mb-3">Pre-Submission Denial Risk Analysis</h5>
              <Table striped hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>Claim ID</th><th>Patient</th><th>Payer</th><th>Amount</th><th>Denial Risk</th><th>Risk Reason</th><th>AI Suggestion</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {denialPredictions.map(d => (
                    <tr key={d.id} className={d.denialRisk > 70 ? 'table-danger' : d.denialRisk > 40 ? 'table-warning' : ''}>
                      <td><strong>{d.id}</strong></td>
                      <td>{d.patient}</td>
                      <td>{d.payer}</td>
                      <td className="fw-bold">{d.amount}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <ProgressBar now={d.denialRisk} variant={d.denialRisk > 70 ? 'danger' : d.denialRisk > 40 ? 'warning' : 'success'} style={{width: 60, height: 8}} />
                          <strong>{d.denialRisk}%</strong>
                        </div>
                      </td>
                      <td><small>{d.reason}</small></td>
                      <td><Badge bg="info">{d.suggestedAction}</Badge></td>
                      <td><Button size="sm" variant="outline-primary">Fix & Submit</Button></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="appeals" title="⚖️ Auto-Appeal Engine">
          <Card>
            <Card.Body>
              <h5 className="mb-3">AI-Generated Appeal Strategies</h5>
              {deniedClaims.map(c => (
                <Alert key={c.id} variant={c.successProb > 70 ? 'success' : c.successProb > 50 ? 'warning' : 'secondary'}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <strong>{c.id}</strong> — {c.patient} | {c.payer} | <strong>{c.amount}</strong>
                      <br/><small className="text-muted">Denial Reason: {c.reason}</small>
                      <br/><small>🤖 <strong>AI Strategy:</strong> {c.aiStrategy}</small>
                    </div>
                    <div className="text-end">
                      <Badge bg={c.successProb > 70 ? 'success' : 'warning'} className="mb-2 d-block">{c.successProb}% success probability</Badge>
                      <Button size="sm" variant="primary" className="me-1">📄 View Draft</Button>
                      <Button size="sm" variant="success">📤 Submit Appeal</Button>
                    </div>
                  </div>
                </Alert>
              ))}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="leakage" title="🔍 Revenue Leakage">
          <Card>
            <Card.Body>
              <h5 className="mb-3">AI-Detected Revenue Leakage</h5>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Category</th><th>Count</th><th>Estimated Amount</th><th>Detail</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {leakageDetection.map((l, i) => (
                    <tr key={i}>
                      <td><strong>{l.category}</strong></td>
                      <td><Badge bg="danger">{l.count}</Badge></td>
                      <td className="text-danger fw-bold">{l.amount}</td>
                      <td><small>{l.detail}</small></td>
                      <td><Button size="sm" variant="outline-primary">Review</Button></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <div className="mt-3 p-3 bg-light rounded text-center">
                <h5>Total Revenue at Risk: <span className="text-danger">₹13,50,000</span></h5>
                <small className="text-muted">AI continuously scans billing pipeline for revenue leakage opportunities</small>
              </div>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default RevenueCycleAI;
