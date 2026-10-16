import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, Form, Alert } from 'react-bootstrap';

const AuditTrail = () => {
  const [activeTab, setActiveTab] = useState('events');
  const [searchQuery, setSearchQuery] = useState('');

  const auditEvents = [];

  const userActivity = [];

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
          <small className="text-muted">Comprehensive event logging, forensic search & user tracking</small>
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
