import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import api from '../utils/axiosInstance';

const emptyTransfer = { patient_id: '', admission_id: '', patient_name: '', from_ward: '', from_bed: '', to_ward: 'ICU Main', to_bed: '', reason: '' };

const BedTransferManager = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [showRequest, setShowRequest] = useState(false);
  const [transfers, setTransfers] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [form, setForm] = useState(emptyTransfer);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/bed-transfers');
      setTransfers(res.data.data || res.data.transfers || []);
    } catch (err) {
      console.error('[BedTransfer] load failed:', err.message);
      setTransfers([]);
      setMessage('Could not load bed transfers.');
    }
  }, []);

  useEffect(() => {
    load();
    (async () => {
      try {
        const res = await api.get('/api/admissions?status=Admitted');
        setAdmissions(res.data?.data || res.data || []);
      } catch (err) {
        console.error('[BedTransfer] admission load failed:', err.message);
        setAdmissions([]);
      }
    })();
  }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/api/bed-transfers', form);
      setShowRequest(false);
      setForm(emptyTransfer);
      await load();
      setMessage('Transfer request submitted for approval.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not submit the transfer request.');
    } finally {
      setBusy(false);
    }
  };

  const decide = async (transfer, status) => {
    setBusy(true);
    try {
      await api.patch(`/api/bed-transfers/${transfer.id}/status`, { status });
      await load();
      setMessage(`Transfer #${transfer.id} ${status.toLowerCase()}.`);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not update the transfer.');
    } finally {
      setBusy(false);
    }
  };

  const pendingTransfers = transfers.filter(t => t.status === 'Requested');
  const approvedTransfers = transfers.filter(t => t.status === 'Approved');
  const history = transfers.filter(t => t.status !== 'Requested');
  const fmt = (v) => (v ? String(v).slice(0, 16).replace('T', ' ') : '—');

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Bed Transfer Manager</h4>
          <small className="text-muted">Transfer requests, approvals and history</small>
        </div>
        <Button variant="primary" onClick={() => { setMessage(''); setShowRequest(true); }}>+ New Transfer Request</Button>
      </div>

      {message && <Alert variant="info" dismissible onClose={() => setMessage('')}>{message}</Alert>}

      <Row className="mb-3">
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{pendingTransfers.length}</h3><small>Pending Approval</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{approvedTransfers.length}</h3><small>Approved</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{admissions.length}</h3><small>Admitted Patients</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">{transfers.length}</h3><small>Total Transfers</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="pending" title={<span>Pending <Badge bg="warning" text="dark">{pendingTransfers.length}</Badge></span>}>
          <Card><Card.Body>
            <Table bordered hover responsive size="sm">
              <thead className="table-warning">
                <tr><th>ID</th><th>Patient</th><th>From</th><th>To</th><th>Reason</th><th>Requested</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {pendingTransfers.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted py-4">No pending transfer requests.</td></tr>
                )}
                {pendingTransfers.map((t) => (
                  <tr key={t.id}>
                    <td><code>{t.id}</code></td>
                    <td><strong>{t.patient_name || t.patient_id || '—'}</strong></td>
                    <td><Badge bg="secondary">{t.from_ward || '—'} {t.from_bed || ''}</Badge></td>
                    <td><Badge bg="primary">{t.to_ward} {t.to_bed || ''}</Badge></td>
                    <td><small>{t.reason || '—'}</small></td>
                    <td><small>{fmt(t.created_at)}</small></td>
                    <td><Badge bg="warning" text="dark">{t.status}</Badge></td>
                    <td>
                      <Button size="sm" variant="success" className="me-1" disabled={busy} onClick={() => decide(t, 'Approved')}>Approve</Button>
                      <Button size="sm" variant="outline-danger" disabled={busy} onClick={() => decide(t, 'Rejected')}>Reject</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>

        <Tab eventKey="approved" title="Approved">
          <Card><Card.Body>
            <Table bordered hover responsive size="sm">
              <thead className="table-success">
                <tr><th>ID</th><th>Patient</th><th>From</th><th>To</th><th>Decided</th><th>Status</th></tr>
              </thead>
              <tbody>
                {approvedTransfers.length === 0 && (
                  <tr><td colSpan={6} className="text-center text-muted py-4">No approved transfers awaiting execution.</td></tr>
                )}
                {approvedTransfers.map(t => (
                  <tr key={t.id}>
                    <td><code>{t.id}</code></td>
                    <td>{t.patient_name || t.patient_id}</td>
                    <td>{t.from_ward} {t.from_bed}</td>
                    <td>{t.to_ward} {t.to_bed}</td>
                    <td><small>{fmt(t.decided_at)}</small></td>
                    <td><Badge bg="success">{t.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>

        <Tab eventKey="history" title="Transfer History">
          <Card><Card.Body>
            <Table striped hover responsive>
              <thead className="table-dark">
                <tr><th>ID</th><th>Patient</th><th>From</th><th>To</th><th>Reason</th><th>Requested</th><th>Status</th></tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-muted py-4">No transfer history yet.</td></tr>
                )}
                {history.map(t => (
                  <tr key={t.id}>
                    <td><code>{t.id}</code></td>
                    <td><strong>{t.patient_name || t.patient_id}</strong></td>
                    <td>{t.from_ward} {t.from_bed}</td>
                    <td>{t.to_ward} {t.to_bed}</td>
                    <td><small>{t.reason || '—'}</small></td>
                    <td><small>{fmt(t.created_at)}</small></td>
                    <td><Badge bg={t.status === 'Rejected' ? 'danger' : 'success'}>{t.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>
      </Tabs>


      <Modal show={showRequest} onHide={() => setShowRequest(false)} centered size="lg">
        <Modal.Header closeButton><Modal.Title>New Transfer Request</Modal.Title></Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Patient</Form.Label>
              <Form.Select
                value={form.admission_id}
                onChange={(e) => {
                  const a = admissions.find(x => String(x.id) === e.target.value);
                  setForm({
                    ...form,
                    admission_id: e.target.value,
                    patient_id: a?.patient_id || '',
                    patient_name: a?.patient_name || '',
                    from_ward: a?.ward || '',
                    from_bed: a?.bed_number || '',
                  });
                }}
                required
              >
                <option value="">Select an admitted patient</option>
                {admissions.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.patient_name || a.patient_uhid || `Patient ${a.patient_id}`} — {a.ward || 'Ward'} {a.bed_number || ''}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>From</Form.Label>
                  <Form.Control value={`${form.from_ward || '—'} ${form.from_bed || ''}`} disabled />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Target Ward</Form.Label>
                  <Form.Select value={form.to_ward} onChange={(e) => setForm({ ...form, to_ward: e.target.value })} required>
                    <option>ICU Main</option>
                    <option>Ward A</option>
                    <option>Ward B</option>
                    <option>Pediatrics</option>
                    <option>NICU</option>
                    <option>Maternity</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Target Bed</Form.Label>
                  <Form.Control value={form.to_bed} onChange={(e) => setForm({ ...form, to_bed: e.target.value })} placeholder="e.g. ICU-05 (blank = auto-assign)" />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Reason</Form.Label>
                  <Form.Control value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Clinical justification" />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowRequest(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? <Spinner animation="border" size="sm" /> : 'Submit Request'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default BedTransferManager;

