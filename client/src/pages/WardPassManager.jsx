import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import api from '../utils/axiosInstance';

const emptyPass = { patient_id: '', pass_type: 'Short leave', purpose: '', escort_name: '', valid_until: '' };

const WardPassManager = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [showNew, setShowNew] = useState(false);
  const [activePasses, setActivePasses] = useState([]);
  const [returnedPasses, setReturnedPasses] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [form, setForm] = useState(emptyPass);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/ward-pass/passes');
      const all = res.data.data || res.data.passes || [];
      setActivePasses(all.filter(p => p.status === 'Active'));
      setReturnedPasses(all.filter(p => p.status !== 'Active'));
    } catch (err) {
      console.error('[WardPassManager] pass load failed:', err.message);
      setActivePasses([]);
      setReturnedPasses([]);
      setError('Could not load ward passes.');
    }
  }, []);

  useEffect(() => {
    load();
    (async () => {
      try {
        const res = await api.get('/api/admissions?status=Admitted');
        setAdmissions(res.data?.data || res.data || []);
      } catch (err) {
        console.error('[WardPassManager] admission load failed:', err.message);
        setAdmissions([]);
      }
    })();
  }, [load]);

  const handleIssue = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.post('/api/ward-pass/passes', form);
      setShowNew(false);
      setForm(emptyPass);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not issue the ward pass.');
    } finally {
      setBusy(false);
    }
  };

  const markReturned = async (pass) => {
    setBusy(true);
    setError('');
    try {
      await api.patch(`/api/ward-pass/passes/${pass.id}/return`, { return_vitals: 'Returned to ward — vitals checked by nursing' });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not mark the pass returned.');
    } finally {
      setBusy(false);
    }
  };

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
        <Button variant="primary" onClick={() => { setError(''); setShowNew(true); }}>+ Issue Ward Pass</Button>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

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
                    <td><strong>{p.patient_name || p.patient_id}</strong></td>
                    <td><Badge bg="secondary">{p.pass_type}</Badge></td>
                    <td><Badge bg="info">{p.pass_type}</Badge></td>
                    <td><small>{p.purpose || '—'}</small></td>
                    <td><small>{p.escort_name || '—'}</small></td>
                    <td className="text-danger fw-bold">{p.valid_until ? String(p.valid_until).slice(0, 16).replace('T', ' ') : '—'}</td>
                    <td><small>{p.return_vitals || 'Awaiting return'}</small></td>
                    <td><Button size="sm" variant="success" disabled={busy} onClick={() => markReturned(p)}>Mark Returned</Button></td>
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
        <Form onSubmit={handleIssue}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Admitted Patient</Form.Label>
              <Form.Select
                value={form.patient_id}
                onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                required
              >
                <option value="">Select an admitted patient</option>
                {admissions.map(a => (
                  <option key={a.id} value={a.patient_id}>
                    {a.patient_name || a.patient_uhid || `Patient ${a.patient_id}`} — {a.ward || 'Ward'} {a.bed_number || ''}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Pass Type</Form.Label>
                  <Form.Select value={form.pass_type} onChange={(e) => setForm({ ...form, pass_type: e.target.value })}>
                    <option value="Short leave">Short Leave (4h)</option>
                    <option value="Day pass">Day Pass (8h)</option>
                    <option value="Overnight pass">Overnight (14h)</option>
                    <option value="Extended leave">Extended (48h)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Valid Until</Form.Label>
                  <Form.Control type="datetime-local" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} required />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Escort Name</Form.Label>
                  <Form.Control value={form.escort_name} onChange={(e) => setForm({ ...form, escort_name: e.target.value })} placeholder="Name & relationship" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Reason / Conditions</Form.Label>
                  <Form.Control value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="Reason for leave, medications, restrictions" />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? <Spinner animation="border" size="sm" /> : 'Issue Pass'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default WardPassManager;
