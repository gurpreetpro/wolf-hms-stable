import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, ProgressBar, Alert } from 'react-bootstrap';

const ClosedLoopMedication = () => {
  const [activeTab, setActiveTab] = useState('tracking');

  const medicationOrders = [
    { id: 'CLM-501', patient: 'Rajesh Kumar', bed: 'A-101', medication: 'Metformin 500mg', 
      prescribe: { status: 'complete', time: '08:00 AM', by: 'Dr. Sharma', cpoe: true, ddiCheck: true },
      verify: { status: 'complete', time: '08:15 AM', by: 'Clinical Pharmacist' },
      dispense: { status: 'complete', time: '08:30 AM', by: 'Pharmacy', lotNo: 'LOT-2401A', expiry: '2027-06' },
      administer: { status: 'complete', time: '08:45 AM', by: 'Nurse Meera', barcodeVerified: true },
      document: { status: 'complete', time: '08:46 AM', autoLogged: true }
    },
    { id: 'CLM-502', patient: 'Anita Desai', bed: 'A-103', medication: 'Ceftriaxone 1g IV',
      prescribe: { status: 'complete', time: '08:00 AM', by: 'Dr. Patel', cpoe: true, ddiCheck: true },
      verify: { status: 'complete', time: '08:20 AM', by: 'Clinical Pharmacist' },
      dispense: { status: 'complete', time: '08:40 AM', by: 'Pharmacy', lotNo: 'LOT-2401B', expiry: '2026-12' },
      administer: { status: 'in_progress', time: '--', by: '--', barcodeVerified: false },
      document: { status: 'pending', time: '--', autoLogged: false }
    },
    { id: 'CLM-503', patient: 'Suresh Menon', bed: 'B-205', medication: 'Warfarin 5mg',
      prescribe: { status: 'complete', time: '09:00 AM', by: 'Dr. Reddy', cpoe: true, ddiCheck: false },
      verify: { status: 'alert', time: '--', by: '--', alert: 'DDI: Warfarin + Aspirin' },
      dispense: { status: 'blocked', time: '--', by: '--' },
      administer: { status: 'pending', time: '--', by: '--', barcodeVerified: false },
      document: { status: 'pending', time: '--', autoLogged: false }
    },
    { id: 'CLM-504', patient: 'Mohammed Ali', bed: 'ICU-3', medication: 'Insulin Glargine 10U SC',
      prescribe: { status: 'complete', time: '07:30 AM', by: 'Dr. Khan', cpoe: true, ddiCheck: true },
      verify: { status: 'complete', time: '07:45 AM', by: 'Clinical Pharmacist' },
      dispense: { status: 'complete', time: '08:00 AM', by: 'Pharmacy', lotNo: 'LOT-2401C', expiry: '2026-09' },
      administer: { status: 'complete', time: '08:10 AM', by: 'Nurse Ritu', barcodeVerified: true },
      document: { status: 'complete', time: '08:11 AM', autoLogged: true }
    },
    { id: 'CLM-505', patient: 'Priya Singh', bed: 'B-208', medication: 'Pantoprazole 40mg IV',
      prescribe: { status: 'complete', time: '09:30 AM', by: 'Dr. Sharma', cpoe: true, ddiCheck: true },
      verify: { status: 'complete', time: '09:45 AM', by: 'Clinical Pharmacist' },
      dispense: { status: 'in_progress', time: '--', by: 'Pharmacy' },
      administer: { status: 'pending', time: '--', by: '--', barcodeVerified: false },
      document: { status: 'pending', time: '--', autoLogged: false }
    },
  ];

  const stepBadge = (status) => {
    if (status === 'complete') return <Badge bg="success">✅</Badge>;
    if (status === 'in_progress') return <Badge bg="warning">🔄</Badge>;
    if (status === 'alert') return <Badge bg="danger">⚠️</Badge>;
    if (status === 'blocked') return <Badge bg="danger">🚫</Badge>;
    return <Badge bg="secondary">⏳</Badge>;
  };

  const chainProgress = (order) => {
    const steps = [order.prescribe, order.verify, order.dispense, order.administer, order.document];
    const complete = steps.filter(s => s.status === 'complete').length;
    return (complete / 5) * 100;
  };

  const metrics = {
    totalOrders: medicationOrders.length,
    fullyTracked: medicationOrders.filter(o => chainProgress(o) === 100).length,
    pendingVerify: medicationOrders.filter(o => o.verify.status !== 'complete').length,
    safetyBlocked: medicationOrders.filter(o => o.verify.status === 'alert' || o.dispense.status === 'blocked').length,
    barcodeRate: 80,
    closedLoopRate: 60
  };

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">🔒 Closed-Loop Medication Management</h4>
          <small className="text-muted">Phase 6 S-Tier — Prescribe → Verify → Dispense → Administer → Document</small>
        </div>
        <Button variant="outline-info">📊 Chain Analytics</Button>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{metrics.fullyTracked}/{metrics.totalOrders}</h3><small>Fully Tracked</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{metrics.pendingVerify}</h3><small>Pending Verify</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">{metrics.safetyBlocked}</h3><small>Safety Blocked</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">{metrics.barcodeRate}%</h3><small>Barcode Scan Rate</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{metrics.closedLoopRate}%</h3><small>Closed-Loop Rate</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="tracking" title="🔗 Medication Chain Tracking">
          <Card>
            <Card.Body>
              {medicationOrders.map(order => (
                <Card key={order.id} className={`mb-3 ${order.verify.status === 'alert' ? 'border-danger' : 'border-light'}`}>
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <div>
                        <strong>{order.id}</strong> — <strong>{order.medication}</strong>
                        <br/><small className="text-muted">{order.patient} | {order.bed}</small>
                      </div>
                      <div className="text-end">
                        <ProgressBar now={chainProgress(order)} style={{width: 200, height: 8}} 
                          variant={chainProgress(order) === 100 ? 'success' : chainProgress(order) > 50 ? 'warning' : 'danger'} />
                        <small className="text-muted">{chainProgress(order)}% complete</small>
                      </div>
                    </div>

                    <div className="d-flex justify-content-between align-items-center p-2 bg-light rounded">
                      {/* Step 1: Prescribe */}
                      <div className="text-center" style={{flex: 1}}>
                        {stepBadge(order.prescribe.status)}
                        <div><small className="fw-bold">Prescribe</small></div>
                        <div><small className="text-muted">{order.prescribe.by}</small></div>
                        <div><small className="text-muted">{order.prescribe.time}</small></div>
                        {order.prescribe.cpoe && <Badge bg="success" className="mt-1" style={{fontSize: '0.6rem'}}>CPOE</Badge>}
                      </div>
                      <div className="text-muted">→</div>

                      {/* Step 2: Verify */}
                      <div className="text-center" style={{flex: 1}}>
                        {stepBadge(order.verify.status)}
                        <div><small className="fw-bold">Verify</small></div>
                        <div><small className="text-muted">{order.verify.by || '--'}</small></div>
                        <div><small className="text-muted">{order.verify.time}</small></div>
                        {order.verify.alert && <Badge bg="danger" className="mt-1" style={{fontSize: '0.6rem'}}>{order.verify.alert}</Badge>}
                      </div>
                      <div className="text-muted">→</div>

                      {/* Step 3: Dispense */}
                      <div className="text-center" style={{flex: 1}}>
                        {stepBadge(order.dispense.status)}
                        <div><small className="fw-bold">Dispense</small></div>
                        <div><small className="text-muted">{order.dispense.by || '--'}</small></div>
                        <div><small className="text-muted">{order.dispense.time}</small></div>
                        {order.dispense.lotNo && <Badge bg="info" className="mt-1" style={{fontSize: '0.6rem'}}>{order.dispense.lotNo}</Badge>}
                      </div>
                      <div className="text-muted">→</div>

                      {/* Step 4: Administer */}
                      <div className="text-center" style={{flex: 1}}>
                        {stepBadge(order.administer.status)}
                        <div><small className="fw-bold">Administer</small></div>
                        <div><small className="text-muted">{order.administer.by || '--'}</small></div>
                        <div><small className="text-muted">{order.administer.time}</small></div>
                        {order.administer.barcodeVerified && <Badge bg="success" className="mt-1" style={{fontSize: '0.6rem'}}>📱 Scanned</Badge>}
                      </div>
                      <div className="text-muted">→</div>

                      {/* Step 5: Document */}
                      <div className="text-center" style={{flex: 1}}>
                        {stepBadge(order.document.status)}
                        <div><small className="fw-bold">Document</small></div>
                        <div><small className="text-muted">{order.document.time}</small></div>
                        {order.document.autoLogged && <Badge bg="primary" className="mt-1" style={{fontSize: '0.6rem'}}>Auto-logged</Badge>}
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              ))}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="alerts" title="⚠️ Safety Blocks">
          <Card>
            <Card.Body>
              {medicationOrders.filter(o => o.verify.status === 'alert' || o.dispense.status === 'blocked').map(order => (
                <Alert key={order.id} variant="danger">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{order.id}</strong> — {order.medication} for {order.patient}
                      <br/><small>⚠️ {order.verify.alert || 'Blocked by safety system'}</small>
                    </div>
                    <div>
                      <Button size="sm" variant="outline-danger" className="me-2">Override (MD)</Button>
                      <Button size="sm" variant="outline-secondary">Cancel Order</Button>
                    </div>
                  </div>
                </Alert>
              ))}
              {medicationOrders.filter(o => o.verify.status === 'alert' || o.dispense.status === 'blocked').length === 0 && (
                <Alert variant="success">✅ No safety blocks — all medication chains are clear</Alert>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="chain-analytics" title="📊 Chain Analytics">
          <Card>
            <Card.Body>
              <h5 className="mb-3">Medication Chain Performance</h5>
              <Row>
                <Col md={6}>
                  <h6>Chain Completion Rate</h6>
                  <ProgressBar className="mb-3" style={{height: 25}}>
                    <ProgressBar variant="success" now={metrics.closedLoopRate} label={`${metrics.closedLoopRate}% Closed`} />
                    <ProgressBar variant="warning" now={20} label="20% In-Progress" />
                    <ProgressBar variant="danger" now={20} label="20% Blocked" />
                  </ProgressBar>
                </Col>
                <Col md={6}>
                  <h6>Barcode Verification Rate</h6>
                  <ProgressBar now={metrics.barcodeRate} variant="info" label={`${metrics.barcodeRate}%`} className="mb-3" style={{height: 25}} />
                </Col>
              </Row>
              <hr />
              <Row className="text-center mt-3">
                <Col><h4>12 min</h4><small className="text-muted">Avg Prescribe → Verify</small></Col>
                <Col><h4>18 min</h4><small className="text-muted">Avg Verify → Dispense</small></Col>
                <Col><h4>15 min</h4><small className="text-muted">Avg Dispense → Administer</small></Col>
                <Col><h4>1 min</h4><small className="text-muted">Avg Administer → Document</small></Col>
                <Col><h4>46 min</h4><small className="text-muted">Avg Total Chain Time</small></Col>
              </Row>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default ClosedLoopMedication;
