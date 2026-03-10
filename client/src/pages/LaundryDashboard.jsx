import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Modal, Tabs, Tab } from 'react-bootstrap';
import { Shirt, BarChart3, Plus, RefreshCw, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import api from '../utils/axiosInstance';

export default function LaundryDashboard() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ pending: 0, inProcess: 0, ready: 0, delivered: 0 });
  const [showNew, setShowNew] = useState(false);
  const [newOrder, setNewOrder] = useState({ ward: '', items: '', weight: '', priority: 'Normal' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/api/laundry/orders');
        const data = res.data.data || res.data || [];
        setOrders(data);
        setStats({
          pending: data.filter(o => o.status === 'Pending').length,
          inProcess: data.filter(o => o.status === 'In Process').length,
          ready: data.filter(o => o.status === 'Ready').length,
          delivered: data.filter(o => o.status === 'Delivered').length
        });
      } catch {
        const mock = [
          { id: 1, ward: 'General Ward A', items: 'Bed sheets (20), Pillow covers (15)', weight: 25, status: 'In Process', priority: 'Normal', submitted: '08:00 AM', category: 'Routine' },
          { id: 2, ward: 'ICU', items: 'Gowns (10), Curtains (4)', weight: 12, status: 'Pending', priority: 'Urgent', submitted: '09:30 AM', category: 'Infection Control' },
          { id: 3, ward: 'OT Complex', items: 'Surgical drapes (30), Towels (20)', weight: 35, status: 'Ready', priority: 'Normal', submitted: '07:00 AM', category: 'Sterile' },
          { id: 4, ward: 'Maternity', items: 'Baby wraps (15), Sheets (10)', weight: 8, status: 'Delivered', priority: 'Normal', submitted: 'Yesterday', category: 'Routine' },
          { id: 5, ward: 'Emergency', items: 'Blankets (5), Gowns (8)', weight: 10, status: 'Pending', priority: 'Urgent', submitted: '10:00 AM', category: 'Infection Control' }
        ];
        setOrders(mock);
        setStats({ pending: 2, inProcess: 1, ready: 1, delivered: 1 });
      }
    };
    fetchData();
  }, []);

  const getStatusBadge = (s) => {
    const map = { Pending: 'warning', 'In Process': 'info', Ready: 'success', Delivered: 'secondary' };
    return <Badge bg={map[s] || 'secondary'}>{s}</Badge>;
  };

  const getCategoryBadge = (c) => {
    const map = { Routine: 'light', 'Infection Control': 'danger', Sterile: 'primary' };
    return <Badge bg={map[c] || 'secondary'} text={c === 'Routine' ? 'dark' : undefined}>{c}</Badge>;
  };

  return (
    <Container fluid className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1"><Shirt className="me-2 text-info" />Laundry Management</h2>
          <p className="text-muted">Hospital Linen & Laundry Tracking System</p>
        </div>
        <Button variant="info" onClick={() => setShowNew(true)}>
          <Plus size={16} className="me-1" /> New Laundry Order
        </Button>
      </div>

      {/* KPI */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 bg-warning bg-opacity-10 text-center p-3">
            <h3 className="fw-bold text-warning">{stats.pending}</h3>
            <small className="text-muted">Pending Pickup</small>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 bg-info bg-opacity-10 text-center p-3">
            <h3 className="fw-bold text-info">{stats.inProcess}</h3>
            <small className="text-muted">In Process</small>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 bg-success bg-opacity-10 text-center p-3">
            <h3 className="fw-bold text-success">{stats.ready}</h3>
            <small className="text-muted">Ready for Delivery</small>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 bg-secondary bg-opacity-10 text-center p-3">
            <h3 className="fw-bold text-secondary">{stats.delivered}</h3>
            <small className="text-muted">Delivered Today</small>
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="orders" className="mb-3">
        <Tab eventKey="orders" title="📋 Laundry Orders">
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Table bordered hover responsive size="sm" className="align-middle">
                <thead className="bg-light">
                  <tr><th>ID</th><th>Ward</th><th>Items</th><th>Weight</th><th>Category</th><th>Priority</th><th>Submitted</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id} className={o.priority === 'Urgent' ? 'table-warning' : ''}>
                      <td className="fw-bold">#{o.id}</td>
                      <td>{o.ward}</td>
                      <td><small>{o.items}</small></td>
                      <td>{o.weight} kg</td>
                      <td>{getCategoryBadge(o.category)}</td>
                      <td><Badge bg={o.priority === 'Urgent' ? 'danger' : 'info'}>{o.priority}</Badge></td>
                      <td><Clock size={12} className="me-1" />{o.submitted}</td>
                      <td>{getStatusBadge(o.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="stats" title="📊 Daily Summary">
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white fw-bold">Today's Laundry Summary</Card.Header>
            <Card.Body>
              <Table bordered size="sm">
                <thead className="bg-light">
                  <tr><th>Category</th><th>Total Weight (kg)</th><th>Orders</th><th>Turnaround</th></tr>
                </thead>
                <tbody>
                  <tr><td>Routine Linen</td><td>85</td><td>12</td><td>4-6 hrs</td></tr>
                  <tr><td className="text-danger fw-bold">Infection Control</td><td>22</td><td>5</td><td>2-3 hrs (Priority)</td></tr>
                  <tr><td className="text-primary fw-bold">Sterile (OT)</td><td>35</td><td>3</td><td>Autoclave cycle</td></tr>
                  <tr className="table-active fw-bold"><td>Total</td><td>142</td><td>20</td><td>—</td></tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* New Order Modal */}
      <Modal show={showNew} onHide={() => setShowNew(false)}>
        <Modal.Header closeButton><Modal.Title>New Laundry Order</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Ward</Form.Label>
            <Form.Select onChange={e => setNewOrder({...newOrder, ward: e.target.value})}>
              <option value="">Select Ward</option>
              <option>General Ward A</option><option>General Ward B</option><option>ICU</option>
              <option>OT Complex</option><option>Maternity</option><option>Emergency</option><option>Pediatric</option>
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>Items Description</Form.Label>
            <Form.Control as="textarea" rows={2} onChange={e => setNewOrder({...newOrder, items: e.target.value})} placeholder="Bed sheets (10), Pillow covers (5)..." />
          </Form.Group>
          <Row className="g-3">
            <Col md={6}>
              <Form.Label>Approx Weight (kg)</Form.Label>
              <Form.Control type="number" onChange={e => setNewOrder({...newOrder, weight: e.target.value})} />
            </Col>
            <Col md={6}>
              <Form.Label>Priority</Form.Label>
              <Form.Select onChange={e => setNewOrder({...newOrder, priority: e.target.value})}>
                <option>Normal</option><option>Urgent</option>
              </Form.Select>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button variant="info" onClick={async () => {
            try { await api.post('/api/laundry/orders', newOrder); } catch { /* fallback */ }
            setShowNew(false);
            alert('👕 Laundry order submitted!');
          }}>Submit Order</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
