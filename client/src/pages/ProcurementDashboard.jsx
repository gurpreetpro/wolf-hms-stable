import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Tabs, Tab, Form, Button, Modal } from 'react-bootstrap';

const ProcurementDashboard = () => {
    const [activeTab, setActiveTab] = useState('po');
    const [showNewPO, setShowNewPO] = useState(false);
    const [poForm, setPoForm] = useState({ vendor: '', items: '', quantity: '', unit_price: '', delivery_date: '', terms: 'Net 30' });

    const purchaseOrders = [
        { id: 'PO-0091', vendor: 'MedSupply India', items: 'Gloves×500, N95×200', total: '₹45,000', status: 'Approved', date: '2026-03-01', grn: null },
        { id: 'PO-0090', vendor: 'Cipla Distribution', items: 'Paracetamol×5000, Amox×2000', total: '₹1,20,000', status: 'GRN Pending', date: '2026-02-28', grn: null },
        { id: 'PO-0089', vendor: 'BioMed Instruments', items: 'BP Monitor×10, Oximeter×20', total: '₹85,000', status: 'GRN Complete', date: '2026-02-25', grn: 'GRN-0045' },
        { id: 'PO-0088', vendor: 'Labline Reagents', items: 'CBC Kit×100, Calibrator×50', total: '₹2,50,000', status: 'Invoice Matched', date: '2026-02-22', grn: 'GRN-0044' },
        { id: 'PO-0087', vendor: 'SterilTech', items: 'Autoclave Paper×1000', total: '₹18,500', status: 'Paid', date: '2026-02-20', grn: 'GRN-0043' },
    ];

    const vendors = [
        { id: 1, name: 'MedSupply India', contact: 'Rajesh Shah', category: 'Consumables', rating: 4.5, poCount: 45 },
        { id: 2, name: 'Cipla Distribution', contact: 'Ankit Patel', category: 'Pharma', rating: 4.8, poCount: 120 },
        { id: 3, name: 'BioMed Instruments', contact: 'Sneha Gupta', category: 'Equipment', rating: 4.2, poCount: 22 },
        { id: 4, name: 'Labline Reagents', contact: 'Dr. Mukesh', category: 'Lab Supplies', rating: 4.6, poCount: 67 },
    ];

    const grnList = [
        { id: 'GRN-0045', po: 'PO-0089', vendor: 'BioMed', received: '2026-02-28', accepted: 29, rejected: 1, status: 'Complete' },
        { id: 'GRN-0044', po: 'PO-0088', vendor: 'Labline', received: '2026-02-26', accepted: 150, rejected: 0, status: 'Matched' },
        { id: 'GRN-0043', po: 'PO-0087', vendor: 'SterilTech', received: '2026-02-23', accepted: 1498, rejected: 2, status: 'Paid' },
    ];

    const statusColor = (s) => ({ 'Approved': 'primary', 'GRN Pending': 'warning', 'GRN Complete': 'info', 'Invoice Matched': 'success', 'Paid': 'success', 'Complete': 'info', 'Matched': 'success' }[s] || 'secondary');

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold">📦 Procurement & Vendor Management</h3>
                <Button variant="primary" onClick={() => setShowNewPO(true)}>➕ New Purchase Order</Button>
            </div>

            <Row className="mb-4 g-3">
                {[{ t: 'Active POs', v: 3, c: 'primary' }, { t: 'GRN Pending', v: 1, c: 'warning' }, { t: 'Vendors', v: vendors.length, c: 'info' }, { t: 'Monthly Spend', v: '₹5.18L', c: 'success' }].map((k, i) => (
                    <Col md={3} key={i}><Card className="border-0 shadow-sm text-center"><Card.Body className="py-3"><small className="text-muted">{k.t}</small><h4 className={`fw-bold text-${k.c} mb-0`}>{k.v}</h4></Card.Body></Card></Col>
                ))}
            </Row>

            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
                <Tab eventKey="po" title="📋 Purchase Orders">
                    <Card className="shadow-sm border-0"><Table hover responsive className="mb-0 align-middle">
                        <thead className="bg-light"><tr><th>PO#</th><th>Vendor</th><th>Items</th><th>Total</th><th>Date</th><th>GRN</th><th>Status</th></tr></thead>
                        <tbody>{purchaseOrders.map(po => (<tr key={po.id}><td><code>{po.id}</code></td><td><strong>{po.vendor}</strong></td><td><small>{po.items}</small></td><td className="fw-bold">{po.total}</td><td>{po.date}</td><td>{po.grn ? <Badge bg="info">{po.grn}</Badge> : '—'}</td><td><Badge bg={statusColor(po.status)}>{po.status}</Badge></td></tr>))}</tbody>
                    </Table></Card>
                </Tab>

                <Tab eventKey="grn" title="📥 Goods Receipt (GRN)">
                    <Card className="shadow-sm border-0"><Table hover responsive className="mb-0 align-middle">
                        <thead className="bg-light"><tr><th>GRN#</th><th>PO</th><th>Vendor</th><th>Received</th><th>Accepted</th><th>Rejected</th><th>Status</th></tr></thead>
                        <tbody>{grnList.map(g => (<tr key={g.id}><td><code>{g.id}</code></td><td>{g.po}</td><td>{g.vendor}</td><td>{g.received}</td><td className="text-success fw-bold">{g.accepted}</td><td className={g.rejected > 0 ? 'text-danger fw-bold' : ''}>{g.rejected}</td><td><Badge bg={statusColor(g.status)}>{g.status}</Badge></td></tr>))}</tbody>
                    </Table></Card>
                </Tab>

                <Tab eventKey="vendors" title="🏢 Vendors">
                    <Card className="shadow-sm border-0"><Table hover responsive className="mb-0 align-middle">
                        <thead className="bg-light"><tr><th>Vendor</th><th>Contact</th><th>Category</th><th>Rating</th><th>POs</th><th>Action</th></tr></thead>
                        <tbody>{vendors.map(v => (<tr key={v.id}><td><strong>{v.name}</strong></td><td>{v.contact}</td><td><Badge bg="secondary">{v.category}</Badge></td><td>{'⭐'.repeat(Math.round(v.rating))}</td><td>{v.poCount}</td><td><Button size="sm" variant="outline-primary">📦 New PO</Button></td></tr>))}</tbody>
                    </Table></Card>
                </Tab>

                <Tab eventKey="matching" title="🔄 3-Way Match">
                    <Card className="shadow-sm border-0"><Card.Header className="bg-white fw-bold">PO → GRN → Invoice Matching</Card.Header>
                    <Table hover responsive className="mb-0 text-center align-middle">
                        <thead className="bg-light"><tr><th>PO</th><th>PO Amount</th><th>GRN</th><th>Invoice</th><th>Variance</th><th>Match</th></tr></thead>
                        <tbody>
                            <tr><td>PO-0088</td><td>₹2,50,000</td><td><Badge bg="success">GRN-0044 ✅</Badge></td><td>INV-9087</td><td className="text-success">₹0</td><td><Badge bg="success">✅ Perfect</Badge></td></tr>
                            <tr><td>PO-0087</td><td>₹18,500</td><td><Badge bg="success">GRN-0043 ✅</Badge></td><td>INV-9080</td><td className="text-warning">₹150</td><td><Badge bg="warning">⚠️ Minor</Badge></td></tr>
                        </tbody>
                    </Table></Card>
                </Tab>
            </Tabs>

            <Modal show={showNewPO} onHide={() => setShowNewPO(false)} size="lg">
                <Modal.Header closeButton className="bg-primary text-white"><Modal.Title>📦 Create Purchase Order</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Row>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Vendor</Form.Label><Form.Select value={poForm.vendor} onChange={e => setPoForm({...poForm, vendor: e.target.value})}><option value="">Select</option>{vendors.map(v => <option key={v.id}>{v.name}</option>)}</Form.Select></Form.Group></Col>
                        <Col md={6}><Form.Group className="mb-3"><Form.Label>Terms</Form.Label><Form.Select value={poForm.terms} onChange={e => setPoForm({...poForm, terms: e.target.value})}><option>Net 30</option><option>Net 15</option><option>COD</option></Form.Select></Form.Group></Col>
                        <Col md={12}><Form.Group className="mb-3"><Form.Label>Items</Form.Label><Form.Control as="textarea" rows={2} value={poForm.items} onChange={e => setPoForm({...poForm, items: e.target.value})} /></Form.Group></Col>
                        <Col md={4}><Form.Group className="mb-3"><Form.Label>Qty</Form.Label><Form.Control type="number" value={poForm.quantity} onChange={e => setPoForm({...poForm, quantity: e.target.value})} /></Form.Group></Col>
                        <Col md={4}><Form.Group className="mb-3"><Form.Label>Unit Price ₹</Form.Label><Form.Control type="number" value={poForm.unit_price} onChange={e => setPoForm({...poForm, unit_price: e.target.value})} /></Form.Group></Col>
                        <Col md={4}><Form.Group className="mb-3"><Form.Label>Delivery</Form.Label><Form.Control type="date" value={poForm.delivery_date} onChange={e => setPoForm({...poForm, delivery_date: e.target.value})} /></Form.Group></Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer><Button variant="secondary" onClick={() => setShowNewPO(false)}>Cancel</Button><Button variant="primary" onClick={() => { alert('✅ PO created (demo)'); setShowNewPO(false); }}>📤 Create PO</Button></Modal.Footer>
            </Modal>
        </Container>
    );
};

export default ProcurementDashboard;
