import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, ProgressBar, Alert } from 'react-bootstrap';

const EarlyWarningScore = () => {
  const [activeTab, setActiveTab] = useState('monitoring');

  const patients = [
    { bed: 'ICU-1', patient: 'Suresh Menon', mrn: 'MRN-1023', hr: 118, bp: '85/50', rr: 28, temp: 39.2, spo2: 88, gcs: 13, news2: 11, trend: '↑↑', alert: 'CRITICAL', prediction: 'Septic shock — 78% deterioration risk in 4h', actions: ['Notify ICU registrar', 'Repeat lactate', 'Start vasopressors'] },
    { bed: 'A-101', patient: 'Rajesh Kumar', mrn: 'MRN-1045', hr: 98, bp: '128/82', rr: 20, temp: 37.4, spo2: 95, gcs: 15, news2: 4, trend: '→', alert: 'LOW', prediction: 'Stable — 8% deterioration risk in 4h', actions: ['Routine monitoring q4h'] },
    { bed: 'A-103', patient: 'Anita Desai', mrn: 'MRN-1078', hr: 105, bp: '100/60', rr: 24, temp: 38.6, spo2: 91, gcs: 14, news2: 8, trend: '↑', alert: 'HIGH', prediction: 'Respiratory failure — 52% deterioration risk in 4h', actions: ['Increase O2', 'ABG stat', 'Chest X-ray', 'Consider BiPAP'] },
    { bed: 'B-205', patient: 'Priya Singh', mrn: 'MRN-1056', hr: 76, bp: '118/72', rr: 16, temp: 36.8, spo2: 97, gcs: 15, news2: 1, trend: '↓', alert: 'LOW', prediction: 'Improving — 3% deterioration risk in 4h', actions: ['Continue current plan'] },
    { bed: 'ICU-3', patient: 'Mohammed Ali', mrn: 'MRN-1089', hr: 110, bp: '92/58', rr: 26, temp: 38.1, spo2: 90, gcs: 14, news2: 9, trend: '↑', alert: 'HIGH', prediction: 'DKA worsening — 61% deterioration risk in 4h', actions: ['Insulin infusion adjust', 'K+ check', 'Fluid bolus', 'ABG q2h'] },
    { bed: 'B-208', patient: 'Lakshmi Nair', mrn: 'MRN-1034', hr: 88, bp: '130/85', rr: 18, temp: 37.0, spo2: 96, gcs: 15, news2: 2, trend: '→', alert: 'LOW', prediction: 'Stable — 5% deterioration risk in 4h', actions: ['Routine monitoring q4h'] },
  ];

  const alertColor = (a) => a === 'CRITICAL' ? 'danger' : a === 'HIGH' ? 'warning' : 'success';
  const scoreColor = (s) => s >= 7 ? 'danger' : s >= 5 ? 'warning' : s >= 1 ? 'info' : 'success';

  const escalationProtocol = [
    { score: '0-4', level: 'Low', response: 'Routine ward monitoring', frequency: 'q4-6h', team: 'Ward nurse' },
    { score: '5-6', level: 'Medium', response: 'Increase monitoring, inform charge nurse', frequency: 'q1h', team: 'Senior nurse + Junior doctor' },
    { score: '7+', level: 'High', response: 'Emergency assessment, consider ICU', frequency: 'Continuous', team: 'Registrar + ICU outreach' },
    { score: '≥9 or 3 in single param', level: 'Critical', response: 'Immediate senior review, ICU transfer', frequency: 'Continuous', team: 'Consultant + ICU team' },
  ];

  const metrics = {
    totalMonitored: patients.length, critical: patients.filter(p => p.alert === 'CRITICAL').length,
    high: patients.filter(p => p.alert === 'HIGH').length, avgNEWS2: (patients.reduce((s,p) => s+p.news2, 0) / patients.length).toFixed(1),
    rrTriggers: 3, codeBluesAvoided: 2, predictionAccuracy: 91
  };

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">⚠️ Early Warning Score (NEWS-2) Dashboard</h4>
          <small className="text-muted">Phase 7 S-Tier — ML-augmented patient deterioration prediction</small>
        </div>
        <div className="d-flex gap-2">
          {metrics.critical > 0 && <Badge bg="danger" className="p-2 fs-6">🚨 {metrics.critical} CRITICAL</Badge>}
          {metrics.high > 0 && <Badge bg="warning" className="p-2 fs-6">⚠️ {metrics.high} HIGH</Badge>}
        </div>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{metrics.totalMonitored}</h3><small>Monitored</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">{metrics.critical}</h3><small>Critical</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{metrics.high}</h3><small>High Risk</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">{metrics.avgNEWS2}</h3><small>Avg NEWS-2</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{metrics.predictionAccuracy}%</h3><small>AI Accuracy</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="monitoring" title="📊 Live Monitoring">
          {patients.filter(p => p.alert === 'CRITICAL').map(p => (
            <Alert key={p.bed} variant="danger" className="mb-2">
              <strong>🚨 CRITICAL: {p.patient} ({p.bed})</strong> — NEWS-2: {p.news2} | {p.prediction}
              <div className="mt-1">{p.actions.map((a,i) => <Badge key={i} bg="light" text="dark" className="me-1">{a}</Badge>)}</div>
            </Alert>
          ))}
          <Card>
            <Card.Body>
              <Table bordered hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>Bed</th><th>Patient</th><th>HR</th><th>BP</th><th>RR</th><th>Temp</th><th>SpO2</th><th>GCS</th><th>NEWS-2</th><th>Trend</th><th>AI Prediction</th></tr>
                </thead>
                <tbody>
                  {patients.sort((a,b) => b.news2 - a.news2).map(p => (
                    <tr key={p.bed} className={p.news2 >= 7 ? 'table-danger' : p.news2 >= 5 ? 'table-warning' : ''}>
                      <td><strong>{p.bed}</strong></td>
                      <td>{p.patient}<br/><small className="text-muted">{p.mrn}</small></td>
                      <td className={p.hr > 100 ? 'text-danger fw-bold' : ''}>{p.hr}</td>
                      <td className={parseInt(p.bp) < 100 ? 'text-danger fw-bold' : ''}>{p.bp}</td>
                      <td className={p.rr > 24 ? 'text-danger fw-bold' : ''}>{p.rr}</td>
                      <td className={p.temp > 38.5 ? 'text-danger fw-bold' : ''}>{p.temp}°C</td>
                      <td className={p.spo2 < 92 ? 'text-danger fw-bold' : ''}>{p.spo2}%</td>
                      <td>{p.gcs}</td>
                      <td><Badge bg={scoreColor(p.news2)} className="fs-6">{p.news2}</Badge></td>
                      <td className={p.trend.includes('↑') ? 'text-danger fw-bold fs-5' : 'text-success'}>{p.trend}</td>
                      <td style={{maxWidth: 200}}><small>{p.prediction}</small></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="protocol" title="📋 Escalation Protocol">
          <Card>
            <Card.Body>
              <h5 className="mb-3">NEWS-2 Escalation Protocol</h5>
              <Table bordered>
                <thead className="table-dark">
                  <tr><th>NEWS-2 Score</th><th>Risk Level</th><th>Clinical Response</th><th>Frequency</th><th>Team</th></tr>
                </thead>
                <tbody>
                  {escalationProtocol.map((e, i) => (
                    <tr key={i} className={i === 3 ? 'table-danger' : i === 2 ? 'table-warning' : i === 1 ? 'table-info' : ''}>
                      <td><strong>{e.score}</strong></td>
                      <td><Badge bg={i === 3 ? 'danger' : i === 2 ? 'warning' : i === 1 ? 'info' : 'success'}>{e.level}</Badge></td>
                      <td>{e.response}</td>
                      <td>{e.frequency}</td>
                      <td>{e.team}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="analytics" title="📈 Prediction Analytics">
          <Card>
            <Card.Body>
              <Row className="text-center">
                <Col md={3}><h2 className="text-success">{metrics.predictionAccuracy}%</h2><small>AI Prediction Accuracy</small><ProgressBar now={metrics.predictionAccuracy} variant="success" className="mt-2" /></Col>
                <Col md={3}><h2 className="text-primary">{metrics.codeBluesAvoided}</h2><small>Code Blues Avoided (30d)</small></Col>
                <Col md={3}><h2 className="text-warning">{metrics.rrTriggers}</h2><small>Rapid Response Triggers</small></Col>
                <Col md={3}><h2 className="text-info">4.2h</h2><small>Avg Early Detection Lead</small></Col>
              </Row>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default EarlyWarningScore;
