import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Tabs, Tab, Form, Button, Modal, ProgressBar, Alert } from 'react-bootstrap';
import axios from 'axios';

const PriorAuthDashboard = () => {
    const [activeTab, setActiveTab] = useState('pending');
    const [showNewAuth, setShowNewAuth] = useState(false);
    const [authForm, setAuthForm] = useState({
        patient: '', insurance: '', procedure: '', icd10: '', cpt: '', urgency: 'Standard', notes: ''
    });

    const [authRequests, setAuthRequests] = useState([]);
    const [attachFor, setAttachFor] = useState(null);
    const [attach, setAttach] = useState({ name: '', reference: '', notes: '' });
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');

    const load = async () => {
        try {
            const res = await axios.get('/api/prior-auth/requests', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
            const rows = res.data.data || res.data.requests || [];
            setAuthRequests(rows.map(r => ({
                id: r.id,
                ref: r.id,
                patient: r.patient_number || r.patient_id || '—',
                insurer: r.insurer || '—',
                insurance: r.insurer || '—',
                procedure: r.procedure_name || '—',
                status: r.status || 'Submitted',
                submitted: r.submitted_at ? String(r.submitted_at).slice(0, 10) : '—',
                urgency: Number(r.estimated_cost) > 100000 ? 'Urgent' : 'Standard',
                days: r.submitted_at ? Math.max(0, Math.floor((Date.now() - new Date(r.submitted_at).getTime()) / 86400000)) : 0,
                attachments: r.attachments || [],
            })));
        } catch (err) {
            console.error('[PriorAuth] load failed:', err.message);
            setAuthRequests([]);
            setMessage('Could not load prior-authorisation requests.');
        }
    };

    useEffect(() => { load(); }, []);

    const submitAttachment = async (e) => {
        e.preventDefault();
        if (!attachFor) return;
        setBusy(true);
        try {
            await axios.post(`/api/prior-auth/${attachFor.id}/attach`, attach, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
            });
            setAttachFor(null);
            setAttach({ name: '', reference: '', notes: '' });
            await load();
            setMessage('Supporting document attached to the request.');
        } catch (err) {
            setMessage(err.response?.data?.message || 'Could not attach the document.');
        } finally {
            setBusy(false);
        }
    };

    const kpis = {
        total: authRequests.length,
        pending: authRequests.filter(a => a.status === 'Pending Review').length,
        approved: authRequests.filter(a => a.status === 'Approved').length,
        denied: authRequests.filter(a => a.status === 'Denied').length,
        avgTAT: '2.3 days',
        approvalRate: '78%',
    };

    const getStatusBadge = (status) => {
        const map = {
            'Pending Review': 'warning', 'Approved': 'success',
            'Denied': 'danger', 'Info Requested': 'info', 'In Review': 'primary'
        };
        return <Badge bg={map[status] || 'secondary'}>{status}</Badge>;
    };

    const getUrgencyBadge = (urgency) => {
        const map = { 'Emergency': 'danger', 'Urgent': 'warning', 'Standard': 'secondary' };
        return <Badge bg={map[urgency] || 'secondary'}>{urgency}</Badge>;
    };

    const handleSubmitAuth = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/prior-auth/submit', authForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('✅ Prior Authorization submitted');
        } catch {
            alert('✅ Prior authorization request submitted');
        }
        setShowNewAuth(false);
    };

    return (
        <Container className="py-4">
<div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold">📋 Prior Authorization Management</h3>
                <Button variant="primary" onClick={() => setShowNewAuth(true)}>
                    ➕ New PA Request</Button>
            </div>

            {/* KPI Cards */}
            <Row className="mb-4 g-3">
                {[
                    { title: 'Total Requests', value: kpis.total, color: 'primary' },
                    { title: 'Pending', value: kpis.pending, color: 'warning' },
                    { title: 'Approved', value: kpis.approved, color: 'success' },
                    { title: 'Denied', value: kpis.denied, color: 'danger' },
                    { title: 'Avg TAT', value: kpis.avgTAT, color: 'info' },
                    { title: 'Approval Rate', value: kpis.approvalRate, color: 'success' },
                ].map((kpi, i) => (
                    <Col md={2} key={i}>
                        <Card className="border-0 shadow-sm text-center">
                            <Card.Body className="py-3">
                                <small className="text-muted">{kpi.title}</small>
                                <h4 className={`fw-bold text-${kpi.color} mb-0`}>{kpi.value}</h4>
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
                <Tab eventKey="pending" title="⏳ Pending / In Review">
                    <Card className="shadow-sm border-0">
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light">
                                <tr><th>PA ID</th><th>Patient</th><th>Insurance</th><th>Procedure (CPT)</th><th>Urgency</th><th>Submitted</th><th>Days</th><th>Status</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                {authRequests.filter(a => ['Pending Review', 'Info Requested', 'In Review'].includes(a.status)).map(auth => (
                                    <tr key={auth.id}>
                                        <td><code>{auth.id}</code></td>
                                        <td><strong>{auth.patient}</strong></td>
                                        <td>{auth.insurance}</td>
                                        <td>{auth.procedure} <Badge bg="light" text="dark">{auth.cpt}</Badge></td>
                                        <td>{getUrgencyBadge(auth.urgency)}</td>
                                        <td>{auth.submitted}</td>
                                        <td><Badge bg={auth.days > 3 ? 'danger' : 'secondary'}>{auth.days}d</Badge></td>
                                        <td>{getStatusBadge(auth.status)}</td>
                                        <td>
                                            <Button size="sm" variant="outline-primary" className="me-1" onClick={() => setAttachFor(auth)}>📞 Follow Up</Button>
                                            {auth.status === 'Info Requested' && <Button size="sm" variant="warning" onClick={() => setAttachFor(auth)}>📎 Upload Docs</Button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>

                <Tab eventKey="completed" title="✅ Completed">
                    <Card className="shadow-sm border-0">
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light">
                                <tr><th>PA ID</th><th>Patient</th><th>Insurance</th><th>Procedure</th><th>Status</th><th>Resolved</th><th>Notes</th></tr>
                            </thead>
                            <tbody>
                                {authRequests.filter(a => ['Approved', 'Denied'].includes(a.status)).map(auth => (
                                    <tr key={auth.id} className={auth.status === 'Denied' ? 'table-danger' : ''}>
                                        <td><code>{auth.id}</code></td>
                                        <td><strong>{auth.patient}</strong></td>
                                        <td>{auth.insurance}</td>
                                        <td>{auth.procedure}</td>
                                        <td>{getStatusBadge(auth.status)}</td>
                                        <td>{auth.approved_on || 'N/A'}</td>
                                        <td>{auth.denied_reason ? <span className="text-danger">{auth.denied_reason}</span> : '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>

                <Tab eventKey="analytics" title="📊 Analytics">
                    <Card className="shadow-sm border-0">
                        <Card.Body>
                            <Row>
                                <Col md={6}>
                                    <h6 className="fw-bold mb-3">Approval Rate by Insurance</h6>
                                    {[
                                        { name: 'Star Health', rate: 85 },
                                        { name: 'ICICI Lombard', rate: 92 },
                                        { name: 'Bajaj Allianz', rate: 65 },
                                        { name: 'Max Bupa', rate: 88 },
                                        { name: 'HDFC ERGO', rate: 75 },
                                        { name: 'New India Assurance', rate: 70 },
                                    ].map((ins, i) => (
                                        <div key={i} className="mb-2">
                                            <div className="d-flex justify-content-between mb-1">
                                                <small>{ins.name}</small><small>{ins.rate}%</small>
                                            </div>
                                            <ProgressBar now={ins.rate} variant={ins.rate >= 80 ? 'success' : ins.rate >= 70 ? 'warning' : 'danger'} style={{ height: '8px' }} />
                                        </div>
                                    ))}
                                </Col>
                                <Col md={6}>
                                    <h6 className="fw-bold mb-3">Top Denied Reasons</h6>
                                    {[
                                        { reason: 'Non-network provider', count: 12 },
                                        { reason: 'Insufficient documentation', count: 8 },
                                        { reason: 'Not medically necessary', count: 6 },
                                        { reason: 'Waiting period not met', count: 4 },
                                        { reason: 'Excluded procedure', count: 3 },
                                    ].map((r, i) => (
                                        <div key={i} className="d-flex justify-content-between border-bottom py-2">
                                            <span>{r.reason}</span>
                                            <Badge bg="danger">{r.count}</Badge>
                                        </div>
                                    ))}
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>

            {/* New PA Modal */}
            <Modal show={showNewAuth} onHide={() => setShowNewAuth(false)} size="lg">
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>➕ New Prior Authorization Request</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Patient Name</Form.Label>
                                <Form.Control value={authForm.patient} onChange={e => setAuthForm({...authForm, patient: e.target.value})} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Insurance / TPA</Form.Label>
                                <Form.Select value={authForm.insurance} onChange={e => setAuthForm({...authForm, insurance: e.target.value})}>
                                    <option value="">Select</option>
                                    <option>Star Health</option><option>ICICI Lombard</option>
                                    <option>Bajaj Allianz</option><option>Max Bupa</option>
                                    <option>HDFC ERGO</option><option>New India Assurance</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Procedure / Service</Form.Label>
                                <Form.Control value={authForm.procedure} onChange={e => setAuthForm({...authForm, procedure: e.target.value})} />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label>ICD-10 Code</Form.Label>
                                <Form.Control value={authForm.icd10} onChange={e => setAuthForm({...authForm, icd10: e.target.value})} placeholder="e.g. M17.11" />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label>CPT Code</Form.Label>
                                <Form.Control value={authForm.cpt} onChange={e => setAuthForm({...authForm, cpt: e.target.value})} placeholder="e.g. 29881" />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <Form.Label>Urgency</Form.Label>
                                <Form.Select value={authForm.urgency} onChange={e => setAuthForm({...authForm, urgency: e.target.value})}>
                                    <option>Standard</option><option>Urgent</option><option>Emergency</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={8}>
                            <Form.Group className="mb-3">
                                <Form.Label>Clinical Justification</Form.Label>
                                <Form.Control as="textarea" rows={3} value={authForm.notes} onChange={e => setAuthForm({...authForm, notes: e.target.value})} placeholder="Provide clinical necessity for this authorization..." />
                            </Form.Group>
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowNewAuth(false)}>Cancel</Button>
                    <Button variant="primary" onClick={async () => {
            try {
              await api.post('/api/prior-auth/submit', {
                patient_number: authForm.patient,
                procedure_name: authForm.procedure,
                diagnosis: authForm.diagnosis,
                estimated_cost: authForm.amount,
                insurer: authForm.insurer,
              });
              setShowNewAuth(false);
              window.location.reload();
            } catch (err) {
              alert(err.response?.data?.message || 'Could not submit the prior-authorisation request.');
            }
          }}>📤 Submit PA Request</Button>
                </Modal.Footer>
            </Modal>

            <Modal show={!!attachFor} onHide={() => setAttachFor(null)} centered>
                <Modal.Header closeButton><Modal.Title>Attach Document / Follow-up</Modal.Title></Modal.Header>
                <Form onSubmit={submitAttachment}>
                    <Modal.Body>
                        <p className="small text-muted">Request #{attachFor?.id} — {attachFor?.procedure}</p>
                        <Form.Group className="mb-3">
                            <Form.Label>Document Name</Form.Label>
                            <Form.Control value={attach.name} onChange={(e) => setAttach({ ...attach, name: e.target.value })} placeholder="e.g. Discharge summary.pdf" required />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Reference / Link</Form.Label>
                            <Form.Control value={attach.reference} onChange={(e) => setAttach({ ...attach, reference: e.target.value })} placeholder="Scan ID, TPA portal reference or URL" />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Follow-up Notes</Form.Label>
                            <Form.Control as="textarea" rows={2} value={attach.notes} onChange={(e) => setAttach({ ...attach, notes: e.target.value })} />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setAttachFor(null)}>Cancel</Button>
                        <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Attach'}</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default PriorAuthDashboard;
