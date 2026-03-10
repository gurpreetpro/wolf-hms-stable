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

  const payroll = [
    { empId: 'WH-001', name: 'Dr. Priya Sharma', dept: 'Cardiology', designation: 'Sr. Consultant', basic: 180000, da: 36000, hra: 72000, special: 25000, ot: 0, gross: 313000, pf: 21600, tax: 42500, insurance: 2500, other: 1500, deductions: 68100, net: 244900, bank: 'HDFC ****4521' },
    { empId: 'WH-015', name: 'Dr. Rajesh Kumar', dept: 'Orthopedics', designation: 'HOD', basic: 200000, da: 40000, hra: 80000, special: 30000, ot: 0, gross: 350000, pf: 21600, tax: 52000, insurance: 2500, other: 1500, deductions: 77600, net: 272400, bank: 'SBI ****7832' },
    { empId: 'WH-042', name: 'Nurse Anita Desai', dept: 'ICU', designation: 'Head Nurse', basic: 55000, da: 11000, hra: 22000, special: 8000, ot: 8400, gross: 104400, pf: 6600, tax: 5200, insurance: 2500, other: 0, deductions: 14300, net: 90100, bank: 'ICICI ****1234' },
    { empId: 'WH-067', name: 'Dr. Suresh Patel', dept: 'Emergency', designation: 'Consultant', basic: 150000, da: 30000, hra: 60000, special: 20000, ot: 25600, gross: 285600, pf: 21600, tax: 35000, insurance: 2500, other: 1500, deductions: 60600, net: 225000, bank: 'Axis ****5678' },
    { empId: 'WH-089', name: 'Nurse Kavita Rao', dept: 'General Ward', designation: 'Staff Nurse', basic: 35000, da: 7000, hra: 14000, special: 5000, ot: 5400, gross: 66400, pf: 4200, tax: 0, insurance: 2500, other: 0, deductions: 6700, net: 59700, bank: 'BOB ****9012' },
    { empId: 'WH-112', name: 'Tech. Arun Nair', dept: 'Radiology', designation: 'Sr. Technician', basic: 45000, da: 9000, hra: 18000, special: 6000, ot: 3000, gross: 81000, pf: 5400, tax: 2500, insurance: 2500, other: 0, deductions: 10400, net: 70600, bank: 'HDFC ****3456' },
  ];

  const attendance = [
    { name: 'Dr. Priya Sharma', present: 24, absent: 0, halfDay: 0, leave: 4, holidays: 2, lop: 0, workingDays: 24 },
    { name: 'Dr. Rajesh Kumar', present: 25, absent: 0, halfDay: 0, leave: 3, holidays: 2, lop: 0, workingDays: 25 },
    { name: 'Nurse Anita Desai', present: 26, absent: 1, halfDay: 0, leave: 1, holidays: 2, lop: 0, workingDays: 26 },
    { name: 'Dr. Suresh Patel', present: 27, absent: 0, halfDay: 0, leave: 1, holidays: 2, lop: 0, workingDays: 27 },
    { name: 'Nurse Kavita Rao', present: 24, absent: 0, halfDay: 1, leave: 3, holidays: 2, lop: 0, workingDays: 24.5 },
    { name: 'Tech. Arun Nair', present: 25, absent: 0, halfDay: 0, leave: 3, holidays: 2, lop: 0, workingDays: 25 },
  ];

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Payroll Integration</h4>
          <small className="text-muted">Phase 11 S-Tier -- Salary processing, attendance-linked pay, deductions & payslips</small>
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
