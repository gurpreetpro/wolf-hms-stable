import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import api from '../utils/axiosInstance';

const emptyForm = { patient_id: '', icd10_code: '', description: '', onset_date: '', notes: '' };

const ProblemListManager = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [problems, setProblems] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [summary, setSummary] = useState({ active: 0, resolved: 0, patients: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/patient-problems');
      const all = res.data.data || res.data.problems || [];
      setProblems(all);
      setSummary({
        active: all.filter(r => r.status === 'Active').length,
        resolved: all.filter(r => r.status !== 'Active').length,
        patients: new Set(all.map(r => r.patient_id)).size,
      });
    } catch (err) {
      console.error('[ProblemListManager] problem load failed:', err.message);
      setProblems([]);
      setSummary({ active: 0, resolved: 0, patients: 0 });
      setError('Could not load the problem list.');
    }
  }, []);

  useEffect(() => {
    load();
    (async () => {
      try {
        const res = await api.get('/api/admissions?status=Admitted');
        setAdmissions(res.data?.data || res.data || []);
      } catch (err) {
        console.error('[ProblemListManager] admission load failed:', err.message);
        setAdmissions([]);
      }
    })();
  }, [load]);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setError(''); setShowAdd(true); };

  const openEdit = (problem) => {
    setEditing(problem);
    setForm({
      patient_id: problem.patient_id || '',
      icd10_code: problem.icd10_code || '',
      description: problem.description || '',
      onset_date: problem.onset_date ? String(problem.onset_date).slice(0, 10) : '',
      notes: problem.notes || '',
    });
    setError('');
    setShowAdd(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (editing) {
        await api.put(`/api/patient-problems/${editing.id}`, form);
      } else {
        await api.post('/api/patient-problems', form);
      }
      setShowAdd(false);
      setEditing(null);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not save the problem.');
    } finally {
      setBusy(false);
    }
  };

  const resolveProblem = async (problem) => {
    setBusy(true);
    setError('');
    try {
      await api.patch(`/api/patient-problems/${problem.id}/resolve`, {});
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not resolve the problem.');
    } finally {
      setBusy(false);
    }
  };

  const activeProblems = problems.filter(p => p.status === 'Active');
  const resolvedProblems = problems.filter(p => p.status !== 'Active');
  const grouped = activeProblems.reduce((acc, p) => {
    const key = p.patient_name || p.patient_id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Problem List Manager</h4>
          <small className="text-muted">ICD-10 coded problem lists, onset tracking, resolution documentation</small>
        </div>
        <Button variant="primary" onClick={openAdd}>+ Add Problem</Button>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}

      <Row className="mb-3">
        <Col><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">{summary.active}</h3><small>Active Problems</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{summary.resolved}</h3><small>Resolved</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{summary.patients}</h3><small>Patients Tracked</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="active" title={<span>Active Problems <Badge bg="danger">{summary.active}</Badge></span>}>
          {Object.keys(grouped).length === 0 && (
            <Alert variant="light" className="border">No active problems recorded. Use <strong>+ Add Problem</strong> to code the first diagnosis.</Alert>
          )}
          {Object.entries(grouped).map(([patient, rows]) => (
            <Card key={patient} className="mb-3">
              <Card.Header className="bg-dark text-white"><strong>{patient}</strong> — {rows.length} active problem(s)</Card.Header>
              <Card.Body>
                <Table bordered hover responsive size="sm">
                  <thead className="table-light">
                    <tr><th>ICD-10</th><th>Problem</th><th>Onset</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((prob) => (
                      <tr key={prob.id}>
                        <td><code>{prob.icd10_code || '—'}</code></td>
                        <td><strong>{prob.description}</strong></td>
                        <td><small>{prob.onset_date ? String(prob.onset_date).slice(0, 10) : '—'}</small></td>
                        <td><Badge bg="danger">{prob.status}</Badge></td>
                        <td>
                          <Button size="sm" variant="outline-success" className="me-1" disabled={busy} onClick={() => resolveProblem(prob)}>Resolve</Button>
                          <Button size="sm" variant="outline-secondary" disabled={busy} onClick={() => openEdit(prob)}>Edit</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          ))}
        </Tab>

        <Tab eventKey="resolved" title="Resolved">
          <Card><Card.Body>
            <Table striped hover responsive>
              <thead className="table-dark">
                <tr><th>Patient</th><th>ICD-10</th><th>Problem</th><th>Onset</th><th>Resolved</th></tr>
              </thead>
              <tbody>
                {resolvedProblems.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-muted py-4">No resolved problems yet.</td></tr>
                )}
                {resolvedProblems.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.patient_name || r.patient_id}</strong></td>
                    <td><code>{r.icd10_code || '—'}</code></td>
                    <td>{r.description}</td>
                    <td><small>{r.onset_date ? String(r.onset_date).slice(0, 10) : '—'}</small></td>
                    <td><small>{r.resolved_date ? String(r.resolved_date).slice(0, 10) : '—'}</small></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>
      </Tabs>

      <Modal show={showAdd} onHide={() => setShowAdd(false)} centered>
        <Modal.Header closeButton><Modal.Title>{editing ? 'Edit Problem' : 'Add Problem'}</Modal.Title></Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Admitted Patient</Form.Label>
              <Form.Select
                value={form.patient_id}
                onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
                disabled={!!editing}
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
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>ICD-10</Form.Label>
                  <Form.Control value={form.icd10_code} onChange={(e) => setForm({ ...form, icd10_code: e.target.value })} placeholder="e.g. I10" />
                </Form.Group>
              </Col>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Problem / Diagnosis</Form.Label>
                  <Form.Control value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Onset Date</Form.Label>
                  <Form.Control type="date" value={form.onset_date} onChange={(e) => setForm({ ...form, onset_date: e.target.value })} />
                </Form.Group>
              </Col>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Notes</Form.Label>
                  <Form.Control value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? <Spinner animation="border" size="sm" /> : (editing ? 'Save Changes' : 'Add Problem')}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ProblemListManager;
