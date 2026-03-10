import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, Alert, Modal, Form } from 'react-bootstrap';

const EmergencyCommandCenter = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [showTrigger, setShowTrigger] = useState(false);

  const activeEmergencies = [
    { id: 'EM-2026-041', type: 'Code Blue', location: 'ICU Bed 3', patient: 'Ramesh Gupta (P-1045)', triggeredBy: 'Nurse Anita Desai', time: '16:02', elapsed: '8 min', responders: 3, status: 'Active' },
    { id: 'EM-2026-040', type: 'Code Red', location: 'Ward B - Room 204', patient: 'N/A (Fire Alarm)', triggeredBy: 'Smoke Detector Auto', time: '15:45', elapsed: '25 min', responders: 5, status: 'Responding' },
  ];

  const recentResolved = [
    { id: 'EM-2026-039', type: 'Code Blue', location: 'ER Bay 2', patient: 'Suresh Patel (P-987)', triggeredBy: 'Dr. Suresh Patel', time: '14:20', resolved: '14:38', duration: '18 min', outcome: 'Stabilized', responders: 4 },
    { id: 'EM-2026-038', type: 'Rapid Response', location: 'Ward A - Bed 12', patient: 'Meena Sharma (P-1023)', triggeredBy: 'Nurse Kavita', time: '12:10', resolved: '12:25', duration: '15 min', outcome: 'Transferred to ICU', responders: 3 },
    { id: 'EM-2026-037', type: 'Code Pink', location: 'Pediatrics Ward', patient: 'Baby Arun (P-1089)', triggeredBy: 'Security', time: '10:05', resolved: '10:12', duration: '7 min', outcome: 'False Alarm', responders: 6 },
    { id: 'EM-2026-036', type: 'Code Blue', location: 'OT-2', patient: 'Rajesh Kumar (P-956)', triggeredBy: 'Dr. Rajesh Kumar', time: '09:30', resolved: '09:52', duration: '22 min', outcome: 'CPR Successful', responders: 5 },
    { id: 'EM-2026-035', type: 'MCI (Mass Casualty)', location: 'Emergency Dept', patient: 'Multiple (RTA - 4 victims)', triggeredBy: 'ER Charge Nurse', time: '08:00', resolved: '10:45', duration: '2h 45m', outcome: 'All Stabilized', responders: 12 },
  ];

  const responseTeams = [
    { team: 'Code Blue Team', lead: 'Dr. Priya Sharma', members: ['Anesthetist', 'ICU Nurse', 'Respiratory Therapist', 'Pharmacist'], pager: '111', avgResponse: '2.1 min', status: 'Available' },
    { team: 'Rapid Response Team', lead: 'Dr. Suresh Patel', members: ['ER Doctor', 'ICU Nurse', 'RT'], pager: '222', avgResponse: '3.5 min', status: 'Available' },
    { team: 'Code Red Team', lead: 'Fire Safety Officer', members: ['Security', 'Maintenance', 'Ward Staff'], pager: '333', avgResponse: '1.8 min', status: 'Deployed' },
    { team: 'Code Pink Team', lead: 'Security Chief', members: ['All Security', 'Ward Staff', 'Reception'], pager: '444', avgResponse: '1.2 min', status: 'Available' },
    { team: 'MCI Team', lead: 'CMO', members: ['All ER Docs', 'Surgeons', 'Anesthetists', 'Nursing Pool'], pager: '555', avgResponse: '5.0 min', status: 'Standby' },
  ];

  const alertConfig = [
    { code: 'Code Blue', description: 'Cardiac/Respiratory Arrest', color: '#0d6efd', sound: 'Continuous Alarm', broadcast: 'PA + SMS + App Push', escalation: 'Auto-page anesthetist at 2 min' },
    { code: 'Code Red', description: 'Fire Emergency', color: '#dc3545', sound: 'Fire Alarm Bell', broadcast: 'PA + All Pagers + SMS', escalation: 'Fire Brigade at 5 min if unresolved' },
    { code: 'Rapid Response', description: 'Clinical Deterioration', color: '#fd7e14', sound: 'Triple Tone', broadcast: 'Team Pager + SMS', escalation: 'Code Blue if no response 3 min' },
    { code: 'Code Pink', description: 'Infant/Child Abduction', color: '#e91e8f', sound: 'Continuous + Lockdown', broadcast: 'All Staff + Security + PA', escalation: 'Police at 5 min' },
    { code: 'Code Orange', description: 'Hazmat / Chemical Spill', color: '#ff8800', sound: 'Wailing Siren', broadcast: 'PA + Safety Team Pager', escalation: 'HazMat team + evacuation' },
    { code: 'MCI', description: 'Mass Casualty Incident', color: '#6f42c1', sound: 'Disaster Alert', broadcast: 'All Staff Recall + PA', escalation: 'Activate disaster plan at 10+ victims' },
  ];

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Emergency Command Center</h4>
          <small className="text-muted">Phase 12 -- Code blue/red triggers, response teams, resolution tracking</small>
        </div>
        <Button variant="danger" size="lg" onClick={() => setShowTrigger(true)}>TRIGGER EMERGENCY</Button>
      </div>

      {activeEmergencies.length > 0 && (
        <Alert variant="danger" className="d-flex align-items-center">
          <strong className="me-2">ACTIVE EMERGENCIES: {activeEmergencies.length}</strong> — Immediate response required!
        </Alert>
      )}

      <Row className="mb-3">
        <Col><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">{activeEmergencies.length}</h3><small>Active Now</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{recentResolved.length}</h3><small>Resolved Today</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">2.5 min</h3><small>Avg Response Time</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">{responseTeams.length}</h3><small>Response Teams</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">96%</h3><small>Response Compliance</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="active" title={<span>Active Emergencies <Badge bg="danger">{activeEmergencies.length}</Badge></span>}>
          <Card>
            <Card.Body>
              {activeEmergencies.length === 0 ? (
                <Alert variant="success">No active emergencies. All clear.</Alert>
              ) : (
                <Table bordered hover responsive>
                  <thead className="table-danger">
                    <tr><th>ID</th><th>Type</th><th>Location</th><th>Patient</th><th>Triggered By</th><th>Time</th><th>Elapsed</th><th>Responders</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {activeEmergencies.map((e, i) => (
                      <tr key={i}>
                        <td><code>{e.id}</code></td>
                        <td><Badge bg="danger">{e.type}</Badge></td>
                        <td><strong>{e.location}</strong></td>
                        <td><small>{e.patient}</small></td>
                        <td><small>{e.triggeredBy}</small></td>
                        <td>{e.time}</td>
                        <td className="text-danger fw-bold">{e.elapsed}</td>
                        <td className="text-center"><Badge bg="primary">{e.responders}</Badge></td>
                        <td><Badge bg={e.status === 'Active' ? 'danger' : 'warning'}>{e.status}</Badge></td>
                        <td><Button size="sm" variant="success">Resolve</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="resolved" title="Resolved Today">
          <Card>
            <Card.Body>
              <Table striped hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>ID</th><th>Type</th><th>Location</th><th>Patient</th><th>Duration</th><th>Outcome</th><th>Responders</th></tr>
                </thead>
                <tbody>
                  {recentResolved.map((r, i) => (
                    <tr key={i}>
                      <td><code>{r.id}</code></td>
                      <td><Badge bg="secondary">{r.type}</Badge></td>
                      <td>{r.location}</td>
                      <td><small>{r.patient}</small></td>
                      <td><strong>{r.duration}</strong></td>
                      <td><Badge bg={r.outcome === 'False Alarm' ? 'warning' : 'success'}>{r.outcome}</Badge></td>
                      <td className="text-center">{r.responders}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="teams" title="Response Teams">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Team</th><th>Lead</th><th>Members</th><th>Pager</th><th>Avg Response</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {responseTeams.map((t, i) => (
                    <tr key={i}>
                      <td><strong>{t.team}</strong></td>
                      <td>{t.lead}</td>
                      <td>{t.members.map((m, j) => <Badge key={j} bg="info" className="me-1 mb-1" style={{fontSize:'0.6rem'}}>{m}</Badge>)}</td>
                      <td><code>{t.pager}</code></td>
                      <td><strong>{t.avgResponse}</strong></td>
                      <td><Badge bg={t.status === 'Available' ? 'success' : t.status === 'Deployed' ? 'danger' : 'warning'}>{t.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="config" title="Alert Configuration">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Code</th><th>Description</th><th>Sound</th><th>Broadcast</th><th>Escalation</th></tr>
                </thead>
                <tbody>
                  {alertConfig.map((a, i) => (
                    <tr key={i}>
                      <td><Badge style={{backgroundColor: a.color}}>{a.code}</Badge></td>
                      <td><strong>{a.description}</strong></td>
                      <td><small>{a.sound}</small></td>
                      <td><small>{a.broadcast}</small></td>
                      <td><small className="text-danger">{a.escalation}</small></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      <Modal show={showTrigger} onHide={() => setShowTrigger(false)} centered>
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title>Trigger Emergency</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Emergency Type</Form.Label>
              <Form.Select><option>Code Blue - Cardiac Arrest</option><option>Code Red - Fire</option><option>Rapid Response</option><option>Code Pink - Infant Abduction</option><option>Code Orange - Hazmat</option><option>MCI - Mass Casualty</option></Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Location</Form.Label>
              <Form.Select><option>ICU</option><option>ER</option><option>Ward A</option><option>Ward B</option><option>OT-1</option><option>OT-2</option><option>Pediatrics</option><option>NICU</option></Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Patient (if applicable)</Form.Label>
              <Form.Control type="text" placeholder="Patient name or ID" />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control as="textarea" rows={2} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTrigger(false)}>Cancel</Button>
          <Button variant="danger" onClick={() => setShowTrigger(false)}>TRIGGER NOW</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default EmergencyCommandCenter;
