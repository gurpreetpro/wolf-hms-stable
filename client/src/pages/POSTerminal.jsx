import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Tabs, Tab } from 'react-bootstrap';

const POSTerminal = () => {
  const [activeTab, setActiveTab] = useState('terminal');

  const currentQueue = [
    { token: 'T-045', patient: 'Walk-in', service: 'OPD Consultation', department: 'General Medicine', amount: 'Rs.500', method: 'UPI', time: '16:05', status: 'Processing' },
    { token: 'T-046', patient: 'Ramesh Gupta (P-1045)', service: 'Lab - CBC + LFT + KFT', department: 'Laboratory', amount: 'Rs.1,450', method: 'Card', time: '16:08', status: 'Waiting' },
    { token: 'T-047', patient: 'Walk-in', service: 'Pharmacy Purchase', department: 'Pharmacy', amount: 'Rs.780', method: 'Cash', time: '16:10', status: 'Waiting' },
  ];

  const todayTransactions = [
    { id: 'POS-3201', time: '15:55', patient: 'Meena Devi', service: 'Ultrasound Abdomen', amount: 'Rs.1,200', method: 'UPI', operator: 'Rekha', status: 'Completed' },
    { id: 'POS-3200', time: '15:40', patient: 'Walk-in', service: 'ECG', amount: 'Rs.300', method: 'Cash', operator: 'Sanjay', status: 'Completed' },
    { id: 'POS-3199', time: '15:22', patient: 'Anil Mehta', service: 'X-Ray Chest PA', amount: 'Rs.450', method: 'Card', operator: 'Rekha', status: 'Completed' },
    { id: 'POS-3198', time: '15:10', patient: 'Walk-in', service: 'OPD + Pharmacy', amount: 'Rs.1,850', method: 'UPI', operator: 'Sanjay', status: 'Completed' },
    { id: 'POS-3197', time: '14:55', patient: 'Fatima Khan', service: 'MRI Brain', amount: 'Rs.5,500', method: 'Card', operator: 'Rekha', status: 'Completed' },
    { id: 'POS-3196', time: '14:30', patient: 'Walk-in', service: 'Health Checkup Package', amount: 'Rs.4,999', method: 'UPI', operator: 'Sanjay', status: 'Completed' },
  ];

  const serviceModules = [
    { module: 'OPD Consultation', txnToday: 45, revenue: 'Rs.22,500', avgTicket: 'Rs.500' },
    { module: 'Laboratory', txnToday: 38, revenue: 'Rs.55,100', avgTicket: 'Rs.1,450' },
    { module: 'Radiology', txnToday: 22, revenue: 'Rs.44,000', avgTicket: 'Rs.2,000' },
    { module: 'Pharmacy (Walk-in)', txnToday: 65, revenue: 'Rs.50,700', avgTicket: 'Rs.780' },
    { module: 'Procedures', txnToday: 12, revenue: 'Rs.36,000', avgTicket: 'Rs.3,000' },
    { module: 'Health Packages', txnToday: 8, revenue: 'Rs.39,992', avgTicket: 'Rs.4,999' },
    { module: 'Emergency Registration', txnToday: 6, revenue: 'Rs.6,000', avgTicket: 'Rs.1,000' },
    { module: 'Vaccination', txnToday: 15, revenue: 'Rs.22,500', avgTicket: 'Rs.1,500' },
    { module: 'Dental', txnToday: 10, revenue: 'Rs.15,000', avgTicket: 'Rs.1,500' },
    { module: 'Physiotherapy', txnToday: 8, revenue: 'Rs.8,000', avgTicket: 'Rs.1,000' },
    { module: 'Diet Counseling', txnToday: 5, revenue: 'Rs.2,500', avgTicket: 'Rs.500' },
    { module: 'Medical Certificates', txnToday: 12, revenue: 'Rs.3,600', avgTicket: 'Rs.300' },
  ];

  const paymentSummary = [
    { method: 'UPI (GPay/PhonePe)', count: 98, amount: 'Rs.1,42,800', share: '46.5%' },
    { method: 'Card (Debit/Credit)', count: 52, amount: 'Rs.89,600', share: '29.2%' },
    { method: 'Cash', count: 72, amount: 'Rs.62,500', share: '20.4%' },
    { method: 'Insurance (Cashless TPA)', count: 8, amount: 'Rs.8,500', share: '2.8%' },
    { method: 'PMJAY', count: 4, amount: 'Rs.3,492', share: '1.1%' },
  ];

  const totalRevenue = 'Rs.3,06,892';
  const totalTxn = 234;

  return (
    <Container fluid className="py-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h4 className="mb-0">Point-of-Sale Terminal</h4>
          <small className="text-muted">Phase 13 -- POS with 12 service sub-modules, multi-payment, walk-in + registered</small>
        </div>
        <Button variant="success" size="lg">+ New Transaction</Button>
      </div>

      <Row className="mb-3">
        <Col><Card className="text-center border-success"><Card.Body><h3 className="text-success">{totalRevenue}</h3><small>Revenue Today</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-primary"><Card.Body><h3 className="text-primary">{totalTxn}</h3><small>Transactions</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-info"><Card.Body><h3 className="text-info">Rs.1,312</h3><small>Avg Ticket Size</small></Card.Body></Card></Col>
        <Col><Card className="text-center border-warning"><Card.Body><h3 className="text-warning">{currentQueue.length}</h3><small>In Queue</small></Card.Body></Card></Col>
      </Row>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="terminal" title={<span>Live Queue <Badge bg="warning" text="dark">{currentQueue.length}</Badge></span>}>
          <Card><Card.Body>
            <Table bordered hover responsive>
              <thead className="table-success">
                <tr><th>Token</th><th>Patient</th><th>Service</th><th>Dept</th><th>Amount</th><th>Payment</th><th>Time</th><th>Status</th><th>Action</th></tr>
              </thead>
              <tbody>
                {currentQueue.map((q) => (
                  <tr key={q.token}>
                    <td><Badge bg="primary">{q.token}</Badge></td>
                    <td><strong>{q.patient}</strong></td>
                    <td>{q.service}</td>
                    <td><small>{q.department}</small></td>
                    <td className="text-success fw-bold">{q.amount}</td>
                    <td><Badge bg="info">{q.method}</Badge></td>
                    <td><small>{q.time}</small></td>
                    <td><Badge bg={q.status === 'Processing' ? 'warning' : 'secondary'}>{q.status}</Badge></td>
                    <td><Button size="sm" variant="success">Complete</Button></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>

        <Tab eventKey="transactions" title="Today's Transactions">
          <Card><Card.Body>
            <Table striped hover responsive size="sm">
              <thead className="table-dark">
                <tr><th>ID</th><th>Time</th><th>Patient</th><th>Service</th><th>Amount</th><th>Payment</th><th>Operator</th><th>Status</th></tr>
              </thead>
              <tbody>
                {todayTransactions.map((t) => (
                  <tr key={t.id}>
                    <td><code>{t.id}</code></td>
                    <td><small>{t.time}</small></td>
                    <td><strong>{t.patient}</strong></td>
                    <td>{t.service}</td>
                    <td className="text-success fw-bold">{t.amount}</td>
                    <td><Badge bg="info">{t.method}</Badge></td>
                    <td><small>{t.operator}</small></td>
                    <td><Badge bg="success">{t.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>

        <Tab eventKey="modules" title="Service Modules (12)">
          <Card><Card.Body>
            <Table bordered hover responsive>
              <thead className="table-dark">
                <tr><th>Service Module</th><th>Transactions Today</th><th>Revenue</th><th>Avg Ticket</th></tr>
              </thead>
              <tbody>
                {serviceModules.map((m) => (
                  <tr key={m.module}>
                    <td><strong>{m.module}</strong></td>
                    <td className="text-center">{m.txnToday}</td>
                    <td className="text-success fw-bold">{m.revenue}</td>
                    <td>{m.avgTicket}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>

        <Tab eventKey="payments" title="Payment Summary">
          <Card><Card.Body>
            <Table bordered hover responsive>
              <thead className="table-dark">
                <tr><th>Payment Method</th><th>Transactions</th><th>Amount</th><th>Share</th></tr>
              </thead>
              <tbody>
                {paymentSummary.map((p) => (
                  <tr key={p.method}>
                    <td><strong>{p.method}</strong></td>
                    <td className="text-center">{p.count}</td>
                    <td className="text-success fw-bold">{p.amount}</td>
                    <td><Badge bg="primary">{p.share}</Badge></td>
                  </tr>
                ))}
                <tr className="table-success fw-bold">
                  <td>TOTAL</td>
                  <td className="text-center">{totalTxn}</td>
                  <td>{totalRevenue}</td>
                  <td>100%</td>
                </tr>
              </tbody>
            </Table>
          </Card.Body></Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default POSTerminal;
