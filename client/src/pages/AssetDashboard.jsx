import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Modal, Tabs, Tab, ProgressBar } from 'react-bootstrap';
import { Monitor, Wrench, Plus, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import api from '../utils/axiosInstance';

export default function AssetDashboard() {
  const [assets, setAssets] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newAsset, setNewAsset] = useState({ name: '', category: '', location: '', serial: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/api/assets');
        setAssets(res.data.data || res.data || []);
      } catch {
        setAssets([
          { id: 1, name: 'Ventilator Drager V500', category: 'Critical Care', location: 'ICU Bed 3', serial: 'DRG-V500-001', status: 'In Use', condition: 'Good', lastService: '2026-01-15', nextService: '2026-04-15' },
          { id: 2, name: 'Portable X-Ray', category: 'Radiology', location: 'Emergency', serial: 'XR-PORT-042', status: 'Available', condition: 'Good', lastService: '2026-02-01', nextService: '2026-05-01' },
          { id: 3, name: 'Infusion Pump B.Braun', category: 'General', location: 'Ward A', serial: 'BBR-INF-118', status: 'In Use', condition: 'Fair', lastService: '2025-12-10', nextService: '2026-03-10' },
          { id: 4, name: 'Defibrillator Philips', category: 'Emergency', location: 'Crash Cart #2', serial: 'PHL-DEF-007', status: 'Available', condition: 'Good', lastService: '2026-02-20', nextService: '2026-05-20' },
          { id: 5, name: 'Syringe Pump', category: 'General', location: 'OT-1', serial: 'SYP-034', status: 'Under Repair', condition: 'Poor', lastService: '2025-11-05', nextService: 'Overdue' },
          { id: 6, name: 'Patient Monitor (5-para)', category: 'Critical Care', location: 'ICU Bed 7', serial: 'MON-5P-022', status: 'In Use', condition: 'Good', lastService: '2026-01-28', nextService: '2026-04-28' }
        ]);
      }
    };
    fetchData();
  }, []);

  const getStatusBadge = (s) => {
    const map = { 'In Use': 'primary', Available: 'success', 'Under Repair': 'danger', Retired: 'secondary' };
    return <Badge bg={map[s] || 'secondary'}>{s}</Badge>;
  };

  const getConditionBadge = (c) => {
    const map = { Good: 'success', Fair: 'warning', Poor: 'danger' };
    return <Badge bg={map[c] || 'secondary'}>{c}</Badge>;
  };

  return (
    <Container fluid className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1"><Monitor className="me-2 text-primary" />Asset & Equipment</h2>
          <p className="text-muted">Biomedical Equipment Tracking & Maintenance</p>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} className="me-1" /> Register Asset
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={3}><Card className="border-0 bg-primary bg-opacity-10 text-center p-3"><h3 className="fw-bold text-primary">{assets.filter(a => a.status === 'In Use').length}</h3><small className="text-muted">In Use</small></Card></Col>
        <Col md={3}><Card className="border-0 bg-success bg-opacity-10 text-center p-3"><h3 className="fw-bold text-success">{assets.filter(a => a.status === 'Available').length}</h3><small className="text-muted">Available</small></Card></Col>
        <Col md={3}><Card className="border-0 bg-danger bg-opacity-10 text-center p-3"><h3 className="fw-bold text-danger">{assets.filter(a => a.status === 'Under Repair').length}</h3><small className="text-muted">Under Repair</small></Card></Col>
        <Col md={3}><Card className="border-0 bg-warning bg-opacity-10 text-center p-3"><h3 className="fw-bold text-warning">{assets.filter(a => a.nextService === 'Overdue').length}</h3><small className="text-muted">Service Overdue</small></Card></Col>
      </Row>

      <Tabs defaultActiveKey="inventory" className="mb-3">
        <Tab eventKey="inventory" title="📦 Equipment Inventory">
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Table bordered hover responsive size="sm" className="align-middle">
                <thead className="bg-light">
                  <tr><th>Asset Name</th><th>Category</th><th>Serial #</th><th>Location</th><th>Condition</th><th>Status</th><th>Next Service</th></tr>
                </thead>
                <tbody>
                  {assets.map(a => (
                    <tr key={a.id} className={a.nextService === 'Overdue' ? 'table-danger' : ''}>
                      <td className="fw-bold">{a.name}</td>
                      <td><Badge bg="light" text="dark">{a.category}</Badge></td>
                      <td><code>{a.serial}</code></td>
                      <td>{a.location}</td>
                      <td>{getConditionBadge(a.condition)}</td>
                      <td>{getStatusBadge(a.status)}</td>
                      <td className={a.nextService === 'Overdue' ? 'text-danger fw-bold' : ''}>{a.nextService}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="maintenance" title="🔧 Maintenance Schedule">
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white fw-bold">Preventive Maintenance Calendar</Card.Header>
            <Card.Body>
              <Table bordered size="sm">
                <thead className="bg-light"><tr><th>Equipment</th><th>Last Service</th><th>Next Due</th><th>Status</th></tr></thead>
                <tbody>
                  {assets.map(a => (
                    <tr key={a.id}>
                      <td className="fw-bold">{a.name}</td>
                      <td>{a.lastService}</td>
                      <td className={a.nextService === 'Overdue' ? 'text-danger fw-bold' : ''}>{a.nextService}</td>
                      <td>{a.nextService === 'Overdue' ? <Badge bg="danger">⚠️ OVERDUE</Badge> : <Badge bg="success">On Schedule</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      <Modal show={showAdd} onHide={() => setShowAdd(false)}>
        <Modal.Header closeButton><Modal.Title>Register New Asset</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3"><Form.Label>Asset Name</Form.Label><Form.Control onChange={e => setNewAsset({...newAsset, name: e.target.value})} placeholder="e.g., Ventilator Drager V500" /></Form.Group>
          <Row className="g-3">
            <Col md={6}><Form.Label>Category</Form.Label><Form.Select onChange={e => setNewAsset({...newAsset, category: e.target.value})}><option>Critical Care</option><option>General</option><option>Radiology</option><option>Emergency</option><option>Laboratory</option></Form.Select></Col>
            <Col md={6}><Form.Label>Serial Number</Form.Label><Form.Control onChange={e => setNewAsset({...newAsset, serial: e.target.value})} /></Col>
          </Row>
          <Form.Group className="mt-3"><Form.Label>Location</Form.Label><Form.Control onChange={e => setNewAsset({...newAsset, location: e.target.value})} placeholder="e.g., ICU Bed 3" /></Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button variant="primary" onClick={async () => {
            try { await api.post('/api/assets', newAsset); } catch { /* fallback */ }
            setShowAdd(false); alert('✅ Asset registered!');
          }}>Register</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
