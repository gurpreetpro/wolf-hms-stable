import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, Modal, Form } from 'react-bootstrap';

const WardPassManager = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [showNew, setShowNew] = useState(false);

  const activePasses = [
    { id: 'WP-078', patient: 'Ramesh Gupta (P-1045)', ward: 'Ward A-12', type: 'Day Pass', reason: 'Family event attendance', approvedBy: 'Dr. Priya Sharma', issuedAt: '2026-03-02 09:00', returnBy: '2026-03-02 18:00', escortedBy: 'Son — Manoj Gupta', contact: '98765-43210', conditions: 'Continue oral meds, avoid exertion', status: 'Out' },
    { id: 'WP-077', patient: 'Meena Sharma (P-1023)', ward: 'Ward A-8', type: 'Short Leave', reason: 'Religious ceremony at home', approvedBy: 'Dr. Suresh Patel', issuedAt: '2026-03-02 10:00', returnBy: '2026-03-02 14:00', escortedBy: 'Husband — Rajesh Sharma', contact: '87654-32100', conditions: 'Wound care instructions provided', status: 'Out' },
  ];

  const returnedPasses = [
    { id: 'WP-076', patient: 'Anil Mehta (P-1067)', ward: 'Ward B-14', type: 'Day Pass', reason: 'Bank work', issuedAt: '2026-03-01 09:00', returnBy: '18:00', returnedAt: '17:30', status: 'Returned On Time', vitalsOnReturn: 'BP 130/80, Temp 98.4°F, SpO2 97%' },
    { id: 'WP-075', patient: 'Vikram Singh (P-998)', ward: 'Ward B-7', type: 'Overnight', reason: 'Night at home before discharge', issuedAt: '2026-02-28 18:00', returnBy: 'Mar 1 08:00', returnedAt: '08:15', status: 'Returned Late (15min)', vitalsOnReturn: 'BP 120/78, Temp 98.2°F, SpO2 99%' },
    { id: 'WP-074', patient: 'Fatima Khan (P-1012)', ward: 'Ward A-15', type: 'Short Leave', reason: 'Follow-up at dental clinic', issuedAt: '2026-02-28 10:00', returnBy: '13:00', returnedAt: '12:45', status: 'Returned On Time', vitalsOnReturn: 'BP 118/75, Temp 98.6°F, SpO2 98%' },
    { id: 'WP-073', patient: 'Neha Gupta (P-1034)', ward: 'Ward A-5', type: 'Day Pass', reason: "Child's school function", issuedAt: '2026-02-27 08:00', returnBy: '16:00', returnedAt: '15:30', status: 'Returned On Time', vitalsOnReturn: 'BP 110/70, Temp 98.4°F, SpO2 99%' },
  ];

  const policies = [
    { type: 'Short Leave', maxDuration: '4 hours', eligibility: 'Stable patients, Day 3+', approval: 'Treating Doctor', escortRequired: 'Yes', vitalsCheck: 'Before & After', restrictions: 'No alcohol, continue meds' },
    { type: 'Day Pass', maxDuration: '8 hours (08:00-18:00)', eligibility: 'Stable patients, Day 5+', approval: 'Treating Doctor + HOD', escortRequired: 'Yes', vitalsCheck: 'Before & After', restrictions: 'Signed AMA acknowledgment' },
    { type: 'Overnight Pass', maxDuration: '14 hours (18:00-08:00)', eligibility: 'Pre-discharge patients only', approval: 'Consultant + Nursing Incharge', escortRequired: 'Yes', vitalsCheck: 'Before, After, Phone check', restrictions: 'Emergency contact mandatory' },
    { type: 'Extended Leave', maxDuration: '48 hours', eligibility: 'Chronic patients, stable condition', approval: 'CMO approval required', escortRequired: 'Yes', vitalsCheck: 'Full assessment on return', restrictions: 'Written care plan, meds dispensed' },
  ];

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Ward Pass Manager</h4>
          <small className="text-muted">Phase 13 -- Temporary leave passes, escort tracking, return vitals, policies</small>
        </div>
        <Button variant="primary" onClick={() => setShowNew(true)}>+ Issue Ward Pass</Button>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{activePasses.length}</h3><small>Currently Out</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{returnedPasses.length}</h3><small>Returned (7d)</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">95%</h3><small>On-Time Return Rate</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">{policies.length}</h3><small>Pass Types</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="active" title={<span>Currently Out <Badge bg="warning" text="dark">{activePasses.length}</Badge></span>}>
          <Card><Card.Body>
            <Table bordered hover responsive>
              <thead className="table-warning">
                <tr><th>Pass ID</th><th>Patient</th><th>Ward</th><th>Type</th><th>Reason</th><th>Escort</th><th>Return By</th><th>Conditions</th><th>Action</th></tr>
              </thead>
              <tbody>
                {activePasses.map((p) => (
                  <tr key={p.id}>
                    <td><code>{p.id}</code></td>
                    <td><strong>{p.patient}</strong></td>
                    <td><Badge bg="secondary">{p.ward}</Badge></td>
                    <td><Badge bg="info">{p.type}</Badge></td>
                    <td><small>{p.reason}</small></td>
                    <td><small>{p.escortedBy}<br/>{p.contact}</small></td>
                    <td className="text-danger fw-bold">{p.returnBy}</td>
                    <td><small>{p.conditions}</small></td>
                    <td><Button size="sm" variant="success">Mark Returned</Button></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>

        <Tab eventKey="returned" title="Return History">
          <Card><Card.Body>
            <Table striped hover responsive size="sm">
              <thead className="table-dark">
                <tr><th>Pass ID</th><th>Patient</th><th>Type</th><th>Return By</th><th>Returned At</th><th>Status</th><th>Vitals on Return</th></tr>
              </thead>
              <tbody>
                {returnedPasses.map((r) => (
                  <tr key={r.id}>
                    <td><code>{r.id}</code></td>
                    <td><strong>{r.patient}</strong></td>
                    <td><Badge bg="info">{r.type}</Badge></td>
                    <td><small>{r.returnBy}</small></td>
                    <td><small>{r.returnedAt}</small></td>
                    <td><Badge bg={r.status.includes('On Time') ? 'success' : 'warning'}>{r.status}</Badge></td>
                    <td><small>{r.vitalsOnReturn}</small></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>

        <Tab eventKey="policies" title="Pass Policies">
          <Card><Card.Body>
            <Table bordered hover responsive>
              <thead className="table-dark">
                <tr><th>Pass Type</th><th>Max Duration</th><th>Eligibility</th><th>Approval Required</th><th>Escort</th><th>Vitals Check</th><th>Restrictions</th></tr>
              </thead>
              <tbody>
                {policies.map((p) => (
                  <tr key={p.type}>
                    <td><Badge bg="primary">{p.type}</Badge></td>
                    <td><strong>{p.maxDuration}</strong></td>
                    <td><small>{p.eligibility}</small></td>
                    <td><small>{p.approval}</small></td>
                    <td>{p.escortRequired}</td>
                    <td><small>{p.vitalsCheck}</small></td>
                    <td><small className="text-danger">{p.restrictions}</small></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>
      </Tabs>

      <Modal show={showNew} onHide={() => setShowNew(false)} centered size="lg">
        <Modal.Header closeButton><Modal.Title>Issue Ward Pass</Modal.Title></Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3"><Form.Label>Patient</Form.Label><Form.Control placeholder="Search admitted patient..." /></Form.Group>
              <Form.Group className="mb-3"><Form.Label>Pass Type</Form.Label><Form.Select><option>Short Leave (4h)</option><option>Day Pass (8h)</option><option>Overnight (14h)</option><option>Extended (48h)</option></Form.Select></Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3"><Form.Label>Escort Name</Form.Label><Form.Control placeholder="Name & relationship" /></Form.Group>
              <Form.Group className="mb-3"><Form.Label>Escort Contact</Form.Label><Form.Control placeholder="Phone number" /></Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-3"><Form.Label>Reason</Form.Label><Form.Control as="textarea" rows={2} placeholder="Reason for leave..." /></Form.Group>
          <Form.Group className="mb-3"><Form.Label>Special Conditions</Form.Label><Form.Control as="textarea" rows={2} placeholder="Medications, restrictions, care instructions..." /></Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => setShowNew(false)}>Issue Pass</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default WardPassManager;
