import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Form, Modal, Tabs, Tab, ProgressBar } from 'react-bootstrap';

const PatientSafetyDashboard = () => {
  const [activeTab, setActiveTab] = useState('incidents');
  const [showReportModal, setShowReportModal] = useState(false);

  const incidents = [
    { id: 'PSR-101', date: '02 Mar 2026', type: 'Medication Error', category: 'Near Miss', severity: 'Low', patient: 'Rajesh Kumar', location: 'Ward-A', reporter: 'Nurse Meera', status: 'Under Review', description: 'Wrong dose prepared — caught before administration' },
    { id: 'PSR-102', date: '01 Mar 2026', type: 'Fall', category: 'Adverse Event', severity: 'Moderate', patient: 'Lakshmi Nair', location: 'ICU', reporter: 'Nurse Priya', status: 'RCA Initiated', description: 'Patient fell from bed, bed rails were down' },
    { id: 'PSR-103', date: '01 Mar 2026', type: 'Surgical', category: 'Near Miss', severity: 'High', patient: 'Suresh Menon', location: 'OT-2', reporter: 'Dr. Reddy', status: 'Resolved', description: 'Wrong site prep — caught during surgical pause' },
    { id: 'PSR-104', date: '28 Feb 2026', type: 'Infection', category: 'Adverse Event', severity: 'Moderate', patient: 'Priya Singh', location: 'Ward-B', reporter: 'Dr. Patel', status: 'Under Review', description: 'CAUTI suspected — catheter in situ > 5 days' },
    { id: 'PSR-105', date: '27 Feb 2026', type: 'Lab Error', category: 'Near Miss', severity: 'Low', patient: 'Mohammed Ali', location: 'Lab', reporter: 'Tech Arun', status: 'Resolved', description: 'Mislabeled sample — identified at accessioning' },
    { id: 'PSR-106', date: '27 Feb 2026', type: 'Blood Transfusion', category: 'Sentinel Event', severity: 'Critical', patient: 'Vikram Iyer', location: 'ICU', reporter: 'Nurse Ritu', status: 'RCA Complete', description: 'Transfusion reaction — ABO incompatibility, TRALI workup' },
  ];

  const rcaData = [
    { id: 'RCA-201', incident: 'PSR-102', title: 'Patient Fall — ICU Bed Rails', phase: 'Analysis', owner: 'QI Team', deadline: '10 Mar 2026', progress: 60, findings: ['Bed rail standard not enforced', 'Night staffing reduced', 'Fall risk not reassessed'] },
    { id: 'RCA-202', incident: 'PSR-106', title: 'Transfusion Reaction — ABO', phase: 'Action Plan', owner: 'Blood Bank', deadline: '05 Mar 2026', progress: 85, findings: ['BBTS barcode scanner offline', 'Manual crosscheck skipped', 'Double-check protocol not followed'] },
  ];

  const metrics = {
    totalIncidents: 156, nearMisses: 89, adverseEvents: 52, sentinelEvents: 2,
    nearMissRate: 57, reportingRate: 82, meanTimeToRCA: '4.2 days',
    topCategories: [
      { name: 'Medication Errors', count: 42, pct: 27 },
      { name: 'Falls', count: 28, pct: 18 },
      { name: 'Infections', count: 22, pct: 14 },
      { name: 'Surgical', count: 18, pct: 12 },
      { name: 'Lab Errors', count: 15, pct: 10 },
    ]
  };

  const severityColor = (s) => s === 'Critical' ? 'danger' : s === 'High' ? 'warning' : s === 'Moderate' ? 'info' : 'secondary';
  const categoryColor = (c) => c === 'Sentinel Event' ? 'danger' : c === 'Adverse Event' ? 'warning' : 'info';

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">🛡️ Patient Safety Incident Reporting</h4>
          <small className="text-muted">Phase 6 S-Tier — Near-miss/adverse event reporting with RCA workflow</small>
        </div>
        <Button variant="danger" onClick={() => setShowReportModal(true)}>🚨 Report Incident</Button>
      </div>

      <Row className="mb-3">
        <Col md={3}><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{metrics.totalIncidents}</h3><small>Total Incidents (YTD)</small></Card.Body></Card></Col>
        <Col md={3}><Card className="text-center border-info"><Card.Body><h3 className="text-info">{metrics.nearMisses}</h3><small>Near Misses ({metrics.nearMissRate}%)</small></Card.Body></Card></Col>
        <Col md={3}><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{metrics.adverseEvents}</h3><small>Adverse Events</small></Card.Body></Card></Col>
        <Col md={3}><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">{metrics.sentinelEvents}</h3><small>Sentinel Events</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="incidents" title="📋 Incident Log">
          <Card>
            <Card.Body>
              <Table striped hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>ID</th><th>Date</th><th>Type</th><th>Category</th><th>Severity</th><th>Patient</th><th>Location</th><th>Status</th><th>Description</th></tr>
                </thead>
                <tbody>
                  {incidents.map(inc => (
                    <tr key={inc.id} className={inc.category === 'Sentinel Event' ? 'table-danger' : ''}>
                      <td><strong>{inc.id}</strong></td>
                      <td>{inc.date}</td>
                      <td>{inc.type}</td>
                      <td><Badge bg={categoryColor(inc.category)}>{inc.category}</Badge></td>
                      <td><Badge bg={severityColor(inc.severity)}>{inc.severity}</Badge></td>
                      <td>{inc.patient}</td>
                      <td>{inc.location}</td>
                      <td><Badge bg={inc.status === 'Resolved' ? 'success' : inc.status.includes('RCA') ? 'primary' : 'warning'}>{inc.status}</Badge></td>
                      <td style={{maxWidth: 250}}><small>{inc.description}</small></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="rca" title="🔍 Root Cause Analysis">
          <Row>
            {rcaData.map(rca => (
              <Col md={6} key={rca.id}>
                <Card className="mb-3 border-primary">
                  <Card.Header className="bg-primary text-white">
                    <div className="d-flex justify-content-between">
                      <strong>{rca.id}: {rca.title}</strong>
                      <Badge bg="light" text="dark">{rca.phase}</Badge>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <Row className="mb-2">
                      <Col><small className="text-muted">Incident:</small> {rca.incident}</Col>
                      <Col><small className="text-muted">Owner:</small> {rca.owner}</Col>
                      <Col><small className="text-muted">Deadline:</small> {rca.deadline}</Col>
                    </Row>
                    <ProgressBar now={rca.progress} label={`${rca.progress}%`} variant={rca.progress > 80 ? 'success' : 'primary'} className="mb-2" />
                    <h6>Root Cause Findings:</h6>
                    <ul className="mb-0">
                      {rca.findings.map((f, i) => <li key={i}><small>{f}</small></li>)}
                    </ul>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Tab>

        <Tab eventKey="analytics" title="📊 Safety Analytics">
          <Card>
            <Card.Body>
              <h5 className="mb-3">Incident Categories (YTD)</h5>
              {metrics.topCategories.map((cat, i) => (
                <div key={i} className="mb-2">
                  <div className="d-flex justify-content-between">
                    <span>{cat.name}</span>
                    <span>{cat.count} ({cat.pct}%)</span>
                  </div>
                  <ProgressBar now={cat.pct} variant={i === 0 ? 'danger' : i === 1 ? 'warning' : 'info'} />
                </div>
              ))}
              <hr />
              <Row className="mt-3">
                <Col md={4} className="text-center"><h4>{metrics.reportingRate}%</h4><small className="text-muted">Reporting Rate</small></Col>
                <Col md={4} className="text-center"><h4>{metrics.meanTimeToRCA}</h4><small className="text-muted">Mean Time to RCA</small></Col>
                <Col md={4} className="text-center"><h4>{metrics.nearMissRate}%</h4><small className="text-muted">Near-Miss Ratio</small></Col>
              </Row>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      <Modal show={showReportModal} onHide={() => setShowReportModal(false)} size="lg">
        <Modal.Header closeButton className="bg-danger text-white"><Modal.Title>🚨 Report Safety Incident</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form>
            <Row className="mb-3">
              <Col md={6}><Form.Group><Form.Label>Incident Type</Form.Label><Form.Select><option>Medication Error</option><option>Fall</option><option>Surgical Error</option><option>Infection</option><option>Lab Error</option><option>Blood Transfusion</option><option>Equipment Failure</option><option>Other</option></Form.Select></Form.Group></Col>
              <Col md={6}><Form.Group><Form.Label>Category</Form.Label><Form.Select><option>Near Miss</option><option>Adverse Event</option><option>Sentinel Event</option></Form.Select></Form.Group></Col>
            </Row>
            <Row className="mb-3">
              <Col md={4}><Form.Group><Form.Label>Severity</Form.Label><Form.Select><option>Low</option><option>Moderate</option><option>High</option><option>Critical</option></Form.Select></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label>Patient (if applicable)</Form.Label><Form.Control placeholder="Patient name or MRN" /></Form.Group></Col>
              <Col md={4}><Form.Group><Form.Label>Location</Form.Label><Form.Select><option>Ward-A</option><option>Ward-B</option><option>ICU</option><option>OT-1</option><option>OT-2</option><option>Lab</option><option>Pharmacy</option><option>ED</option></Form.Select></Form.Group></Col>
            </Row>
            <Form.Group className="mb-3"><Form.Label>Description</Form.Label><Form.Control as="textarea" rows={3} placeholder="What happened? Include timeline and people involved..." /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Immediate Action Taken</Form.Label><Form.Control as="textarea" rows={2} placeholder="What was done immediately to address the situation?" /></Form.Group>
            <Form.Check type="checkbox" label="I want to remain anonymous" className="mb-2" />
          </Form>
        </Modal.Body>
        <Modal.Footer><Button variant="danger">Submit Report</Button></Modal.Footer>
      </Modal>
    </Container>
  );
};

export default PatientSafetyDashboard;
