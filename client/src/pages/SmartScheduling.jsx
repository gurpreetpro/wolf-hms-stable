import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Tabs, Tab, ProgressBar, Alert } from 'react-bootstrap';

const SmartScheduling = () => {
  const [activeTab, setActiveTab] = useState('optimization');

  const scheduleSuggestions = [];

  const noShowPredictions = [];

  const doctorLoad = [];

  const weeklyMetrics = {
    totalAppointments: 342, noShowRate: 12.4, avgWaitTime: '19 min', utilizationRate: 81,
    aiOptimizations: 28, savedMinutes: 340, revenueProtected: '₹1.8L'
  };

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">📅 AI Smart Scheduling</h4>
          <small className="text-muted">ML-driven appointment optimization & no-show prediction</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary">🔄 Run Optimization</Button>
          <Button variant="outline-info">📊 Weekly Report</Button>
        </div>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{weeklyMetrics.totalAppointments}</h3><small>This Week</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{weeklyMetrics.noShowRate}%</h3><small>No-Show Rate</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">{weeklyMetrics.avgWaitTime}</h3><small>Avg Wait</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{weeklyMetrics.aiOptimizations}</h3><small>AI Optimizations</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-danger"><Card.Body><h3 className="text-success">{weeklyMetrics.revenueProtected}</h3><small>Revenue Protected</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="optimization" title="🧠 AI Suggestions">
          <Card>
            <Card.Body>
              <h5 className="mb-3">Schedule Optimization Suggestions</h5>
              {scheduleSuggestions.map(s => (
                <Alert key={s.id} variant={s.suggestedSlot === 'No change' ? 'success' : 'info'} className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{s.patient}</strong> — {s.type}
                    <br/><small>Current: <strong>{s.currentSlot}</strong> → Suggested: <strong>{s.suggestedSlot}</strong></small>
                    <br/><small className="text-muted">💡 {s.reason}</small>
                    <br/><Badge bg="info">{s.impact}</Badge>
                  </div>
                  <div className="text-end">
                    <div className="mb-2">
                      <Badge bg={s.confidence > 85 ? 'success' : 'warning'}>{s.confidence}% confidence</Badge>
                    </div>
                    {s.suggestedSlot !== 'No change' && (
                      <div className="d-flex gap-1">
                        <Button size="sm" variant="success">Accept</Button>
                        <Button size="sm" variant="outline-secondary">Dismiss</Button>
                      </div>
                    )}
                  </div>
                </Alert>
              ))}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="noshow" title="⚠️ No-Show Predictions">
          <Card>
            <Card.Body>
              <Table striped hover responsive>
                <thead className="table-dark">
                  <tr><th>Patient</th><th>Appointment</th><th>Doctor</th><th>No-Show Risk</th><th>Risk Factors</th><th>Recommended Action</th></tr>
                </thead>
                <tbody>
                  {noShowPredictions.map((p, i) => (
                    <tr key={i} className={p.risk > 70 ? 'table-danger' : p.risk > 50 ? 'table-warning' : ''}>
                      <td><strong>{p.patient}</strong></td>
                      <td>{p.appointment}</td>
                      <td>{p.doctor}</td>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <ProgressBar now={p.risk} variant={p.risk > 70 ? 'danger' : p.risk > 50 ? 'warning' : 'success'} style={{width: 80, height: 8}} />
                          <strong>{p.risk}%</strong>
                        </div>
                      </td>
                      <td><ul className="mb-0 ps-3">{p.factors.map((f, j) => <li key={j}><small>{f}</small></li>)}</ul></td>
                      <td><Badge bg={p.risk > 70 ? 'danger' : p.risk > 50 ? 'warning' : 'info'}>{p.action}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="loadbalance" title="⚖️ Doctor Load Balancing">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Doctor</th><th>Specialty</th><th>Scheduled / Capacity</th><th>Utilization</th><th>Overbooked</th><th>Avg Wait</th></tr>
                </thead>
                <tbody>
                  {doctorLoad.map((d, i) => (
                    <tr key={i} className={d.utilization > 90 ? 'table-danger' : d.utilization < 70 ? 'table-info' : ''}>
                      <td><strong>{d.doctor}</strong></td>
                      <td>{d.specialty}</td>
                      <td>{d.scheduled} / {d.capacity}</td>
                      <td>
                        <ProgressBar now={d.utilization} variant={d.utilization > 90 ? 'danger' : d.utilization > 80 ? 'warning' : 'success'} label={`${d.utilization}%`} />
                      </td>
                      <td><Badge bg={d.overbookedSlots > 0 ? 'danger' : 'success'}>{d.overbookedSlots}</Badge></td>
                      <td>{d.avgWait}</td>
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

export default SmartScheduling;
