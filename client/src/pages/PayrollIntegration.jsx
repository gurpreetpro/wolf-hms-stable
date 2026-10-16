import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab, ProgressBar } from 'react-bootstrap';

const PayrollIntegration = () => {
  const [activeTab, setActiveTab] = useState('summary');

  const payrollSummary = {
    month: 'February 2026',
    totalStaff: 245,
    processedOn: '2026-02-28',
    totalGross: 'Rs.1,22,50,000',
    totalDeductions: 'Rs.18,45,000',
    totalNet: 'Rs.1,04,05,000',
    status: 'Processed',
  };

  const payroll = [];

  const attendance = [];

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Payroll Integration</h4>
          <small className="text-muted">Salary processing, attendance-linked pay, deductions & payslips</small>
        </div>
        <div className="d-flex gap-2">
          <Button variant="success">Run Payroll</Button>
          <Button variant="outline-primary">Generate Payslips</Button>
        </div>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-success"><Card.Body><h5 className="text-success">{payrollSummary.totalGross}</h5><small>Gross Salary</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-danger"><Card.Body><h5 className="text-danger">{payrollSummary.totalDeductions}</h5><small>Total Deductions</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h5 className="text-primary">{payrollSummary.totalNet}</h5><small>Net Payable</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">{payrollSummary.totalStaff}</h3><small>Staff Processed</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><Badge bg="success" className="p-2 fs-6">{payrollSummary.status}</Badge><br/><small>{payrollSummary.month}</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="summary" title="Payroll Sheet">
          <Card>
            <Card.Body>
              <div className="table-responsive">
                <Table bordered hover size="sm" style={{fontSize:'0.75rem'}}>
                  <thead className="table-dark">
                    <tr>
                      <th>Emp ID</th><th>Name</th><th>Dept</th><th>Basic</th><th>DA</th><th>HRA</th><th>Special</th><th>OT</th>
                      <th className="table-success">Gross</th><th>PF</th><th>Tax</th><th>Ins</th>
                      <th className="table-danger">Deductions</th><th className="table-primary">Net Pay</th><th>Bank</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payroll.map(p => (
                      <tr key={p.empId}>
                        <td><code>{p.empId}</code></td>
                        <td><strong>{p.name}</strong></td>
                        <td><small>{p.dept}</small></td>
                        <td>{(p.basic/1000).toFixed(0)}K</td>
                        <td>{(p.da/1000).toFixed(0)}K</td>
                        <td>{(p.hra/1000).toFixed(0)}K</td>
                        <td>{(p.special/1000).toFixed(0)}K</td>
                        <td className={p.ot > 0 ? 'text-info fw-bold' : ''}>{p.ot > 0 ? (p.ot/1000).toFixed(1)+'K' : '-'}</td>
                        <td className="fw-bold text-success">Rs.{p.gross.toLocaleString()}</td>
                        <td>{(p.pf/1000).toFixed(1)}K</td>
                        <td>{p.tax > 0 ? (p.tax/1000).toFixed(1)+'K' : '-'}</td>
                        <td>{(p.insurance/1000).toFixed(1)}K</td>
                        <td className="fw-bold text-danger">Rs.{p.deductions.toLocaleString()}</td>
                        <td className="fw-bold text-primary">Rs.{p.net.toLocaleString()}</td>
                        <td><small>{p.bank}</small></td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="attendance" title="Attendance Summary">
          <Card>
            <Card.Body>
              <Table bordered hover responsive>
                <thead className="table-dark">
                  <tr><th>Staff</th><th>Present</th><th>Absent</th><th>Half Day</th><th>Leave</th><th>Holidays</th><th>LOP</th><th>Working Days</th></tr>
                </thead>
                <tbody>
                  {attendance.map((a, i) => (
                    <tr key={i}>
                      <td><strong>{a.name}</strong></td>
                      <td className="text-success fw-bold">{a.present}</td>
                      <td className={a.absent > 0 ? 'text-danger fw-bold' : ''}>{a.absent}</td>
                      <td>{a.halfDay}</td>
                      <td>{a.leave}</td>
                      <td>{a.holidays}</td>
                      <td className={a.lop > 0 ? 'text-danger' : ''}>{a.lop}</td>
                      <td><strong>{a.workingDays}</strong></td>
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

export default PayrollIntegration;
