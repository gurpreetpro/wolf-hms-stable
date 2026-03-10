import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, Form, Alert } from 'react-bootstrap';

const SystemConfiguration = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 3000); };

  const featureFlags = [
    { name: 'AI Clinical Assistant', key: 'ai_clinical_assistant', enabled: true, env: 'Production', lastChanged: '2026-02-28' },
    { name: 'Telehealth Module', key: 'telehealth_module', enabled: true, env: 'Production', lastChanged: '2026-03-01' },
    { name: 'Smart Scheduling', key: 'smart_scheduling', enabled: true, env: 'Production', lastChanged: '2026-02-25' },
    { name: 'RPM Wearable Sync', key: 'rpm_wearable_sync', enabled: true, env: 'Production', lastChanged: '2026-03-02' },
    { name: 'NLP Auto-Coding', key: 'nlp_auto_coding', enabled: false, env: 'Staging', lastChanged: '2026-03-01' },
    { name: 'Predictive Analytics v2', key: 'predictive_v2', enabled: false, env: 'Beta', lastChanged: '2026-02-28' },
    { name: 'WhatsApp Notifications', key: 'whatsapp_notif', enabled: true, env: 'Production', lastChanged: '2026-02-20' },
    { name: 'Voice-to-Text Dictation', key: 'voice_dictation', enabled: false, env: 'Alpha', lastChanged: '2026-03-02' },
  ];

  const notifChannels = [
    { channel: 'Email (SMTP)', status: 'Active', provider: 'AWS SES', dailyLimit: '10,000', used: '2,340', health: 'Healthy' },
    { channel: 'SMS', status: 'Active', provider: 'Twilio', dailyLimit: '5,000', used: '892', health: 'Healthy' },
    { channel: 'Push Notification', status: 'Active', provider: 'Firebase FCM', dailyLimit: 'Unlimited', used: '4,210', health: 'Healthy' },
    { channel: 'WhatsApp', status: 'Active', provider: 'WhatsApp Business API', dailyLimit: '1,000', used: '345', health: 'Healthy' },
    { channel: 'In-App', status: 'Active', provider: 'Internal WebSocket', dailyLimit: 'Unlimited', used: '8,900', health: 'Healthy' },
  ];

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">System Configuration & Settings</h4>
          <small className="text-muted">Phase 10 S-Tier -- Global config, feature flags & notification management</small>
        </div>
        <Button variant="success" onClick={handleSave}>Save All Changes</Button>
      </div>

      {saved && <Alert variant="success" dismissible>All configuration changes saved successfully!</Alert>}

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="general" title="General Settings">
          <Row>
            <Col md={6}>
              <Card className="mb-3">
                <Card.Header className="bg-primary text-white"><strong>Hospital Information</strong></Card.Header>
                <Card.Body>
                  <Form.Group className="mb-2"><Form.Label>Hospital Name</Form.Label><Form.Control defaultValue="Wolf Multispeciality Hospital" /></Form.Group>
                  <Form.Group className="mb-2"><Form.Label>Registration No.</Form.Label><Form.Control defaultValue="REG-MH-2024-0045" /></Form.Group>
                  <Form.Group className="mb-2"><Form.Label>NABH Accreditation ID</Form.Label><Form.Control defaultValue="NABH-H-2025-0892" /></Form.Group>
                  <Form.Group className="mb-2"><Form.Label>Address</Form.Label><Form.Control as="textarea" rows={2} defaultValue="123, Health Avenue, Mumbai - 400001, Maharashtra, India" /></Form.Group>
                  <Row>
                    <Col><Form.Group className="mb-2"><Form.Label>Phone</Form.Label><Form.Control defaultValue="+91-22-12345678" /></Form.Group></Col>
                    <Col><Form.Group className="mb-2"><Form.Label>Emergency</Form.Label><Form.Control defaultValue="+91-22-87654321" /></Form.Group></Col>
                  </Row>
                  <Form.Group className="mb-2"><Form.Label>Email</Form.Label><Form.Control type="email" defaultValue="admin@wolfhospital.in" /></Form.Group>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="mb-3">
                <Card.Header className="bg-info text-white"><strong>System Preferences</strong></Card.Header>
                <Card.Body>
                  <Form.Group className="mb-2"><Form.Label>Timezone</Form.Label>
                    <Form.Select defaultValue="Asia/Kolkata"><option>Asia/Kolkata</option><option>UTC</option><option>America/New_York</option></Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-2"><Form.Label>Date Format</Form.Label>
                    <Form.Select defaultValue="DD/MM/YYYY"><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-2"><Form.Label>Currency</Form.Label>
                    <Form.Select defaultValue="INR"><option>INR (Rs.)</option><option>USD ($)</option><option>EUR</option><option>GBP</option></Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-2"><Form.Label>Default Language</Form.Label>
                    <Form.Select defaultValue="en"><option value="en">English</option><option value="hi">Hindi</option><option value="ta">Tamil</option></Form.Select>
                  </Form.Group>
                  <Form.Group className="mb-2"><Form.Label>Session Timeout (minutes)</Form.Label><Form.Control type="number" defaultValue={30} /></Form.Group>
                  <Form.Group className="mb-2"><Form.Label>Max Login Attempts</Form.Label><Form.Control type="number" defaultValue={5} /></Form.Group>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="features" title="Feature Flags">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Feature</th><th>Key</th><th>Status</th><th>Environment</th><th>Last Changed</th><th>Toggle</th></tr>
                </thead>
                <tbody>
                  {featureFlags.map((f, i) => (
                    <tr key={i}>
                      <td><strong>{f.name}</strong></td>
                      <td><code>{f.key}</code></td>
                      <td><Badge bg={f.enabled ? 'success' : 'secondary'}>{f.enabled ? 'Enabled' : 'Disabled'}</Badge></td>
                      <td><Badge bg={f.env === 'Production' ? 'primary' : f.env === 'Staging' ? 'warning' : 'info'}>{f.env}</Badge></td>
                      <td><small>{f.lastChanged}</small></td>
                      <td><Form.Check type="switch" defaultChecked={f.enabled} /></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="notifications" title="Notification Channels">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Channel</th><th>Provider</th><th>Status</th><th>Daily Limit</th><th>Used Today</th><th>Health</th></tr>
                </thead>
                <tbody>
                  {notifChannels.map((n, i) => (
                    <tr key={i}>
                      <td><strong>{n.channel}</strong></td>
                      <td>{n.provider}</td>
                      <td><Badge bg="success">{n.status}</Badge></td>
                      <td>{n.dailyLimit}</td>
                      <td>{n.used}</td>
                      <td><Badge bg="success">{n.health}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="branding" title="Branding">
          <Row>
            <Col md={6}>
              <Card>
                <Card.Header className="bg-dark text-white"><strong>Theme & Colors</strong></Card.Header>
                <Card.Body>
                  <Form.Group className="mb-2"><Form.Label>Primary Color</Form.Label><Form.Control type="color" defaultValue="#0d6efd" /></Form.Group>
                  <Form.Group className="mb-2"><Form.Label>Secondary Color</Form.Label><Form.Control type="color" defaultValue="#6c757d" /></Form.Group>
                  <Form.Group className="mb-2"><Form.Label>Accent Color</Form.Label><Form.Control type="color" defaultValue="#198754" /></Form.Group>
                  <Form.Group className="mb-2"><Form.Label>Logo URL</Form.Label><Form.Control defaultValue="/assets/logo-wolf.png" /></Form.Group>
                  <Form.Group className="mb-2"><Form.Label>Favicon URL</Form.Label><Form.Control defaultValue="/favicon.ico" /></Form.Group>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card>
                <Card.Header className="bg-dark text-white"><strong>Report Headers</strong></Card.Header>
                <Card.Body>
                  <Form.Group className="mb-2"><Form.Label>Report Title</Form.Label><Form.Control defaultValue="Wolf Multispeciality Hospital" /></Form.Group>
                  <Form.Group className="mb-2"><Form.Label>Report Subtitle</Form.Label><Form.Control defaultValue="Excellence in Healthcare Since 2020" /></Form.Group>
                  <Form.Group className="mb-2"><Form.Label>Footer Text</Form.Label><Form.Control defaultValue="This is a computer-generated report. No signature required." /></Form.Group>
                  <Form.Group className="mb-2"><Form.Label>Prescription Disclaimer</Form.Label><Form.Control as="textarea" rows={2} defaultValue="This prescription is valid for 7 days from the date of issue." /></Form.Group>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default SystemConfiguration;
