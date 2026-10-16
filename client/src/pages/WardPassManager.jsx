import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, Modal, Form } from 'react-bootstrap';
import api from '../utils/axiosInstance';

const WardPassManager = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [showNew, setShowNew] = useState(false);
  const [activePasses, setActivePasses] = useState([]);
  const [returnedPasses, setReturnedPasses] = useState([]);

  // Live ward passes (replaces the previously hardcoded pass rows)
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/ward-pass/passes');
        const all = res.data.data || res.data.passes || [];
        setActivePasses(all.filter(p => p.status === 'Active'));
        setReturnedPasses(all.filter(p => p.status !== 'Active'));
      } catch (err) {
        console.error('[WardPassManager] pass load failed:', err.message);
        setActivePasses([]);
        setReturnedPasses([]);
      }
    })();
  }, []);

  const totalPasses = activePasses.length + returnedPasses.length;

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
          <small className="text-muted">Temporary leave passes, escort tracking, return vitals, policies</small>
        </div>
        <Button variant="primary" onClick={() => setShowNew(true)}>+ Issue Ward Pass</Button>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{activePasses.length}</h3><small>Currently Out</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{returnedPasses.length}</h3><small>Returned (7d)</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{totalPasses > 0 ? `${Math.round((returnedPasses.length / totalPasses) * 100)}%` : '—'}</h3><small>On-Time Return Rate</small></Card.Body></Card></Col>
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
