import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, ProgressBar } from 'react-bootstrap';

const TransitionPlanner = () => {
  const [activeTab, setActiveTab] = useState('active');

  const activePlans = [
    { patient: 'Ramesh Gupta (P-1045)', ward: 'ICU-3', admDate: '2026-02-28', targetDischarge: '2026-03-04', day: 3, tasks: [
      { task: 'Wean ventilator', status: 'Completed', owner: 'RT Team' },
      { task: 'Tolerating oral feeds', status: 'Completed', owner: 'Dietitian' },
      { task: 'Ambulation started', status: 'In Progress', owner: 'Physiotherapy' },
      { task: 'Discharge medications finalized', status: 'Pending', owner: 'Dr. Priya' },
      { task: 'Follow-up appointment booked', status: 'Pending', owner: 'Reception' },
      { task: 'Family counseling', status: 'Pending', owner: 'Nurse' },
    ], progress: 33, destination: 'Step-down to Ward A → Home' },
    { patient: 'Meena Sharma (P-1023)', ward: 'Ward A-12', admDate: '2026-02-27', targetDischarge: '2026-03-03', day: 4, tasks: [
      { task: 'IV antibiotics completed', status: 'Completed', owner: 'Pharmacy' },
      { task: 'Wound healing satisfactory', status: 'Completed', owner: 'Surgeon' },
      { task: 'Drain removal', status: 'Completed', owner: 'Dr. Suresh' },
      { task: 'Oral antibiotics started', status: 'Completed', owner: 'Pharmacy' },
      { task: 'Discharge summary prepared', status: 'In Progress', owner: 'Dr. Suresh' },
      { task: 'Insurance pre-auth for follow-up', status: 'Pending', owner: 'TPA Desk' },
    ], progress: 67, destination: 'Home with home care follow-up' },
    { patient: 'Suresh Patel (P-987)', ward: 'ICU-1', admDate: '2026-02-25', targetDischarge: '2026-03-05', day: 6, tasks: [
      { task: 'Cardiac rehab started', status: 'In Progress', owner: 'Physiotherapy' },
      { task: 'Dual antiplatelet compliance', status: 'Completed', owner: 'Pharmacy' },
      { task: 'Echo follow-up done', status: 'Completed', owner: 'Cardiology' },
      { task: 'Dietitian counseling', status: 'Completed', owner: 'Dietitian' },
      { task: 'Home BP monitor arranged', status: 'Pending', owner: 'Nurse' },
    ], progress: 60, destination: 'Home — Cardiac Rehab OPD twice/week' },
  ];

  const readyForDischarge = [
    { patient: 'Vikram Singh (P-998)', ward: 'Ward B-7', diagnosis: 'Post-PTCA Recovery', los: '5 days', allTasksDone: true, dischargeSummary: 'Ready', insurance: 'Settled', followUp: 'Booked — Mar 10' },
    { patient: 'Fatima Khan (P-1012)', ward: 'Ward A-15', diagnosis: 'Post-op Fracture Fixation', los: '3 days', allTasksDone: true, dischargeSummary: 'Ready', insurance: 'HDFC ERGO — Approved', followUp: 'Booked — Mar 8' },
  ];

  const dischargedToday = [
    { patient: 'Neha Gupta (P-1034)', diagnosis: 'Pneumonia', los: '4 days', dischargedAt: '11:00 AM', destination: 'Home', followUp: 'Mar 9', summary: 'Completed' },
    { patient: 'Ravi Joshi (P-1001)', diagnosis: 'Appendectomy', los: '2 days', dischargedAt: '10:30 AM', destination: 'Home', followUp: 'Mar 7', summary: 'Completed' },
    { patient: 'Amit Verma (P-1056)', diagnosis: 'NICU — Preterm stabilized', los: '8 days', dischargedAt: '09:00 AM', destination: 'Home with Kangaroo Care', followUp: 'Mar 5', summary: 'Completed' },
  ];

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Discharge Transition Planner</h4>
          <small className="text-muted">Phase 13 -- Discharge readiness tracking, task checklists, transition workflows</small>
        </div>
        <Button variant="primary">+ Create Plan</Button>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">{activePlans.length}</h3><small>Active Plans</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{readyForDischarge.length}</h3><small>Ready for Discharge</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{dischargedToday.length}</h3><small>Discharged Today</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">3.8d</h3><small>Avg LOS</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="active" title={<span>Active Plans <Badge bg="info">{activePlans.length}</Badge></span>}>
          {activePlans.map((p) => (
            <Card key={p.patient} className="mb-3">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <div><strong>{p.patient}</strong> — {p.ward} | Day {p.day} | Target: {p.targetDischarge}</div>
                <Badge bg="info">{p.destination}</Badge>
              </Card.Header>
              <Card.Body>
                <ProgressBar now={p.progress} label={`${p.progress}%`} variant={p.progress >= 80 ? 'success' : p.progress >= 50 ? 'info' : 'warning'} className="mb-3" />
                <Table bordered size="sm">
                  <thead className="table-light">
                    <tr><th>Task</th><th>Owner</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {p.tasks.map((t) => (
                      <tr key={t.task}>
                        <td>{t.task}</td>
                        <td><small>{t.owner}</small></td>
                        <td><Badge bg={t.status === 'Completed' ? 'success' : t.status === 'In Progress' ? 'warning' : 'secondary'}>{t.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          ))}
        </Tab>

        <Tab eventKey="ready" title={<span>Ready <Badge bg="success">{readyForDischarge.length}</Badge></span>}>
          <Card><Card.Body>
            <Table bordered hover responsive>
              <thead className="table-success">
                <tr><th>Patient</th><th>Ward</th><th>Diagnosis</th><th>LOS</th><th>Summary</th><th>Insurance</th><th>Follow-Up</th><th>Action</th></tr>
              </thead>
              <tbody>
                {readyForDischarge.map((r) => (
                  <tr key={r.patient}>
                    <td><strong>{r.patient}</strong></td>
                    <td><Badge bg="secondary">{r.ward}</Badge></td>
                    <td>{r.diagnosis}</td>
                    <td>{r.los}</td>
                    <td><Badge bg="success">{r.dischargeSummary}</Badge></td>
                    <td><small>{r.insurance}</small></td>
                    <td><small>{r.followUp}</small></td>
                    <td><Button size="sm" variant="success">Discharge Now</Button></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>

        <Tab eventKey="discharged" title="Discharged Today">
          <Card><Card.Body>
            <Table striped hover responsive>
              <thead className="table-dark">
                <tr><th>Patient</th><th>Diagnosis</th><th>LOS</th><th>Discharged At</th><th>Destination</th><th>Follow-Up</th><th>Summary</th></tr>
              </thead>
              <tbody>
                {dischargedToday.map((d) => (
                  <tr key={d.patient}>
                    <td><strong>{d.patient}</strong></td>
                    <td>{d.diagnosis}</td>
                    <td>{d.los}</td>
                    <td>{d.dischargedAt}</td>
                    <td><Badge bg="info">{d.destination}</Badge></td>
                    <td><small>{d.followUp}</small></td>
                    <td><Badge bg="success">{d.summary}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default TransitionPlanner;
