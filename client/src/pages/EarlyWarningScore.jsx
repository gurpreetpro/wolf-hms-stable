import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import api from '../utils/axiosInstance';

const emptyVitals = { admission_id: '', temperature: '', pulse: '', bp_systolic: '', bp_diastolic: '', spo2: '' };

const EarlyWarningScore = () => {
  const [activeTab, setActiveTab] = useState('monitoring');
  const [patients, setPatients] = useState([]);
  const [scoringError, setScoringError] = useState('');
  const [showVitals, setShowVitals] = useState(false);
  const [vitals, setVitals] = useState(emptyVitals);
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/ews/scores');
      setPatients(res.data.data || res.data.patients || []);
      setScoringError('');
    } catch (err) {
      console.error('[EarlyWarningScore] score load failed:', err.message);
      setPatients([]);
      setScoringError('Unable to load live vitals for NEWS-2 scoring. Please refresh.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleLogVitals = async (e) => {
    e.preventDefault();
    setBusy(true);
    setScoringError('');
    try {
      const res = await api.post('/api/ews/log-vitals', vitals);
      setLastResult(res.data?.data || null);
      setShowVitals(false);
      setVitals(emptyVitals);
      await load();
    } catch (err) {
      setScoringError(err.response?.data?.message || 'Could not log vitals.');
    } finally {
      setBusy(false);
    }
  };

  const alertColor = (a) => a === 'CRITICAL' ? 'danger' : a === 'HIGH' ? 'warning' : 'success';
  const scoreColor = (s) => s >= 7 ? 'danger' : s >= 5 ? 'warning' : s >= 1 ? 'info' : 'success';
  const fmtTime = (v) => v ? String(v).slice(0, 16).replace('T', ' ') : '—';

  const escalationProtocol = [
    { score: '0-4', level: 'Low', response: 'Routine ward monitoring', frequency: 'q4-6h', team: 'Ward nurse' },
    { score: '5-6', level: 'Medium', response: 'Increase monitoring, inform charge nurse', frequency: 'q1h', team: 'Senior nurse + Junior doctor' },
    { score: '7+', level: 'High', response: 'Emergency assessment, consider ICU', frequency: 'Continuous', team: 'Registrar + ICU outreach' },
    { score: '≥9 or 3 in single param', level: 'Critical', response: 'Immediate senior review, ICU transfer', frequency: 'Continuous', team: 'Consultant + ICU team' },
  ];

  const metrics = {
    totalMonitored: patients.length,
    critical: patients.filter(p => p.alert === 'CRITICAL').length,
    high: patients.filter(p => p.alert === 'HIGH').length,
    avgNEWS2: patients.length ? (patients.reduce((s, p) => s + (p.news2 || 0), 0) / patients.length).toFixed(1) : '—'
  };

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">⚠️ Early Warning Score (NEWS-2) Dashboard</h4>
          <small className="text-muted">Server-scored NEWS-2 from each admitted patient's most recent vitals</small>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {metrics.critical > 0 && <Badge bg="danger" className="p-2 fs-6">🚨 {metrics.critical} CRITICAL</Badge>}
          {metrics.high > 0 && <Badge bg="warning" className="p-2 fs-6">⚠️ {metrics.high} HIGH</Badge>}
          <Button variant="primary" onClick={() => { setVitals(emptyVitals); setShowVitals(true); }}>+ Log Vitals &amp; Recalculate NEWS-2</Button>
        </div>
      </div>

      {scoringError && <Alert variant="warning" dismissible onClose={() => setScoringError('')}>{scoringError}</Alert>}
      {lastResult && (
        <Alert variant={alertColor(lastResult.alert)} dismissible onClose={() => setLastResult(null)}>
          Vitals logged. Recalculated NEWS-2 = <strong>{lastResult.news2}</strong> ({lastResult.alert}).
        </Alert>
      )}

      <Row className="mb-3">
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{metrics.totalMonitored}</h3><small>Monitored</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">{metrics.critical}</h3><small>Critical</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{metrics.high}</h3><small>High Risk</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">{metrics.avgNEWS2}</h3><small>Avg NEWS-2</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="monitoring" title="📊 Live Monitoring">
          {patients.filter(p => p.alert === 'CRITICAL').map(p => (
            <Alert key={p.bed} variant="danger" className="mb-2">
              <strong>🚨 CRITICAL: {p.patient} ({p.bed})</strong> — NEWS-2: {p.news2} | {p.prediction}
              <div className="mt-1">{p.actions.map((a,i) => <Badge key={i} bg="light" text="dark" className="me-1">{a}</Badge>)}</div>
            </Alert>
          ))}
          <Card>
            <Card.Body>
              <Table bordered hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>Bed / Ward</th><th>Patient</th><th>Pulse</th><th>BP</th><th>Temp</th><th>SpO2</th><th>NEWS-2</th><th>Alert</th><th>Recommended Action</th></tr>
                </thead>
                <tbody>
                  {patients.length === 0 && (
                    <tr><td colSpan={9} className="text-center text-muted py-4">No admitted patients with recorded vitals yet. Use “+ Log Vitals &amp; Recalculate NEWS-2”.</td></tr>
                  )}
                  {[...patients].sort((a, b) => b.news2 - a.news2).map(p => (
                    <tr key={p.admission_id} className={p.news2 >= 7 ? 'table-danger' : p.news2 >= 5 ? 'table-warning' : ''}>
                      <td><strong>{p.bed_number || '—'}</strong><br/><small className="text-muted">{p.ward || ''}</small></td>
                      <td>{p.patient_name || p.patient_id}</td>
                      <td>{p.pulse != null ? p.pulse : '—'}</td>
                      <td>{p.bp_systolic && p.bp_diastolic ? `${p.bp_systolic}/${p.bp_diastolic}` : '—'}</td>
                      <td>{p.temperature != null ? `${p.temperature} °C` : '—'}</td>
                      <td>{p.spo2 != null ? `${p.spo2}%` : '—'}</td>
                      <td><Badge bg={scoreColor(p.news2)} className="fs-6">{p.news2}</Badge></td>
                      <td><Badge bg={alertColor(p.alert)}>{p.alert}</Badge></td>
                      <td style={{maxWidth: 240}}><small>{p.recommendation}</small></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="protocol" title="📋 Escalation Protocol">
          <Card>
            <Card.Body>
              <h5 className="mb-3">NEWS-2 Escalation Protocol</h5>
              <Table bordered>
                <thead className="table-dark">
                  <tr><th>NEWS-2 Score</th><th>Risk Level</th><th>Clinical Response</th><th>Frequency</th><th>Team</th></tr>
                </thead>
                <tbody>
                  {escalationProtocol.map((e, i) => (
                    <tr key={i} className={i === 3 ? 'table-danger' : i === 2 ? 'table-warning' : i === 1 ? 'table-info' : ''}>
                      <td><strong>{e.score}</strong></td>
                      <td><Badge bg={i === 3 ? 'danger' : i === 2 ? 'warning' : i === 1 ? 'info' : 'success'}>{e.level}</Badge></td>
                      <td>{e.response}</td>
                      <td>{e.frequency}</td>
                      <td>{e.team}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="analytics" title="📈 Score Distribution">
          <Card>
            <Card.Body>
              <Row className="text-center">
                <Col md={3}><h2 className="text-primary">{metrics.totalMonitored}</h2><small>Admitted Patients Scored</small></Col>
                <Col md={3}><h2 className="text-danger">{metrics.critical}</h2><small>Critical (NEWS-2 ≥ 7)</small></Col>
                <Col md={3}><h2 className="text-warning">{metrics.high}</h2><small>High (NEWS-2 5-6)</small></Col>
                <Col md={3}><h2 className="text-info">{metrics.avgNEWS2}</h2><small>Average NEWS-2</small></Col>
              </Row>
              <hr />
              <p className="text-muted mb-0 small">
                Scores are recomputed server-side from each admission&apos;s latest recorded vitals. Logging new vitals from the
                button above immediately recalculates the score and the escalation band.
              </p>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      <Modal show={showVitals} onHide={() => setShowVitals(false)} centered>
        <Modal.Header closeButton><Modal.Title>Log Vitals &amp; Recalculate NEWS-2</Modal.Title></Modal.Header>
        <Form onSubmit={handleLogVitals}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Admitted Patient</Form.Label>
              <Form.Select
                value={vitals.admission_id}
                onChange={(e) => setVitals({ ...vitals, admission_id: e.target.value })}
                required
              >
                <option value="">Select an admitted patient</option>
                {patients.map(p => (
                  <option key={p.admission_id} value={p.admission_id}>
                    {p.patient_name || p.patient_id} — {p.ward || 'Ward'} {p.bed_number || ''}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Temperature (°C)</Form.Label>
                  <Form.Control type="number" step="0.1" value={vitals.temperature} onChange={(e) => setVitals({ ...vitals, temperature: e.target.value })} required />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Pulse (bpm)</Form.Label>
                  <Form.Control type="number" value={vitals.pulse} onChange={(e) => setVitals({ ...vitals, pulse: e.target.value })} required />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>SpO2 (%)</Form.Label>
                  <Form.Control type="number" value={vitals.spo2} onChange={(e) => setVitals({ ...vitals, spo2: e.target.value })} required />
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Systolic BP (mmHg)</Form.Label>
                  <Form.Control type="number" value={vitals.bp_systolic} onChange={(e) => setVitals({ ...vitals, bp_systolic: e.target.value })} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Diastolic BP (mmHg)</Form.Label>
                  <Form.Control type="number" value={vitals.bp_diastolic} onChange={(e) => setVitals({ ...vitals, bp_diastolic: e.target.value })} required />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowVitals(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? <Spinner animation="border" size="sm" /> : 'Save Vitals & Recalculate'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default EarlyWarningScore;
