import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, ListGroup, ProgressBar, Alert } from 'react-bootstrap';

const PatientPortal = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const patient = {
    name: 'Rajesh Kumar', mrn: 'MRN-1045', age: 58, blood: 'B+',
    phone: '+91-98765-43210', email: 'rajesh.kumar@email.com',
    allergies: ['Penicillin', 'Sulfa drugs'], conditions: ['Type 2 Diabetes', 'Hypertension', 'CKD Stage 3']
  };

  const upcomingAppointments = [
    { id: 'APT-301', date: '2026-03-05', time: '10:00 AM', doctor: 'Dr. Sharma', dept: 'Medicine', type: 'Follow-up', status: 'Confirmed' },
    { id: 'APT-302', date: '2026-03-12', time: '11:30 AM', doctor: 'Dr. Patel', dept: 'Cardiology', type: 'ECG Review', status: 'Pending' },
    { id: 'APT-303', date: '2026-03-20', time: '09:00 AM', doctor: 'Dr. Reddy', dept: 'Nephrology', type: 'Lab Review', status: 'Confirmed' },
  ];

  const recentReports = [
    { id: 'RPT-501', date: '2026-02-28', name: 'Complete Blood Count', status: 'Ready', critical: false },
    { id: 'RPT-502', date: '2026-02-28', name: 'HbA1c', status: 'Ready', critical: true },
    { id: 'RPT-503', date: '2026-02-25', name: 'Renal Function Test', status: 'Ready', critical: false },
    { id: 'RPT-504', date: '2026-03-01', name: 'Lipid Profile', status: 'Processing', critical: false },
    { id: 'RPT-505', date: '2026-02-20', name: 'Chest X-Ray', status: 'Ready', critical: false },
  ];

  const prescriptions = [
    { drug: 'Metformin 500mg', dosage: '1-0-1', duration: '90 days', refills: 2, nextRefill: '2026-03-15', doctor: 'Dr. Sharma' },
    { drug: 'Amlodipine 5mg', dosage: '0-0-1', duration: '90 days', refills: 1, nextRefill: '2026-04-01', doctor: 'Dr. Patel' },
    { drug: 'Telmisartan 40mg', dosage: '1-0-0', duration: '90 days', refills: 2, nextRefill: '2026-03-15', doctor: 'Dr. Sharma' },
    { drug: 'Atorvastatin 10mg', dosage: '0-0-1', duration: '60 days', refills: 0, nextRefill: 'Needs renewal', doctor: 'Dr. Patel' },
  ];

  const bills = [
    { id: 'INV-2201', date: '2026-02-28', desc: 'OPD Consultation + Labs', total: 3500, paid: 3500, balance: 0, status: 'Paid' },
    { id: 'INV-2198', date: '2026-02-15', desc: 'Cardiology Review + ECG', total: 2800, paid: 2800, balance: 0, status: 'Paid' },
    { id: 'INV-2210', date: '2026-03-01', desc: 'Lab Tests (Lipid + RFT)', total: 1800, paid: 0, balance: 1800, status: 'Pending' },
  ];

  const healthTimeline = [
    { date: '2026-03-01', event: 'Lab tests ordered (Lipid Profile)', type: 'lab' },
    { date: '2026-02-28', event: 'Follow-up with Dr. Sharma - medication adjusted', type: 'visit' },
    { date: '2026-02-28', event: 'HbA1c result: 7.8% (Target < 7%)', type: 'result' },
    { date: '2026-02-25', event: 'Renal Function Test - eGFR 48 (stable)', type: 'result' },
    { date: '2026-02-15', event: 'Cardiology review - BP well controlled', type: 'visit' },
    { date: '2026-02-01', event: 'Annual health checkup completed', type: 'visit' },
  ];

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Patient Portal</h4>
          <small className="text-muted">Phase 8 S-Tier -- Self-service patient dashboard</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary">Book Appointment</Button>
          <Button variant="outline-success">Download Health Summary</Button>
        </div>
      </div>

      <Card className="mb-3 border-primary">
        <Card.Body>
          <Row>
            <Col md={3}>
              <div className="text-center">
                <div style={{width:80, height:80, borderRadius:'50%', backgroundColor:'#0d6efd', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem', margin:'0 auto 10px'}}>
                  {patient.name.charAt(0)}
                </div>
                <h5>{patient.name}</h5>
                <Badge bg="secondary">{patient.mrn}</Badge>
              </div>
            </Col>
            <Col md={3}>
              <small className="text-muted">Age / Blood Group</small><br/>
              <strong>{patient.age} yrs | {patient.blood}</strong><br/><br/>
              <small className="text-muted">Contact</small><br/>
              <small>{patient.phone}</small>
            </Col>
            <Col md={3}>
              <small className="text-muted">Allergies</small><br/>
              {patient.allergies.map((a,i) => <Badge key={i} bg="danger" className="me-1">{a}</Badge>)}
              <br/><br/>
              <small className="text-muted">Active Conditions</small><br/>
              {patient.conditions.map((c,i) => <Badge key={i} bg="warning" text="dark" className="me-1 mb-1">{c}</Badge>)}
            </Col>
            <Col md={3} className="text-center">
              <Card className="border-info"><Card.Body>
                <h3 className="text-info">3</h3>
                <small>Upcoming Appointments</small>
              </Card.Body></Card>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="overview" title="Overview">
          <Row>
            <Col md={7}>
              <Card className="mb-3">
                <Card.Header><strong>Upcoming Appointments</strong></Card.Header>
                <ListGroup variant="flush">
                  {upcomingAppointments.map(a => (
                    <ListGroup.Item key={a.id} className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{a.doctor}</strong> -- {a.dept}<br/>
                        <small className="text-muted">{a.date} at {a.time} | {a.type}</small>
                      </div>
                      <div>
                        <Badge bg={a.status === 'Confirmed' ? 'success' : 'warning'}>{a.status}</Badge>
                        <Button size="sm" variant="outline-primary" className="ms-2">Reschedule</Button>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card>
            </Col>
            <Col md={5}>
              <Card>
                <Card.Header><strong>Health Timeline</strong></Card.Header>
                <ListGroup variant="flush">
                  {healthTimeline.map((h,i) => (
                    <ListGroup.Item key={i}>
                      <div className="d-flex gap-2">
                        <Badge bg={h.type === 'visit' ? 'primary' : h.type === 'lab' ? 'info' : 'success'}>
                          {h.type === 'visit' ? 'Visit' : h.type === 'lab' ? 'Lab' : 'Result'}
                        </Badge>
                        <div>
                          <small>{h.event}</small><br/>
                          <small className="text-muted">{h.date}</small>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="reports" title="Lab Reports">
          <Card>
            <Card.Body>
              <Table striped hover responsive>
                <thead className="table-dark">
                  <tr><th>Report ID</th><th>Date</th><th>Test Name</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {recentReports.map(r => (
                    <tr key={r.id} className={r.critical ? 'table-warning' : ''}>
                      <td>{r.id}</td>
                      <td>{r.date}</td>
                      <td><strong>{r.name}</strong> {r.critical && <Badge bg="danger">Review Needed</Badge>}</td>
                      <td><Badge bg={r.status === 'Ready' ? 'success' : 'info'}>{r.status}</Badge></td>
                      <td>{r.status === 'Ready' && <Button size="sm" variant="outline-primary">Download PDF</Button>}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="prescriptions" title="Prescriptions">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Medication</th><th>Dosage</th><th>Duration</th><th>Refills Left</th><th>Next Refill</th><th>Prescribed By</th></tr>
                </thead>
                <tbody>
                  {prescriptions.map((p,i) => (
                    <tr key={i} className={p.refills === 0 ? 'table-warning' : ''}>
                      <td><strong>{p.drug}</strong></td>
                      <td>{p.dosage}</td>
                      <td>{p.duration}</td>
                      <td><Badge bg={p.refills > 0 ? 'success' : 'danger'}>{p.refills}</Badge></td>
                      <td>{p.nextRefill === 'Needs renewal' ? <Badge bg="danger">{p.nextRefill}</Badge> : p.nextRefill}</td>
                      <td>{p.doctor}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="bills" title="Bills & Payments">
          <Card>
            <Card.Body>
              <Table striped hover responsive>
                <thead className="table-dark">
                  <tr><th>Invoice</th><th>Date</th><th>Description</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {bills.map(b => (
                    <tr key={b.id}>
                      <td><strong>{b.id}</strong></td>
                      <td>{b.date}</td>
                      <td>{b.desc}</td>
                      <td>Rs.{b.total.toLocaleString()}</td>
                      <td className="text-success">Rs.{b.paid.toLocaleString()}</td>
                      <td className={b.balance > 0 ? 'text-danger fw-bold' : 'text-success'}>Rs.{b.balance.toLocaleString()}</td>
                      <td><Badge bg={b.status === 'Paid' ? 'success' : 'warning'}>{b.status}</Badge></td>
                      <td>{b.status === 'Pending' && <Button size="sm" variant="success">Pay Now</Button>}</td>
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

export default PatientPortal;
