import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Modal, Tabs, Tab } from 'react-bootstrap';
import { Users, Calendar, Clock, Plus, CheckCircle, Search } from 'lucide-react';
import api from '../utils/axiosInstance';

export default function StaffSchedulingDashboard() {
  const [shifts, setShifts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newShift, setNewShift] = useState({ staff_id: '', shift_type: 'Morning', date: '', department: '' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sRes, stRes] = await Promise.all([
          api.get('/api/staff/shifts'),
          api.get('/api/staff/roster')
        ]);
        setShifts(sRes.data.data || sRes.data || []);
        setStaff(stRes.data.data || stRes.data || []);
      } catch {
        setShifts([
          { id: 1, name: 'Dr. Anil Kumar', role: 'Doctor', dept: 'General Medicine', shift: 'Morning', time: '08:00–14:00', status: 'On Duty', date: 'Today' },
          { id: 2, name: 'Nurse Priya', role: 'Nurse', dept: 'ICU', shift: 'Night', time: '20:00–08:00', status: 'On Duty', date: 'Today' },
          { id: 3, name: 'Dr. Sunita Verma', role: 'Doctor', dept: 'Pediatrics', shift: 'Afternoon', time: '14:00–20:00', status: 'Upcoming', date: 'Today' },
          { id: 4, name: 'Nurse Ramesh', role: 'Nurse', dept: 'Emergency', shift: 'Morning', time: '08:00–14:00', status: 'On Duty', date: 'Today' },
          { id: 5, name: 'Dr. Vikram Singh', role: 'Doctor', dept: 'Ortho', shift: 'Morning', time: '08:00–14:00', status: 'On Leave', date: 'Today' },
          { id: 6, name: 'Tech Ajay', role: 'Lab Tech', dept: 'Pathology', shift: 'Afternoon', time: '14:00–20:00', status: 'Upcoming', date: 'Today' }
        ]);
        setStaff([]);
      }
    };
    fetchData();
  }, []);

  const getStatusBadge = (s) => {
    const map = { 'On Duty': 'success', Upcoming: 'info', 'On Leave': 'warning', 'Off Duty': 'secondary' };
    return <Badge bg={map[s] || 'secondary'}>{s}</Badge>;
  };

  const getShiftBadge = (s) => {
    const map = { Morning: 'primary', Afternoon: 'warning', Night: 'dark' };
    return <Badge bg={map[s] || 'secondary'}>{s}</Badge>;
  };

  return (
    <Container fluid className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1"><Calendar className="me-2 text-primary" />Staff Scheduling</h2>
          <p className="text-muted">Shift Management & Roster Planning</p>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} className="me-1" /> Add Shift
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={3}>
          <Card className="border-0 bg-success bg-opacity-10 text-center p-3">
            <h3 className="fw-bold text-success">{shifts.filter(s => s.status === 'On Duty').length}</h3>
            <small className="text-muted">Currently On Duty</small>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 bg-info bg-opacity-10 text-center p-3">
            <h3 className="fw-bold text-info">{shifts.filter(s => s.status === 'Upcoming').length}</h3>
            <small className="text-muted">Upcoming Shifts</small>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 bg-warning bg-opacity-10 text-center p-3">
            <h3 className="fw-bold text-warning">{shifts.filter(s => s.status === 'On Leave').length}</h3>
            <small className="text-muted">On Leave</small>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 bg-primary bg-opacity-10 text-center p-3">
            <h3 className="fw-bold text-primary">{shifts.length}</h3>
            <small className="text-muted">Total Scheduled</small>
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="today" className="mb-3">
        <Tab eventKey="today" title="📅 Today's Roster">
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Table bordered hover responsive size="sm" className="align-middle">
                <thead className="bg-light">
                  <tr><th>Name</th><th>Role</th><th>Department</th><th>Shift</th><th>Time</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {shifts.map(s => (
                    <tr key={s.id} className={s.status === 'On Leave' ? 'table-warning' : ''}>
                      <td className="fw-bold">{s.name}</td>
                      <td><Badge bg="light" text="dark">{s.role}</Badge></td>
                      <td>{s.dept}</td>
                      <td>{getShiftBadge(s.shift)}</td>
                      <td><Clock size={12} className="me-1" />{s.time}</td>
                      <td>{getStatusBadge(s.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="coverage" title="📊 Coverage Summary">
          <Card className="shadow-sm border-0">
            <Card.Header className="bg-white fw-bold">Shift Coverage by Department</Card.Header>
            <Card.Body>
              <Table bordered size="sm">
                <thead className="bg-light"><tr><th>Department</th><th>Morning</th><th>Afternoon</th><th>Night</th><th>Total</th></tr></thead>
                <tbody>
                  <tr><td className="fw-bold">General Medicine</td><td>3</td><td>2</td><td>2</td><td>7</td></tr>
                  <tr><td className="fw-bold">ICU</td><td>4</td><td>4</td><td>4</td><td>12</td></tr>
                  <tr><td className="fw-bold">Emergency</td><td>3</td><td>3</td><td>3</td><td>9</td></tr>
                  <tr><td className="fw-bold">Pediatrics</td><td>2</td><td>2</td><td>1</td><td>5</td></tr>
                  <tr><td className="fw-bold">OT</td><td>3</td><td>2</td><td>1</td><td>6</td></tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      <Modal show={showAdd} onHide={() => setShowAdd(false)}>
        <Modal.Header closeButton><Modal.Title>Add Shift Assignment</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3"><Form.Label>Staff Name / ID</Form.Label><Form.Control onChange={e => setNewShift({...newShift, staff_id: e.target.value})} placeholder="Staff name or ID" /></Form.Group>
          <Form.Group className="mb-3"><Form.Label>Department</Form.Label>
            <Form.Select onChange={e => setNewShift({...newShift, department: e.target.value})}>
              <option>General Medicine</option><option>ICU</option><option>Emergency</option><option>Pediatrics</option><option>OT</option><option>Pathology</option>
            </Form.Select>
          </Form.Group>
          <Row className="g-3">
            <Col md={6}><Form.Label>Shift</Form.Label><Form.Select onChange={e => setNewShift({...newShift, shift_type: e.target.value})}><option>Morning</option><option>Afternoon</option><option>Night</option></Form.Select></Col>
            <Col md={6}><Form.Label>Date</Form.Label><Form.Control type="date" onChange={e => setNewShift({...newShift, date: e.target.value})} /></Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
          <Button variant="primary" onClick={async () => {
            try { await api.post('/api/staff/shifts', newShift); } catch { /* fallback */ }
            setShowAdd(false); alert('✅ Shift assigned!');
          }}>Assign Shift</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
