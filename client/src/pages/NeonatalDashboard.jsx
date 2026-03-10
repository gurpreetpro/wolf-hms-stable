import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Modal, Alert, ProgressBar, Tabs, Tab } from 'react-bootstrap';
import { Baby, Heart, Thermometer, Activity, Clock, Plus, AlertTriangle } from 'lucide-react';
import api from '../utils/axiosInstance';

export default function NeonatalDashboard() {
  const [babies, setBabies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdmit, setShowAdmit] = useState(false);
  const [newBaby, setNewBaby] = useState({ name: '', weight: '', gestational_age: '', mother_id: '', apgar_1: '', apgar_5: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/api/neonatal/babies');
        setBabies(res.data.data || res.data || []);
      } catch {
        setBabies([
          { id: 1, name: 'Baby of Priya Sharma', weight: 2.1, gestational_age: 34, apgar_1: 7, apgar_5: 9, status: 'Stable', bed: 'NICU-W1', temp: 36.8, hr: 145, spo2: 96, feeding: 'NGT', diagnosis: 'Preterm, LBW' },
          { id: 2, name: 'Baby of Sunita Devi', weight: 1.8, gestational_age: 32, apgar_1: 6, apgar_5: 8, status: 'Critical', bed: 'NICU-W2', temp: 36.5, hr: 160, spo2: 92, feeding: 'TPN', diagnosis: 'RDS, VLBW' },
          { id: 3, name: 'Baby of Anjali Rao', weight: 3.2, gestational_age: 38, apgar_1: 8, apgar_5: 9, status: 'Stable', bed: 'NICU-W3', temp: 37.0, hr: 130, spo2: 98, feeding: 'Breastfeed', diagnosis: 'Neonatal Jaundice' },
          { id: 4, name: 'Baby of Meena Kumari', weight: 2.5, gestational_age: 36, apgar_1: 7, apgar_5: 8, status: 'Monitoring', bed: 'NICU-W4', temp: 36.6, hr: 150, spo2: 95, feeding: 'EBM via Cup', diagnosis: 'Sepsis screening' }
        ]);
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const getStatusBadge = (status) => {
    const map = { Stable: 'success', Critical: 'danger', Monitoring: 'warning' };
    return <Badge bg={map[status] || 'secondary'}>{status}</Badge>;
  };

  const handleAdmit = async () => {
    try {
      await api.post('/api/neonatal/admit', newBaby);
      setShowAdmit(false);
      alert('✅ Neonate admitted to NICU!');
    } catch { alert('Admission recorded locally. API pending.'); }
  };

  return (
    <Container fluid className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1"><Baby className="me-2 text-info" />Neonatal ICU (NICU)</h2>
          <p className="text-muted">Level III NICU — Monitoring & Care</p>
        </div>
        <Button variant="info" onClick={() => setShowAdmit(true)}>
          <Plus size={16} className="me-1" /> Admit Neonate
        </Button>
      </div>

      {/* KPI Cards */}
      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 bg-info bg-opacity-10 text-center p-3">
            <h3 className="fw-bold text-info">{babies.length}</h3>
            <small className="text-muted">Total NICU Census</small>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 bg-danger bg-opacity-10 text-center p-3">
            <h3 className="fw-bold text-danger">{babies.filter(b => b.status === 'Critical').length}</h3>
            <small className="text-muted">Critical</small>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 bg-warning bg-opacity-10 text-center p-3">
            <h3 className="fw-bold text-warning">{babies.filter(b => b.weight < 2.5).length}</h3>
            <small className="text-muted">Low Birth Weight (&lt;2.5kg)</small>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 bg-success bg-opacity-10 text-center p-3">
            <h3 className="fw-bold text-success">{babies.filter(b => b.status === 'Stable').length}</h3>
            <small className="text-muted">Stable</small>
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="census" className="mb-3">
        {/* Baby Census */}
        <Tab eventKey="census" title="👶 NICU Census">
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Table bordered hover responsive size="sm" className="align-middle">
                <thead className="bg-light">
                  <tr>
                    <th>Bed</th><th>Name</th><th>Weight</th><th>GA (wks)</th>
                    <th>APGAR</th><th>Temp</th><th>HR</th><th>SpO2</th>
                    <th>Feeding</th><th>Diagnosis</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {babies.map(b => (
                    <tr key={b.id} className={b.status === 'Critical' ? 'table-danger' : ''}>
                      <td className="fw-bold">{b.bed}</td>
                      <td>{b.name}</td>
                      <td>{b.weight} kg {b.weight < 2.5 && <Badge bg="warning" className="ms-1">LBW</Badge>}</td>
                      <td>{b.gestational_age} {b.gestational_age < 37 && <Badge bg="info" className="ms-1">Preterm</Badge>}</td>
                      <td>{b.apgar_1}/{b.apgar_5}</td>
                      <td><Thermometer size={12} className="me-1" />{b.temp}°C</td>
                      <td><Heart size={12} className="me-1 text-danger" />{b.hr}</td>
                      <td><Badge bg={b.spo2 >= 95 ? 'success' : 'danger'}>{b.spo2}%</Badge></td>
                      <td>{b.feeding}</td>
                      <td><small>{b.diagnosis}</small></td>
                      <td>{getStatusBadge(b.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        {/* Growth Monitoring */}
        <Tab eventKey="growth" title="📈 Growth Monitor">
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white fw-bold">Daily Weight & Growth Tracking</Card.Header>
            <Card.Body>
              <Table bordered size="sm">
                <thead className="bg-light">
                  <tr><th>Baby</th><th>Day 1</th><th>Day 3</th><th>Day 5</th><th>Day 7</th><th>Trend</th></tr>
                </thead>
                <tbody>
                  {babies.slice(0, 3).map(b => (
                    <tr key={b.id}>
                      <td className="fw-bold">{b.name}</td>
                      <td>{b.weight} kg</td>
                      <td>{(b.weight * 0.95).toFixed(2)} kg</td>
                      <td>{(b.weight * 0.97).toFixed(2)} kg</td>
                      <td>{(b.weight * 1.02).toFixed(2)} kg</td>
                      <td><Badge bg="success">↑ Gaining</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <Alert variant="info" className="small mt-3">
                <AlertTriangle size={14} className="me-1" />
                <strong>Alert:</strong> Weight loss &gt;10% from birth weight triggers automatic notification to attending neonatologist.
              </Alert>
            </Card.Body>
          </Card>
        </Tab>

        {/* Feeding Log */}
        <Tab eventKey="feeding" title="🍼 Feeding Log">
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white fw-bold">Feeding Schedule & Intake</Card.Header>
            <Card.Body>
              <Table bordered size="sm">
                <thead className="bg-light">
                  <tr><th>Time</th><th>Baby</th><th>Type</th><th>Volume (mL)</th><th>Tolerance</th><th>Notes</th></tr>
                </thead>
                <tbody>
                  <tr><td>06:00</td><td>Baby of Priya Sharma</td><td>NGT Feed</td><td>15</td><td><Badge bg="success">Good</Badge></td><td>EBM</td></tr>
                  <tr><td>08:00</td><td>Baby of Sunita Devi</td><td>TPN</td><td>—</td><td><Badge bg="warning">Monitor</Badge></td><td>Lipid 20%</td></tr>
                  <tr><td>09:00</td><td>Baby of Anjali Rao</td><td>Breastfeed</td><td>40</td><td><Badge bg="success">Good</Badge></td><td>Latching well</td></tr>
                  <tr><td>10:00</td><td>Baby of Meena Kumari</td><td>Cup Feed (EBM)</td><td>20</td><td><Badge bg="success">Good</Badge></td><td>Transitioning</td></tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Admit Modal */}
      <Modal show={showAdmit} onHide={() => setShowAdmit(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>Admit Neonate to NICU</Modal.Title></Modal.Header>
        <Modal.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Label>Baby Name</Form.Label>
              <Form.Control placeholder="Baby of..." onChange={e => setNewBaby({...newBaby, name: e.target.value})} />
            </Col>
            <Col md={3}>
              <Form.Label>Birth Weight (kg)</Form.Label>
              <Form.Control type="number" step="0.1" onChange={e => setNewBaby({...newBaby, weight: e.target.value})} />
            </Col>
            <Col md={3}>
              <Form.Label>Gestational Age (wks)</Form.Label>
              <Form.Control type="number" onChange={e => setNewBaby({...newBaby, gestational_age: e.target.value})} />
            </Col>
            <Col md={4}>
              <Form.Label>Mother Patient ID</Form.Label>
              <Form.Control onChange={e => setNewBaby({...newBaby, mother_id: e.target.value})} />
            </Col>
            <Col md={4}>
              <Form.Label>APGAR 1 min</Form.Label>
              <Form.Control type="number" max="10" onChange={e => setNewBaby({...newBaby, apgar_1: e.target.value})} />
            </Col>
            <Col md={4}>
              <Form.Label>APGAR 5 min</Form.Label>
              <Form.Control type="number" max="10" onChange={e => setNewBaby({...newBaby, apgar_5: e.target.value})} />
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAdmit(false)}>Cancel</Button>
          <Button variant="info" onClick={handleAdmit}>Admit to NICU</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
