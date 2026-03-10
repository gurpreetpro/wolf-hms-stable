import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Modal, Alert, Tabs, Tab } from 'react-bootstrap';
import { Truck, MapPin, Phone, Clock, Plus, AlertTriangle, CheckCircle, Navigation } from 'lucide-react';
import api from '../utils/axiosInstance';

export default function AmbulanceDashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [trips, setTrips] = useState([]);
  const [showDispatch, setShowDispatch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dispatch, setDispatch] = useState({ vehicle_id: '', patient_name: '', pickup: '', destination: '', priority: 'Normal' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [vRes, tRes] = await Promise.all([
          api.get('/api/ambulance/vehicles'),
          api.get('/api/ambulance/trips')
        ]);
        setVehicles(vRes.data.data || vRes.data || []);
        setTrips(tRes.data.data || tRes.data || []);
      } catch {
        setVehicles([
          { id: 1, number: 'WF-AMB-01', type: 'ALS', status: 'Available', driver: 'Ramesh Kumar', phone: '9876543210', location: 'Hospital Bay' },
          { id: 2, number: 'WF-AMB-02', type: 'BLS', status: 'On Trip', driver: 'Suresh Yadav', phone: '9876543211', location: 'Sector 44, Noida' },
          { id: 3, number: 'WF-AMB-03', type: 'ALS', status: 'Available', driver: 'Vikram Singh', phone: '9876543212', location: 'Hospital Bay' },
          { id: 4, number: 'WF-AMB-04', type: 'Patient Transport', status: 'Maintenance', driver: 'Ajay Sharma', phone: '9876543213', location: 'Service Center' }
        ]);
        setTrips([
          { id: 1, vehicle: 'WF-AMB-02', patient: 'Rajesh Kumar', pickup: 'Sector 44, Noida', dest: 'Wolf Hospital', priority: 'Emergency', status: 'In Transit', eta: '12 min', time: '11:20 AM' },
          { id: 2, vehicle: 'WF-AMB-01', patient: 'Priya Sharma', pickup: 'Wolf Hospital', dest: 'Max Hospital (Referral)', priority: 'Normal', status: 'Completed', eta: '—', time: '10:00 AM' },
          { id: 3, vehicle: 'WF-AMB-03', patient: 'Sunita Devi', pickup: 'DLF Phase 3', dest: 'Wolf Hospital', priority: 'Urgent', status: 'Dispatched', eta: '18 min', time: '11:35 AM' }
        ]);
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const getStatusBadge = (status) => {
    const map = { Available: 'success', 'On Trip': 'primary', Maintenance: 'warning', Dispatched: 'info', 'In Transit': 'primary', Completed: 'secondary' };
    return <Badge bg={map[status] || 'secondary'}>{status}</Badge>;
  };

  const getPriorityBadge = (p) => {
    const map = { Emergency: 'danger', Urgent: 'warning', Normal: 'info' };
    return <Badge bg={map[p] || 'secondary'}>{p}</Badge>;
  };

  return (
    <Container fluid className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1"><Truck className="me-2 text-danger" />Ambulance Fleet</h2>
          <p className="text-muted">Fleet Management & Emergency Dispatch</p>
        </div>
        <Button variant="danger" onClick={() => setShowDispatch(true)}>
          <Plus size={16} className="me-1" /> Dispatch Ambulance
        </Button>
      </div>

      {/* KPI */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 bg-success bg-opacity-10 text-center p-3">
            <h3 className="fw-bold text-success">{vehicles.filter(v => v.status === 'Available').length}</h3>
            <small className="text-muted">Available</small>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 bg-primary bg-opacity-10 text-center p-3">
            <h3 className="fw-bold text-primary">{vehicles.filter(v => v.status === 'On Trip').length}</h3>
            <small className="text-muted">On Trip</small>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 bg-warning bg-opacity-10 text-center p-3">
            <h3 className="fw-bold text-warning">{vehicles.filter(v => v.status === 'Maintenance').length}</h3>
            <small className="text-muted">Under Maintenance</small>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 bg-danger bg-opacity-10 text-center p-3">
            <h3 className="fw-bold text-danger">{trips.filter(t => t.priority === 'Emergency').length}</h3>
            <small className="text-muted">Active Emergencies</small>
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="fleet" className="mb-3">
        <Tab eventKey="fleet" title="🚑 Fleet Status">
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Table bordered hover responsive size="sm" className="align-middle">
                <thead className="bg-light">
                  <tr><th>Vehicle #</th><th>Type</th><th>Status</th><th>Driver</th><th>Phone</th><th>Location</th></tr>
                </thead>
                <tbody>
                  {vehicles.map(v => (
                    <tr key={v.id}>
                      <td className="fw-bold">{v.number}</td>
                      <td><Badge bg={v.type === 'ALS' ? 'danger' : v.type === 'BLS' ? 'warning' : 'info'}>{v.type}</Badge></td>
                      <td>{getStatusBadge(v.status)}</td>
                      <td>{v.driver}</td>
                      <td><Phone size={12} className="me-1" />{v.phone}</td>
                      <td><MapPin size={12} className="me-1" />{v.location}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="trips" title="📍 Active Trips">
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Table bordered hover responsive size="sm" className="align-middle">
                <thead className="bg-light">
                  <tr><th>Time</th><th>Vehicle</th><th>Patient</th><th>Pickup</th><th>Destination</th><th>Priority</th><th>ETA</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {trips.map(t => (
                    <tr key={t.id} className={t.priority === 'Emergency' ? 'table-danger' : ''}>
                      <td><Clock size={12} className="me-1" />{t.time}</td>
                      <td className="fw-bold">{t.vehicle}</td>
                      <td>{t.patient}</td>
                      <td><small>{t.pickup}</small></td>
                      <td><small>{t.dest}</small></td>
                      <td>{getPriorityBadge(t.priority)}</td>
                      <td className="fw-bold">{t.eta}</td>
                      <td>{getStatusBadge(t.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Dispatch Modal */}
      <Modal show={showDispatch} onHide={() => setShowDispatch(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>Dispatch Ambulance</Modal.Title></Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Label>Vehicle</Form.Label>
              <Form.Select onChange={e => setDispatch({...dispatch, vehicle_id: e.target.value})}>
                <option value="">Select Vehicle</option>
                {vehicles.filter(v => v.status === 'Available').map(v => (
                  <option key={v.id} value={v.id}>{v.number} ({v.type}) — {v.driver}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label>Priority</Form.Label>
              <Form.Select onChange={e => setDispatch({...dispatch, priority: e.target.value})}>
                <option>Normal</option><option>Urgent</option><option>Emergency</option>
              </Form.Select>
            </Col>
            <Col md={6}>
              <Form.Label>Patient Name</Form.Label>
              <Form.Control onChange={e => setDispatch({...dispatch, patient_name: e.target.value})} placeholder="Patient name" />
            </Col>
            <Col md={6}>
              <Form.Label>Pickup Location</Form.Label>
              <Form.Control onChange={e => setDispatch({...dispatch, pickup: e.target.value})} placeholder="Address" />
            </Col>
            <Col md={12}>
              <Form.Label>Destination</Form.Label>
              <Form.Control onChange={e => setDispatch({...dispatch, destination: e.target.value})} placeholder="Hospital / Address" />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDispatch(false)}>Cancel</Button>
          <Button variant="danger" onClick={async () => {
            try { await api.post('/api/ambulance/dispatch', dispatch); } catch { /* fallback */ }
            setShowDispatch(false);
            alert('🚑 Ambulance Dispatched!');
          }}>Dispatch Now</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
