import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, Modal, Form } from 'react-bootstrap';

const BedTransferManager = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [showRequest, setShowRequest] = useState(false);

  const pendingTransfers = [
    { id: 'TRF-301', patient: 'Ramesh Gupta (P-1045)', from: 'ICU Bed 3', to: 'Ward A - Bed 12', reason: 'Step-down: Stable vitals for 24h', requestedBy: 'Dr. Priya Sharma', time: '15:30', priority: 'High', status: 'Awaiting Approval' },
    { id: 'TRF-302', patient: 'Meena Sharma (P-1023)', from: 'Ward A - Bed 8', to: 'ICU Bed 5', reason: 'Deterioration: SpO2 dropped to 88%', requestedBy: 'Nurse Kavita', time: '14:45', priority: 'Urgent', status: 'Doctor Review' },
    { id: 'TRF-303', patient: 'Anil Mehta (P-1067)', from: 'Ward B - Bed 14', to: 'Ward A - Bed 3', reason: 'Patient request: closer to nursing station', requestedBy: 'Ward B Incharge', time: '13:20', priority: 'Low', status: 'Awaiting Approval' },
  ];

  const approvedTransfers = [
    { id: 'TRF-298', patient: 'Vikram Singh (P-998)', from: 'ER Bay 4', to: 'Ward B - Bed 7', reason: 'ER to ward admission', approvedBy: 'Dr. Rajesh Kumar', approvedAt: '12:00', executedAt: '12:25', duration: '25 min' },
    { id: 'TRF-297', patient: 'Fatima Khan (P-1012)', from: 'OT Recovery', to: 'Ward A - Bed 15', reason: 'Post-op recovery complete', approvedBy: 'Dr. Meena Iyer', approvedAt: '11:30', executedAt: '11:50', duration: '20 min' },
    { id: 'TRF-296', patient: 'Suresh Patel (P-987)', from: 'Ward A - Bed 6', to: 'ICU Bed 1', reason: 'Post-cardiac arrest monitoring', approvedBy: 'Dr. Priya Sharma', approvedAt: '10:15', executedAt: '10:22', duration: '7 min' },
  ];

  const transferHistory = [
    { id: 'TRF-295', patient: 'Neha Gupta (P-1034)', from: 'ICU', to: 'Ward B', date: '2026-03-01', reason: 'Step-down', status: 'Completed', duration: '15 min' },
    { id: 'TRF-294', patient: 'Ravi Joshi (P-1001)', from: 'ER', to: 'OT-1', date: '2026-03-01', reason: 'Emergency surgery', status: 'Completed', duration: '8 min' },
    { id: 'TRF-293', patient: 'Priya Sen (P-978)', from: 'Ward A', to: 'Ward B', date: '2026-03-01', reason: 'Isolation required', status: 'Completed', duration: '30 min' },
    { id: 'TRF-292', patient: 'Amit Verma (P-1056)', from: 'NICU', to: 'Pediatrics', date: '2026-02-28', reason: 'Neonatal discharge', status: 'Completed', duration: '20 min' },
    { id: 'TRF-291', patient: 'Rekha Jain (P-945)', from: 'Ward B', to: 'ICU', date: '2026-02-28', reason: 'Sepsis escalation', status: 'Completed', duration: '5 min' },
  ];

  const availableBeds = [
    { ward: 'ICU', total: 12, occupied: 10, available: 2, beds: ['ICU-5', 'ICU-11'] },
    { ward: 'Ward A', total: 30, occupied: 26, available: 4, beds: ['A-3', 'A-12', 'A-18', 'A-27'] },
    { ward: 'Ward B', total: 25, occupied: 22, available: 3, beds: ['B-7', 'B-14', 'B-23'] },
    { ward: 'Pediatrics', total: 15, occupied: 11, available: 4, beds: ['P-2', 'P-8', 'P-12', 'P-15'] },
    { ward: 'NICU', total: 8, occupied: 6, available: 2, beds: ['N-4', 'N-7'] },
    { ward: 'Maternity', total: 10, occupied: 8, available: 2, beds: ['M-3', 'M-9'] },
  ];

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Bed Transfer Manager</h4>
          <small className="text-muted">Phase 12 -- Transfer requests, approvals, bed availability & history</small>
        </div>
        <Button variant="primary" onClick={() => setShowRequest(true)}>+ New Transfer Request</Button>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{pendingTransfers.length}</h3><small>Pending Approval</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{approvedTransfers.length}</h3><small>Executed Today</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">17</h3><small>Available Beds</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">18 min</h3><small>Avg Transfer Time</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="pending" title={<span>Pending <Badge bg="warning" text="dark">{pendingTransfers.length}</Badge></span>}>
          <Card>
            <Card.Body>
              <Table bordered hover responsive size="sm">
                <thead className="table-warning">
                  <tr><th>ID</th><th>Patient</th><th>From</th><th>To</th><th>Reason</th><th>Requested By</th><th>Priority</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {pendingTransfers.map((t, i) => (
                    <tr key={i}>
                      <td><code>{t.id}</code></td>
                      <td><strong>{t.patient}</strong></td>
                      <td><Badge bg="secondary">{t.from}</Badge></td>
                      <td><Badge bg="primary">{t.to}</Badge></td>
                      <td><small>{t.reason}</small></td>
                      <td><small>{t.requestedBy}</small></td>
                      <td><Badge bg={t.priority === 'Urgent' ? 'danger' : t.priority === 'High' ? 'warning' : 'info'}>{t.priority}</Badge></td>
                      <td><Badge bg="warning" text="dark">{t.status}</Badge></td>
                      <td>
                        <Button size="sm" variant="success" className="me-1">Approve</Button>
                        <Button size="sm" variant="outline-danger">Reject</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="executed" title="Executed Today">
          <Card>
            <Card.Body>
              <Table striped hover responsive>
                <thead className="table-dark">
                  <tr><th>ID</th><th>Patient</th><th>From</th><th>To</th><th>Reason</th><th>Approved By</th><th>Executed At</th><th>Duration</th></tr>
                </thead>
                <tbody>
                  {approvedTransfers.map((t, i) => (
                    <tr key={i}>
                      <td><code>{t.id}</code></td>
                      <td><strong>{t.patient}</strong></td>
                      <td>{t.from}</td>
                      <td>{t.to}</td>
                      <td><small>{t.reason}</small></td>
                      <td><small>{t.approvedBy}</small></td>
                      <td>{t.executedAt}</td>
                      <td><Badge bg="success">{t.duration}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="beds" title="Bed Availability">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Ward</th><th>Total</th><th>Occupied</th><th>Available</th><th>Available Bed IDs</th></tr>
                </thead>
                <tbody>
                  {availableBeds.map((b, i) => (
                    <tr key={i}>
                      <td><strong>{b.ward}</strong></td>
                      <td>{b.total}</td>
                      <td>{b.occupied}</td>
                      <td className="text-success fw-bold">{b.available}</td>
                      <td>{b.beds.map((bed, j) => <Badge key={j} bg="outline-success" className="me-1 border border-success text-success">{bed}</Badge>)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="history" title="Transfer History">
          <Card>
            <Card.Body>
              <Table striped hover responsive>
                <thead className="table-dark">
                  <tr><th>ID</th><th>Patient</th><th>From</th><th>To</th><th>Date</th><th>Reason</th><th>Duration</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {transferHistory.map((h, i) => (
                    <tr key={i}>
                      <td><code>{h.id}</code></td>
                      <td><strong>{h.patient}</strong></td>
                      <td>{h.from}</td>
                      <td>{h.to}</td>
                      <td><small>{h.date}</small></td>
                      <td><small>{h.reason}</small></td>
                      <td>{h.duration}</td>
                      <td><Badge bg="success">{h.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      <Modal show={showRequest} onHide={() => setShowRequest(false)} centered size="lg">
        <Modal.Header closeButton><Modal.Title>New Transfer Request</Modal.Title></Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3"><Form.Label>Patient</Form.Label><Form.Control type="text" placeholder="Search patient..." /></Form.Group>
              <Form.Group className="mb-3"><Form.Label>From (Current Bed)</Form.Label><Form.Control type="text" disabled value="Auto-populated from patient" /></Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3"><Form.Label>To (Target Ward)</Form.Label><Form.Select><option>ICU</option><option>Ward A</option><option>Ward B</option><option>Pediatrics</option><option>NICU</option><option>Maternity</option></Form.Select></Form.Group>
              <Form.Group className="mb-3"><Form.Label>Target Bed</Form.Label><Form.Select><option>Auto-assign best available</option></Form.Select></Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-3"><Form.Label>Priority</Form.Label><Form.Select><option>Urgent</option><option>High</option><option>Normal</option><option>Low</option></Form.Select></Form.Group>
          <Form.Group className="mb-3"><Form.Label>Transfer Reason</Form.Label><Form.Control as="textarea" rows={2} placeholder="Clinical justification for transfer..." /></Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRequest(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => setShowRequest(false)}>Submit Request</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default BedTransferManager;
