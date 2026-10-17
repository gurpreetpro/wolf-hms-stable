import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Tabs, Tab, Alert, Modal, Spinner } from 'react-bootstrap';
import api from '../utils/axiosInstance';

const emptySession = { patient_id: '', session_type: 'Video Consultation', scheduled_at: '' };

const TelehealthConsole = () => {
  const [activeTab, setActiveTab] = useState('waitingroom');
  const [sessions, setSessions] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [newSession, setNewSession] = useState(emptySession);
  const [notes, setNotes] = useState('');
  const [drugs, setDrugs] = useState([]);
  const [drugDraft, setDrugDraft] = useState({ drug: '', dosage: '', days: '' });
  const [investigation, setInvestigation] = useState('');
  const [investigations, setInvestigations] = useState([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await api.get('/api/telehealth/sessions');
      setSessions(res.data.data || res.data.sessions || []);
    } catch (err) {
      console.error('[TelehealthConsole] session load failed:', err.message);
      setSessions([]);
      setMessage('Could not load telehealth sessions.');
    }
  }, []);

  useEffect(() => {
    load();
    (async () => {
      try {
        const res = await api.get('/api/admissions?status=Admitted');
        setAdmissions(res.data?.data || res.data || []);
      } catch (err) {
        console.error('[TelehealthConsole] admission load failed:', err.message);
        setAdmissions([]);
      }
    })();
  }, [load]);

  const selectSession = (session) => {
    setSelected(session);
    setNotes(session.notes || '');
    setDrugs([]);
    setInvestigations([]);
    setActiveTab('consult');
  };

  const handleSchedule = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post('/api/telehealth/sessions', newSession);
      setShowSchedule(false);
      setNewSession(emptySession);
      await load();
      setMessage('Telehealth session scheduled.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not schedule the session.');
    } finally {
      setBusy(false);
    }
  };

  const saveNotes = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.patch(`/api/telehealth/sessions/${selected.id}/prescribe`, {
        notes: [notes, ...investigations.map(i => `Investigation ordered: ${i}`)].join('\n'),
        drugs,
      });
      await load();
      setMessage('Consultation notes saved to the session.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not save the notes.');
    } finally {
      setBusy(false);
    }
  };

  const sendPrescription = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.patch(`/api/telehealth/sessions/${selected.id}/prescribe`, { notes, drugs });
      await load();
      setMessage(`E-prescription with ${drugs.length} drug(s) sent to the patient.`);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not send the e-prescription.');
    } finally {
      setBusy(false);
    }
  };

  const addDrug = () => {
    if (!drugDraft.drug) return;
    setDrugs([...drugs, { ...drugDraft, days: Number(drugDraft.days) || 1 }]);
    setDrugDraft({ drug: '', dosage: '', days: '' });
  };

  const addInvestigation = () => {
    if (!investigation.trim()) return;
    setInvestigations([...investigations, investigation.trim()]);
    setInvestigation('');
  };

  const waitingRoom = sessions.filter(s => s.status === 'Waiting');
  const schedule = sessions.filter(s => s.status !== 'Waiting');
  const fmt = (v) => (v ? String(v).slice(0, 16).replace('T', ' ') : '—');
  const metrics = {
    total: sessions.length,
    completed: schedule.filter(s => s.status === 'Completed').length,
    waiting: waitingRoom.length,
  };

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Telehealth Console</h4>
          <small className="text-muted">Video consultation scheduling, charting and e-prescribing</small>
        </div>
        <Button variant="primary" onClick={() => { setMessage(''); setShowSchedule(true); }}>+ Schedule Session</Button>
      </div>

      {message && <Alert variant="info" dismissible onClose={() => setMessage('')}>{message}</Alert>}

      <Row className="mb-3">
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{metrics.total}</h3><small>Sessions</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{metrics.waiting}</h3><small>Waiting Room</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{metrics.completed}</h3><small>Completed</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="waitingroom" title={<span>Waiting Room <Badge bg="warning" text="dark">{metrics.waiting}</Badge></span>}>
          {waitingRoom.length === 0 && <Alert variant="light" className="border">No patients are waiting. Use <strong>+ Schedule Session</strong> to book a consultation.</Alert>}
          <Row>
            {waitingRoom.map(s => (
              <Col md={4} key={s.id}>
                <Card className="mb-3 border-warning">
                  <Card.Header className="bg-warning text-dark"><strong>{s.patient_name || s.patient_id}</strong></Card.Header>
                  <Card.Body>
                    <p className="mb-1"><strong>Type:</strong> {s.session_type}</p>
                    <p className="mb-1"><strong>Scheduled:</strong> {fmt(s.scheduled_at)}</p>
                    <Button variant="success" onClick={() => selectSession(s)}>Open Consultation</Button>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Tab>

        <Tab eventKey="schedule" title="Schedule">
          <Card><Card.Body>
            <Table bordered hover responsive size="sm">
              <thead className="table-dark">
                <tr><th>Patient</th><th>Type</th><th>Scheduled</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {schedule.length === 0 && <tr><td colSpan={5} className="text-center text-muted py-4">No scheduled sessions.</td></tr>}
                {schedule.map(s => (
                  <tr key={s.id}>
                    <td><strong>{s.patient_name || s.patient_id}</strong></td>
                    <td>{s.session_type}</td>
                    <td><small>{fmt(s.scheduled_at)}</small></td>
                    <td><Badge bg={s.status === 'Completed' ? 'success' : 'secondary'}>{s.status}</Badge></td>
                    <td><Button size="sm" variant="outline-primary" onClick={() => selectSession(s)}>Open</Button></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>

        <Tab eventKey="consult" title="Consultation">
          {!selected ? (
            <Alert variant="light" className="border">Select a session from the waiting room or schedule.</Alert>
          ) : (
            <Row>
              <Col md={7}>
                <Card className="mb-3">
                  <Card.Header><strong>Consultation — {selected.patient_name || selected.patient_id}</strong></Card.Header>
                  <Card.Body>
                    <Form.Group className="mb-3">
                      <Form.Label>Clinical Notes</Form.Label>
                      <Form.Control as="textarea" rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="History, examination, assessment, plan..." />
                    </Form.Group>
                    <Button variant="primary" onClick={saveNotes} disabled={busy}>
                      {busy ? <Spinner animation="border" size="sm" /> : 'Save Notes'}
                    </Button>
                  </Card.Body>
                </Card>

                <Card>
                  <Card.Header><strong>Investigations</strong></Card.Header>
                  <Card.Body>
                    <div className="d-flex gap-2 mb-2">
                      <Form.Control value={investigation} onChange={(e) => setInvestigation(e.target.value)} placeholder="e.g. CBC, Chest X-ray" />
                      <Button variant="outline-primary" onClick={addInvestigation}>+ Add Investigation</Button>
                    </div>
                    <ul className="mb-0">
                      {investigations.map((i, idx) => <li key={idx}>{i}</li>)}
                      {investigations.length === 0 && <li className="text-muted">No investigations ordered.</li>}
                    </ul>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={5}>
                <Card>
                  <Card.Header><strong>E-Prescription</strong></Card.Header>
                  <Card.Body>
                    <Table size="sm" bordered>
                      <thead><tr><th>Drug</th><th>Dosage</th><th>Days</th><th /></tr></thead>
                      <tbody>
                        {drugs.length === 0 && <tr><td colSpan={4} className="text-center text-muted">No drugs added.</td></tr>}
                        {drugs.map((d, idx) => (
                          <tr key={idx}>
                            <td>{d.drug}</td>
                            <td>{d.dosage}</td>
                            <td>{d.days}</td>
                            <td><Button size="sm" variant="outline-danger" onClick={() => setDrugs(drugs.filter((_, i) => i !== idx))}>X</Button></td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                    <Row className="g-2 mb-2">
                      <Col><Form.Control size="sm" placeholder="Drug" value={drugDraft.drug} onChange={(e) => setDrugDraft({ ...drugDraft, drug: e.target.value })} /></Col>
                      <Col><Form.Control size="sm" placeholder="1-0-1" value={drugDraft.dosage} onChange={(e) => setDrugDraft({ ...drugDraft, dosage: e.target.value })} /></Col>
                      <Col><Form.Control size="sm" type="number" placeholder="Days" value={drugDraft.days} onChange={(e) => setDrugDraft({ ...drugDraft, days: e.target.value })} /></Col>
                    </Row>
                    <div className="d-flex gap-2">
                      <Button variant="outline-primary" onClick={addDrug}>+ Add Drug</Button>
                      <Button variant="success" className="ms-auto" onClick={sendPrescription} disabled={busy || drugs.length === 0}>
                        Send E-Prescription to Patient
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Tab>
      </Tabs>


      <Modal show={showSchedule} onHide={() => setShowSchedule(false)} centered>
        <Modal.Header closeButton><Modal.Title>Schedule Telehealth Session</Modal.Title></Modal.Header>
        <Form onSubmit={handleSchedule}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Admitted Patient</Form.Label>
              <Form.Select value={newSession.patient_id} onChange={(e) => setNewSession({ ...newSession, patient_id: e.target.value })} required>
                <option value="">Select an admitted patient</option>
                {admissions.map(a => (
                  <option key={a.id} value={a.patient_id}>{a.patient_name || a.patient_uhid || `Patient ${a.patient_id}`} — {a.ward || 'Ward'} {a.bed_number || ''}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Session Type</Form.Label>
                  <Form.Select value={newSession.session_type} onChange={(e) => setNewSession({ ...newSession, session_type: e.target.value })}>
                    <option>Video Consultation</option>
                    <option>Tele-ICU Review</option>
                    <option>Follow-up</option>
                    <option>Second Opinion</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Scheduled At</Form.Label>
                  <Form.Control type="datetime-local" value={newSession.scheduled_at} onChange={(e) => setNewSession({ ...newSession, scheduled_at: e.target.value })} required />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowSchedule(false)}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={busy}>
              {busy ? <Spinner animation="border" size="sm" /> : 'Schedule'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default TelehealthConsole;

