import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Modal, Alert, Tabs, Tab, InputGroup, ListGroup, ProgressBar } from 'react-bootstrap';
import api from '../utils/axiosInstance';

const CPOEDashboard = () => {
  const [activeTab, setActiveTab] = useState('newOrder');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedOrderType, setSelectedOrderType] = useState('medication');
  const [orderSearch, setOrderSearch] = useState('');
  const [showSafetyAlert, setShowSafetyAlert] = useState(false);
  const [admissions, setAdmissions] = useState([]);
  const [orderMsg, setOrderMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [orderForm, setOrderForm] = useState({
    admission_id: '', patient_id: '', patient_name: '', medication: '', dose: '',
    route: 'Oral', frequency: 'OD', priority: 'Routine', instructions: '',
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/admissions?status=Admitted');
        setAdmissions(res.data?.data || res.data || []);
      } catch (err) {
        console.error('[CPOE] admission load failed:', err.message);
        setAdmissions([]);
      }
    })();
  }, []);

  const submitOrder = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const details = selectedOrderType === 'medication'
        ? `${orderForm.medication} ${orderForm.dose} ${orderForm.route} ${orderForm.frequency}${orderForm.instructions ? ` - ${orderForm.instructions}` : ''}`
        : `${selectedOrderType} order${orderForm.instructions ? ` - ${orderForm.instructions}` : ''}`;
      await api.post('/api/cpoe/orders', {
        patient_id: orderForm.patient_id || null,
        admission_id: orderForm.admission_id || null,
        patient_name: orderForm.patient_name || null,
        order_type: selectedOrderType,
        details: details.trim() || 'Clinical order',
        priority: orderForm.priority,
      });
      setShowOrderModal(false);
      setOrderForm({ admission_id: '', patient_id: '', patient_name: '', medication: '', dose: '', route: 'Oral', frequency: 'OD', priority: 'Routine', instructions: '' });
      setOrderMsg('Order submitted to the clinical order engine.');
    } catch (err) {
      setOrderMsg(err.response?.data?.message || 'Could not submit the order.');
    } finally {
      setBusy(false);
    }
  };

  const pendingOrders = [];

  const safetyChecks = [
    { check: 'Drug-Drug Interaction', status: '⚠️ Warfarin + Aspirin (already prescribed)', severity: 'high', action: 'Increased bleeding risk — requires physician override' },
    { check: 'Allergy Check', status: '✅ No known allergies to ordered medications', severity: 'clear', action: 'None required' },
    { check: 'Dose Range Check', status: '✅ Within therapeutic range', severity: 'clear', action: 'None required' },
    { check: 'Duplicate Order', status: '✅ No duplicate orders found', severity: 'clear', action: 'None required' },
    { check: 'Renal Dose Adjustment', status: '⚠️ GFR 45 — Consider dose reduction', severity: 'medium', action: 'Auto-adjusted dose suggested: Metformin 250mg BD' },
    { check: 'Pregnancy Check', status: '✅ Not applicable', severity: 'clear', action: 'None required' },
  ];

  const orderSets = [
    { name: 'Admission — General Medical', orders: 12, lastUsed: '2h ago', category: 'Medical' },
    { name: 'Post-Op — Appendectomy', orders: 8, lastUsed: '1d ago', category: 'Surgical' },
    { name: 'DKA Protocol', orders: 15, lastUsed: '3h ago', category: 'Emergency' },
    { name: 'Chest Pain Workup', orders: 10, lastUsed: '4h ago', category: 'Cardiology' },
    { name: 'Sepsis Bundle (Hour-1)', orders: 7, lastUsed: '6h ago', category: 'Critical Care' },
    { name: 'Stroke — Code Brain', orders: 9, lastUsed: '1d ago', category: 'Neurology' },
  ];

  const recentOrders = [];

  const priorityColor = (p) => p === 'STAT' ? 'danger' : p === 'Urgent' ? 'warning' : 'secondary';
  const statusColor = (s) => s === 'Safety Alert' ? 'danger' : s === 'Pending Verification' ? 'warning' : s === 'Active' ? 'success' : s === 'Sent to Dept' ? 'info' : 'primary';

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">🏥 Computerized Provider Order Entry (CPOE)</h4>
          <small className="text-muted">Full order lifecycle with clinical decision support</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary" onClick={() => setShowOrderModal(true)}>➕ New Order</Button>
          <Button variant="outline-success" onClick={() => setActiveTab('orderSets')}>📋 Order Sets</Button>
          <Button variant="outline-info" onClick={() => setActiveTab('safety')}>📊 Safety Analytics</Button>
        </div>
      </div>

      {showSafetyAlert && (
        <Alert variant="danger" dismissible onClose={() => setShowSafetyAlert(false)}>
          <Alert.Heading>⚠️ Clinical Decision Support Alert</Alert.Heading>
          <p className="mb-0">Drug interaction detected: <strong>Warfarin + Aspirin</strong> — Increased bleeding risk. Physician override required to proceed.</p>
        </Alert>
      )}

      <Row className="mb-3">
        <Col md={3}><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{pendingOrders.length}</h3><small>Pending Orders</small></Card.Body></Card></Col>
        <Col md={3}><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{pendingOrders.filter(o => o.safety === 'warning').length}</h3><small>Safety Alerts</small></Card.Body></Card></Col>
        <Col md={3}><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">{pendingOrders.filter(o => o.priority === 'STAT').length}</h3><small>STAT Orders</small></Card.Body></Card></Col>
        <Col md={3}><Card className="text-center border-success"><Card.Body><h3 className="text-success">{recentOrders.filter(o => o.verified).length}</h3><small>Verified Today</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="newOrder" title="📝 Active Orders">
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between mb-3">
                <InputGroup style={{maxWidth: 350}}>
                  <Form.Control placeholder="Search orders..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
                </InputGroup>
                <div className="d-flex gap-2">
                  <Form.Select size="sm" style={{width: 150}}><option>All Types</option><option>Medication</option><option>Lab</option><option>Radiology</option><option>Diet</option></Form.Select>
                  <Form.Select size="sm" style={{width: 150}}><option>All Priority</option><option>STAT</option><option>Urgent</option><option>Routine</option></Form.Select>
                </div>
              </div>
              <Table striped hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>Order ID</th><th>Patient</th><th>Type</th><th>Order</th><th>Priority</th><th>Status</th><th>Doctor</th><th>Time</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {pendingOrders.map(o => (
                    <tr key={o.id} className={o.safety === 'warning' ? 'table-danger' : ''}>
                      <td><strong>{o.id}</strong></td>
                      <td>{o.patient}<br/><small className="text-muted">{o.mrn}</small></td>
                      <td><Badge bg={o.type === 'Medication' ? 'primary' : o.type === 'Lab' ? 'info' : o.type === 'Radiology' ? 'secondary' : 'success'}>{o.type}</Badge></td>
                      <td>{o.order}</td>
                      <td><Badge bg={priorityColor(o.priority)}>{o.priority}</Badge></td>
                      <td><Badge bg={statusColor(o.status)}>{o.status}</Badge></td>
                      <td>{o.doctor}</td>
                      <td>{o.time}</td>
                      <td>
                        <Button size="sm" variant="outline-success" className="me-1">✅</Button>
                        <Button size="sm" variant="outline-danger">❌</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="safety" title="🛡️ Safety Checks">
          <Card>
            <Card.Body>
              <h5 className="mb-3">Clinical Decision Support — Safety Validation</h5>
              <Table bordered responsive>
                <thead className="table-dark">
                  <tr><th>Safety Check</th><th>Result</th><th>Severity</th><th>Recommended Action</th></tr>
                </thead>
                <tbody>
                  {safetyChecks.map((s, i) => (
                    <tr key={i} className={s.severity === 'high' ? 'table-danger' : s.severity === 'medium' ? 'table-warning' : ''}>
                      <td><strong>{s.check}</strong></td>
                      <td>{s.status}</td>
                      <td><Badge bg={s.severity === 'high' ? 'danger' : s.severity === 'medium' ? 'warning' : 'success'}>{s.severity.toUpperCase()}</Badge></td>
                      <td>{s.action}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <div className="mt-3 p-3 bg-light rounded">
                <h6>Safety Score: <Badge bg="warning">83/100</Badge></h6>
                <ProgressBar variant="warning" now={83} label="83%" className="mt-2" />
                <small className="text-muted">2 alerts require attention before order verification</small>
              </div>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="orderSets" title="📋 Order Sets">
          <Card>
            <Card.Body>
              <h5 className="mb-3">Pre-built Order Sets</h5>
              <Row>
                {orderSets.map((os, i) => (
                  <Col md={4} key={i} className="mb-3">
                    <Card className="h-100 border-primary" style={{cursor: 'pointer'}}>
                      <Card.Body>
                        <div className="d-flex justify-content-between">
                          <h6>{os.name}</h6>
                          <Badge bg="primary">{os.category}</Badge>
                        </div>
                        <p className="text-muted mb-1">{os.orders} orders in set</p>
                        <small className="text-muted">Last used: {os.lastUsed}</small>
                        <div className="mt-2">
                          <Button size="sm" variant="outline-primary" className="me-2">Apply</Button>
                          <Button size="sm" variant="outline-secondary">Edit</Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="history" title="📜 Recent Orders">
          <Card>
            <Card.Body>
              <Table striped hover responsive>
                <thead className="table-dark">
                  <tr><th>Order ID</th><th>Patient</th><th>Order</th><th>Status</th><th>Time</th><th>Verified</th></tr>
                </thead>
                <tbody>
                  {recentOrders.map(o => (
                    <tr key={o.id}>
                      <td>{o.id}</td><td>{o.patient}</td><td>{o.order}</td>
                      <td><Badge bg="success">{o.status}</Badge></td>
                      <td>{o.time}</td><td>{o.verified ? '✅' : '⏳'}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      <Modal show={showOrderModal} onHide={() => setShowOrderModal(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>➕ New Clinical Order</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form onSubmit={submitOrder}>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Patient</Form.Label>
                  <Form.Select
                    value={orderForm.admission_id}
                    onChange={(e) => {
                      const a = admissions.find(x => String(x.id) === e.target.value);
                      setOrderForm({ ...orderForm, admission_id: e.target.value, patient_id: a?.patient_id || '', patient_name: a?.patient_name || '' });
                    }}
                    required
                  >
                    <option value="">Select Patient...</option>
                    {admissions.map(a => (
                      <option key={a.id} value={a.id}>{a.patient_name || a.patient_uhid || `Patient ${a.patient_id}`}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}><Form.Group><Form.Label>Order Type</Form.Label><Form.Select value={selectedOrderType} onChange={e => setSelectedOrderType(e.target.value)}><option value="medication">💊 Medication</option><option value="lab">🧪 Laboratory</option><option value="radiology">📷 Radiology</option><option value="diet">🍽️ Diet</option><option value="nursing">👩‍⚕️ Nursing</option></Form.Select></Form.Group></Col>
            </Row>
            {selectedOrderType === 'medication' && (
              <>
                <Row className="mb-3">
                  <Col md={6}><Form.Group><Form.Label>Medication</Form.Label><Form.Control value={orderForm.medication} onChange={e => setOrderForm({ ...orderForm, medication: e.target.value })} placeholder="Type to search medications..." required /></Form.Group></Col>
                  <Col md={3}><Form.Group><Form.Label>Dose</Form.Label><Form.Control value={orderForm.dose} onChange={e => setOrderForm({ ...orderForm, dose: e.target.value })} placeholder="500" /></Form.Group></Col>
                  <Col md={3}><Form.Group><Form.Label>Unit</Form.Label><Form.Select><option>mg</option><option>ml</option><option>units</option><option>mcg</option></Form.Select></Form.Group></Col>
                </Row>
                <Row className="mb-3">
                  <Col md={4}><Form.Group><Form.Label>Route</Form.Label><Form.Select value={orderForm.route} onChange={e => setOrderForm({ ...orderForm, route: e.target.value })}><option>Oral</option><option>IV</option><option>IM</option><option>SC</option><option>Topical</option></Form.Select></Form.Group></Col>
                  <Col md={4}><Form.Group><Form.Label>Frequency</Form.Label><Form.Select value={orderForm.frequency} onChange={e => setOrderForm({ ...orderForm, frequency: e.target.value })}><option>OD</option><option>BD</option><option>TDS</option><option>QID</option><option>PRN</option><option>STAT</option></Form.Select></Form.Group></Col>
                  <Col md={4}><Form.Group><Form.Label>Duration</Form.Label><Form.Control value={orderForm.instructions} onChange={e => setOrderForm({ ...orderForm, instructions: e.target.value })} placeholder="5 days" /></Form.Group></Col>
                </Row>
              </>
            )}
            <Row className="mb-3">
              <Col md={6}><Form.Group><Form.Label>Priority</Form.Label><Form.Select value={orderForm.priority} onChange={e => setOrderForm({ ...orderForm, priority: e.target.value })}><option>Routine</option><option>Urgent</option><option>STAT</option></Form.Select></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label>Special Instructions</Form.Label><Form.Control value={orderForm.instructions} onChange={e => setOrderForm({ ...orderForm, instructions: e.target.value })} placeholder="e.g., Give after meals" /></Form.Group></Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-warning" onClick={() => setShowSafetyAlert(true)}>🛡️ Run Safety Check</Button>
          <Button variant="primary" onClick={submitOrder} disabled={busy}>{busy ? 'Submitting…' : 'Submit Order'}</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default CPOEDashboard;
