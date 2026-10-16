import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, ProgressBar, Alert } from 'react-bootstrap';

const RemotePatientMonitoring = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const monitoredPatients = [];

  const alertHistory = [];

  const programMetrics = {
    totalPatients: 4, activeAlerts: 5, avgCompliance: 82.5,
    readmissionReduction: '34%', costSavings: 'Rs.4.2L/month', emergencyPrevented: 8
  };

  const trendColor = (t) => t === 'Improving' ? 'success' : t === 'Stable' ? 'info' : 'danger';

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Remote Patient Monitoring (RPM)</h4>
          <small className="text-muted">Wearable integration, vitals dashboard, smart alerts</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary">+ Enroll Patient</Button>
          <Button variant="outline-info">RPM Analytics</Button>
        </div>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{programMetrics.totalPatients}</h3><small>Monitored</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">{programMetrics.activeAlerts}</h3><small>Active Alerts</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{programMetrics.avgCompliance}%</h3><small>Avg Compliance</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">{programMetrics.readmissionReduction}</h3><small>Readmission Reduction</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{programMetrics.emergencyPrevented}</h3><small>Emergencies Prevented</small></Card.Body></Card></Col>
      </Row>

      {monitoredPatients.filter(p => p.alerts > 0).map(p => (
        <Alert key={p.id} variant={p.trend === 'Worsening' ? 'danger' : 'warning'} className="mb-2">
          <strong>ALERT: {p.patient}</strong> -- {p.alerts} active alert(s) | Trend: {p.trend} | Last sync: {p.lastSync}
          <Button size="sm" variant={p.trend === 'Worsening' ? 'danger' : 'warning'} className="ms-3">Review Now</Button>
        </Alert>
      ))}

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="dashboard" title="Live Dashboard">
          <Row>
            {monitoredPatients.map(p => (
              <Col md={6} key={p.id} className="mb-3">
                <Card className={`${p.alerts > 0 ? 'border-danger' : 'border-success'}`}>
                  <Card.Header className={`${p.alerts > 0 ? 'bg-danger' : 'bg-success'} text-white d-flex justify-content-between`}>
                    <span><strong>{p.patient}</strong> ({p.mrn})</span>
                    <Badge bg="light" text="dark">{p.condition}</Badge>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={8}>
                        <Row className="text-center g-2">
                          <Col xs={4}>
                            <Card className={`border-0 ${p.vitals.bp && parseInt(p.vitals.bp) > 140 ? 'bg-danger bg-opacity-10' : ''}`}>
                              <Card.Body className="p-2">
                                <small className="text-muted">BP</small><br/>
                                <strong className={parseInt(p.vitals.bp) > 140 ? 'text-danger' : ''}>{p.vitals.bp || '--'}</strong>
                              </Card.Body>
                            </Card>
                          </Col>
                          <Col xs={4}>
                            <Card className={`border-0 ${p.vitals.glucose && p.vitals.glucose > 180 ? 'bg-warning bg-opacity-10' : ''}`}>
                              <Card.Body className="p-2">
                                <small className="text-muted">Glucose</small><br/>
                                <strong className={p.vitals.glucose > 180 ? 'text-danger' : ''}>{p.vitals.glucose || '--'}</strong>
                              </Card.Body>
                            </Card>
                          </Col>
                          <Col xs={4}>
                            <Card className={`border-0 ${p.vitals.spo2 < 92 ? 'bg-danger bg-opacity-10' : ''}`}>
                              <Card.Body className="p-2">
                                <small className="text-muted">SpO2</small><br/>
                                <strong className={p.vitals.spo2 < 92 ? 'text-danger' : ''}>{p.vitals.spo2}%</strong>
                              </Card.Body>
                            </Card>
                          </Col>
                          <Col xs={4}>
                            <Card className="border-0"><Card.Body className="p-2"><small className="text-muted">HR</small><br/><strong>{p.vitals.hr}</strong></Card.Body></Card>
                          </Col>
                          <Col xs={4}>
                            <Card className="border-0"><Card.Body className="p-2"><small className="text-muted">Weight</small><br/><strong>{p.vitals.weight}kg</strong></Card.Body></Card>
                          </Col>
                          <Col xs={4}>
                            <Card className="border-0"><Card.Body className="p-2"><small className="text-muted">Steps</small><br/><strong>{p.vitals.steps?.toLocaleString()}</strong></Card.Body></Card>
                          </Col>
                          {p.vitals.peakFlow && <Col xs={4}><Card className={`border-0 ${p.vitals.peakFlow < 300 ? 'bg-warning bg-opacity-10' : ''}`}><Card.Body className="p-2"><small className="text-muted">Peak Flow</small><br/><strong>{p.vitals.peakFlow}</strong></Card.Body></Card></Col>}
                          {p.vitals.fetalHR && <Col xs={4}><Card className="border-0"><Card.Body className="p-2"><small className="text-muted">Fetal HR</small><br/><strong>{p.vitals.fetalHR}</strong></Card.Body></Card></Col>}
                        </Row>
                      </Col>
                      <Col md={4}>
                        <div className="mb-2">
                          <small className="text-muted">Trend</small><br/>
                          <Badge bg={trendColor(p.trend)}>{p.trend}</Badge>
                        </div>
                        <div className="mb-2">
                          <small className="text-muted">Compliance</small>
                          <ProgressBar now={p.compliance} variant={p.compliance > 80 ? 'success' : 'warning'} label={`${p.compliance}%`} />
                        </div>
                        <div className="mb-2">
                          <small className="text-muted">Devices</small><br/>
                          {p.devices.map((d,i) => <Badge key={i} bg="light" text="dark" className="me-1 mb-1" style={{fontSize:'0.7rem'}}>{d}</Badge>)}
                        </div>
                        <small className="text-muted">Synced: {p.lastSync}</small>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Tab>

        <Tab eventKey="alerts" title="Alert History">
          <Card>
            <Card.Body>
              <Table striped hover responsive>
                <thead className="table-dark">
                  <tr><th>Time</th><th>Patient</th><th>Type</th><th>Value</th><th>Threshold</th><th>Severity</th><th>Auto-Action</th></tr>
                </thead>
                <tbody>
                  {alertHistory.map((a,i) => (
                    <tr key={i} className={a.severity === 'Critical' ? 'table-danger' : a.severity === 'Warning' ? 'table-warning' : ''}>
                      <td>{a.time}</td>
                      <td><strong>{a.patient}</strong></td>
                      <td>{a.type}</td>
                      <td><strong>{a.value}</strong></td>
                      <td><small>{a.threshold}</small></td>
                      <td><Badge bg={a.severity === 'Critical' ? 'danger' : a.severity === 'Warning' ? 'warning' : 'info'}>{a.severity}</Badge></td>
                      <td><small>{a.action}</small></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="outcomes" title="RPM Outcomes">
          <Card>
            <Card.Body>
              <Row className="text-center">
                <Col md={3}>
                  <h2 className="text-success">{programMetrics.readmissionReduction}</h2>
                  <p>Readmission Reduction</p>
                  <ProgressBar now={34} variant="success" />
                </Col>
                <Col md={3}>
                  <h2 className="text-primary">{programMetrics.costSavings}</h2>
                  <p>Monthly Cost Savings</p>
                  <ProgressBar now={70} variant="primary" />
                </Col>
                <Col md={3}>
                  <h2 className="text-warning">{programMetrics.emergencyPrevented}</h2>
                  <p>ER Visits Prevented (30d)</p>
                  <ProgressBar now={80} variant="warning" />
                </Col>
                <Col md={3}>
                  <h2 className="text-info">{programMetrics.avgCompliance}%</h2>
                  <p>Patient Compliance</p>
                  <ProgressBar now={programMetrics.avgCompliance} variant="info" />
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default RemotePatientMonitoring;
