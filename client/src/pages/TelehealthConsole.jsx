import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Tabs, Tab, ListGroup, Alert } from 'react-bootstrap';

const TelehealthConsole = () => {
  const [activeTab, setActiveTab] = useState('waitingroom');
  const [inCall, setInCall] = useState(false);

  const waitingRoom = [
    { id: 'TH-401', patient: 'Rajesh Kumar', mrn: 'MRN-1045', type: 'Follow-up', waitTime: '5 min', priority: 'Normal', complaint: 'Diabetes medication review', vitals: 'BP: 138/86, Sugar: 180 mg/dL' },
    { id: 'TH-402', patient: 'Anita Desai', mrn: 'MRN-1078', type: 'Urgent', waitTime: '12 min', priority: 'High', complaint: 'Persistent cough with fever 3 days', vitals: 'Temp: 38.4C, SpO2: 94%' },
    { id: 'TH-403', patient: 'Priya Singh', mrn: 'MRN-1056', type: 'New Consult', waitTime: '2 min', priority: 'Normal', complaint: 'Skin rash assessment', vitals: 'N/A' },
  ];

  const todaySchedule = [
    { time: '09:00 AM', patient: 'Vikram Iyer', type: 'Follow-up', status: 'Completed', duration: '15 min' },
    { time: '09:30 AM', patient: 'Lakshmi Nair', type: 'Review', status: 'Completed', duration: '12 min' },
    { time: '10:00 AM', patient: 'Rajesh Kumar', type: 'Follow-up', status: 'In Waiting', duration: '--' },
    { time: '10:30 AM', patient: 'Anita Desai', type: 'Urgent', status: 'In Waiting', duration: '--' },
    { time: '11:00 AM', patient: 'Priya Singh', type: 'New Consult', status: 'In Waiting', duration: '--' },
    { time: '11:30 AM', patient: 'Mohammed Ali', type: 'Follow-up', status: 'Scheduled', duration: '--' },
    { time: '02:00 PM', patient: 'Kavita Mehta', type: 'Post-op Review', status: 'Scheduled', duration: '--' },
  ];

  const ePrescriptionDrugs = [
    { drug: 'Azithromycin 500mg', dosage: '1-0-0', days: 5, instructions: 'Take on empty stomach' },
    { drug: 'Paracetamol 650mg', dosage: '1-1-1', days: 3, instructions: 'After food, SOS for fever > 100F' },
    { drug: 'Cetirizine 10mg', dosage: '0-0-1', days: 5, instructions: 'At bedtime' },
  ];

  const metrics = {
    todayConsults: 7, completed: 2, avgDuration: '14 min',
    satisfaction: 4.6, totalThisWeek: 34, noShowRate: '8%'
  };

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Telehealth Console</h4>
          <small className="text-muted">Phase 8 S-Tier -- Video consultation & virtual care platform</small>
        </div>
        <div className="d-flex gap-2">
          <Badge bg="success" className="p-2 fs-6">Camera Ready</Badge>
          <Badge bg="info" className="p-2 fs-6">HIPAA Secure</Badge>
        </div>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{metrics.todayConsults}</h3><small>Today</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{metrics.completed}</h3><small>Completed</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">{metrics.avgDuration}</h3><small>Avg Duration</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{metrics.satisfaction}/5</h3><small>Satisfaction</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">{metrics.noShowRate}</h3><small>No-Show Rate</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="waitingroom" title="Virtual Waiting Room">
          {waitingRoom.filter(w => w.priority === 'High').map(w => (
            <Alert key={w.id} variant="danger">
              <strong>URGENT:</strong> {w.patient} -- {w.complaint} | Vitals: {w.vitals} | Waiting: {w.waitTime}
              <Button size="sm" variant="danger" className="ms-3" onClick={() => setInCall(true)}>Start Call Now</Button>
            </Alert>
          ))}
          <Row>
            {waitingRoom.map(w => (
              <Col md={4} key={w.id}>
                <Card className={`mb-3 ${w.priority === 'High' ? 'border-danger' : 'border-primary'}`}>
                  <Card.Header className={w.priority === 'High' ? 'bg-danger text-white' : 'bg-primary text-white'}>
                    <strong>{w.patient}</strong> <Badge bg="light" text="dark">{w.mrn}</Badge>
                  </Card.Header>
                  <Card.Body>
                    <p><strong>Type:</strong> {w.type}</p>
                    <p><strong>Complaint:</strong> {w.complaint}</p>
                    <p><strong>Vitals:</strong> <small>{w.vitals}</small></p>
                    <p><strong>Waiting:</strong> <Badge bg={parseInt(w.waitTime) > 10 ? 'danger' : 'success'}>{w.waitTime}</Badge></p>
                    <div className="d-grid gap-2">
                      <Button variant="success" onClick={() => setInCall(true)}>Start Video Call</Button>
                      <Button variant="outline-primary" size="sm">View History</Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Tab>

        <Tab eventKey="videocall" title="Video Call">
          <Card>
            <Card.Body>
              {!inCall ? (
                <div className="text-center py-5">
                  <h3 className="text-muted">No Active Call</h3>
                  <p>Select a patient from the waiting room to start a video consultation</p>
                  <Button variant="primary" size="lg" onClick={() => setInCall(true)}>Start Demo Call</Button>
                </div>
              ) : (
                <Row>
                  <Col md={8}>
                    <div style={{backgroundColor: '#1a1a2e', borderRadius: 12, height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'}}>
                      <div className="text-center text-white">
                        <div style={{width:120, height:120, borderRadius:'50%', backgroundColor:'#0d6efd', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'3rem', margin:'0 auto 15px'}}>R</div>
                        <h4>Rajesh Kumar</h4>
                        <Badge bg="success">Connected - 03:24</Badge>
                      </div>
                      <div style={{position:'absolute', bottom:15, right:15, width:150, height:100, backgroundColor:'#16213e', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center'}}>
                        <small className="text-white">Dr. Sharma (You)</small>
                      </div>
                      <div style={{position:'absolute', bottom:15, left:'50%', transform:'translateX(-50%)', display:'flex', gap:10}}>
                        <Button variant="light" className="rounded-circle" style={{width:50, height:50}}>Mic</Button>
                        <Button variant="light" className="rounded-circle" style={{width:50, height:50}}>Cam</Button>
                        <Button variant="light" className="rounded-circle" style={{width:50, height:50}}>Share</Button>
                        <Button variant="danger" className="rounded-circle" style={{width:50, height:50}} onClick={() => setInCall(false)}>End</Button>
                      </div>
                    </div>
                  </Col>
                  <Col md={4}>
                    <Card className="mb-2">
                      <Card.Header><strong>Patient Quick Info</strong></Card.Header>
                      <Card.Body>
                        <p><strong>Name:</strong> Rajesh Kumar</p>
                        <p><strong>Age:</strong> 58 yrs | B+</p>
                        <p><strong>Allergies:</strong> <Badge bg="danger">Penicillin</Badge></p>
                        <p><strong>Vitals (reported):</strong><br/>BP: 138/86 | Sugar: 180</p>
                      </Card.Body>
                    </Card>
                    <Card>
                      <Card.Header><strong>Quick Notes</strong></Card.Header>
                      <Card.Body>
                        <Form.Control as="textarea" rows={4} placeholder="Type consultation notes..." />
                        <Button variant="primary" size="sm" className="mt-2 w-100">Save Notes</Button>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="eprescription" title="E-Prescription">
          <Card>
            <Card.Body>
              <h5 className="mb-3">Generate E-Prescription</h5>
              <Alert variant="info">Patient: <strong>Rajesh Kumar (MRN-1045)</strong> | Consultation: Telehealth Follow-up</Alert>
              <Table bordered hover>
                <thead className="table-dark">
                  <tr><th>Drug</th><th>Dosage (M-A-N)</th><th>Days</th><th>Instructions</th><th>Remove</th></tr>
                </thead>
                <tbody>
                  {ePrescriptionDrugs.map((d,i) => (
                    <tr key={i}>
                      <td><strong>{d.drug}</strong></td>
                      <td>{d.dosage}</td>
                      <td>{d.days}</td>
                      <td><small>{d.instructions}</small></td>
                      <td><Button size="sm" variant="outline-danger">X</Button></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <div className="d-flex gap-2">
                <Button variant="outline-primary">+ Add Drug</Button>
                <Button variant="outline-info">+ Add Investigation</Button>
                <Button variant="success" className="ms-auto">Send E-Prescription to Patient</Button>
              </div>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="schedule" title="Today Schedule">
          <Card>
            <Card.Body>
              <Table striped hover responsive>
                <thead className="table-dark">
                  <tr><th>Time</th><th>Patient</th><th>Type</th><th>Status</th><th>Duration</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {todaySchedule.map((s,i) => (
                    <tr key={i} className={s.status === 'In Waiting' ? 'table-warning' : s.status === 'Completed' ? 'table-success' : ''}>
                      <td><strong>{s.time}</strong></td>
                      <td>{s.patient}</td>
                      <td>{s.type}</td>
                      <td><Badge bg={s.status === 'Completed' ? 'success' : s.status === 'In Waiting' ? 'warning' : 'info'}>{s.status}</Badge></td>
                      <td>{s.duration}</td>
                      <td>
                        {s.status === 'In Waiting' && <Button size="sm" variant="success">Join</Button>}
                        {s.status === 'Completed' && <Button size="sm" variant="outline-primary">Notes</Button>}
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

export default TelehealthConsole;
