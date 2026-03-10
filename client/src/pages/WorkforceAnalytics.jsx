import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, ProgressBar } from 'react-bootstrap';

const WorkforceAnalytics = () => {
  const [activeTab, setActiveTab] = useState('utilization');

  const utilization = [
    { dept: 'Cardiology', totalStaff: 18, activeToday: 14, utilRate: 92, avgHoursWeek: 44, patientToStaff: '8:1', efficiency: 'High' },
    { dept: 'Emergency', totalStaff: 25, activeToday: 22, utilRate: 96, avgHoursWeek: 48, patientToStaff: '12:1', efficiency: 'High' },
    { dept: 'ICU', totalStaff: 30, activeToday: 28, utilRate: 95, avgHoursWeek: 46, patientToStaff: '2:1', efficiency: 'Optimal' },
    { dept: 'Orthopedics', totalStaff: 15, activeToday: 12, utilRate: 88, avgHoursWeek: 42, patientToStaff: '10:1', efficiency: 'Good' },
    { dept: 'Pediatrics', totalStaff: 12, activeToday: 10, utilRate: 85, avgHoursWeek: 40, patientToStaff: '9:1', efficiency: 'Good' },
    { dept: 'OB-GYN', totalStaff: 14, activeToday: 11, utilRate: 87, avgHoursWeek: 42, patientToStaff: '7:1', efficiency: 'Good' },
    { dept: 'Radiology', totalStaff: 10, activeToday: 8, utilRate: 90, avgHoursWeek: 43, patientToStaff: '15:1', efficiency: 'High' },
    { dept: 'Pharmacy', totalStaff: 12, activeToday: 10, utilRate: 88, avgHoursWeek: 41, patientToStaff: 'N/A', efficiency: 'Good' },
    { dept: 'Nursing Pool', totalStaff: 60, activeToday: 52, utilRate: 91, avgHoursWeek: 44, patientToStaff: '5:1', efficiency: 'High' },
    { dept: 'Admin & Support', totalStaff: 49, activeToday: 35, utilRate: 78, avgHoursWeek: 40, patientToStaff: 'N/A', efficiency: 'Moderate' },
  ];

  const attrition = [
    { period: 'Q1 2026 (Jan-Mar)', openingCount: 240, joined: 12, resigned: 5, terminated: 2, closingCount: 245, attritionRate: '2.9%', avgTenure: '3.2 yrs' },
    { period: 'Q4 2025 (Oct-Dec)', openingCount: 235, joined: 10, resigned: 3, terminated: 2, closingCount: 240, attritionRate: '2.1%', avgTenure: '3.1 yrs' },
    { period: 'Q3 2025 (Jul-Sep)', openingCount: 228, joined: 14, resigned: 6, terminated: 1, closingCount: 235, attritionRate: '3.0%', avgTenure: '2.9 yrs' },
    { period: 'Q2 2025 (Apr-Jun)', openingCount: 222, joined: 11, resigned: 4, terminated: 1, closingCount: 228, attritionRate: '2.2%', avgTenure: '2.8 yrs' },
  ];

  const productivity = [
    { metric: 'Average Patients per Doctor/Day', value: '18.5', benchmark: '15-20', trend: 'Stable', status: 'Met' },
    { metric: 'Bed Turnover Rate', value: '4.2', benchmark: '3.5-5.0', trend: 'Improving', status: 'Met' },
    { metric: 'Avg Length of Stay (days)', value: '3.8', benchmark: '3.5-4.5', trend: 'Stable', status: 'Met' },
    { metric: 'Lab TAT (hours)', value: '2.1', benchmark: '<4', trend: 'Improving', status: 'Met' },
    { metric: 'OT Utilization (%)', value: '82%', benchmark: '>75%', trend: 'Improving', status: 'Met' },
    { metric: 'Pharmacy Dispensing Time (min)', value: '8.5', benchmark: '<15', trend: 'Stable', status: 'Met' },
    { metric: 'Radiology Report TAT (hours)', value: '1.5', benchmark: '<2', trend: 'Stable', status: 'Met' },
    { metric: 'Nurse-to-Patient Ratio', value: '1:5', benchmark: '1:4 to 1:6', trend: 'Stable', status: 'Met' },
    { metric: 'Staff Satisfaction Score', value: '4.2/5', benchmark: '>3.5/5', trend: 'Improving', status: 'Met' },
    { metric: 'Overtime as % of Total Hours', value: '5.8%', benchmark: '<8%', trend: 'Stable', status: 'Met' },
  ];

  const totalStaff = utilization.reduce((s, d) => s + d.totalStaff, 0);
  const activeToday = utilization.reduce((s, d) => s + d.activeToday, 0);

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Workforce Analytics</h4>
          <small className="text-muted">Phase 11 S-Tier -- Staff utilization, attrition tracking, productivity metrics & benchmarking</small>
        </div>
        <Button variant="outline-primary">Download Report</Button>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{totalStaff}</h3><small>Total Workforce</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{activeToday}</h3><small>Active Today</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">89.8%</h3><small>Avg Utilization</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">2.5%</h3><small>Attrition Rate</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">4.2/5</h3><small>Staff Satisfaction</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="utilization" title="Staff Utilization">
          <Card>
            <Card.Body>
              <Table striped hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>Department</th><th>Total</th><th>Active</th><th>Utilization</th><th>Avg Hrs/Week</th><th>Patient:Staff</th><th>Efficiency</th></tr>
                </thead>
                <tbody>
                  {utilization.map((u, i) => (
                    <tr key={i}>
                      <td><strong>{u.dept}</strong></td>
                      <td>{u.totalStaff}</td>
                      <td>{u.activeToday}</td>
                      <td><div className="d-flex align-items-center gap-2"><ProgressBar now={u.utilRate} variant={u.utilRate >= 90 ? 'success' : u.utilRate >= 80 ? 'primary' : 'warning'} style={{width:80,height:8}} /><small>{u.utilRate}%</small></div></td>
                      <td>{u.avgHoursWeek}h</td>
                      <td><Badge bg="info">{u.patientToStaff}</Badge></td>
                      <td><Badge bg={u.efficiency === 'Optimal' ? 'success' : u.efficiency === 'High' ? 'primary' : u.efficiency === 'Good' ? 'info' : 'warning'}>{u.efficiency}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="attrition" title="Attrition Tracking">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Period</th><th>Opening</th><th>Joined</th><th>Resigned</th><th>Terminated</th><th>Closing</th><th>Attrition</th><th>Avg Tenure</th></tr>
                </thead>
                <tbody>
                  {attrition.map((a, i) => (
                    <tr key={i}>
                      <td><strong>{a.period}</strong></td>
                      <td>{a.openingCount}</td>
                      <td className="text-success fw-bold">+{a.joined}</td>
                      <td className="text-danger">-{a.resigned}</td>
                      <td className="text-danger">-{a.terminated}</td>
                      <td><strong>{a.closingCount}</strong></td>
                      <td><Badge bg={parseFloat(a.attritionRate) <= 3 ? 'success' : 'warning'}>{a.attritionRate}</Badge></td>
                      <td>{a.avgTenure}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="productivity" title="Productivity Metrics">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Metric</th><th>Current Value</th><th>Benchmark</th><th>Trend</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {productivity.map((p, i) => (
                    <tr key={i}>
                      <td><strong>{p.metric}</strong></td>
                      <td className="fw-bold text-primary">{p.value}</td>
                      <td><small>{p.benchmark}</small></td>
                      <td><Badge bg={p.trend === 'Improving' ? 'success' : 'info'}>{p.trend === 'Improving' ? '↑ ' : '→ '}{p.trend}</Badge></td>
                      <td><Badge bg="success">{p.status}</Badge></td>
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

export default WorkforceAnalytics;
