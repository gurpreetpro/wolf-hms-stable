import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, ProgressBar, Alert } from 'react-bootstrap';

const IntegrationHub = () => {
  const [activeTab, setActiveTab] = useState('endpoints');

  const endpoints = [
    { name: 'HL7 ADT Feed', standard: 'HL7 v2.5', type: 'Inbound', status: 'Active', uptime: '99.98%', lastMsg: '10:44 AM', msgToday: 342, errors: 0 },
    { name: 'HL7 ORM Orders', standard: 'HL7 v2.5', type: 'Outbound', status: 'Active', uptime: '99.95%', lastMsg: '10:42 AM', msgToday: 189, errors: 2 },
    { name: 'FHIR Patient Resource', standard: 'FHIR R4', type: 'REST API', status: 'Active', uptime: '99.99%', lastMsg: '10:45 AM', msgToday: 1205, errors: 0 },
    { name: 'FHIR Observation Bundle', standard: 'FHIR R4', type: 'REST API', status: 'Active', uptime: '99.97%', lastMsg: '10:43 AM', msgToday: 856, errors: 1 },
    { name: 'DICOM Worklist', standard: 'DICOM', type: 'Bidirectional', status: 'Active', uptime: '99.90%', lastMsg: '10:40 AM', msgToday: 67, errors: 0 },
    { name: 'Insurance Claims (X12 837)', standard: 'X12 EDI', type: 'Outbound', status: 'Active', uptime: '99.85%', lastMsg: '10:30 AM', msgToday: 45, errors: 0 },
    { name: 'ABDM Health ID', standard: 'ABDM API', type: 'REST API', status: 'Active', uptime: '99.92%', lastMsg: '10:41 AM', msgToday: 234, errors: 3 },
    { name: 'Lab Instrument Interface', standard: 'ASTM/LIS', type: 'Inbound', status: 'Active', uptime: '99.80%', lastMsg: '10:38 AM', msgToday: 412, errors: 1 },
  ];

  const apiGateway = [
    { endpoint: '/api/v2/patients', method: 'GET', calls24h: 12450, avgLatency: '45ms', p99Latency: '120ms', errorRate: '0.02%', rateLimit: '1000/min', auth: 'JWT + API Key' },
    { endpoint: '/api/v2/appointments', method: 'POST', calls24h: 3420, avgLatency: '68ms', p99Latency: '180ms', errorRate: '0.05%', rateLimit: '500/min', auth: 'JWT + API Key' },
    { endpoint: '/api/v2/lab-results', method: 'GET', calls24h: 8900, avgLatency: '52ms', p99Latency: '140ms', errorRate: '0.01%', rateLimit: '800/min', auth: 'JWT + API Key' },
    { endpoint: '/api/v2/billing', method: 'POST', calls24h: 2100, avgLatency: '85ms', p99Latency: '220ms', errorRate: '0.08%', rateLimit: '300/min', auth: 'JWT + API Key' },
    { endpoint: '/api/v2/prescriptions', method: 'GET', calls24h: 5600, avgLatency: '38ms', p99Latency: '95ms', errorRate: '0.01%', rateLimit: '600/min', auth: 'JWT + API Key' },
  ];

  const webhooks = [
    { name: 'Patient Admission', url: 'https://ehr.partner.com/webhook/admit', events: ['patient.admitted', 'patient.transferred'], status: 'Active', secret: '***hidden***', retries: 3, lastDelivery: '10:42 AM', successRate: '99.8%' },
    { name: 'Lab Results Ready', url: 'https://portal.wolfhms.in/webhook/labs', events: ['lab.result.ready'], status: 'Active', secret: '***hidden***', retries: 3, lastDelivery: '10:38 AM', successRate: '99.9%' },
    { name: 'Discharge Notification', url: 'https://insurance.api.com/webhook/discharge', events: ['patient.discharged'], status: 'Active', secret: '***hidden***', retries: 5, lastDelivery: '09:55 AM', successRate: '98.5%' },
    { name: 'Critical Alert', url: 'https://oncall.wolfhms.in/webhook/critical', events: ['alert.critical', 'ews.high'], status: 'Active', secret: '***hidden***', retries: 5, lastDelivery: '10:15 AM', successRate: '100%' },
  ];

  const totalMsgsToday = endpoints.reduce((s, e) => s + e.msgToday, 0);
  const totalErrors = endpoints.reduce((s, e) => s + e.errors, 0);

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Integration Hub (HL7 / FHIR / API Gateway)</h4>
          <small className="text-muted">Phase 10 S-Tier -- Interoperability, API management & webhook configuration</small>
        </div>
        <div className="d-flex gap-2">
          <Badge bg="success" className="p-2 fs-6">{totalMsgsToday.toLocaleString()} msgs today</Badge>
          <Button variant="outline-primary">+ New Endpoint</Button>
        </div>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{endpoints.length}</h3><small>Active Endpoints</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{totalMsgsToday.toLocaleString()}</h3><small>Messages Today</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">{totalErrors}</h3><small>Errors Today</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">99.92%</h3><small>Avg Uptime</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">4</h3><small>Standards</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="endpoints" title="Integration Endpoints">
          <Card>
            <Card.Body>
              <Table striped hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>Endpoint</th><th>Standard</th><th>Type</th><th>Status</th><th>Uptime</th><th>Last Msg</th><th>Today</th><th>Errors</th></tr>
                </thead>
                <tbody>
                  {endpoints.map((e, i) => (
                    <tr key={i}>
                      <td><strong>{e.name}</strong></td>
                      <td><Badge bg="info">{e.standard}</Badge></td>
                      <td><Badge bg={e.type === 'Inbound' ? 'success' : e.type === 'Outbound' ? 'warning' : 'primary'}>{e.type}</Badge></td>
                      <td><Badge bg="success">{e.status}</Badge></td>
                      <td>{e.uptime}</td>
                      <td><small>{e.lastMsg}</small></td>
                      <td><strong>{e.msgToday}</strong></td>
                      <td className={e.errors > 0 ? 'text-danger fw-bold' : 'text-success'}>{e.errors}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="api" title="API Gateway">
          <Card>
            <Card.Body>
              <Table bordered hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>Endpoint</th><th>Method</th><th>Calls (24h)</th><th>Avg Latency</th><th>P99</th><th>Error Rate</th><th>Rate Limit</th><th>Auth</th></tr>
                </thead>
                <tbody>
                  {apiGateway.map((a, i) => (
                    <tr key={i}>
                      <td><code>{a.endpoint}</code></td>
                      <td><Badge bg={a.method === 'GET' ? 'success' : 'warning'}>{a.method}</Badge></td>
                      <td>{a.calls24h.toLocaleString()}</td>
                      <td>{a.avgLatency}</td>
                      <td>{a.p99Latency}</td>
                      <td><Badge bg="success">{a.errorRate}</Badge></td>
                      <td><small>{a.rateLimit}</small></td>
                      <td><Badge bg="secondary" style={{fontSize:'0.65rem'}}>{a.auth}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="webhooks" title="Webhooks">
          <Card>
            <Card.Body>
              {webhooks.map((w, i) => (
                <Alert key={i} variant="light" className="border mb-2">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <strong>{w.name}</strong> <Badge bg="success">{w.status}</Badge><br/>
                      <code style={{fontSize:'0.75rem'}}>{w.url}</code><br/>
                      <small>Events: {w.events.map((e, j) => <Badge key={j} bg="info" className="me-1" style={{fontSize:'0.6rem'}}>{e}</Badge>)}</small>
                    </div>
                    <div className="text-end">
                      <small>Last: {w.lastDelivery}</small><br/>
                      <small>Success: <strong>{w.successRate}</strong></small><br/>
                      <small>Retries: {w.retries}</small>
                    </div>
                  </div>
                </Alert>
              ))}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default IntegrationHub;
