import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Tabs, Tab, ProgressBar, Alert } from 'react-bootstrap';

const PatientFeedback = () => {
  const [activeTab, setActiveTab] = useState('nps');

  const npsData = {
    score: 72, promoters: 58, passives: 22, detractors: 8, totalResponses: 88,
    trend: [65, 68, 70, 69, 72], months: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb']
  };

  const recentFeedback = [
    { id: 'FB-101', patient: 'Rajesh Kumar', date: '2026-03-01', nps: 9, comment: 'Excellent care by Dr. Sharma. The new telehealth feature is very convenient.', dept: 'Medicine', sentiment: 'Positive' },
    { id: 'FB-102', patient: 'Anita Desai', date: '2026-02-28', nps: 7, comment: 'Good treatment but waiting time was long. Had to wait 45 minutes past appointment.', dept: 'Cardiology', sentiment: 'Neutral' },
    { id: 'FB-103', patient: 'Priya Singh', date: '2026-02-27', nps: 3, comment: 'Billing was confusing. Got charged for services not received. Need better transparency.', dept: 'Billing', sentiment: 'Negative' },
    { id: 'FB-104', patient: 'Vikram Iyer', date: '2026-02-26', nps: 10, comment: 'The nursing staff was exceptional. Clean rooms and great food quality.', dept: 'IPD', sentiment: 'Positive' },
    { id: 'FB-105', patient: 'Mohammed Ali', date: '2026-02-25', nps: 8, comment: 'Smooth admission process. Pharmacy was quick with medications.', dept: 'Emergency', sentiment: 'Positive' },
  ];

  const departmentScores = [
    { dept: 'Emergency', nps: 78, responses: 45, topIssue: 'Wait time', satisfaction: 4.2 },
    { dept: 'Medicine', nps: 82, responses: 62, topIssue: 'None significant', satisfaction: 4.5 },
    { dept: 'Surgery', nps: 75, responses: 38, topIssue: 'Post-op communication', satisfaction: 4.1 },
    { dept: 'Cardiology', nps: 68, responses: 28, topIssue: 'Appointment availability', satisfaction: 3.9 },
    { dept: 'IPD Nursing', nps: 85, responses: 55, topIssue: 'Night call response', satisfaction: 4.6 },
    { dept: 'Billing', nps: 52, responses: 40, topIssue: 'Billing transparency', satisfaction: 3.4 },
    { dept: 'Pharmacy', nps: 80, responses: 35, topIssue: 'Wait for discharge meds', satisfaction: 4.3 },
  ];

  const complaints = [
    { id: 'CMP-201', date: '2026-02-28', patient: 'Priya Singh', category: 'Billing', desc: 'Incorrect charges on final bill', status: 'Under Review', priority: 'High', tat: '2 days' },
    { id: 'CMP-202', date: '2026-02-27', patient: 'Arun Das', category: 'Wait Time', desc: 'OPD wait exceeded 1 hour', status: 'Resolved', priority: 'Medium', tat: '1 day' },
    { id: 'CMP-203', date: '2026-02-26', patient: 'Kavita Mehta', category: 'Staff', desc: 'Rude behavior at reception', status: 'Escalated', priority: 'High', tat: '3 days' },
    { id: 'CMP-204', date: '2026-02-25', patient: 'Lakshmi Nair', category: 'Cleanliness', desc: 'Washroom not cleaned in Ward B', status: 'Resolved', priority: 'Low', tat: '4 hours' },
  ];

  const sentimentColor = (s) => s === 'Positive' ? 'success' : s === 'Negative' ? 'danger' : 'warning';

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Patient Feedback & NPS</h4>
          <small className="text-muted">Phase 8 S-Tier -- Satisfaction surveys, NPS tracking, complaint management</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary">Send Survey</Button>
          <Button variant="outline-info">Export Report</Button>
        </div>
      </div>

      <Row className="mb-3">
        <Col md={3}>
          <Card className="text-center border-success h-100">
            <Card.Body>
              <h1 className={`display-4 ${npsData.score >= 70 ? 'text-success' : npsData.score >= 50 ? 'text-warning' : 'text-danger'}`}>{npsData.score}</h1>
              <h6>NPS Score</h6>
              <small className="text-muted">Industry benchmark: 60</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="h-100">
            <Card.Body>
              <div className="mb-2"><strong>Promoters (9-10):</strong> <Badge bg="success">{npsData.promoters}%</Badge></div>
              <ProgressBar now={npsData.promoters} variant="success" className="mb-2" />
              <div className="mb-2"><strong>Passives (7-8):</strong> <Badge bg="warning">{npsData.passives}%</Badge></div>
              <ProgressBar now={npsData.passives} variant="warning" className="mb-2" />
              <div className="mb-2"><strong>Detractors (0-6):</strong> <Badge bg="danger">{npsData.detractors}%</Badge></div>
              <ProgressBar now={npsData.detractors} variant="danger" />
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100"><Card.Body>
            <h2 className="text-primary">{npsData.totalResponses}</h2>
            <small>Total Responses (30d)</small>
            <hr/>
            <h4 className="text-info">68%</h4>
            <small>Response Rate</small>
          </Card.Body></Card>
        </Col>
        <Col md={3}>
          <Card className="text-center h-100"><Card.Body>
            <h2 className="text-success">+7</h2>
            <small>NPS Trend (5 months)</small>
            <hr/>
            <div className="d-flex justify-content-around">
              {npsData.trend.map((t,i) => (
                <div key={i} className="text-center">
                  <div style={{height: t * 0.8, width: 20, backgroundColor: t >= 70 ? '#198754' : '#ffc107', borderRadius: 4, margin: '0 auto'}}></div>
                  <small style={{fontSize:'0.7rem'}}>{npsData.months[i]}</small>
                </div>
              ))}
            </div>
          </Card.Body></Card>
        </Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="nps" title="Recent Feedback">
          <Card>
            <Card.Body>
              {recentFeedback.map(f => (
                <Alert key={f.id} variant={sentimentColor(f.sentiment)} className="d-flex justify-content-between align-items-start">
                  <div>
                    <strong>{f.patient}</strong> | {f.dept} | <small className="text-muted">{f.date}</small>
                    <br/><small>{f.comment}</small>
                  </div>
                  <div className="text-center ms-3" style={{minWidth: 60}}>
                    <h3 className={`mb-0 text-${sentimentColor(f.sentiment)}`}>{f.nps}</h3>
                    <Badge bg={sentimentColor(f.sentiment)}>{f.sentiment}</Badge>
                  </div>
                </Alert>
              ))}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="departments" title="Department Scores">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Department</th><th>NPS</th><th>Responses</th><th>Satisfaction</th><th>Top Issue</th></tr>
                </thead>
                <tbody>
                  {departmentScores.sort((a,b) => b.nps - a.nps).map((d,i) => (
                    <tr key={i}>
                      <td><strong>{d.dept}</strong></td>
                      <td>
                        <Badge bg={d.nps >= 75 ? 'success' : d.nps >= 60 ? 'warning' : 'danger'} className="fs-6">{d.nps}</Badge>
                      </td>
                      <td>{d.responses}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <ProgressBar now={d.satisfaction * 20} variant={d.satisfaction >= 4 ? 'success' : 'warning'} style={{width: 80, height: 8}} />
                          <span>{d.satisfaction}/5</span>
                        </div>
                      </td>
                      <td><small>{d.topIssue}</small></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="complaints" title="Complaints">
          <Card>
            <Card.Body>
              <Table striped hover responsive>
                <thead className="table-dark">
                  <tr><th>ID</th><th>Date</th><th>Patient</th><th>Category</th><th>Description</th><th>Priority</th><th>Status</th><th>TAT</th></tr>
                </thead>
                <tbody>
                  {complaints.map(c => (
                    <tr key={c.id} className={c.status === 'Escalated' ? 'table-danger' : ''}>
                      <td><strong>{c.id}</strong></td>
                      <td>{c.date}</td>
                      <td>{c.patient}</td>
                      <td><Badge bg="secondary">{c.category}</Badge></td>
                      <td><small>{c.desc}</small></td>
                      <td><Badge bg={c.priority === 'High' ? 'danger' : c.priority === 'Medium' ? 'warning' : 'info'}>{c.priority}</Badge></td>
                      <td><Badge bg={c.status === 'Resolved' ? 'success' : c.status === 'Escalated' ? 'danger' : 'warning'}>{c.status}</Badge></td>
                      <td>{c.tat}</td>
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

export default PatientFeedback;
