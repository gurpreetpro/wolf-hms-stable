import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, Form, ProgressBar } from 'react-bootstrap';

const StaffRoster = () => {
  const [activeTab, setActiveTab] = useState('roster');

  const todayRoster = [];

  const leaveCalendar = [];

  const overtime = [];

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Staff Roster & Scheduling</h4>
          <small className="text-muted">Shift management, duty rosters, leave calendar & overtime tracking</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="primary">+ Create Shift</Button>
          <Button variant="outline-success">Export Roster</Button>
        </div>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">245</h3><small>Total Staff</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">182</h3><small>On Duty Today</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">12</h3><small>On Leave</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">8</h3><small>On Call</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-danger"><Card.Body><h3 className="text-danger">86 hrs</h3><small>Overtime (This Month)</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="roster" title="Today's Roster">
          <Card>
            <Card.Body>
              <Table striped hover responsive size="sm">
                <thead className="table-dark">
                  <tr><th>Staff Member</th><th>Department</th><th>Role</th><th>Shift</th><th>Status</th><th>Contact</th></tr>
                </thead>
                <tbody>
                  {todayRoster.map((s, i) => (
                    <tr key={i}>
                      <td><strong>{s.name}</strong></td>
                      <td>{s.dept}</td>
                      <td><small>{s.role}</small></td>
                      <td><small>{s.shift}</small></td>
                      <td><Badge bg={s.status === 'On Duty' ? 'success' : s.status === 'Upcoming' ? 'info' : s.status === 'On Call' ? 'warning' : 'secondary'}>{s.status}</Badge></td>
                      <td><small>{s.phone}</small></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="leave" title="Leave Calendar">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Staff</th><th>Dept</th><th>Type</th><th>From</th><th>To</th><th>Days</th><th>Coverage</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {leaveCalendar.map((l, i) => (
                    <tr key={i} className={l.status === 'Pending' ? 'table-warning' : ''}>
                      <td><strong>{l.name}</strong></td>
                      <td>{l.dept}</td>
                      <td><Badge bg={l.type.includes('Sick') ? 'danger' : l.type.includes('Maternity') ? 'info' : l.type.includes('CME') ? 'primary' : 'success'}>{l.type}</Badge></td>
                      <td>{l.from}</td>
                      <td>{l.to}</td>
                      <td><strong>{l.days}</strong></td>
                      <td><small>{l.coverage}</small></td>
                      <td><Badge bg={l.status === 'Approved' ? 'success' : 'warning'}>{l.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="overtime" title="Overtime Tracker">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Staff</th><th>Dept</th><th>Regular Hrs</th><th>OT Hrs</th><th>Total</th><th>OT Rate</th><th>OT Amount</th><th>Month</th></tr>
                </thead>
                <tbody>
                  {overtime.map((o, i) => (
                    <tr key={i}>
                      <td><strong>{o.name}</strong></td>
                      <td>{o.dept}</td>
                      <td>{o.regularHrs}</td>
                      <td className="text-danger fw-bold">{o.overtimeHrs}</td>
                      <td><strong>{o.totalHrs}</strong></td>
                      <td><small>{o.rate}</small></td>
                      <td className="text-success fw-bold">{o.amount}</td>
                      <td><small>{o.month}</small></td>
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

export default StaffRoster;
