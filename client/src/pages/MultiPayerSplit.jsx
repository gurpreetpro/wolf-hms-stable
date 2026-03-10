import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Button, Modal, Form, ProgressBar } from 'react-bootstrap';

const MultiPayerSplit = () => {
    const [showSplit, setShowSplit] = useState(false);

    const splitBills = [
        {
            id: 'INV-87301', patient: 'Ramesh Kumar', total: 250000, date: '2026-03-01', status: 'Settled',
            payers: [
                { type: 'Insurance', name: 'Star Health — Gold Plan', amount: 175000, pct: 70, status: 'Paid' },
                { type: 'Corporate', name: 'TCS Wellness Program', amount: 50000, pct: 20, status: 'Paid' },
                { type: 'Patient', name: 'Self / Cash', amount: 25000, pct: 10, status: 'Paid' },
            ]
        },
        {
            id: 'INV-87298', patient: 'Priya Sharma', total: 180000, date: '2026-02-28', status: 'Partial',
            payers: [
                { type: 'Insurance', name: 'ICICI Lombard — Platinum', amount: 150000, pct: 83, status: 'Approved' },
                { type: 'PMJAY', name: 'PMJAY — AB-PMJAY', amount: 0, pct: 0, status: 'N/A' },
                { type: 'Patient', name: 'Self / Cash', amount: 30000, pct: 17, status: 'Pending' },
            ]
        },
        {
            id: 'INV-87285', patient: 'Vikram Joshi', total: 95000, date: '2026-02-27', status: 'Pending',
            payers: [
                { type: 'Insurance', name: 'Max Bupa — Heartbeat', amount: 60000, pct: 63, status: 'Submitted' },
                { type: 'Corporate', name: 'Infosys EHB', amount: 20000, pct: 21, status: 'Pending' },
                { type: 'Patient', name: 'Advance Deposit', amount: 15000, pct: 16, status: 'Collected' },
            ]
        },
    ];

    const payerColor = (t) => ({ Insurance: 'primary', Corporate: 'info', Patient: 'success', PMJAY: 'warning' }[t] || 'secondary');
    const statusColor = (s) => ({ Paid: 'success', Approved: 'info', Collected: 'success', Submitted: 'warning', Pending: 'danger', 'N/A': 'secondary' }[s] || 'secondary');
    const billStatus = (s) => ({ Settled: 'success', Partial: 'warning', Pending: 'danger' }[s] || 'secondary');

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold">💳 Multi-Payer Bill Splitting</h3>
                <Button variant="primary" onClick={() => setShowSplit(true)}>➕ New Split Bill</Button>
            </div>

            <Row className="mb-4 g-3">
                {[
                    { t: 'Active Splits', v: splitBills.length, c: 'primary' },
                    { t: 'Total Billed', v: '₹5,25,000', c: 'info' },
                    { t: 'Insurance Share', v: '73%', c: 'success' },
                    { t: 'Patient Due', v: '₹70,000', c: 'danger' },
                ].map((k, i) => (
                    <Col md={3} key={i}><Card className="border-0 shadow-sm text-center"><Card.Body className="py-3"><small className="text-muted">{k.t}</small><h4 className={`fw-bold text-${k.c} mb-0`}>{k.v}</h4></Card.Body></Card></Col>
                ))}
            </Row>

            {splitBills.map(bill => (
                <Card key={bill.id} className="shadow-sm border-0 mb-3">
                    <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                        <div>
                            <strong>{bill.patient}</strong> — <code>{bill.id}</code>
                            <small className="text-muted ms-2">{bill.date}</small>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                            <span className="fw-bold">₹{bill.total.toLocaleString()}</span>
                            <Badge bg={billStatus(bill.status)}>{bill.status}</Badge>
                        </div>
                    </Card.Header>
                    <Card.Body>
                        <Table responsive className="mb-0 align-middle" size="sm">
                            <thead><tr><th>Payer Type</th><th>Payer Name</th><th>Amount</th><th>Share</th><th>Payment Status</th></tr></thead>
                            <tbody>{bill.payers.map((p, i) => (
                                <tr key={i}>
                                    <td><Badge bg={payerColor(p.type)}>{p.type}</Badge></td>
                                    <td>{p.name}</td>
                                    <td className="fw-bold">₹{p.amount.toLocaleString()}</td>
                                    <td><div className="d-flex align-items-center gap-2"><ProgressBar now={p.pct} style={{ width: 60, height: 8 }} variant={payerColor(p.type)} /><small>{p.pct}%</small></div></td>
                                    <td><Badge bg={statusColor(p.status)}>{p.status}</Badge></td>
                                </tr>
                            ))}</tbody>
                        </Table>
                    </Card.Body>
                </Card>
            ))}

            <Modal show={showSplit} onHide={() => setShowSplit(false)} size="lg">
                <Modal.Header closeButton className="bg-primary text-white"><Modal.Title>💳 Create Multi-Payer Split</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Row>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Invoice</Form.Label><Form.Control placeholder="Search invoice..." /></Form.Group></Col>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Total Amount (₹)</Form.Label><Form.Control type="number" placeholder="0.00" /></Form.Group></Col>
                    </Row>
                    <h6 className="fw-bold mt-2 mb-3">Payer Allocation</h6>
                    {['Primary Insurance', 'Secondary Insurance / PMJAY', 'Corporate / Employer', 'Patient (Self-Pay)'].map((payer, i) => (
                        <Row key={i} className="mb-2 align-items-center">
                            <Col md={4}><Form.Label className="mb-0 small">{payer}</Form.Label></Col>
                            <Col md={4}><Form.Control size="sm" type="number" placeholder="Amount ₹" /></Col>
                            <Col md={4}><Form.Control size="sm" type="number" placeholder="%" max={100} /></Col>
                        </Row>
                    ))}
                </Modal.Body>
                <Modal.Footer><Button variant="secondary" onClick={() => setShowSplit(false)}>Cancel</Button><Button variant="primary" onClick={() => { alert('✅ Split bill created'); setShowSplit(false); }}>Create Split</Button></Modal.Footer>
            </Modal>
        </Container>
    );
};

export default MultiPayerSplit;
