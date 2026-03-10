import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, Form, Alert } from 'react-bootstrap';

const AuditTrail = () => {
  const [activeTab, setActiveTab] = useState('events');
  const [searchQuery, setSearchQuery] = useState('');

  const auditEvents = [
    { id: 'AE-10045', timestamp: '2026-03-02 10:45:12', user: 'Dr. Sharma', role: 'Physician', module: 'EMR', action: 'UPDATE', resource: 'Patient Record (MRN-1045)', details: 'Modified medication list - added Metformin 500mg', ip: '192.168.1.45', session: 'S-8821' },
    { id: 'AE-10044', timestamp: '2026-03-02 10:42:08', user: 'Nurse Priya', role: 'Nurse', module: 'Vitals', action: 'CREATE', resource: 'Vitals Entry (MRN-1078)', details: 'Recorded BP: 120/80, Temp: 37.2C, SpO2: 98%', ip: '192.168.1.52', session: 'S-8819' },
    { id: 'AE-10043', timestamp: '2026-03-02 10:38:55', user: 'Admin Ravi', role: 'Admin', module: 'Reports', action: 'EXPORT', resource: 'Lab Report Bundle', details: 'Exported 15 lab reports for external audit', ip: '192.168.1.10', session: 'S-8815' },
    { id: 'AE-10042', timestamp: '2026-03-02 10:30:22', user: 'Dr. Patel', role: 'Physician', module: 'Orders', action: 'CREATE', resource: 'Lab Order (MRN-1067)', details: 'Ordered CBC, RFT, LFT for pre-op assessment', ip: '192.168.1.48', session: 'S-8812' },
    { id: 'AE-10041', timestamp: '2026-03-02 10:25:10', user: 'Pharmacist Deepa', role: 'Pharmacist', module: 'Pharmacy', action: 'DISPENSE', resource: 'Rx-4421 (MRN-1045)', details: 'Dispensed Metformin 500mg x 90 tabs', ip: '192.168.1.35', session: 'S-8810' },
    { id: 'AE-10040', timestamp: '2026-03-02 10:20:05', user: 'System', role: 'System', module: 'Auth', action: 'LOGIN_FAIL', resource: 'User: unknown_user', details: 'Failed login attempt - invalid credentials (3rd attempt)', ip: '203.45.67.89', session: 'N/A' },
    { id: 'AE-10039', timestamp: '2026-03-02 10:15:30', user: 'Billing Meena', role: 'Billing', module: 'Billing', action: 'UPDATE', resource: 'Invoice INV-2210', details: 'Applied insurance adjustment Rs.1,200', ip: '192.168.1.28', session: 'S-8808' },
    { id: 'AE-10038', timestamp: '2026-03-02 10:10:18', user: 'Dr. Reddy', role: 'Physician', module: 'EMR', action: 'DELETE', resource: 'Clinical Note (MRN-1023)', details: 'Deleted draft note - replaced with final version', ip: '192.168.1.50', session: 'S-8805' },
  ];

  const userActivity = [
    { user: 'Dr. Sharma', sessions: 12, actions: 145, lastActive: '10:45 AM', avgDuration: '6.2h', topModule: 'EMR', riskScore: 'Low' },
    { user: 'Nurse Priya', sessions: 8, actions: 98, lastActive: '10:42 AM', avgDuration: '8.5h', topModule: 'Vitals', riskScore: 'Low' },
    { user: 'Admin Ravi', sessions: 5, actions: 67, lastActive: '10:38 AM', avgDuration: '4.1h', topModule: 'Reports', riskScore: 'Medium' },
    { user: 'Receptionist Anil', sessions: 3, actions: 42, lastActive: '09:30 AM', avgDuration: '3.8h', topModule: 'Registration', riskScore: 'High' },
    { user: 'Dr. Patel', sessions: 10, actions: 132, lastActive: '10:30 AM', avgDuration: '7.0h', topModule: 'Orders', riskScore: 'Low' },
  ];

  const actionColor = (a) => {
    if (a === 'CREATE') return 'success';
    if (a === 'UPDATE') return 'primary';
    if (a === 'DELETE') return 'danger';
    if (a === 'EXPORT') return 'warning';
    if (a === 'LOGIN_FAIL') return 'danger';
    return 'info';
  };

  const metrics = { totalEvents: '12,458', todayEvents: 342, criticalEvents: 3, activeUsers: 28, avgResponseTime: '45ms' };

  const filteredEvents = searchQuery
    ? auditEvents.filter(e => JSON.stringify(e).toLowerCase().includes(searchQuery.toLowerCase()))
    : auditEvents;

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Audit Trail & Access Logs</h4>
          <small className="text-muted">Phase 9 S-Tier -- Comprehensive event logging, forensic search & user tracking</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary">Export Audit Log</Button>
          <Button variant="outline-danger">Forensic Search</Button>
        </div>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{metrics.totalEvents}</h3><small>Total Events (30d)</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">{metrics.todayEvents}</h3><small>Today</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">{metrics.criticalEvents}</h3><small>Critical Events</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{metrics.activeUsers}</h3><small>Active Users</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{metrics.avgResponseTime}</h3><small>Avg Log Latency</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="events" title="Event Log">
          <Card>
            <Card.Header>
              <Form.Control placeholder="Search events by user, module, action, resource..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </Card.Header>
            <Card.Body>
              {filteredEvents.filter(e => e.action === 'LOGIN_FAIL').map(e => (
                <Alert key={e.id} variant="danger" className="py-2">
                  <strong>SECURITY:</strong> {e.details} from IP {e.ip}
                </Alert>
              ))}
              <Table striped hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>ID</th><th>Timestamp</th><th>User</th><th>Module</th><th>Action</th><th>Resource</th><th>Details</th><th>IP</th></tr>
                </thead>
                <tbody>
                  {filteredEvents.map(e => (
                    <tr key={e.id} className={e.action === 'DELETE' ? 'table-warning' : e.action === 'LOGIN_FAIL' ? 'table-danger' : ''}>
                      <td><code>{e.id}</code></td>
                      <td><small>{e.timestamp}</small></td>
                      <td><strong>{e.user}</strong><br/><Badge bg="secondary" style={{fontSize:'0.65rem'}}>{e.role}</Badge></td>
                      <td>{e.module}</td>
                      <td><Badge bg={actionColor(e.action)}>{e.action}</Badge></td>
                      <td><small>{e.resource}</small></td>
                      <td><small>{e.details}</small></td>
                      <td><code style={{fontSize:'0.7rem'}}>{e.ip}</code></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="users" title="User Activity">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>User</th><th>Sessions (7d)</th><th>Actions (7d)</th><th>Last Active</th><th>Avg Duration</th><th>Top Module</th><th>Risk Score</th></tr>
                </thead>
                <tbody>
                  {userActivity.map((u, i) => (
                    <tr key={i} className={u.riskScore === 'High' ? 'table-danger' : ''}>
                      <td><strong>{u.user}</strong></td>
                      <td>{u.sessions}</td>
                      <td>{u.actions}</td>
                      <td>{u.lastActive}</td>
                      <td>{u.avgDuration}</td>
                      <td><Badge bg="info">{u.topModule}</Badge></td>
                      <td><Badge bg={u.riskScore === 'Low' ? 'success' : u.riskScore === 'Medium' ? 'warning' : 'danger'}>{u.riskScore}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="forensic" title="Forensic Tools">
          <Row>
            <Col md={6}>
              <Card className="mb-3">
                <Card.Header className="bg-dark text-white"><strong>Forensic Query Builder</strong></Card.Header>
                <Card.Body>
                  <Form.Group className="mb-2"><Form.Label>User</Form.Label><Form.Control placeholder="Enter username" /></Form.Group>
                  <Form.Group className="mb-2"><Form.Label>Date Range</Form.Label>
                    <Row><Col><Form.Control type="date" /></Col><Col><Form.Control type="date" /></Col></Row>
                  </Form.Group>
                  <Form.Group className="mb-2"><Form.Label>Module</Form.Label>
                    <Form.Select><option>All Modules</option><option>EMR</option><option>Billing</option><option>Pharmacy</option><option>Auth</option><option>Reports</option></Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-2"><Form.Label>Action Type</Form.Label>
                    <Form.Select><option>All Actions</option><option>CREATE</option><option>UPDATE</option><option>DELETE</option><option>EXPORT</option><option>LOGIN_FAIL</option></Form.Select>
                  </Form.Group>
                  <Button variant="danger" className="w-100 mt-2">Run Forensic Query</Button>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <Card.Header className="bg-dark text-white"><strong>Chain of Custody</strong></Card.Header>
                <Card.Body>
                  <p className="text-muted">Tamper-proof audit trail with cryptographic hashing ensures data integrity for legal and compliance purposes.</p>
                  <Table bordered size="sm">
                    <tbody>
                      <tr><td><strong>Hashing Algorithm</strong></td><td>SHA-256</td></tr>
                      <tr><td><strong>Log Integrity</strong></td><td><Badge bg="success">Verified</Badge></td></tr>
                      <tr><td><strong>Last Verification</strong></td><td>2026-03-02 10:00 AM</td></tr>
                      <tr><td><strong>Total Chain Length</strong></td><td>12,458 blocks</td></tr>
                      <tr><td><strong>Retention Period</strong></td><td>7 years (HIPAA)</td></tr>
                    </tbody>
                  </Table>
                  <Button variant="outline-success" className="w-100">Verify Chain Integrity</Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default AuditTrail;
