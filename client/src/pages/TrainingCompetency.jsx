import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, ProgressBar } from 'react-bootstrap';

const TrainingCompetency = () => {
  const [activeTab, setActiveTab] = useState('cme');

  const cmeTracking = [
    { name: 'Dr. Priya Sharma', dept: 'Cardiology', required: 30, earned: 28, remaining: 2, cycle: '2025-2027', status: 'On Track', lastActivity: 'Interventional Cardiology Workshop (8 credits)' },
    { name: 'Dr. Rajesh Kumar', dept: 'Orthopedics', required: 30, earned: 30, remaining: 0, cycle: '2025-2027', status: 'Completed', lastActivity: 'Arthroplasty Masterclass (6 credits)' },
    { name: 'Dr. Suresh Patel', dept: 'Emergency', required: 30, earned: 22, remaining: 8, cycle: '2025-2027', status: 'On Track', lastActivity: 'ATLS Recertification (16 credits)' },
    { name: 'Nurse Anita Desai', dept: 'ICU', required: 20, earned: 18, remaining: 2, cycle: '2025-2026', status: 'On Track', lastActivity: 'Critical Care Nursing Update (4 credits)' },
    { name: 'Dr. Meena Iyer', dept: 'Pediatrics', required: 30, earned: 12, remaining: 18, cycle: '2025-2027', status: 'Behind', lastActivity: 'Neonatal Resuscitation (4 credits)' },
    { name: 'Pharm. Rekha Jain', dept: 'Pharmacy', required: 15, earned: 15, remaining: 0, cycle: '2025-2026', status: 'Completed', lastActivity: 'Clinical Pharmacy Conference (5 credits)' },
  ];

  const certifications = [
    { cert: 'BLS (Basic Life Support)', provider: 'AHA', staff: 230, total: 245, coverage: 93.9, validity: '2 years', nextBatch: '2026-04-15' },
    { cert: 'ACLS (Advanced Cardiac)', provider: 'AHA', staff: 85, total: 120, coverage: 70.8, validity: '2 years', nextBatch: '2026-03-20' },
    { cert: 'Fire Safety', provider: 'NFSC', staff: 240, total: 245, coverage: 98.0, validity: '1 year', nextBatch: '2026-06-01' },
    { cert: 'Infection Control', provider: 'NABH', staff: 245, total: 245, coverage: 100, validity: '1 year', nextBatch: '2026-05-15' },
    { cert: 'PALS (Pediatric ALS)', provider: 'AHA', staff: 35, total: 45, coverage: 77.8, validity: '2 years', nextBatch: '2026-04-10' },
    { cert: 'Radiation Safety', provider: 'AERB', staff: 18, total: 18, coverage: 100, validity: '3 years', nextBatch: '2028-01-01' },
    { cert: 'Hand Hygiene', provider: 'WHO', staff: 245, total: 245, coverage: 100, validity: '6 months', nextBatch: '2026-06-01' },
  ];

  const assessments = [
    { name: 'Dr. Priya Sharma', domain: 'Clinical Procedures', score: 95, grade: 'A+', date: '2026-01-15', next: '2027-01-15', status: 'Passed' },
    { name: 'Nurse Anita Desai', domain: 'Critical Care Nursing', score: 88, grade: 'A', date: '2026-02-10', next: '2027-02-10', status: 'Passed' },
    { name: 'Dr. Suresh Patel', domain: 'Emergency Protocols', score: 92, grade: 'A+', date: '2025-12-20', next: '2026-12-20', status: 'Passed' },
    { name: 'Tech. Arun Nair', domain: 'Imaging Equipment', score: 85, grade: 'A', date: '2026-01-25', next: '2027-01-25', status: 'Passed' },
    { name: 'Nurse Kavita Rao', domain: 'General Nursing', score: 78, grade: 'B+', date: '2026-02-05', next: '2026-08-05', status: 'Passed (Retest in 6mo)' },
  ];

  const eLearning = [
    { course: 'HIPAA Privacy & Security', enrolled: 245, completed: 238, inProgress: 7, avgScore: 92, mandatory: true },
    { course: 'Patient Safety Fundamentals', enrolled: 245, completed: 245, inProgress: 0, avgScore: 89, mandatory: true },
    { course: 'Medication Safety', enrolled: 180, completed: 172, inProgress: 8, avgScore: 91, mandatory: true },
    { course: 'Cultural Competency', enrolled: 245, completed: 220, inProgress: 25, avgScore: 86, mandatory: false },
    { course: 'AI in Healthcare (New)', enrolled: 120, completed: 45, inProgress: 75, avgScore: 88, mandatory: false },
  ];

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Training & Competency Management</h4>
          <small className="text-muted">Phase 11 S-Tier -- CME tracking, certifications, competency assessments & e-learning</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary">+ Schedule Training</Button>
          <Button variant="outline-info">Training Report</Button>
        </div>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">92%</h3><small>CME Compliance</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">7</h3><small>Active Certifications</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">91.4%</h3><small>Cert Coverage</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">5</h3><small>E-Learning Courses</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">89.2</h3><small>Avg Assessment Score</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="cme" title="CME Credits">
          <Card>
            <Card.Body>
              <Table striped hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>Staff</th><th>Dept</th><th>Required</th><th>Earned</th><th>Progress</th><th>Cycle</th><th>Status</th><th>Last Activity</th></tr>
                </thead>
                <tbody>
                  {cmeTracking.map((c, i) => (
                    <tr key={i}>
                      <td><strong>{c.name}</strong></td>
                      <td>{c.dept}</td>
                      <td>{c.required}</td>
                      <td><strong>{c.earned}</strong></td>
                      <td style={{minWidth:120}}><ProgressBar now={(c.earned/c.required)*100} variant={c.status === 'Completed' ? 'success' : c.status === 'Behind' ? 'danger' : 'primary'} label={`${Math.round((c.earned/c.required)*100)}%`} /></td>
                      <td><small>{c.cycle}</small></td>
                      <td><Badge bg={c.status === 'Completed' ? 'success' : c.status === 'Behind' ? 'danger' : 'primary'}>{c.status}</Badge></td>
                      <td><small>{c.lastActivity}</small></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="certs" title="Certifications">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Certification</th><th>Provider</th><th>Certified</th><th>Total Req.</th><th>Coverage</th><th>Validity</th><th>Next Batch</th></tr>
                </thead>
                <tbody>
                  {certifications.map((c, i) => (
                    <tr key={i}>
                      <td><strong>{c.cert}</strong> {c.coverage === 100 && <Badge bg="success" style={{fontSize:'0.55rem'}}>100%</Badge>}</td>
                      <td><small>{c.provider}</small></td>
                      <td>{c.staff}</td>
                      <td>{c.total}</td>
                      <td><div className="d-flex align-items-center gap-2"><ProgressBar now={c.coverage} variant={c.coverage === 100 ? 'success' : c.coverage >= 80 ? 'primary' : 'warning'} style={{width:80,height:8}} /><small>{c.coverage}%</small></div></td>
                      <td><small>{c.validity}</small></td>
                      <td><small>{c.nextBatch}</small></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="assess" title="Assessments">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Staff</th><th>Domain</th><th>Score</th><th>Grade</th><th>Date</th><th>Next Due</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {assessments.map((a, i) => (
                    <tr key={i}>
                      <td><strong>{a.name}</strong></td>
                      <td>{a.domain}</td>
                      <td><strong>{a.score}%</strong></td>
                      <td><Badge bg={a.grade.startsWith('A') ? 'success' : 'primary'}>{a.grade}</Badge></td>
                      <td><small>{a.date}</small></td>
                      <td><small>{a.next}</small></td>
                      <td><Badge bg="success">{a.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="elearn" title="E-Learning">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Course</th><th>Enrolled</th><th>Completed</th><th>In Progress</th><th>Completion</th><th>Avg Score</th><th>Mandatory</th></tr>
                </thead>
                <tbody>
                  {eLearning.map((e, i) => (
                    <tr key={i}>
                      <td><strong>{e.course}</strong></td>
                      <td>{e.enrolled}</td>
                      <td className="text-success fw-bold">{e.completed}</td>
                      <td>{e.inProgress}</td>
                      <td><div className="d-flex align-items-center gap-2"><ProgressBar now={(e.completed/e.enrolled)*100} variant="success" style={{width:80,height:8}} /><small>{Math.round((e.completed/e.enrolled)*100)}%</small></div></td>
                      <td><strong>{e.avgScore}%</strong></td>
                      <td>{e.mandatory ? <Badge bg="danger">Mandatory</Badge> : <Badge bg="secondary">Optional</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default TrainingCompetency;
