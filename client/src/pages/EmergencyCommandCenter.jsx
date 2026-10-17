import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, Alert, Modal, Form, Spinner } from 'react-bootstrap';
import api from '../utils/axiosInstance';
import { connectSocket } from '../services/socket';

/**
 * Emergency Command Center — live data only.
 *
 * Data sources (all real, hospital-scoped):
 *   GET  /api/emergency/history   → active rows, resolved rows + KPI summary
 *   GET  /api/emergency/config    → alert routing configuration
 *   POST /api/emergency/trigger   → raise a code
 *   POST /api/emergency/resolve   → stand a code down
 * Socket.IO: `emergency_broadcast` / `emergency_resolved` refresh the view instantly.
 */
const EmergencyCommandCenter = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [showTrigger, setShowTrigger] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [activeEmergencies, setActiveEmergencies] = useState([]);
  const [recentResolved, setRecentResolved] = useState([]);
  const [summary, setSummary] = useState({ activeCount: 0, resolvedTodayCount: 0, avgResponseMinutes: null, compliancePct: null });
  const [alertConfig, setAlertConfig] = useState([]);

  const [form, setForm] = useState({ code: 'Blue', location: 'ICU', notes: '' });

  const load = useCallback(async () => {
    try {
      setError('');
      const [histRes, cfgRes] = await Promise.all([
        api.get('/api/emergency/history'),
        api.get('/api/emergency/config').catch(() => ({ data: { data: [] } })),
      ]);
      const payload = histRes.data.data || histRes.data || {};
      setActiveEmergencies(Array.isArray(payload.active) ? payload.active : []);
      setRecentResolved(Array.isArray(payload.resolved) ? payload.resolved : []);
      setSummary(payload.summary || { activeCount: 0, resolvedTodayCount: 0, avgResponseMinutes: null, compliancePct: null });

      const cfgPayload = cfgRes.data.data || cfgRes.data;
      setAlertConfig(Array.isArray(cfgPayload) ? cfgPayload : (cfgPayload && cfgPayload.codes ? cfgPayload.codes : []));
    } catch (err) {
      console.error('[EmergencyCommandCenter] load failed:', err.message);
      setError('Unable to load live emergency data. Please retry.');
      setActiveEmergencies([]);
      setRecentResolved([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live updates: refresh on every broadcast / resolution (no page reload)
  useEffect(() => {
    const token = localStorage.getItem('token');
    const hospitalId = localStorage.getItem('hospitalId') || '1';
    if (!token) return undefined;
    const socket = connectSocket(token, hospitalId);
    if (!socket) return undefined;
    const refresh = () => load();
    socket.on('emergency_broadcast', refresh);
    socket.on('emergency_resolved', refresh);
    return () => {
      socket.off('emergency_broadcast', refresh);
      socket.off('emergency_resolved', refresh);
    };
  }, [load]);

  const triggerEmergency = async () => {
    setSaving(true);
    try {
      await api.post('/api/emergency/trigger', {
        code: form.code,
        location: form.location,
        notes: form.notes,
      });
      setShowTrigger(false);
      setForm({ code: 'Blue', location: 'ICU', notes: '' });
      await load();
    } catch (err) {
      console.error('[EmergencyCommandCenter] trigger failed:', err.message);
      setError(err.response?.data?.message || 'Could not raise the emergency code. Please retry.');
    } finally {
      setSaving(false);
    }
  };

  const resolveEmergency = async (id) => {
    try {
      await api.post('/api/emergency/resolve', { id, resolution_notes: 'Resolved from Emergency Command Center' });
      await load();
    } catch (err) {
      console.error('[EmergencyCommandCenter] resolve failed:', err.message);
      setError(err.response?.data?.message || 'Could not resolve the emergency. Please retry.');
    }
  };

  const fmtTime = (v) => (v ? new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—');
  const codeLabel = (c) => `CODE ${String(c || 'ALERT').replace(/^CODE_/i, '').toUpperCase()}`;

  if (loading) {
    return (
      <Container fluid className="py-5 text-center">
        <Spinner animation="border" role="status" className="me-2" />
        <span>Loading live emergency data…</span>
      </Container>
    );
  }

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Emergency Command Center</h4>
          <small className="text-muted">Code blue/red triggers, response teams, and real-time resolution tracking</small>
        </div>
        <Button variant="danger" size="lg" onClick={() => setShowTrigger(true)}>TRIGGER EMERGENCY</Button>
      </div>

      {error && <Alert variant="warning" dismissible onClose={() => setError('')}>{error}</Alert>}

      {activeEmergencies.length > 0 ? (
        <Alert variant="danger" className="d-flex align-items-center">
          <strong className="me-2">ACTIVE EMERGENCIES: {activeEmergencies.length}</strong> — Immediate response required!
        </Alert>
      ) : (
        <Alert variant="success" className="d-flex align-items-center">
          <strong className="me-2">0 Active Emergencies</strong> — All hospital zones clear.
        </Alert>
      )}

      <Row className="mb-3">
        <Col><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">{summary.activeCount}</h3><small>Active Now</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{summary.resolvedTodayCount}</h3><small>Resolved Today</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{summary.avgResponseMinutes != null ? `${summary.avgResponseMinutes} min` : '—'}</h3><small>Avg Response Time</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">{alertConfig.length}</h3><small>Configured Codes</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{summary.compliancePct != null ? `${summary.compliancePct}%` : '—'}</h3><small>Resolution Compliance</small></Card.Body></Card></Col>
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
                    <tr><th>ID</th><th>Code</th><th>Location</th><th>Patient</th><th>Triggered By</th><th>Time</th><th>Elapsed</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {activeEmergencies.map((e) => (
                      <tr key={e.id}>
                        <td><code>EM-{String(e.id).padStart(4, '0')}</code></td>
                        <td><Badge bg="danger">{codeLabel(e.code)}</Badge></td>
                        <td><strong>{e.location || '—'}</strong></td>
                        <td><small>{e.patient_name || 'N/A'}</small></td>
                        <td><small>{e.triggered_by_name || 'Staff'}</small></td>
                        <td>{fmtTime(e.triggered_at)}</td>
                        <td className="text-danger fw-bold">{e.elapsed_minutes != null ? `${e.elapsed_minutes} min` : '—'}</td>
                        <td><Badge bg="danger">{e.status}</Badge></td>
                        <td><Button size="sm" variant="success" onClick={() => resolveEmergency(e.id)}>Resolve</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="resolved" title="Resolved">
          <Card>
            <Card.Body>
              {recentResolved.length === 0 ? (
                <Alert variant="secondary" className="mb-0">No resolved emergencies logged for this hospital.</Alert>
              ) : (
                <Table striped hover responsive size="sm">
                  <thead className="table-dark">
                    <tr><th>ID</th><th>Code</th><th>Location</th><th>Patient</th><th>Duration</th><th>Resolved By</th><th>Notes</th></tr>
                  </thead>
                  <tbody>
                    {recentResolved.map((r) => (
                      <tr key={r.id}>
                        <td><code>EM-{String(r.id).padStart(4, '0')}</code></td>
                        <td><Badge bg="secondary">{codeLabel(r.code)}</Badge></td>
                        <td>{r.location || '—'}</td>
                        <td><small>{r.patient_name || 'N/A'}</small></td>
                        <td><strong>{r.duration_minutes != null ? `${r.duration_minutes} min` : '—'}</strong></td>
                        <td><small>{r.resolved_by_name || '—'}</small></td>
                        <td><small className="text-muted">{r.resolution_notes || '—'}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="config" title="Alert Configuration">
          <Card>
            <Card.Body>
              {alertConfig.length === 0 ? (
                <Alert variant="secondary" className="mb-0">No custom alert routing rules configured for this facility.</Alert>
              ) : (
                <Table bordered hover responsive>
                  <thead className="table-dark">
                    <tr><th>Code</th><th>Description</th><th>Sound</th><th>Broadcast</th><th>Escalation</th></tr>
                  </thead>
                  <tbody>
                    {alertConfig.map((a, i) => (
                      <tr key={a.code || i}>
                        <td><Badge style={{ backgroundColor: a.color || '#6c757d' }}>{a.code}</Badge></td>
                        <td><strong>{a.description || '—'}</strong></td>
                        <td><small>{a.sound || '—'}</small></td>
                        <td><small>{a.broadcast || '—'}</small></td>
                        <td><small className="text-danger">{a.escalation || '—'}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      <Modal show={showTrigger} onHide={() => setShowTrigger(false)} centered>
        <Modal.Header closeButton className="bg-danger text-white">
          <Modal.Title>Trigger Emergency</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={(e) => { e.preventDefault(); triggerEmergency(); }}>
            <Form.Group className="mb-3">
              <Form.Label>Emergency Type</Form.Label>
              <Form.Select value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })}>
                <option value="Blue">Code Blue — Cardiac Arrest</option>
                <option value="Red">Code Red — Fire</option>
                <option value="Yellow">Code Yellow — Emergency Triage</option>
                <option value="Pink">Code Pink — Infant Abduction</option>
                <option value="Orange">Code Orange — Hazmat</option>
                <option value="Grey">Code Grey — Security</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Location</Form.Label>
              <Form.Select value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}>
                <option>ICU</option>
                <option>Emergency Ward</option>
                <option>Operation Theatre</option>
                <option>General Ward B</option>
                <option>NICU</option>
                <option>Pediatrics Ward</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control as="textarea" rows={2} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Clinical context for the responding team" />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTrigger(false)} disabled={saving}>Cancel</Button>
          <Button variant="danger" onClick={triggerEmergency} disabled={saving}>
            {saving ? 'Dispatching…' : 'TRIGGER NOW'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default EmergencyCommandCenter;
