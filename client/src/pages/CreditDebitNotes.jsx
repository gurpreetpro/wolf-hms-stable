import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Tabs, Tab, Button, Modal, Form } from 'react-bootstrap';

const CreditDebitNotes = () => {
    const [activeTab, setActiveTab] = useState('credit');
    const [showNew, setShowNew] = useState(false);
    const [noteType, setNoteType] = useState('Credit');

    const creditNotes = [
        { id: 'CN-2026-0045', date: '2026-03-01', patient: 'Ramesh Kumar', invoice: 'INV-87234', amount: 4500, reason: 'Duplicate charge — Chest X-Ray', status: 'Approved', approvedBy: 'Dr. Finance Head' },
        { id: 'CN-2026-0044', date: '2026-02-28', patient: 'Priya Sharma', invoice: 'INV-87198', amount: 12000, reason: 'Insurance adjustment — TPA rate difference', status: 'Approved', approvedBy: 'Billing Manager' },
        { id: 'CN-2026-0043', date: '2026-02-27', patient: 'Suresh Mehta', invoice: 'INV-87156', amount: 2200, reason: 'Cancelled lab test — CBC Panel', status: 'Pending', approvedBy: '—' },
        { id: 'CN-2026-0042', date: '2026-02-26', patient: 'Anita Reddy', invoice: 'INV-87101', amount: 8500, reason: 'Package rate correction — Normal delivery', status: 'Rejected', approvedBy: 'Rejected: insufficient docs' },
    ];

    const debitNotes = [
        { id: 'DN-2026-0018', date: '2026-03-01', patient: 'Vikram Joshi', invoice: 'INV-87245', amount: 3200, reason: 'Additional medication charges', status: 'Approved', approvedBy: 'Billing Manager' },
        { id: 'DN-2026-0017', date: '2026-02-28', patient: 'Meera Patel', invoice: 'INV-87200', amount: 15000, reason: 'Extended ICU stay — 2 additional days', status: 'Pending', approvedBy: '—' },
        { id: 'DN-2026-0016', date: '2026-02-25', patient: 'Arun Singh', invoice: 'INV-87098', amount: 5500, reason: 'OT consumables not billed initially', status: 'Approved', approvedBy: 'Dr. Finance Head' },
    ];

    const statusColor = (s) => ({ Approved: 'success', Pending: 'warning', Rejected: 'danger' }[s] || 'secondary');
    const notes = activeTab === 'credit' ? creditNotes : debitNotes;

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold">📝 Credit / Debit Notes</h3>
                <div className="d-flex gap-2">
                    <Button variant="success" onClick={() => { setNoteType('Credit'); setShowNew(true); }}>➕ Credit Note</Button>
                    <Button variant="warning" onClick={() => { setNoteType('Debit'); setShowNew(true); }}>➕ Debit Note</Button>
                </div>
            </div>

            <Row className="mb-4 g-3">
                {[
                    { t: 'Credit Notes (MTD)', v: '₹27,200', c: 'success' },
                    { t: 'Debit Notes (MTD)', v: '₹23,700', c: 'warning' },
                    { t: 'Pending Approval', v: 2, c: 'danger' },
                    { t: 'Net Adjustment', v: '₹-3,500', c: 'info' },
                ].map((k, i) => (
                    <Col md={3} key={i}><Card className="border-0 shadow-sm text-center"><Card.Body className="py-3"><small className="text-muted">{k.t}</small><h4 className={`fw-bold text-${k.c} mb-0`}>{k.v}</h4></Card.Body></Card></Col>
                ))}
            </Row>

            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
                <Tab eventKey="credit" title="🟢 Credit Notes">
                    <Card className="shadow-sm border-0"><Table hover responsive className="mb-0 align-middle">
                        <thead className="bg-light"><tr><th>Note ID</th><th>Date</th><th>Patient</th><th>Invoice</th><th>Amount</th><th>Reason</th><th>Status</th><th>Approved By</th></tr></thead>
                        <tbody>{creditNotes.map(n => (
                            <tr key={n.id}>
                                <td><code>{n.id}</code></td><td>{n.date}</td><td><strong>{n.patient}</strong></td>
                                <td><Badge bg="light" text="dark">{n.invoice}</Badge></td>
                                <td className="text-success fw-bold">₹{n.amount.toLocaleString()}</td>
                                <td><small>{n.reason}</small></td>
                                <td><Badge bg={statusColor(n.status)}>{n.status}</Badge></td>
                                <td><small>{n.approvedBy}</small></td>
                            </tr>
                        ))}</tbody>
                    </Table></Card>
                </Tab>
                <Tab eventKey="debit" title="🟡 Debit Notes">
                    <Card className="shadow-sm border-0"><Table hover responsive className="mb-0 align-middle">
                        <thead className="bg-light"><tr><th>Note ID</th><th>Date</th><th>Patient</th><th>Invoice</th><th>Amount</th><th>Reason</th><th>Status</th><th>Approved By</th></tr></thead>
                        <tbody>{debitNotes.map(n => (
                            <tr key={n.id}>
                                <td><code>{n.id}</code></td><td>{n.date}</td><td><strong>{n.patient}</strong></td>
                                <td><Badge bg="light" text="dark">{n.invoice}</Badge></td>
                                <td className="text-warning fw-bold">₹{n.amount.toLocaleString()}</td>
                                <td><small>{n.reason}</small></td>
                                <td><Badge bg={statusColor(n.status)}>{n.status}</Badge></td>
                                <td><small>{n.approvedBy}</small></td>
                            </tr>
                        ))}</tbody>
                    </Table></Card>
                </Tab>
            </Tabs>

            <Modal show={showNew} onHide={() => setShowNew(false)} size="lg">
                <Modal.Header closeButton className={`text-white ${noteType === 'Credit' ? 'bg-success' : 'bg-warning'}`}>
                    <Modal.Title>📝 New {noteType} Note</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Row>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Patient / Invoice</Form.Label><Form.Control placeholder="Search invoice number..." /></Form.Group></Col>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Original Invoice</Form.Label><Form.Control placeholder="INV-XXXXX" /></Form.Group></Col>
                        <Col md={4}><Form.Group className="mb-3"><Form.Label>Amount (₹)</Form.Label><Form.Control type="number" placeholder="0.00" /></Form.Group></Col>
                        <Col md={4}><Form.Group className="mb-3"><Form.Label>Category</Form.Label>
                            <Form.Select><option>Duplicate Charge</option><option>TPA Adjustment</option><option>Package Rate Correction</option><option>Cancelled Service</option><option>Additional Charges</option><option>Extended Stay</option><option>Other</option></Form.Select>
                        </Form.Group></Col>
                        <Col md={4}><Form.Group className="mb-3"><Form.Label>Priority</Form.Label><Form.Select><option>Normal</option><option>Urgent</option></Form.Select></Form.Group></Col>
                        <Col md={12}><Form.Group className="mb-3"><Form.Label>Reason / Justification</Form.Label><Form.Control as="textarea" rows={2} placeholder="Detailed reason for the adjustment..." /></Form.Group></Col>
                        <Col md={12}><Form.Group className="mb-3"><Form.Label>Supporting Documents</Form.Label><Form.Control type="file" multiple /></Form.Group></Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer><Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button><Button variant={noteType === 'Credit' ? 'success' : 'warning'} onClick={() => { alert(`✅ ${noteType} Note created`); setShowNew(false); }}>Submit for Approval</Button></Modal.Footer>
            </Modal>
        </Container>
    );
};

export default CreditDebitNotes;
