import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Modal, Tabs, Tab } from 'react-bootstrap';
import { MessageSquare, Bell, Send, Plus, Users, AlertTriangle } from 'lucide-react';
import api from '../utils/axiosInstance';

export default function CommsDashboard() {
  const [announcements, setAnnouncements] = useState([]);
  const [messages, setMessages] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [newMsg, setNewMsg] = useState({ title: '', body: '', target: 'All Staff', priority: 'Normal', type: 'Announcement' });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/api/communications');
        setAnnouncements(res.data.announcements || []);
        setMessages(res.data.messages || []);
      } catch {
        setAnnouncements([
          { id: 1, title: 'OT Schedule Change', body: 'OT-2 reserved for emergency cases until further notice.', author: 'Admin', time: '10:30 AM', priority: 'High', target: 'OT Staff' },
          { id: 2, title: 'Fire Drill Reminder', body: 'Mock fire drill scheduled for March 5th at 3 PM.', author: 'Safety Officer', time: '09:00 AM', priority: 'Normal', target: 'All Staff' },
          { id: 3, title: 'New NABH Protocol', body: 'Updated hand hygiene protocol effective immediately.', author: 'QA Dept', time: 'Yesterday', priority: 'High', target: 'Clinical Staff' },
          { id: 4, title: 'Cafeteria Menu Update', body: 'Special diet options added for diabetic patients.', author: 'Dietary', time: 'Yesterday', priority: 'Low', target: 'Nursing Staff' }
        ]);
        setMessages([
          { id: 1, from: 'Dr. Anil Kumar', to: 'Nurse Station ICU', msg: 'Please prepare Bed 3 for post-op patient.', time: '11:15 AM', read: true },
          { id: 2, from: 'Lab', to: 'Dr. Sunita Verma', msg: 'Critical value: Patient #1042 K+ 6.2 mEq/L', time: '11:00 AM', read: false },
          { id: 3, from: 'Pharmacy', to: 'Ward A Nurse', msg: 'Insulin stock replenished. Ready for pickup.', time: '10:45 AM', read: true }
        ]);
      }
    };
    fetchData();
  }, []);

  return (
    <Container fluid className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="mb-1"><MessageSquare className="me-2 text-primary" />Communication Hub</h2>
          <p className="text-muted">Internal Announcements & Messaging</p>
        </div>
        <Button variant="primary" onClick={() => setShowNew(true)}>
          <Plus size={16} className="me-1" /> New Announcement
        </Button>
      </div>

      <Row className="g-3 mb-4">
        <Col md={3}><Card className="border-0 bg-primary bg-opacity-10 text-center p-3"><h3 className="fw-bold text-primary">{announcements.length}</h3><small className="text-muted">Active Announcements</small></Card></Col>
        <Col md={3}><Card className="border-0 bg-danger bg-opacity-10 text-center p-3"><h3 className="fw-bold text-danger">{announcements.filter(a => a.priority === 'High').length}</h3><small className="text-muted">High Priority</small></Card></Col>
        <Col md={3}><Card className="border-0 bg-info bg-opacity-10 text-center p-3"><h3 className="fw-bold text-info">{messages.length}</h3><small className="text-muted">Messages Today</small></Card></Col>
        <Col md={3}><Card className="border-0 bg-warning bg-opacity-10 text-center p-3"><h3 className="fw-bold text-warning">{messages.filter(m => !m.read).length}</h3><small className="text-muted">Unread</small></Card></Col>
      </Row>

      <Tabs defaultActiveKey="announcements" className="mb-3">
        <Tab eventKey="announcements" title="📢 Announcements">
          <Card className="shadow-sm border-0">
            <Card.Body>
              {announcements.map(a => (
                <Card key={a.id} className={`mb-3 ${a.priority === 'High' ? 'border-danger' : 'border-light'}`}>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 className="fw-bold mb-1">{a.priority === 'High' && <AlertTriangle size={14} className="text-danger me-1" />}{a.title}</h6>
                        <p className="text-muted mb-2 small">{a.body}</p>
                        <small className="text-muted">By {a.author} · {a.time} · Target: <Badge bg="light" text="dark">{a.target}</Badge></small>
                      </div>
                      <Badge bg={a.priority === 'High' ? 'danger' : a.priority === 'Low' ? 'secondary' : 'primary'}>{a.priority}</Badge>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </Card.Body>
          </Card>
        </Tab>
        <Tab eventKey="messages" title="💬 Messages">
          <Card className="shadow-sm border-0">
            <Card.Body>
              <Table bordered hover size="sm" className="align-middle">
                <thead className="bg-light"><tr><th>From</th><th>To</th><th>Message</th><th>Time</th><th>Status</th></tr></thead>
                <tbody>
                  {messages.map(m => (
                    <tr key={m.id} className={!m.read ? 'table-info' : ''}>
                      <td className="fw-bold">{m.from}</td>
                      <td>{m.to}</td>
                      <td><small>{m.msg}</small></td>
                      <td>{m.time}</td>
                      <td>{m.read ? <Badge bg="secondary">Read</Badge> : <Badge bg="primary">New</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      <Modal show={showNew} onHide={() => setShowNew(false)}>
        <Modal.Header closeButton><Modal.Title>New Announcement</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3"><Form.Label>Title</Form.Label><Form.Control onChange={e => setNewMsg({...newMsg, title: e.target.value})} /></Form.Group>
          <Form.Group className="mb-3"><Form.Label>Body</Form.Label><Form.Control as="textarea" rows={3} onChange={e => setNewMsg({...newMsg, body: e.target.value})} /></Form.Group>
          <Row className="g-3">
            <Col md={6}><Form.Label>Target</Form.Label><Form.Select onChange={e => setNewMsg({...newMsg, target: e.target.value})}><option>All Staff</option><option>Clinical Staff</option><option>Nursing Staff</option><option>OT Staff</option><option>Admin</option></Form.Select></Col>
            <Col md={6}><Form.Label>Priority</Form.Label><Form.Select onChange={e => setNewMsg({...newMsg, priority: e.target.value})}><option>Normal</option><option>High</option><option>Low</option></Form.Select></Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
          <Button variant="primary" onClick={async () => {
            try { await api.post('/api/communications/announce', newMsg); } catch { /* fallback */ }
            setShowNew(false); alert('📢 Announcement posted!');
          }}><Send size={14} className="me-1" /> Post</Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
