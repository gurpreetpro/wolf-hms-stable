import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab } from 'react-bootstrap';
import api from '../utils/axiosInstance';

const ProblemListManager = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [activeProblems, setActiveProblems] = useState([]);
  const [resolvedProblems, setResolvedProblems] = useState([]);
  const [summary, setSummary] = useState({ active: 0, resolved: 0, patients: 0, high: 0 });

  // Live coded problem list (icd10 codes) from the problem-list module
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/patient-problems');
        const all = res.data.data || res.data.problems || [];
        const byPatient = new Map();
        for (const row of all.filter(r => r.status === 'Active')) {
          const key = row.patient_name || row.patient_id;
          if (!byPatient.has(key)) byPatient.set(key, { patient: key, problems: [] });
          byPatient.get(key).problems.push(row);
        }
        setActiveProblems([...byPatient.values()]);
        setResolvedProblems(all.filter(r => r.status !== 'Active'));
        setSummary({
          active: all.filter(r => r.status === 'Active').length,
          resolved: all.filter(r => r.status !== 'Active').length,
          patients: byPatient.size,
          high: 0,
        });
      } catch (err) {
        console.error('[ProblemListManager] problem load failed:', err.message);
        setActiveProblems([]);
        setResolvedProblems([]);
        setSummary({ active: 0, resolved: 0, patients: 0, high: 0 });
      }
    })();
  }, []);

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Problem List Manager</h4>
          <small className="text-muted">ICD-10 coded problem lists, onset tracking, resolution documentation</small>
        </div>
        <Button variant="primary">+ Add Problem</Button>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">{summary.active}</h3><small>Active Problems</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{summary.resolved}</h3><small>Resolved</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{summary.patients}</h3><small>Patients Tracked</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{summary.high}</h3><small>High Severity</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="active" title={<span>Active Problems <Badge bg="danger">{summary.active}</Badge></span>}>
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
