import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, Modal, Form } from 'react-bootstrap';

const SpecialistReferralManager = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [showRefer, setShowRefer] = useState(false);

  const pendingReferrals = [
    { id: 'REF-501', patient: 'Ramesh Gupta (P-1045)', from: 'Dr. Priya Sharma (Gen Medicine)', to: 'Dr. Amit Verma (Cardiology)', reason: 'Persistent arrhythmia, needs EP study evaluation', priority: 'Urgent', requested: '15:30', status: 'Pending Acceptance' },
    { id: 'REF-502', patient: 'Meena Devi (P-1078)', from: 'Dr. Rajesh Kumar (OB/GYN)', to: 'Dr. Sunita Iyer (Neonatology)', reason: 'High-risk pregnancy — preterm labor signs at 32 weeks', priority: 'Urgent', requested: '14:45', status: 'Pending Acceptance' },
    { id: 'REF-503', patient: 'Anil Mehta (P-1067)', from: 'Dr. Suresh Patel (Gen Surgery)', to: 'Dr. Rao (Gastroenterology)', reason: 'Pre-op endoscopy for suspected duodenal ulcer', priority: 'High', requested: '13:20', status: 'Scheduling' },
    { id: 'REF-504', patient: 'Fatima Khan (P-1012)', from: 'Dr. Kavita (ER)', to: 'Dr. Mohan (Orthopedics)', reason: 'Comminuted fracture right tibia — needs surgical fixation', priority: 'High', requested: '12:00', status: 'Accepted' },
  ];

  const completedReferrals = [
    { id: 'REF-498', patient: 'Vikram Singh (P-998)', from: 'ER', to: 'Cardiology', reason: 'STEMI evaluation', outcome: 'PTCA + Stenting done', duration: '2 days', satisfaction: '5/5' },
    { id: 'REF-497', patient: 'Priya Sen (P-978)', from: 'Gen Medicine', to: 'Pulmonology', reason: 'Chronic cough 6 weeks', outcome: 'TB ruled out, Asthma diagnosed', duration: '3 days', satisfaction: '4/5' },
    { id: 'REF-496', patient: 'Rekha Jain (P-945)', from: 'OB/GYN', to: 'Anesthesiology', reason: 'Pre-anesthetic checkup for LSCS', outcome: 'Cleared for spinal anesthesia', duration: '1 day', satisfaction: '5/5' },
    { id: 'REF-495', patient: 'Suresh Patel (P-987)', from: 'Gen Medicine', to: 'Nephrology', reason: 'Elevated creatinine (3.2)', outcome: 'CKD Stage 3 — dialysis not yet needed', duration: '4 days', satisfaction: '4/5' },
  ];

  const specialists = [
    { name: 'Dr. Amit Verma', dept: 'Cardiology', specialization: 'Interventional', queue: 2, avgWait: '1.5 hrs', availability: 'Available', rating: '4.8/5' },
    { name: 'Dr. Sunita Iyer', dept: 'Neonatology', specialization: 'NICU', queue: 1, avgWait: '30 min', availability: 'Available', rating: '4.9/5' },
    { name: 'Dr. Rao', dept: 'Gastroenterology', specialization: 'Endoscopy', queue: 3, avgWait: '2 hrs', availability: 'In Procedure', rating: '4.7/5' },
    { name: 'Dr. Mohan', dept: 'Orthopedics', specialization: 'Trauma', queue: 0, avgWait: '15 min', availability: 'Available', rating: '4.6/5' },
    { name: 'Dr. Neha Gupta', dept: 'Neurology', specialization: 'Stroke', queue: 1, avgWait: '45 min', availability: 'Available', rating: '4.8/5' },
    { name: 'Dr. Ravi Joshi', dept: 'Oncology', specialization: 'Medical Oncology', queue: 4, avgWait: '3 hrs', availability: 'Busy', rating: '4.9/5' },
    { name: 'Dr. Meena Iyer', dept: 'Anesthesiology', specialization: 'PAC', queue: 2, avgWait: '1 hr', availability: 'Available', rating: '4.5/5' },
    { name: 'Dr. Sanjay', dept: 'ENT', specialization: 'Head & Neck Surgery', queue: 0, avgWait: '20 min', availability: 'Available', rating: '4.7/5' },
  ];

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Specialist Referral Manager</h4>
          <small className="text-muted">Phase 13 -- Referral requests, specialist availability, scheduling & outcomes</small>
        </div>
        <Button variant="primary" onClick={() => setShowRefer(true)}>+ New Referral</Button>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{pendingReferrals.length}</h3><small>Pending Referrals</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{completedReferrals.length}</h3><small>Completed Today</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{specialists.length}</h3><small>Specialists Online</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">1.2 hrs</h3><small>Avg Response Time</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="pending" title={<span>Pending <Badge bg="warning" text="dark">{pendingReferrals.length}</Badge></span>}>
          <Card><Card.Body>
            <Table bordered hover responsive size="sm">
              <thead className="table-warning">
                <tr><th>ID</th><th>Patient</th><th>From</th><th>To</th><th>Reason</th><th>Priority</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {pendingReferrals.map((r) => (
                  <tr key={r.id}>
                    <td><code>{r.id}</code></td>
                    <td><strong>{r.patient}</strong></td>
                    <td><small>{r.from}</small></td>
                    <td><Badge bg="info">{r.to}</Badge></td>
                    <td><small>{r.reason}</small></td>
                    <td><Badge bg={r.priority === 'Urgent' ? 'danger' : 'warning'}>{r.priority}</Badge></td>
                    <td><Badge bg={r.status === 'Accepted' ? 'success' : r.status === 'Scheduling' ? 'info' : 'secondary'}>{r.status}</Badge></td>
                    <td><Button size="sm" variant="outline-primary">Schedule</Button></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>

        <Tab eventKey="completed" title="Completed">
          <Card><Card.Body>
            <Table striped hover responsive>
              <thead className="table-dark">
                <tr><th>ID</th><th>Patient</th><th>From → To</th><th>Reason</th><th>Outcome</th><th>Duration</th><th>Rating</th></tr>
              </thead>
              <tbody>
                {completedReferrals.map((r) => (
                  <tr key={r.id}>
                    <td><code>{r.id}</code></td>
                    <td><strong>{r.patient}</strong></td>
                    <td><small>{r.from} → {r.to}</small></td>
                    <td><small>{r.reason}</small></td>
                    <td><Badge bg="success">{r.outcome}</Badge></td>
                    <td>{r.duration}</td>
                    <td><Badge bg="primary">{r.satisfaction}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>

        <Tab eventKey="specialists" title="Specialist Directory">
          <Card><Card.Body>
            <Table bordered hover responsive>
              <thead className="table-dark">
                <tr><th>Specialist</th><th>Department</th><th>Specialization</th><th>Queue</th><th>Avg Wait</th><th>Availability</th><th>Rating</th></tr>
              </thead>
              <tbody>
                {specialists.map((s) => (
                  <tr key={s.name}>
                    <td><strong>{s.name}</strong></td>
                    <td>{s.dept}</td>
                    <td><small>{s.specialization}</small></td>
                    <td className="text-center"><Badge bg={s.queue === 0 ? 'success' : s.queue <= 2 ? 'warning' : 'danger'}>{s.queue}</Badge></td>
                    <td>{s.avgWait}</td>
                    <td><Badge bg={s.availability === 'Available' ? 'success' : s.availability === 'In Procedure' ? 'info' : 'danger'}>{s.availability}</Badge></td>
                    <td>{s.rating}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>
      </Tabs>

      <Modal show={showRefer} onHide={() => setShowRefer(false)} centered size="lg">
        <Modal.Header closeButton><Modal.Title>New Specialist Referral</Modal.Title></Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3"><Form.Label>Patient</Form.Label><Form.Control placeholder="Search patient..." /></Form.Group>
              <Form.Group className="mb-3"><Form.Label>Referring Doctor</Form.Label><Form.Control disabled value="Auto: Current logged-in doctor" /></Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3"><Form.Label>Specialist Department</Form.Label><Form.Select><option>Cardiology</option><option>Neurology</option><option>Orthopedics</option><option>Gastroenterology</option><option>Oncology</option><option>Pulmonology</option><option>ENT</option><option>Anesthesiology</option></Form.Select></Form.Group>
              <Form.Group className="mb-3"><Form.Label>Specific Specialist</Form.Label><Form.Select><option>Auto-assign (next available)</option></Form.Select></Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-3"><Form.Label>Priority</Form.Label><Form.Select><option>Urgent</option><option>High</option><option>Normal</option></Form.Select></Form.Group>
          <Form.Group className="mb-3"><Form.Label>Clinical Reason</Form.Label><Form.Control as="textarea" rows={2} placeholder="Clinical justification..." /></Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRefer(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => setShowRefer(false)}>Submit Referral</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default SpecialistReferralManager;
