import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, ProgressBar, Alert } from 'react-bootstrap';

const Credentialing = () => {
  const [activeTab, setActiveTab] = useState('licenses');

  const licenses = [];

  const skillMatrix = [];

  const privileges = [];

  const expiring = licenses.filter(l => l.daysLeft <= 90);

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Credentialing & Privileging</h4>
          <small className="text-muted">License verification, skill matrix, privilege tracking & re-credentialing</small>
        </div>
        <Button variant="primary">+ Add Credential</Button>
      </div>

      {expiring.length > 0 && (
        <Alert variant="warning">
          <strong>Attention:</strong> {expiring.length} staff credential(s) expiring or expired! Immediate action required.
        </Alert>
      )}

      <Row className="mb-3">
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{licenses.filter(l => l.status === 'Valid').length}</h3><small>Valid Licenses</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{licenses.filter(l => l.status === 'Expiring Soon').length}</h3><small>Expiring Soon</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">{licenses.filter(l => l.status === 'Expired').length}</h3><small>Expired</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">100%</h3><small>Verification Rate</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">{privileges.length}</h3><small>Active Privileges</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="licenses" title="License Tracker">
          <Card>
            <Card.Body>
              <Table striped hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>Staff</th><th>Dept</th><th>License #</th><th>Type</th><th>Expiry</th><th>Days Left</th><th>Verified</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {licenses.map((l, i) => (
                    <tr key={i} className={l.status === 'Expired' ? 'table-danger' : l.status === 'Expiring Soon' ? 'table-warning' : ''}>
                      <td><strong>{l.name}</strong></td>
                      <td>{l.dept}</td>
                      <td><code>{l.license}</code></td>
                      <td><small>{l.type}</small></td>
                      <td>{l.expiry}</td>
                      <td><strong className={l.daysLeft <= 0 ? 'text-danger' : l.daysLeft <= 90 ? 'text-warning' : 'text-success'}>{l.daysLeft <= 0 ? 'EXPIRED' : l.daysLeft + 'd'}</strong></td>
                      <td>{l.verified ? <Badge bg="success">Verified</Badge> : <Badge bg="danger">Unverified</Badge>}</td>
                      <td><Badge bg={l.status === 'Valid' ? 'success' : l.status === 'Expiring Soon' ? 'warning' : 'danger'}>{l.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="skills" title="Skill Matrix">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Staff</th><th>Skills</th><th>Level</th><th>Certifications</th><th>Last Assessed</th></tr>
                </thead>
                <tbody>
                  {skillMatrix.map((s, i) => (
                    <tr key={i}>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.skills.map((sk, j) => <Badge key={j} bg="info" className="me-1 mb-1" style={{fontSize:'0.65rem'}}>{sk}</Badge>)}</td>
                      <td><Badge bg={s.level === 'Expert' ? 'danger' : s.level === 'Advanced' ? 'primary' : 'success'}>{s.level}</Badge></td>
                      <td className="text-center"><strong>{s.certifications}</strong></td>
                      <td><small>{s.lastAssessed}</small></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="privileges" title="Privilege Tracking">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Doctor</th><th>Dept</th><th>Privileges</th><th>Granted</th><th>Next Review</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {privileges.map((p, i) => (
                    <tr key={i}>
                      <td><strong>{p.name}</strong></td>
                      <td>{p.dept}</td>
                      <td>{p.privileges.map((pr, j) => <Badge key={j} bg="secondary" className="me-1 mb-1" style={{fontSize:'0.6rem'}}>{pr}</Badge>)}</td>
                      <td><small>{p.granted}</small></td>
                      <td><small>{p.review}</small></td>
                      <td><Badge bg={p.status === 'Active' ? 'success' : 'warning'}>{p.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default Credentialing;
