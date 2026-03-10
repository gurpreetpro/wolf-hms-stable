import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, ProgressBar, Alert } from 'react-bootstrap';

const MultiTenantAdmin = () => {
  const [activeTab, setActiveTab] = useState('tenants');

  const tenants = [
    { id: 'T-001', name: 'Wolf Multispeciality Hospital', plan: 'Enterprise', users: 245, beds: 500, modules: 45, status: 'Active', mrr: 'Rs.4,50,000', storage: '48.2 GB', apiCalls: '49.4K/day', sla: '99.97%', since: '2024-01-15' },
    { id: 'T-002', name: 'City General Hospital', plan: 'Professional', users: 120, beds: 200, modules: 32, status: 'Active', mrr: 'Rs.2,25,000', storage: '22.5 GB', apiCalls: '18.2K/day', sla: '99.95%', since: '2024-06-01' },
    { id: 'T-003', name: 'Sunrise Clinic Chain', plan: 'Professional', users: 85, beds: 50, modules: 28, status: 'Active', mrr: 'Rs.1,50,000', storage: '12.8 GB', apiCalls: '8.5K/day', sla: '99.90%', since: '2024-09-15' },
    { id: 'T-004', name: 'Apollo Diagnostics Lab', plan: 'Standard', users: 45, beds: 0, modules: 15, status: 'Active', mrr: 'Rs.75,000', storage: '8.2 GB', apiCalls: '5.2K/day', sla: '99.85%', since: '2025-01-01' },
    { id: 'T-005', name: 'Rural Health Center Network', plan: 'Standard', users: 30, beds: 30, modules: 12, status: 'Active', mrr: 'Rs.45,000', storage: '4.5 GB', apiCalls: '2.1K/day', sla: '99.80%', since: '2025-03-15' },
    { id: 'T-006', name: 'MedCare Trial Hospital', plan: 'Trial', users: 10, beds: 50, modules: 45, status: 'Trial', mrr: 'Rs.0 (Trial)', storage: '1.2 GB', apiCalls: '500/day', sla: '--', since: '2026-02-20' },
  ];

  const licenses = [
    { module: 'Core HMS (OPD/IPD/Billing)', type: 'Included', tenants: 6, limit: 'Unlimited', status: 'Active' },
    { module: 'AI Clinical Assistant', type: 'Add-on', tenants: 3, limit: '10', status: 'Active' },
    { module: 'Telehealth Module', type: 'Add-on', tenants: 4, limit: '10', status: 'Active' },
    { module: 'Smart Scheduling', type: 'Add-on', tenants: 2, limit: '10', status: 'Active' },
    { module: 'FHIR/HL7 Integration', type: 'Enterprise Only', tenants: 1, limit: '5', status: 'Active' },
    { module: 'Remote Patient Monitoring', type: 'Add-on', tenants: 2, limit: '10', status: 'Active' },
    { module: 'Regulatory Reporting', type: 'Enterprise Only', tenants: 1, limit: '5', status: 'Active' },
  ];

  const slaMetrics = [
    { tenant: 'Wolf Multispeciality', target: '99.95%', actual: '99.97%', incidents: 1, mttr: '12 min', status: 'Met', credits: 'None' },
    { tenant: 'City General', target: '99.90%', actual: '99.95%', incidents: 2, mttr: '18 min', status: 'Met', credits: 'None' },
    { tenant: 'Sunrise Clinic', target: '99.90%', actual: '99.90%', incidents: 3, mttr: '25 min', status: 'Met', credits: 'None' },
    { tenant: 'Apollo Diagnostics', target: '99.80%', actual: '99.85%', incidents: 1, mttr: '10 min', status: 'Met', credits: 'None' },
    { tenant: 'Rural Health Center', target: '99.80%', actual: '99.80%', incidents: 2, mttr: '30 min', status: 'Met', credits: 'None' },
  ];

  const totalMRR = 'Rs.9,45,000';
  const totalUsers = tenants.reduce((s, t) => s + t.users, 0);

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Multi-Tenant Administration</h4>
          <small className="text-muted">Phase 10 S-Tier -- Tenant management, licensing, usage analytics & SLA monitoring</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary">+ Onboard Tenant</Button>
          <Button variant="outline-info">Revenue Report</Button>
        </div>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{tenants.length}</h3><small>Active Tenants</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{totalMRR}</h3><small>Monthly Revenue</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">{totalUsers}</h3><small>Total Users</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">97.2 GB</h3><small>Total Storage</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">100%</h3><small>SLA Compliance</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="tenants" title="Tenants">
          <Card>
            <Card.Body>
              <Table striped hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>ID</th><th>Tenant</th><th>Plan</th><th>Users</th><th>Beds</th><th>Modules</th><th>MRR</th><th>Storage</th><th>API/day</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {tenants.map(t => (
                    <tr key={t.id} className={t.status === 'Trial' ? 'table-warning' : ''}>
                      <td><code>{t.id}</code></td>
                      <td><strong>{t.name}</strong><br/><small className="text-muted">Since {t.since}</small></td>
                      <td><Badge bg={t.plan === 'Enterprise' ? 'danger' : t.plan === 'Professional' ? 'primary' : t.plan === 'Trial' ? 'warning' : 'info'}>{t.plan}</Badge></td>
                      <td>{t.users}</td>
                      <td>{t.beds}</td>
                      <td>{t.modules}</td>
                      <td><strong>{t.mrr}</strong></td>
                      <td>{t.storage}</td>
                      <td><small>{t.apiCalls}</small></td>
                      <td><Badge bg={t.status === 'Active' ? 'success' : 'warning'}>{t.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="licenses" title="License Management">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Module</th><th>License Type</th><th>Active Tenants</th><th>Limit</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {licenses.map((l, i) => (
                    <tr key={i}>
                      <td><strong>{l.module}</strong></td>
                      <td><Badge bg={l.type === 'Included' ? 'success' : l.type === 'Enterprise Only' ? 'danger' : 'info'}>{l.type}</Badge></td>
                      <td>{l.tenants}</td>
                      <td>{l.limit}</td>
                      <td><Badge bg="success">{l.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="sla" title="SLA Monitoring">
          <Card>
            <Card.Body>
              <Alert variant="success">
                <strong>All SLAs Met!</strong> 100% of tenants meeting their uptime commitments. Zero SLA credits issued this month.
              </Alert>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Tenant</th><th>Target</th><th>Actual</th><th>Incidents</th><th>MTTR</th><th>Status</th><th>Credits</th></tr>
                </thead>
                <tbody>
                  {slaMetrics.map((s, i) => (
                    <tr key={i}>
                      <td><strong>{s.tenant}</strong></td>
                      <td>{s.target}</td>
                      <td><Badge bg="success">{s.actual}</Badge></td>
                      <td>{s.incidents}</td>
                      <td>{s.mttr}</td>
                      <td><Badge bg="success">{s.status}</Badge></td>
                      <td><Badge bg="secondary">{s.credits}</Badge></td>
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

export default MultiTenantAdmin;
