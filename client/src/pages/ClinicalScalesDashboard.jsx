import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab } from 'react-bootstrap';

const ClinicalScalesDashboard = () => {
  const [activeTab, setActiveTab] = useState('active');

  const activeAssessments = [
    { patient: 'Ramesh Gupta (P-1045)', ward: 'ICU-3', scale: 'GCS', score: '8/15 (E2V2M4)', interpretation: 'Severe Brain Injury', trend: '↓ from 10', lastAssessed: '15:45', assessedBy: 'Nurse Anita', nextDue: '17:45', alert: true },
    { patient: 'Meena Sharma (P-1023)', ward: 'Ward A-12', scale: 'NEWS-2', score: '7', interpretation: 'High Clinical Risk', trend: '↑ from 4', lastAssessed: '15:30', assessedBy: 'Nurse Kavita', nextDue: '16:30', alert: true },
    { patient: 'Suresh Patel (P-987)', ward: 'ICU-1', scale: 'APACHE II', score: '22', interpretation: 'Predicted Mortality 40%', trend: '→ stable', lastAssessed: '14:00', assessedBy: 'Dr. Priya', nextDue: '20:00', alert: false },
    { patient: 'Anil Mehta (P-1067)', ward: 'Ward B-14', scale: 'Braden', score: '12/23', interpretation: 'High Risk Pressure Injury', trend: '↓ from 14', lastAssessed: '14:30', assessedBy: 'Nurse Renu', nextDue: '20:30', alert: true },
    { patient: 'Rajesh Kumar (P-956)', ward: 'PACU-2', scale: 'Aldrete', score: '7/10', interpretation: 'Not Ready for Discharge', trend: '↑ from 5', lastAssessed: '15:00', assessedBy: 'Nurse Maya', nextDue: '15:30', alert: false },
    { patient: 'Lakshmi Devi (P-1078)', ward: 'Ward A-8', scale: 'Norton', score: '10/20', interpretation: 'Very High Risk Falls', trend: '→ stable', lastAssessed: '13:00', assessedBy: 'Nurse Pooja', nextDue: '19:00', alert: true },
    { patient: 'Baby Arun (P-1089)', ward: 'NICU-4', scale: 'APGAR', score: '6 (1min) → 8 (5min)', interpretation: 'Normal Recovery', trend: '↑', lastAssessed: '12:30', assessedBy: 'Dr. Sunita', nextDue: 'N/A', alert: false },
  ];

  const scaleDefinitions = [
    { name: 'GCS (Glasgow Coma Scale)', range: '3-15', components: 'Eye (1-4) + Verbal (1-5) + Motor (1-6)', frequency: 'q2h in ICU, q4h in ward', thresholds: '≤8 Severe, 9-12 Moderate, 13-15 Mild', usage: 'Head injury, altered consciousness' },
    { name: 'NEWS-2 (National Early Warning)', range: '0-20', components: 'RR + SpO2 + Temp + BP + HR + Consciousness', frequency: 'q1h if ≥7, q4h if 1-4, q12h if 0', thresholds: '≥7 High, 5-6 Medium, 1-4 Low', usage: 'General ward deterioration' },
    { name: 'APACHE II', range: '0-71', components: '12 physiologic vars + age + chronic health', frequency: 'First 24h of ICU admission', thresholds: '>25: >50% mortality', usage: 'ICU severity & prognosis' },
    { name: 'Braden Scale', range: '6-23', components: 'Sensory + Moisture + Activity + Mobility + Nutrition + Friction', frequency: 'Daily for at-risk patients', thresholds: '≤12 High Risk, 13-14 Moderate, 15-18 Mild', usage: 'Pressure injury risk' },
    { name: 'Norton Scale', range: '5-20', components: 'Physical + Mental + Activity + Mobility + Incontinence', frequency: 'Weekly or on admission', thresholds: '≤14 At Risk, ≤12 High Risk', usage: 'Fall risk assessment' },
    { name: 'Aldrete Score', range: '0-10', components: 'Activity + Respiration + Circulation + Consciousness + SpO2', frequency: 'q15min in PACU', thresholds: '≥9 Safe to discharge', usage: 'Post-anesthesia recovery' },
    { name: 'APGAR Score', range: '0-10', components: 'Appearance + Pulse + Grimace + Activity + Respiration', frequency: '1min + 5min after birth', thresholds: '7-10 Normal, 4-6 Low, ≤3 Critical', usage: 'Newborn assessment' },
    { name: 'MEWS (Modified Early Warning)', range: '0-14', components: 'HR + RR + BP + Temp + Consciousness', frequency: 'q4h ward patients', thresholds: '≥5 Critical, 3-4 Concern', usage: 'Ward patient monitoring' },
  ];

  const analytics = [
    { metric: 'Total Assessments Today', value: '142' },
    { metric: 'Overdue Assessments', value: '3' },
    { metric: 'Critical Alerts Triggered', value: '8' },
    { metric: 'Auto-Escalations', value: '2' },
    { metric: 'Most Used Scale', value: 'NEWS-2 (68 assessments)' },
    { metric: 'Avg Completion Time', value: '3.2 min' },
  ];

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Clinical Assessment Scales Dashboard</h4>
          <small className="text-muted">Phase 13 -- GCS, NEWS-2, APACHE II, Braden, Norton, Aldrete, APGAR, MEWS</small>
        </div>
        <Button variant="primary">+ New Assessment</Button>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">4</h3><small>Critical Alerts</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">3</h3><small>Overdue</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">142</h3><small>Assessments Today</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">8</h3><small>Scales Active</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="active" title={<span>Active Scores <Badge bg="danger">4 alerts</Badge></span>}>
          <Card><Card.Body>
            <Table bordered hover responsive size="sm">
              <thead className="table-dark">
                <tr><th>Patient</th><th>Ward</th><th>Scale</th><th>Score</th><th>Interpretation</th><th>Trend</th><th>Last Assessed</th><th>Next Due</th><th>Alert</th></tr>
              </thead>
              <tbody>
                {activeAssessments.map((a) => (
                  <tr key={a.patient} className={a.alert ? 'table-danger' : ''}>
                    <td><strong>{a.patient}</strong></td>
                    <td><Badge bg="secondary">{a.ward}</Badge></td>
                    <td><Badge bg="primary">{a.scale}</Badge></td>
                    <td className="fw-bold">{a.score}</td>
                    <td><small>{a.interpretation}</small></td>
                    <td>{a.trend.startsWith('↓') ? <span className="text-danger fw-bold">{a.trend}</span> : a.trend.startsWith('↑') ? <span className="text-success fw-bold">{a.trend}</span> : <span className="text-muted">{a.trend}</span>}</td>
                    <td><small>{a.lastAssessed} by {a.assessedBy}</small></td>
                    <td><small>{a.nextDue}</small></td>
                    <td>{a.alert ? <Badge bg="danger">⚠️ ALERT</Badge> : <Badge bg="success">OK</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>

        <Tab eventKey="scales" title="Scale Reference">
          <Card><Card.Body>
            <Table bordered hover responsive size="sm">
              <thead className="table-dark">
                <tr><th>Scale</th><th>Range</th><th>Components</th><th>Frequency</th><th>Thresholds</th><th>Usage</th></tr>
              </thead>
              <tbody>
                {scaleDefinitions.map((s) => (
                  <tr key={s.name}>
                    <td><strong>{s.name}</strong></td>
                    <td><Badge bg="info">{s.range}</Badge></td>
                    <td><small>{s.components}</small></td>
                    <td><small>{s.frequency}</small></td>
                    <td><small className="text-danger">{s.thresholds}</small></td>
                    <td><small>{s.usage}</small></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>

        <Tab eventKey="analytics" title="Analytics">
          <Card><Card.Body>
            <Table bordered hover>
              <thead className="table-dark"><tr><th>Metric</th><th>Value</th></tr></thead>
              <tbody>
                {analytics.map((a) => (
                  <tr key={a.metric}><td><strong>{a.metric}</strong></td><td className="fw-bold">{a.value}</td></tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default ClinicalScalesDashboard;
