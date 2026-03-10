import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Tabs, Tab, ProgressBar, Alert } from 'react-bootstrap';

const SmartScheduling = () => {
  const [activeTab, setActiveTab] = useState('optimization');

  const scheduleSuggestions = [
    { id: 'SS-01', patient: 'Rajesh Kumar', type: 'Follow-up', currentSlot: 'Mon 10:00 AM', suggestedSlot: 'Tue 11:30 AM', reason: 'Doctor has 3 back-to-back complex cases Mon AM', confidence: 92, impact: 'Reduces wait by 25 min' },
    { id: 'SS-02', patient: 'Anita Desai', type: 'Lab Review', currentSlot: 'Wed 09:00 AM', suggestedSlot: 'Wed 02:00 PM', reason: 'Lab results expected by 1 PM — avoid wasted visit', confidence: 88, impact: 'Prevents re-visit' },
    { id: 'SS-03', patient: 'Priya Singh', type: 'Consultation', currentSlot: 'Thu 03:00 PM', suggestedSlot: 'Thu 10:00 AM', reason: 'Patient travel distance 45km — earlier slot reduces fatigue', confidence: 75, impact: 'Better patient experience' },
    { id: 'SS-04', patient: 'Mohammed Ali', type: 'Dialysis', currentSlot: 'Fri 08:00 AM', suggestedSlot: 'No change', reason: 'Optimal slot — dialysis unit least busy', confidence: 95, impact: 'Already optimal' },
  ];

  const noShowPredictions = [
    { patient: 'Vikram Iyer', appointment: 'Mon 11:00 AM', doctor: 'Dr. Patel', risk: 78, factors: ['3 prior no-shows', 'Distance > 30km', 'No reminder response'], action: 'Double-book slot' },
    { patient: 'Lakshmi Nair', appointment: 'Tue 02:00 PM', doctor: 'Dr. Sharma', risk: 65, factors: ['1 prior no-show', 'Weather forecast: rain', 'Chronic condition — low urgency'], action: 'Send reminder 2h before' },
    { patient: 'Arun Das', appointment: 'Wed 10:00 AM', doctor: 'Dr. Reddy', risk: 42, factors: ['New patient', 'Self-referral', 'No deposit paid'], action: 'Confirmation call' },
    { patient: 'Kavita Mehta', appointment: 'Thu 09:30 AM', doctor: 'Dr. Khan', risk: 15, factors: ['Regular patient', 'Post-surgical follow-up', 'Deposit paid'], action: 'No action needed' },
  ];

  const doctorLoad = [
    { doctor: 'Dr. Sharma', specialty: 'Medicine', scheduled: 24, capacity: 28, utilization: 86, overbookedSlots: 2, avgWait: '18 min' },
    { doctor: 'Dr. Patel', specialty: 'Cardiology', scheduled: 18, capacity: 20, utilization: 90, overbookedSlots: 1, avgWait: '22 min' },
    { doctor: 'Dr. Reddy', specialty: 'Surgery', scheduled: 12, capacity: 16, utilization: 75, overbookedSlots: 0, avgWait: '12 min' },
    { doctor: 'Dr. Khan', specialty: 'Ortho', scheduled: 20, capacity: 22, utilization: 91, overbookedSlots: 3, avgWait: '28 min' },
    { doctor: 'Dr. Gupta', specialty: 'Pediatrics', scheduled: 15, capacity: 24, utilization: 63, overbookedSlots: 0, avgWait: '8 min' },
  ];

  const weeklyMetrics = {
    totalAppointments: 342, noShowRate: 12.4, avgWaitTime: '19 min', utilizationRate: 81,
    aiOptimizations: 28, savedMinutes: 340, revenueProtected: '₹1.8L'
  };

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">📅 AI Smart Scheduling</h4>
          <small className="text-muted">Phase 7 S-Tier — ML-driven appointment optimization & no-show prediction</small>
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
