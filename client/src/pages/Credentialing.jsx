import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, ProgressBar, Alert } from 'react-bootstrap';

const Credentialing = () => {
  const [activeTab, setActiveTab] = useState('licenses');

  const licenses = [
    { name: 'Dr. Priya Sharma', dept: 'Cardiology', license: 'MCI-MH-28456', type: 'Medical Council', issued: '2022-06-15', expiry: '2027-06-14', daysLeft: 470, status: 'Valid', verified: true },
    { name: 'Dr. Rajesh Kumar', dept: 'Orthopedics', license: 'MCI-MH-31892', type: 'Medical Council', issued: '2023-01-10', expiry: '2028-01-09', daysLeft: 680, status: 'Valid', verified: true },
    { name: 'Nurse Anita Desai', dept: 'ICU', license: 'NCI-MH-45623', type: 'Nursing Council', issued: '2024-03-20', expiry: '2026-03-19', daysLeft: 17, status: 'Expiring Soon', verified: true },
    { name: 'Dr. Suresh Patel', dept: 'Emergency', license: 'MCI-GJ-52341', type: 'Medical Council', issued: '2021-08-05', expiry: '2026-08-04', daysLeft: 155, status: 'Valid', verified: true },
    { name: 'Tech. Arun Nair', dept: 'Radiology', license: 'AERB-RT-8923', type: 'AERB Radiation', issued: '2023-11-01', expiry: '2026-10-31', daysLeft: 243, status: 'Valid', verified: true },
    { name: 'Pharm. Rekha Jain', dept: 'Pharmacy', license: 'PCI-MH-67890', type: 'Pharmacy Council', issued: '2024-05-15', expiry: '2026-05-14', daysLeft: 73, status: 'Expiring Soon', verified: true },
    { name: 'Dr. Fatima Khan', dept: 'OB-GYN', license: 'MCI-MH-39012', type: 'Medical Council', issued: '2020-02-10', expiry: '2025-02-09', daysLeft: -386, status: 'Expired', verified: false },
  ];

  const skillMatrix = [
    { name: 'Dr. Priya Sharma', skills: ['Interventional Cardiology', 'Echo', 'Cardiac Cath', 'ACLS'], level: 'Expert', certifications: 4, lastAssessed: '2026-01-15' },
    { name: 'Nurse Anita Desai', skills: ['Critical Care', 'Ventilator Mgmt', 'ACLS', 'BLS', 'IV Therapy'], level: 'Advanced', certifications: 5, lastAssessed: '2026-02-10' },
    { name: 'Dr. Suresh Patel', skills: ['Emergency Medicine', 'Trauma Care', 'ATLS', 'ACLS', 'Toxicology'], level: 'Expert', certifications: 5, lastAssessed: '2025-12-20' },
    { name: 'Tech. Arun Nair', skills: ['CT Scan', 'MRI', 'X-Ray', 'Fluoroscopy', 'Radiation Safety'], level: 'Advanced', certifications: 4, lastAssessed: '2026-01-25' },
    { name: 'Nurse Kavita Rao', skills: ['General Nursing', 'Wound Care', 'BLS', 'Patient Education'], level: 'Intermediate', certifications: 3, lastAssessed: '2026-02-05' },
  ];

  const privileges = [
    { name: 'Dr. Priya Sharma', dept: 'Cardiology', privileges: ['Cardiac Catheterization', 'PCI/Stenting', 'Pacemaker Implantation', 'TEE'], granted: '2024-01-15', review: '2026-01-15', status: 'Active' },
    { name: 'Dr. Rajesh Kumar', dept: 'Orthopedics', privileges: ['Total Joint Replacement', 'Arthroscopy', 'Spinal Surgery', 'Fracture Fixation'], granted: '2024-06-01', review: '2026-06-01', status: 'Active' },
    { name: 'Dr. Suresh Patel', dept: 'Emergency', privileges: ['Emergency Intubation', 'Chest Tube Insertion', 'Central Line', 'Lumbar Puncture'], granted: '2024-03-10', review: '2026-03-10', status: 'Due for Review' },
    { name: 'Dr. Meena Iyer', dept: 'Pediatrics', privileges: ['Neonatal Resuscitation', 'Pediatric Intubation', 'Umbilical Catheterization'], granted: '2025-01-20', review: '2027-01-20', status: 'Active' },
  ];

  const expiring = licenses.filter(l => l.daysLeft <= 90);

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Credentialing & Privileging</h4>
          <small className="text-muted">Phase 11 S-Tier -- License verification, skill matrix, privilege tracking & re-credentialing</small>
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
