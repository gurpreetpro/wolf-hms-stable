import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, ProgressBar, Alert } from 'react-bootstrap';

const PerformanceMonitoring = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const serverMetrics = [
    { name: 'Web Server 1 (Primary)', cpu: 34, memory: 62, disk: 45, network: '120 Mbps', status: 'Healthy', uptime: '45d 12h' },
    { name: 'Web Server 2 (Secondary)', cpu: 28, memory: 55, disk: 42, network: '95 Mbps', status: 'Healthy', uptime: '45d 12h' },
    { name: 'API Server', cpu: 41, memory: 68, disk: 38, network: '200 Mbps', status: 'Healthy', uptime: '30d 8h' },
    { name: 'Database Primary (MongoDB)', cpu: 52, memory: 78, disk: 65, network: '150 Mbps', status: 'Healthy', uptime: '60d 4h' },
    { name: 'Database Replica', cpu: 38, memory: 72, disk: 64, network: '80 Mbps', status: 'Healthy', uptime: '60d 4h' },
    { name: 'Redis Cache', cpu: 12, memory: 45, disk: 20, network: '50 Mbps', status: 'Healthy', uptime: '90d 2h' },
    { name: 'Worker Queue (Bull)', cpu: 22, memory: 35, disk: 15, network: '30 Mbps', status: 'Healthy', uptime: '30d 8h' },
  ];

  const apiPerformance = [
    { endpoint: 'GET /patients', avgMs: 42, p50: 35, p95: 85, p99: 120, calls: '12.4K', errors: 3, sla: 'Met' },
    { endpoint: 'POST /appointments', avgMs: 68, p50: 55, p95: 140, p99: 195, calls: '3.4K', errors: 5, sla: 'Met' },
    { endpoint: 'GET /lab-results', avgMs: 52, p50: 42, p95: 110, p99: 155, calls: '8.9K', errors: 1, sla: 'Met' },
    { endpoint: 'POST /billing/invoice', avgMs: 95, p50: 80, p95: 180, p99: 250, calls: '2.1K', errors: 8, sla: 'Met' },
    { endpoint: 'GET /dashboard/stats', avgMs: 120, p50: 100, p95: 250, p99: 380, calls: '1.8K', errors: 0, sla: 'Met' },
    { endpoint: 'POST /prescriptions', avgMs: 55, p50: 45, p95: 100, p99: 140, calls: '5.6K', errors: 2, sla: 'Met' },
    { endpoint: 'GET /notifications', avgMs: 28, p50: 22, p95: 60, p99: 85, calls: '15.2K', errors: 0, sla: 'Met' },
  ];

  const errorLog = [
    { time: '10:42 AM', type: 'Timeout', endpoint: 'POST /billing/invoice', message: 'Request timeout after 30s', count: 3, severity: 'Medium' },
    { time: '10:38 AM', type: '500 Error', endpoint: 'POST /appointments', message: 'Null reference in slot validation', count: 2, severity: 'High' },
    { time: '10:15 AM', type: 'Rate Limit', endpoint: 'GET /patients', message: 'Rate limit exceeded from IP 203.45.x.x', count: 3, severity: 'Low' },
    { time: '09:55 AM', type: 'DB Timeout', endpoint: 'GET /dashboard/stats', message: 'MongoDB query timeout on aggregation', count: 1, severity: 'Medium' },
  ];

  const getBarColor = (val) => val >= 80 ? 'danger' : val >= 60 ? 'warning' : 'success';

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Performance Monitoring & APM</h4>
          <small className="text-muted">Phase 10 S-Tier -- Server metrics, API latency, error tracking & resource utilization</small>
        </div>
        <div className="d-flex gap-2">
          <Badge bg="success" className="p-2 fs-6">All Systems Healthy</Badge>
          <Button variant="outline-primary">View Grafana</Button>
        </div>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">99.97%</h3><small>Uptime (30d)</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">58ms</h3><small>Avg API Latency</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">9</h3><small>Errors (24h)</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">49.4K</h3><small>API Calls (24h)</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">7</h3><small>Active Servers</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="overview" title="Server Infrastructure">
          <Card>
            <Card.Body>
              <Table bordered hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>Server</th><th>CPU</th><th>Memory</th><th>Disk</th><th>Network</th><th>Uptime</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {serverMetrics.map((s, i) => (
                    <tr key={i}>
                      <td><strong>{s.name}</strong></td>
                      <td><div className="d-flex align-items-center gap-2"><ProgressBar now={s.cpu} variant={getBarColor(s.cpu)} style={{width:80,height:8}} /><small>{s.cpu}%</small></div></td>
                      <td><div className="d-flex align-items-center gap-2"><ProgressBar now={s.memory} variant={getBarColor(s.memory)} style={{width:80,height:8}} /><small>{s.memory}%</small></div></td>
                      <td><div className="d-flex align-items-center gap-2"><ProgressBar now={s.disk} variant={getBarColor(s.disk)} style={{width:80,height:8}} /><small>{s.disk}%</small></div></td>
                      <td><small>{s.network}</small></td>
                      <td><small>{s.uptime}</small></td>
                      <td><Badge bg="success">{s.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="api" title="API Performance">
          <Card>
            <Card.Body>
              <Table striped hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>Endpoint</th><th>Avg (ms)</th><th>P50</th><th>P95</th><th>P99</th><th>Calls (24h)</th><th>Errors</th><th>SLA</th></tr>
                </thead>
                <tbody>
                  {apiPerformance.map((a, i) => (
                    <tr key={i}>
                      <td><code>{a.endpoint}</code></td>
                      <td><strong>{a.avgMs}</strong></td>
                      <td>{a.p50}</td>
                      <td>{a.p95}</td>
                      <td><Badge bg={a.p99 > 300 ? 'warning' : 'success'}>{a.p99}</Badge></td>
                      <td>{a.calls}</td>
                      <td className={a.errors > 0 ? 'text-danger fw-bold' : 'text-success'}>{a.errors}</td>
                      <td><Badge bg="success">{a.sla}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="errors" title="Error Tracking">
          <Card>
            <Card.Body>
              {errorLog.map((e, i) => (
                <Alert key={i} variant={e.severity === 'High' ? 'danger' : e.severity === 'Medium' ? 'warning' : 'info'} className="mb-2">
                  <div className="d-flex justify-content-between">
                    <div>
                      <strong>{e.type}</strong> -- <code>{e.endpoint}</code><br/>
                      <small>{e.message}</small>
                    </div>
                    <div className="text-end">
                      <Badge bg={e.severity === 'High' ? 'danger' : e.severity === 'Medium' ? 'warning' : 'info'}>{e.severity}</Badge><br/>
                      <small>{e.time} | Count: {e.count}</small>
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

export default PerformanceMonitoring;
