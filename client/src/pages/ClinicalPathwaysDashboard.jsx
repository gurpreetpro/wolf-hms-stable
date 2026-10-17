import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Modal, Tabs, Tab, ProgressBar, Alert } from 'react-bootstrap';
import { GitBranch, CheckCircle, Clock, AlertTriangle, Plus, FileText } from 'lucide-react';
import api from '../utils/axiosInstance';

export default function ClinicalPathwaysDashboard() {
  const [pathways, setPathways] = useState([]);
  const [activePatients, setActivePatients] = useState([]);
  const [showEnroll, setShowEnroll] = useState(false);
  const [form, setForm] = useState({ name: '', condition: '', pathway_code: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    try {
      const res = await api.get('/api/clinical-pathways');
      setPathways(res.data.pathways || res.data.data || []);
      setActivePatients(res.data.patients || []);
    } catch (err) {
      console.error('[ClinicalPathways] load failed:', err.message);
      setPathways([]);
      setActivePatients([]);
      setMessage('Could not load clinical pathways.');
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleEnroll = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/api/clinical-pathways', form);
      setShowEnroll(false);
      setForm({ name: '', condition: '', pathway_code: '' });
      await fetchData();
      setMessage('Clinical pathway saved. It is now available for enrolment.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not save the pathway.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container fluid className="p-4">
      {message && <Alert variant="info" dismissible onClose={() => setMessage('')}>{message}</Alert>}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1"><GitBranch className="me-2 text-primary" />Clinical Pathways</h2>
          <p className="text-muted">Standardized Care Protocols & Progress Tracking</p>
        </div>
        <Button variant="primary" onClick={() => { setMessage(''); setShowEnroll(true); }}>
          <Plus size={16} className="me-1" /> Enroll Pathway
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={3}><Card className="border-0 bg-primary bg-opacity-10 text-center p-3"><h3 className="fw-bold text-primary">{pathways.length}</h3><small className="text-muted">Active Pathways</small></Card></Col>
        <Col md={3}><Card className="border-0 bg-success bg-opacity-10 text-center p-3"><h3 className="fw-bold text-success">{activePatients.length}</h3><small className="text-muted">Patients on Pathway</small></Card></Col>
        <Col md={3}><Card className="border-0 bg-info bg-opacity-10 text-center p-3"><h3 className="fw-bold text-info">{pathways.length > 0 ? Math.round(pathways.reduce((s,p) => s+p.compliance, 0) / pathways.length) : 0}%</h3><small className="text-muted">Avg Compliance</small></Card></Col>
        <Col md={3}><Card className="border-0 bg-warning bg-opacity-10 text-center p-3"><h3 className="fw-bold text-warning">{activePatients.filter(p => p.status === 'Delayed').length}</h3><small className="text-muted">Delayed</small></Card></Col>
      </Row>

      <Tabs defaultActiveKey="active" className="mb-3">
        <Tab eventKey="active" title="🏥 Active Patient Pathways">
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Table bordered hover responsive size="sm" className="align-middle">
                <thead className="bg-light">
                  <tr><th>Patient</th><th>Pathway</th><th>Current Step</th><th>Progress</th><th>Doctor</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {activePatients.map(p => (
                    <tr key={p.id} className={p.status === 'Delayed' ? 'table-warning' : ''}>
                      <td className="fw-bold">{p.patient}</td>
                      <td><Badge bg="light" text="dark">{p.pathway}</Badge></td>
                      <td><small>{p.currentStep}</small></td>
                      <td style={{ width: 150 }}>
                        <ProgressBar now={p.progress} variant={p.status === 'Delayed' ? 'warning' : 'success'} style={{ height: 10 }} />
                        <small className="text-muted">{p.progress}%</small>
                      </td>
                      <td>{p.doctor}</td>
                      <td><Badge bg={p.status === 'On Track' ? 'success' : 'warning'}>{p.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="library" title="📚 Pathway Library">
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white fw-bold">Standardized Clinical Pathways</Card.Header>
            <Card.Body>
              <Table bordered hover size="sm" className="align-middle">
                <thead className="bg-light">
                  <tr><th>Pathway Name</th><th>Category</th><th>Steps</th><th>Avg LOS</th><th>Active Patients</th><th>Compliance</th></tr>
                </thead>
                <tbody>
                  {pathways.map(p => (
                    <tr key={p.id}>
                      <td className="fw-bold">{p.name}</td>
                      <td><Badge bg="light" text="dark">{p.category}</Badge></td>
                      <td>{p.steps}</td>
                      <td>{p.avgLOS} days</td>
                      <td><Badge bg="primary">{p.active}</Badge></td>
                      <td>
                        <ProgressBar now={p.compliance} variant={p.compliance >= 90 ? 'success' : p.compliance >= 80 ? 'warning' : 'danger'} style={{ height: 10 }} />
                        <small>{p.compliance}%</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      <Modal show={showEnroll} onHide={() => setShowEnroll(false)} centered>
        <Modal.Header closeButton><Modal.Title>Enroll Clinical Pathway</Modal.Title></Modal.Header>
        <Form onSubmit={handleEnroll}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Pathway Name</Form.Label>
              <Form.Control value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Pathway Code</Form.Label>
                  <Form.Control value={form.pathway_code} onChange={(e) => setForm({ ...form, pathway_code: e.target.value })} placeholder="e.g. PW-AKI-01" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Condition</Form.Label>
                  <Form.Control value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} placeholder="e.g. Acute Kidney Injury" />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEnroll(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save Pathway'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
