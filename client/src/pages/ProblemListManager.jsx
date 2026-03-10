import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab } from 'react-bootstrap';

const ProblemListManager = () => {
  const [activeTab, setActiveTab] = useState('active');

  const activeProblems = [
    { patient: 'Ramesh Gupta (P-1045)', problems: [
      { icd: 'I48.0', name: 'Atrial Fibrillation', onset: '2025-06-15', severity: 'Moderate', status: 'Active', managedBy: 'Dr. Amit Verma' },
      { icd: 'E11.9', name: 'Type 2 Diabetes Mellitus', onset: '2020-03-10', severity: 'Controlled', status: 'Active', managedBy: 'Dr. Priya Sharma' },
      { icd: 'I10', name: 'Essential Hypertension', onset: '2019-08-22', severity: 'Controlled', status: 'Active', managedBy: 'Dr. Priya Sharma' },
    ]},
    { patient: 'Meena Devi (P-1078)', problems: [
      { icd: 'O60.1', name: 'Preterm Labor - 32 weeks', onset: '2026-03-01', severity: 'High', status: 'Active', managedBy: 'Dr. Rajesh Kumar' },
      { icd: 'O24.4', name: 'Gestational Diabetes', onset: '2026-01-15', severity: 'Moderate', status: 'Active', managedBy: 'Dr. Rajesh Kumar' },
    ]},
    { patient: 'Anil Mehta (P-1067)', problems: [
      { icd: 'K25.9', name: 'Gastric Ulcer', onset: '2026-02-20', severity: 'Moderate', status: 'Active', managedBy: 'Dr. Suresh Patel' },
      { icd: 'F10.1', name: 'Alcohol Use Disorder', onset: '2024-01-01', severity: 'Moderate', status: 'Active', managedBy: 'Dr. Suresh Patel' },
      { icd: 'K70.3', name: 'Alcoholic Cirrhosis', onset: '2025-11-10', severity: 'Severe', status: 'Active', managedBy: 'Dr. Rao' },
    ]},
  ];

  const resolvedProblems = [
    { patient: 'Vikram Singh (P-998)', icd: 'I21.0', name: 'Acute STEMI', onset: '2026-02-25', resolved: '2026-02-27', resolution: 'PTCA + DES Stenting successful' },
    { patient: 'Priya Sen (P-978)', icd: 'R05', name: 'Chronic Cough', onset: '2026-01-10', resolved: '2026-02-28', resolution: 'Diagnosed as Asthma — started inhaler therapy' },
    { patient: 'Rekha Jain (P-945)', icd: 'A41.9', name: 'Sepsis', onset: '2026-02-20', resolved: '2026-02-28', resolution: 'IV antibiotics 7-day course completed, cultures negative' },
    { patient: 'Suresh Patel (P-987)', icd: 'N17.9', name: 'Acute Kidney Injury', onset: '2026-02-15', resolved: '2026-02-22', resolution: 'Resolved with hydration, Cr normalized to 1.1' },
  ];

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Problem List Manager</h4>
          <small className="text-muted">Phase 13 -- ICD-10 coded problem lists, onset tracking, resolution documentation</small>
        </div>
        <Button variant="primary">+ Add Problem</Button>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">8</h3><small>Active Problems</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">4</h3><small>Resolved This Month</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">3</h3><small>Patients Tracked</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">2</h3><small>High Severity</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="active" title={<span>Active Problems <Badge bg="danger">8</Badge></span>}>
          {activeProblems.map((p) => (
            <Card key={p.patient} className="mb-3">
              <Card.Header className="bg-dark text-white"><strong>{p.patient}</strong> — {p.problems.length} active problems</Card.Header>
              <Card.Body>
                <Table bordered hover responsive size="sm">
                  <thead className="table-light">
                    <tr><th>ICD-10</th><th>Problem</th><th>Onset</th><th>Severity</th><th>Managed By</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {p.problems.map((prob) => (
                      <tr key={prob.icd}>
                        <td><code>{prob.icd}</code></td>
                        <td><strong>{prob.name}</strong></td>
                        <td><small>{prob.onset}</small></td>
                        <td><Badge bg={prob.severity === 'High' || prob.severity === 'Severe' ? 'danger' : prob.severity === 'Moderate' ? 'warning' : 'success'}>{prob.severity}</Badge></td>
                        <td><small>{prob.managedBy}</small></td>
                        <td><Button size="sm" variant="outline-success" className="me-1">Resolve</Button><Button size="sm" variant="outline-secondary">Edit</Button></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          ))}
        </Tab>

        <Tab eventKey="resolved" title="Resolved">
          <Card><Card.Body>
            <Table striped hover responsive>
              <thead className="table-dark">
                <tr><th>Patient</th><th>ICD-10</th><th>Problem</th><th>Onset</th><th>Resolved</th><th>Resolution</th></tr>
              </thead>
              <tbody>
                {resolvedProblems.map((r) => (
                  <tr key={r.icd + r.patient}>
                    <td><strong>{r.patient}</strong></td>
                    <td><code>{r.icd}</code></td>
                    <td>{r.name}</td>
                    <td><small>{r.onset}</small></td>
                    <td><small>{r.resolved}</small></td>
                    <td><Badge bg="success">{r.resolution}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default ProblemListManager;
