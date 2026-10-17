import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Modal, Tabs, Tab, Alert, Spinner } from 'react-bootstrap';
import api from '../utils/axiosInstance';

const emptyQuery = { admission_id: '', patient_id: '', patient_name: '', query_type: 'Documentation', query_text: '', severity: 'Medium' };

const CDIDashboard = () => {
  const [activeTab, setActiveTab] = useState('queries');
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [queries, setQueries] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [form, setForm] = useState(emptyQuery);
  const [responding, setResponding] = useState(null);
  const [response, setResponse] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/cdi/queries');
      setQueries(res.data.data || res.data.queries || []);
    } catch (err) {
      console.error('[CDI] load failed:', err.message);
      setQueries([]);
      setMessage('Could not load CDI queries.');
    }
  }, []);

  useEffect(() => {
    load();
    (async () => {
      try {
        const res = await api.get('/api/admissions?status=Admitted');
        setAdmissions(res.data?.data || res.data || []);
      } catch (err) {
        console.error('[CDI] admission load failed:', err.message);
        setAdmissions([]);
      }
    })();
  }, [load]);

  const submitQuery = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/api/cdi/queries', form);
      setShowQueryModal(false);
      setForm(emptyQuery);
      await load();
      setMessage('CDI query raised to the attending physician.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not raise the query.');
    } finally {
      setBusy(false);
    }
  };

  const submitResponse = async (e) => {
    e.preventDefault();
    if (!responding) return;
    setBusy(true);
    try {
      await api.patch(`/api/cdi/queries/${responding.id}/respond`, { physician_response: response });
      setResponding(null);
      setResponse('');
      await load();
      setMessage('Physician response recorded.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not record the response.');
    } finally {
      setBusy(false);
    }
  };

  const statusColor = (s) => s === 'Open' ? 'warning' : s === 'Responded' ? 'success' : 'secondary';
  const open = queries.filter(q => q.status === 'Open');
  const responded = queries.filter(q => q.status === 'Responded');
  const high = queries.filter(q => q.severity === 'High');
  const responseRate = queries.length ? Math.round((responded.length / queries.length) * 100) : 0;
  const ageDays = (d) => (d ? Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000)) : 0);

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">📋 Clinical Documentation Improvement (CDI)</h4>
          <small className="text-muted">Documentation gap analysis, physician queries and coding capture</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary" onClick={() => { setMessage(''); setShowQueryModal(true); }}>➕ New Query</Button>
          <Button variant="outline-info" onClick={() => setActiveTab('metrics')}>📊 Metrics</Button>
        </div>
      </div>

      {message && <Alert variant="info" dismissible onClose={() => setMessage('')}>{message}</Alert>}

      <Row className="mb-3">
        <Col md={3}><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{open.length}</h3><small>Open Queries</small></Card.Body></Card></Col>
        <Col md={3}><Card className="text-center border-info"><Card.Body><h3 className="text-info">{responseRate}%</h3><small>Response Rate</small></Card.Body></Card></Col>
        <Col md={3}><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">{high.length}</h3><small>High Severity</small></Card.Body></Card></Col>
        <Col md={3}><Card className="text-center border-success"><Card.Body><h3 className="text-success">{queries.length}</h3><small>Total Queries</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="queries" title="📝 CDI Queries">
          <Card><Card.Body>
            <Table striped hover responsive size="sm">
              <thead className="table-dark">
                <tr><th>ID</th><th>Patient</th><th>Query</th><th>Type</th><th>Priority</th><th>Status</th><th>Age</th><th>Response</th><th>Action</th></tr>
              </thead>
              <tbody>
                {queries.length === 0 && (
                  <tr><td colSpan={9} className="text-center text-muted py-4">No CDI queries recorded. Use <strong>➕ New Query</strong>.</td></tr>
                )}
                {queries.map(q => (
                  <tr key={q.id}>
                    <td><strong>{q.id}</strong></td>
                    <td>{q.patient_name || q.patient_id}<br/><small className="text-muted">{q.query_type}</small></td>
                    <td style={{ maxWidth: 320 }}>{q.query_text}</td>
                    <td><Badge bg="secondary">{q.query_type}</Badge></td>
                    <td><Badge bg={q.severity === 'High' ? 'danger' : q.severity === 'Medium' ? 'warning' : 'secondary'}>{q.severity}</Badge></td>
                    <td><Badge bg={statusColor(q.status)}>{q.status}</Badge></td>
                    <td>{ageDays(q.created_at)}d</td>
                    <td><small>{q.physician_response || '—'}</small></td>
                    <td>
                      {q.status === 'Open'
                        ? <Button size="sm" variant="outline-primary" onClick={() => { setResponding(q); setResponse(''); }}>Record Response</Button>
                        : <Badge bg="success">Closed</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>

        <Tab eventKey="metrics" title="📊 Coding Metrics">
          <Card><Card.Body>
            <Row className="text-center">
              <Col md={4}><h2 className="text-primary">{queries.length}</h2><small>Queries Raised</small></Col>
              <Col md={4}><h2 className="text-success">{responseRate}%</h2><small>Physician Response Rate</small></Col>
              <Col md={4}><h2 className="text-warning">{high.length}</h2><small>High-severity Open</small></Col>
            </Row>
            <hr />
            <p className="text-muted small mb-0">
              Figures are computed from the live cdi_queries table for this hospital. Case-mix index and CC/MCC capture require the
              coding module and are not fabricated here.
            </p>
          </Card.Body></Card>
        </Tab>
      </Tabs>


      <Modal show={showQueryModal} onHide={() => setShowQueryModal(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>➕ New CDI Query</Modal.Title></Modal.Header>
        <Form onSubmit={submitQuery}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Admitted Patient</Form.Label>
              <Form.Select
                value={form.admission_id}
                onChange={(e) => {
                  const a = admissions.find(x => String(x.id) === e.target.value);
                  setForm({ ...form, admission_id: e.target.value, patient_id: a?.patient_id || '', patient_name: a?.patient_name || '' });
                }}
                required
              >
                <option value="">Select Patient...</option>
                {admissions.map(a => (
                  <option key={a.id} value={a.id}>{a.patient_name || a.patient_uhid || `Patient ${a.patient_id}`}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Query Type</Form.Label>
                  <Form.Select value={form.query_type} onChange={(e) => setForm({ ...form, query_type: e.target.value })}>
                    <option>Documentation</option><option>Clarification</option><option>Specificity</option><option>Capture</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Priority</Form.Label>
                  <Form.Select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
                    <option>High</option><option>Medium</option><option>Low</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Query Description</Form.Label>
              <Form.Control as="textarea" rows={3} value={form.query_text} onChange={(e) => setForm({ ...form, query_text: e.target.value })} placeholder="Describe the clinical documentation gap..." required />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowQueryModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={busy}>{busy ? <Spinner animation="border" size="sm" /> : 'Submit Query'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={!!responding} onHide={() => setResponding(null)} centered>
        <Modal.Header closeButton><Modal.Title>Physician Response</Modal.Title></Modal.Header>
        <Form onSubmit={submitResponse}>
          <Modal.Body>
            <p className="small text-muted">Query #{responding?.id} — {responding?.patient_name}</p>
            <Form.Group>
              <Form.Label>Response</Form.Label>
              <Form.Control as="textarea" rows={3} value={response} onChange={(e) => setResponse(e.target.value)} required />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setResponding(null)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={busy}>Save Response</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default CDIDashboard;

