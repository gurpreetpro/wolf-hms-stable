import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, ProgressBar } from 'react-bootstrap';

const TransitionPlanner = () => {
  const [activeTab, setActiveTab] = useState('active');

  const activePlans = [];

  const readyForDischarge = [];

  const dischargedToday = [];

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Discharge Transition Planner</h4>
          <small className="text-muted">Discharge readiness tracking, task checklists, transition workflows</small>
        </div>
        <Button variant="primary">+ Create Plan</Button>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">{activePlans.length}</h3><small>Active Plans</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{readyForDischarge.length}</h3><small>Ready for Discharge</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{dischargedToday.length}</h3><small>Discharged Today</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">3.8d</h3><small>Avg LOS</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="active" title={<span>Active Plans <Badge bg="info">{activePlans.length}</Badge></span>}>
          {activePlans.map((p) => (
            <Card key={p.patient} className="mb-3">
              <Card.Header className="d-flex justify-content-between align-items-center">
                <div><strong>{p.patient}</strong> — {p.ward} | Day {p.day} | Target: {p.targetDischarge}</div>
                <Badge bg="info">{p.destination}</Badge>
              </Card.Header>
              <Card.Body>
                <ProgressBar now={p.progress} label={`${p.progress}%`} variant={p.progress >= 80 ? 'success' : p.progress >= 50 ? 'info' : 'warning'} className="mb-3" />
                <Table bordered size="sm">
                  <thead className="table-light">
                    <tr><th>Task</th><th>Owner</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {p.tasks.map((t) => (
                      <tr key={t.task}>
                        <td>{t.task}</td>
                        <td><small>{t.owner}</small></td>
                        <td><Badge bg={t.status === 'Completed' ? 'success' : t.status === 'In Progress' ? 'warning' : 'secondary'}>{t.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          ))}
        </Tab>

        <Tab eventKey="ready" title={<span>Ready <Badge bg="success">{readyForDischarge.length}</Badge></span>}>
          <Card><Card.Body>
            <Table bordered hover responsive>
              <thead className="table-success">
                <tr><th>Patient</th><th>Ward</th><th>Diagnosis</th><th>LOS</th><th>Summary</th><th>Insurance</th><th>Follow-Up</th><th>Action</th></tr>
              </thead>
              <tbody>
                {readyForDischarge.map((r) => (
                  <tr key={r.patient}>
                    <td><strong>{r.patient}</strong></td>
                    <td><Badge bg="secondary">{r.ward}</Badge></td>
                    <td>{r.diagnosis}</td>
                    <td>{r.los}</td>
                    <td><Badge bg="success">{r.dischargeSummary}</Badge></td>
                    <td><small>{r.insurance}</small></td>
                    <td><small>{r.followUp}</small></td>
                    <td><Button size="sm" variant="success">Discharge Now</Button></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>

        <Tab eventKey="discharged" title="Discharged Today">
          <Card><Card.Body>
            <Table striped hover responsive>
              <thead className="table-dark">
                <tr><th>Patient</th><th>Diagnosis</th><th>LOS</th><th>Discharged At</th><th>Destination</th><th>Follow-Up</th><th>Summary</th></tr>
              </thead>
              <tbody>
                {dischargedToday.map((d) => (
                  <tr key={d.patient}>
                    <td><strong>{d.patient}</strong></td>
                    <td>{d.diagnosis}</td>
                    <td>{d.los}</td>
                    <td>{d.dischargedAt}</td>
                    <td><Badge bg="info">{d.destination}</Badge></td>
                    <td><small>{d.followUp}</small></td>
                    <td><Badge bg="success">{d.summary}</Badge></td>
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

export default TransitionPlanner;
