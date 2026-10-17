import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import api from '../utils/axiosInstance';

const emptyTxn = { patient_id: '', amount: '', payment_mode: 'Cash', service: 'OPD Consultation' };

const POSTerminal = () => {
  const [activeTab, setActiveTab] = useState('terminal');
  const [devices, setDevices] = useState([]);
  const [providerCount, setProviderCount] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [showTxn, setShowTxn] = useState(false);
  const [txn, setTxn] = useState(emptyTxn);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const loadTransactions = useCallback(async () => {
    try {
      const res = await api.get('/api/pos/transactions');
      setTransactions(res.data.data || res.data.transactions || []);
    } catch (err) {
      console.error('[POSTerminal] transaction load failed:', err.message);
      setTransactions([]);
    }
  }, []);

  // Live POS terminals + providers + today's real transactions
  useEffect(() => {
    (async () => {
      try {
        const [devRes, provRes] = await Promise.all([
          api.get('/api/pos/devices'),
          api.get('/api/pos/providers/active').catch(() => ({ data: { data: [] } })),
        ]);
        setDevices(devRes.data.data || devRes.data.devices || []);
        setProviderCount((provRes.data.data || []).length);
      } catch (err) {
        console.error('[POSTerminal] terminal load failed:', err.message);
        setDevices([]);
        setProviderCount(0);
      }
    })();
    loadTransactions();
    (async () => {
      try {
        const res = await api.get('/api/admissions?status=Admitted');
        setAdmissions(res.data?.data || res.data || []);
      } catch (err) {
        console.error('[POSTerminal] admission load failed:', err.message);
        setAdmissions([]);
      }
    })();
  }, [loadTransactions]);

  const handleCharge = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      await api.post('/api/pos/transactions', txn);
      setShowTxn(false);
      setTxn(emptyTxn);
      await loadTransactions();
      setMessage('Transaction recorded against the patient ledger.');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Could not record the transaction.');
    } finally {
      setBusy(false);
    }
  };

  // Every figure below is derived from the transactions just loaded — no fabricated revenue.
  const totalRevenue = transactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const totalTxn = transactions.length;
  const avgTicket = totalTxn ? Math.round(totalRevenue / totalTxn) : 0;

  const byModule = Object.values(transactions.reduce((acc, t) => {
    const key = t.department || 'Unassigned';
    if (!acc[key]) acc[key] = { module: key, txnToday: 0, revenue: 0 };
    acc[key].txnToday += 1;
    acc[key].revenue += Number(t.amount || 0);
    return acc;
  }, {})).map(m => ({ ...m, avgTicket: m.txnToday ? Math.round(m.revenue / m.txnToday) : 0 }));

  const paymentSummary = Object.values(transactions.reduce((acc, t) => {
    const key = t.payment_mode || 'Unknown';
    if (!acc[key]) acc[key] = { method: key, count: 0, amount: 0 };
    acc[key].count += 1;
    acc[key].amount += Number(t.amount || 0);
    return acc;
  }, {})).map(p => ({ ...p, share: totalRevenue ? `${Math.round((p.amount / totalRevenue) * 1000) / 10}%` : '0%' }));

  const inr = (n) => `Rs.${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Point-of-Sale Terminal</h4>
          <small className="text-muted">POS with 12 service sub-modules, multi-payment, walk-in + registered</small>
        </div>
        <Button variant="success" size="lg" onClick={() => { setMessage(''); setShowTxn(true); }}>+ New Transaction</Button>
      </div>

      {message && <Alert variant="info" dismissible onClose={() => setMessage('')}>{message}</Alert>}

      <Row className="mb-3">
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{devices.length}</h3><small>POS Terminals ({providerCount} providers)</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{totalTxn}</h3><small>Transactions</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">Rs.{avgTicket}</h3><small>Avg Ticket Size</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{inr(totalRevenue)}</h3><small>Collected (live)</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="terminal" title={<span>Live Queue <Badge bg="warning" text="dark">{currentQueue.length}</Badge></span>}>
          <Card><Card.Body>
            <Table bordered hover responsive>
              <thead className="table-success">
                <tr><th>Token</th><th>Patient</th><th>Service</th><th>Dept</th><th>Amount</th><th>Payment</th><th>Time</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {currentQueue.length === 0 && (
                  <tr><td colSpan={9} className="text-center text-muted py-4">Queue is clear. Use <strong>+ New Transaction</strong> to charge a walk-in or admitted patient.</td></tr>
                )}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>

        <Tab eventKey="transactions" title="Today's Transactions">
          <Card><Card.Body>
            <Table striped hover responsive size="sm">
              <thead className="table-dark">
                <tr><th>ID</th><th>Time</th><th>Patient</th><th>Service</th><th>Amount</th><th>Payment</th><th>Operator</th><th>Status</th></tr>
              </thead>
              <tbody>
                {transactions.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted py-4">No transactions recorded yet.</td></tr>
                )}
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td><code>{t.transaction_id}</code></td>
                    <td><small>{t.initiated_at ? String(t.initiated_at).slice(0, 16).replace('T', ' ') : '—'}</small></td>
                    <td><strong>{t.patient_name || 'Walk-in'}</strong></td>
                    <td>{t.department || '—'}</td>
                    <td className="text-success fw-bold">{inr(t.amount)}</td>
                    <td><Badge bg="info">{t.payment_mode || '—'}</Badge></td>
                    <td><small>—</small></td>
                    <td><Badge bg="success">{t.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>

        <Tab eventKey="modules" title="Service Modules (12)">
          <Card><Card.Body>
            <Table bordered hover responsive>
              <thead className="table-dark">
                <tr><th>Service Module</th><th>Transactions Today</th><th>Revenue</th><th>Avg Ticket</th></tr>
              </thead>
              <tbody>
                {byModule.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-muted py-4">No service revenue yet.</td></tr>
                )}
                {byModule.map((m) => (
                  <tr key={m.module}>
                    <td><strong>{m.module}</strong></td>
                    <td className="text-center">{m.txnToday}</td>
                    <td className="text-success fw-bold">{inr(m.revenue)}</td>
                    <td>{inr(m.avgTicket)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>

        <Tab eventKey="payments" title="Payment Summary">
          <Card><Card.Body>
            <Table bordered hover responsive>
              <thead className="table-dark">
                <tr><th>Payment Method</th><th>Transactions</th><th>Amount</th><th>Share</th></tr>
              </thead>
              <tbody>
                {paymentSummary.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-muted py-4">No payments collected yet.</td></tr>
                )}
                {paymentSummary.map((p) => (
                  <tr key={p.method}>
                    <td><strong>{p.method}</strong></td>
                    <td className="text-center">{p.count}</td>
                    <td className="text-success fw-bold">{inr(p.amount)}</td>
                    <td><Badge bg="primary">{p.share}</Badge></td>
                  </tr>
                ))}
                <tr className="table-success fw-bold">
                  <td>TOTAL</td>
                  <td className="text-center">{totalTxn}</td>
                  <td>{inr(totalRevenue)}</td>
                  <td>100%</td>
                </tr>
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>
      </Tabs>

      <Modal show={showTxn} onHide={() => setShowTxn(false)} centered>
        <Modal.Header closeButton><Modal.Title>New POS Transaction</Modal.Title></Modal.Header>
        <Form onSubmit={handleCharge}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Patient (optional)</Form.Label>
              <Form.Select value={txn.patient_id} onChange={(e) => setTxn({ ...txn, patient_id: e.target.value })}>
                <option value="">Walk-in / unregistered</option>
                {admissions.map(a => (
                  <option key={a.id} value={a.patient_id}>{a.patient_name || a.patient_uhid || `Patient ${a.patient_id}`} — {a.ward || 'Ward'} {a.bed_number || ''}</option>
                ))}
              </Form.Select>
            </Form.Group>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Amount (INR)</Form.Label>
                  <Form.Control type="number" min="1" step="0.01" value={txn.amount} onChange={(e) => setTxn({ ...txn, amount: e.target.value })} required />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Payment Mode</Form.Label>
                  <Form.Select value={txn.payment_mode} onChange={(e) => setTxn({ ...txn, payment_mode: e.target.value })}>
                    <option>Cash</option>
                    <option>Card</option>
                    <option>UPI</option>
                    <option>Insurance</option>
                    <option>PMJAY</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Form.Group className="mb-3">
              <Form.Label>Service / Department</Form.Label>
              <Form.Select value={txn.service} onChange={(e) => setTxn({ ...txn, service: e.target.value })}>
                <option>OPD Consultation</option>
                <option>Laboratory</option>
                <option>Radiology</option>
                <option>Pharmacy</option>
                <option>Procedures</option>
                <option>Emergency Registration</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowTxn(false)}>Cancel</Button>
            <Button variant="success" type="submit" disabled={busy}>
              {busy ? <Spinner animation="border" size="sm" /> : 'Charge Patient'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default POSTerminal;
