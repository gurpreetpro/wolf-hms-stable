import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, ProgressBar, Alert } from 'react-bootstrap';

const ConsentManagement = () => {
  const [activeTab, setActiveTab] = useState('active');

  const activeConsents = [
    { id: 'CON-301', patient: 'Rajesh Kumar', mrn: 'MRN-1045', type: 'Treatment Consent', procedure: 'Diabetes Management Plan', signDate: '2026-02-15', expiry: '2027-02-15', method: 'E-Signature', status: 'Active', witness: 'Nurse Priya' },
    { id: 'CON-302', patient: 'Anita Desai', mrn: 'MRN-1078', type: 'Surgical Consent', procedure: 'Appendectomy', signDate: '2026-03-01', expiry: '2026-03-15', method: 'Wet Signature', status: 'Active', witness: 'Dr. Reddy' },
    { id: 'CON-303', patient: 'Suresh Menon', mrn: 'MRN-1023', type: 'Research Consent', procedure: 'Cardiac Rehabilitation Study', signDate: '2026-01-20', expiry: '2027-01-20', method: 'E-Signature', status: 'Active', witness: 'Dr. Sharma' },
    { id: 'CON-304', patient: 'Kavita Mehta', mrn: 'MRN-1067', type: 'Data Sharing', procedure: 'Share records with Dr. Patel (Cardiology)', signDate: '2026-02-28', expiry: '2026-08-28', method: 'E-Signature', status: 'Active', witness: 'Self' },
    { id: 'CON-305', patient: 'Mohammed Ali', mrn: 'MRN-1089', type: 'Treatment Consent', procedure: 'Chemotherapy Cycle 3', signDate: '2026-02-20', expiry: '2026-05-20', method: 'Wet Signature', status: 'Active', witness: 'Nurse Deepa' },
  ];

  const expiringConsents = [
    { id: 'CON-202', patient: 'Lakshmi Nair', mrn: 'MRN-1034', type: 'Treatment Consent', expiry: '2026-03-10', daysLeft: 8, procedure: 'Physiotherapy sessions' },
    { id: 'CON-198', patient: 'Arun Das', mrn: 'MRN-1056', type: 'Data Sharing', expiry: '2026-03-05', daysLeft: 3, procedure: 'Insurance data sharing' },
    { id: 'CON-189', patient: 'Priya Singh', mrn: 'MRN-1078', type: 'Research Consent', expiry: '2026-03-08', daysLeft: 6, procedure: 'Mental health survey participation' },
  ];

  const consentTemplates = [
    { name: 'General Treatment Consent', version: 'v3.2', lastUpdate: '2026-01-15', language: ['English', 'Hindi', 'Tamil'], approvedBy: 'Medical Director' },
    { name: 'Surgical Consent', version: 'v2.8', lastUpdate: '2026-02-01', language: ['English', 'Hindi'], approvedBy: 'Chief Surgeon' },
    { name: 'Anesthesia Consent', version: 'v2.5', lastUpdate: '2025-12-10', language: ['English', 'Hindi', 'Kannada'], approvedBy: 'Anesthesia HOD' },
    { name: 'Blood Transfusion Consent', version: 'v2.1', lastUpdate: '2026-01-20', language: ['English', 'Hindi'], approvedBy: 'Blood Bank Director' },
    { name: 'Research Participation', version: 'v1.9', lastUpdate: '2025-11-15', language: ['English'], approvedBy: 'Ethics Committee' },
    { name: 'Data Sharing / HIE', version: 'v1.5', lastUpdate: '2026-02-10', language: ['English', 'Hindi'], approvedBy: 'Privacy Officer' },
  ];

  const metrics = { total: 1245, active: 892, expired: 203, revoked: 48, pending: 102, eSignRate: '78%' };

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Consent Management</h4>
          <small className="text-muted">Phase 9 S-Tier -- Patient consent tracking, e-signatures & expiry management</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary">+ New Consent</Button>
          <Button variant="outline-info">Consent Report</Button>
        </div>
      </div>

      {expiringConsents.filter(c => c.daysLeft <= 3).length > 0 && (
        <Alert variant="danger">
          <strong>URGENT:</strong> {expiringConsents.filter(c => c.daysLeft <= 3).length} consent(s) expiring within 3 days! Immediate renewal required.
        </Alert>
      )}

      <Row className="mb-3">
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{metrics.total}</h3><small>Total Consents</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{metrics.active}</h3><small>Active</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{metrics.pending}</h3><small>Pending</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">{metrics.expired}</h3><small>Expired</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">{metrics.eSignRate}</h3><small>E-Sign Rate</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="active" title="Active Consents">
          <Card>
            <Card.Body>
              <Table striped hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>ID</th><th>Patient</th><th>Type</th><th>Procedure</th><th>Signed</th><th>Expiry</th><th>Method</th><th>Witness</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {activeConsents.map(c => (
                    <tr key={c.id}>
                      <td><code>{c.id}</code></td>
                      <td><strong>{c.patient}</strong><br/><small className="text-muted">{c.mrn}</small></td>
                      <td><Badge bg="info">{c.type}</Badge></td>
                      <td><small>{c.procedure}</small></td>
                      <td>{c.signDate}</td>
                      <td>{c.expiry}</td>
                      <td><Badge bg={c.method === 'E-Signature' ? 'success' : 'secondary'}>{c.method}</Badge></td>
                      <td><small>{c.witness}</small></td>
                      <td>
                        <Button size="sm" variant="outline-primary" className="me-1">View</Button>
                        <Button size="sm" variant="outline-warning">Revoke</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="expiring" title="Expiring Soon">
          <Card>
            <Card.Body>
              {expiringConsents.map(c => (
                <Alert key={c.id} variant={c.daysLeft <= 3 ? 'danger' : 'warning'}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{c.patient} ({c.mrn})</strong> -- {c.type}<br/>
                      <small>Procedure: {c.procedure}</small>
                    </div>
                    <div className="text-end">
                      <Badge bg={c.daysLeft <= 3 ? 'danger' : 'warning'} className="fs-6">{c.daysLeft} days left</Badge><br/>
                      <small>Expires: {c.expiry}</small><br/>
                      <Button size="sm" variant="primary" className="mt-1">Send Renewal</Button>
                    </div>
                  </div>
                </Alert>
              ))}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="templates" title="Consent Templates">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Template</th><th>Version</th><th>Last Update</th><th>Languages</th><th>Approved By</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {consentTemplates.map((t, i) => (
                    <tr key={i}>
                      <td><strong>{t.name}</strong></td>
                      <td><Badge bg="info">{t.version}</Badge></td>
                      <td>{t.lastUpdate}</td>
                      <td>{t.language.map((l, j) => <Badge key={j} bg="light" text="dark" className="me-1">{l}</Badge>)}</td>
                      <td><small>{t.approvedBy}</small></td>
                      <td>
                        <Button size="sm" variant="outline-primary" className="me-1">Edit</Button>
                        <Button size="sm" variant="outline-success">Use</Button>
                      </td>
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

export default ConsentManagement;
