import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Form, Row, Col, Alert, Modal, Spinner } from 'react-bootstrap';
import { Plus, CheckCircle, Clock, Truck, FileText } from 'lucide-react';
import api from '../utils/axiosInstance';

const ProcurementDashboard = ({ inventory }) => {
    const [suppliers, setSuppliers] = useState([]);
    const [items, setItems] = useState([
        { inventory_item_id: '', item_name: '', quantity: 1, unit_price: 0 }
    ]);
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [message, setMessage] = useState(null);
    const [purchaseOrders, setPurchaseOrders] = useState([]); // List of POs
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Add Supplier Modal State
    const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
    const [supplierForm, setSupplierForm] = useState({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        gstin: '',
        drug_license_no: '',
        payment_terms: 'Net 30'
    });
    const [supplierSaving, setSupplierSaving] = useState(false);

    // GRN / Receive Stock Modal State
    const [showReceiveModal, setShowReceiveModal] = useState(false);
    const [receivingPO, setReceivingPO] = useState(null);
    const [grnForm, setGrnForm] = useState({
        invoice_number: '',
        invoice_date: new Date().toISOString().slice(0, 10),
        notes: '',
        items: []
    });
    const [receivingStock, setReceivingStock] = useState(false);

    useEffect(() => {
        fetchSuppliers();
        fetchPurchaseOrders();
    }, [refreshTrigger]);

    const fetchSuppliers = async () => {
        try {
            const res = await api.get('/api/pharmacy/suppliers');
            const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setSuppliers(data);
            if (data.length > 0 && !selectedSupplier) setSelectedSupplier(data[0].id);
        } catch (err) {
            console.error("Supplier fetch failed", err);
        }
    };

    const fetchPurchaseOrders = async () => {
        try {
            const res = await api.get('/api/pharmacy/purchase-orders');
            setPurchaseOrders(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (err) {
            console.error("PO fetch failed", err);
        }
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        if (field === 'inventory_item_id') {
            const selectedInv = inventory.find(inv => inv.id.toString() === value);
            if (selectedInv) {
                newItems[index].item_name = selectedInv.name;
                newItems[index].unit_price = selectedInv.price_per_unit || 0;
            }
        }
        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { inventory_item_id: '', item_name: '', quantity: 1, unit_price: 0 }]);
    };

    const removeItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const createPO = async () => {
        if (!selectedSupplier) {
            setMessage({ type: 'danger', text: 'Please select a supplier.' });
            return;
        }
        try {
            const payload = {
                supplier_id: selectedSupplier,
                items: items.filter(i => i.inventory_item_id && i.quantity > 0),
                expected_delivery_date: deliveryDate,
                notes: 'Generated from Enterprise Pharmacy Dashboard'
            };
            await api.post('/api/pharmacy/purchase-orders', payload);
            setMessage({ type: 'success', text: 'Purchase Order created and submitted for approval!' });
            setItems([{ inventory_item_id: '', item_name: '', quantity: 1, unit_price: 0 }]);
            setRefreshTrigger(prev => prev + 1);
        } catch (err) {
            setMessage({ type: 'danger', text: 'Failed to create PO: ' + (err.response?.data?.message || err.message) });
        }
    };

    const handleOpenReceiveModal = (po) => {
        setReceivingPO(po);
        setGrnForm({
            invoice_number: `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
            invoice_date: new Date().toISOString().slice(0, 10),
            notes: `Received stock for PO #${po.id}`,
            items: (po.items || []).map(it => ({
                po_item_id: it.id,
                inventory_item_id: it.inventory_item_id,
                item_name: it.item_name,
                quantity: it.quantity,
                unit_price: it.unit_price,
                batch_number: `BATCH-${(it.item_name || 'MED').slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
                mfg_date: new Date().toISOString().slice(0, 10),
                expiry_date: '2028-12-31'
            }))
        });
        setShowReceiveModal(true);
    };

    const handleGrnItemChange = (index, field, value) => {
        const updated = [...grnForm.items];
        updated[index][field] = value;
        setGrnForm({ ...grnForm, items: updated });
    };

    const handleReceiveStockSubmit = async (e) => {
        e.preventDefault();
        if (!receivingPO) return;
        setReceivingStock(true);

        try {
            const payload = {
                po_id: receivingPO.id,
                invoice_number: grnForm.invoice_number,
                invoice_date: grnForm.invoice_date,
                items: grnForm.items,
                notes: grnForm.notes
            };
            const res = await api.post('/api/pharmacy/purchase-orders/receive', payload);
            const grnNumber = res.data?.data?.grn_number || 'GRN-Processed';
            setMessage({ 
                type: 'success', 
                text: `Stock received & Goods Received Note generated! (${grnNumber})` 
            });
            setShowReceiveModal(false);
            setReceivingPO(null);
            setRefreshTrigger(prev => prev + 1);
        } catch (err) {
            setMessage({ type: 'danger', text: 'Failed to receive stock: ' + (err.response?.data?.message || err.message) });
        } finally {
            setReceivingStock(false);
        }
    };

    const handleAddSupplierSubmit = async (e) => {
        e.preventDefault();
        setSupplierSaving(true);
        try {
            const res = await api.post('/api/pharmacy/suppliers', supplierForm);
            const created = res.data?.data || res.data;
            setMessage({ type: 'success', text: `Supplier "${supplierForm.name}" registered successfully!` });
            setShowAddSupplierModal(false);
            setSupplierForm({
                name: '',
                contact_person: '',
                phone: '',
                email: '',
                address: '',
                gstin: '',
                drug_license_no: '',
                payment_terms: 'Net 30'
            });
            await fetchSuppliers();
            if (created?.id) setSelectedSupplier(created.id);
        } catch (err) {
            setMessage({ type: 'danger', text: 'Failed to create supplier: ' + (err.response?.data?.message || err.message) });
        } finally {
            setSupplierSaving(false);
        }
    };

    const grandTotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    return (
        <div className="p-3">
            {message && <Alert variant={message.type} onClose={() => setMessage(null)} dismissible>{message.text}</Alert>}

            <Row>
                <Col md={7}>
                    <Card className="shadow-sm border-0 mb-4 h-100">
                        <Card.Header className="bg-white fw-bold d-flex justify-content-between align-items-center">
                            <span>Create New Purchase Order</span>
                            <Button 
                                variant="outline-primary" 
                                size="sm" 
                                onClick={() => setShowAddSupplierModal(true)}
                            >
                                <Plus size={14} className="me-1" /> Add New Supplier
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <Form.Label>Select Supplier *</Form.Label>
                                    <Form.Select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
                                        {suppliers.length === 0 && <option value="">No suppliers found — click Add Supplier</option>}
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.payment_terms || 'Net 30'})</option>)}
                                    </Form.Select>
                                </Col>
                                <Col md={6}>
                                    <Form.Label>Expected Delivery Date</Form.Label>
                                    <Form.Control type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} />
                                </Col>
                            </Row>

                            <Table bordered hover size="sm">
                                <thead className="bg-light">
                                    <tr>
                                        <th width="40%">Item</th>
                                        <th width="20%">Quantity</th>
                                        <th width="20%">Price (₹)</th>
                                        <th width="15%">Total</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={index}>
                                            <td>
                                                <Form.Select
                                                    value={item.inventory_item_id}
                                                    onChange={e => handleItemChange(index, 'inventory_item_id', e.target.value)}
                                                    size="sm"
                                                >
                                                    <option value="">Select Item...</option>
                                                    {inventory.map(inv => (
                                                        <option key={inv.id} value={inv.id}>
                                                            {inv.name} {inv.dosage_form ? `(${inv.dosage_form})` : ''} - Stock: {inv.stock_quantity}
                                                        </option>
                                                    ))}
                                                </Form.Select>
                                            </td>
                                            <td>
                                                <Form.Control
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                                                    size="sm"
                                                />
                                            </td>
                                            <td>
                                                <Form.Control
                                                    type="number"
                                                    value={item.unit_price}
                                                    onChange={e => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                                    size="sm"
                                                />
                                            </td>
                                            <td>₹{(item.quantity * item.unit_price).toFixed(2)}</td>
                                            <td>
                                                {items.length > 1 && (
                                                    <Button variant="link" className="text-danger p-0" onClick={() => removeItem(index)}>x</Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan="3" className="text-end fw-bold">Grand Total:</td>
                                        <td className="fw-bold">₹{grandTotal.toFixed(2)}</td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </Table>

                            <div className="d-flex justify-content-between">
                                <Button variant="outline-secondary" size="sm" onClick={addItem}>
                                    <Plus size={16} /> Add Item
                                </Button>
                                <Button variant="success" onClick={createPO}>
                                    <Truck size={16} className="me-1" /> Send Purchase Order
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={5}>
                    <Card className="shadow-sm border-0 bg-light h-100">
                        <Card.Body>
                            <h6 className="fw-bold text-muted mb-3">
                                <Clock size={16} className="me-2" /> Active Purchase Orders & GRN
                            </h6>

                            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                                {purchaseOrders.length === 0 ? (
                                    <div className="text-center text-muted small py-5">No Purchase Orders found.</div>
                                ) : (
                                    purchaseOrders.map(po => (
                                        <Card key={po.id} className="mb-3 border-0 shadow-sm">
                                            <Card.Body className="p-3">
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <div>
                                                        <h6 className="fw-bold mb-0">PO #{po.id}</h6>
                                                        <small className="text-muted">{po.supplier_name}</small>
                                                        {po.grn_number && (
                                                            <div className="text-success small fw-semibold">
                                                                <FileText size={12} className="me-1" />{po.grn_number}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Badge bg={po.status === 'Received' ? 'success' : 'warning'}>{po.status}</Badge>
                                                </div>
                                                <div className="d-flex justify-content-between align-items-center mt-3">
                                                    <div>
                                                        <div className="text-muted small">Total Amount</div>
                                                        <strong className="text-primary">₹{parseFloat(po.total_amount || 0).toFixed(2)}</strong>
                                                    </div>
                                                    {po.status !== 'Received' && (
                                                        <Button
                                                            variant="success"
                                                            size="sm"
                                                            onClick={() => handleOpenReceiveModal(po)}
                                                        >
                                                            <CheckCircle size={14} className="me-1" /> Receive (GRN)
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="text-muted small mt-2">
                                                    Created: {new Date(po.created_at).toLocaleDateString()}
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Modal: Add Supplier */}
            <Modal show={showAddSupplierModal} onHide={() => setShowAddSupplierModal(false)} backdrop="static">
                <Modal.Header closeButton>
                    <Modal.Title style={{ color: 'var(--text-primary, #ffffff)' }}>
                        Add Pharmaceutical Supplier
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleAddSupplierSubmit}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Supplier / Company Name *</Form.Label>
                            <Form.Control 
                                required
                                value={supplierForm.name}
                                onChange={e => setSupplierForm({ ...supplierForm, name: e.target.value })}
                                placeholder="e.g. Cipla Pharmaceuticals Ltd."
                            />
                        </Form.Group>
                        <Row className="mb-3">
                            <Col md={6}>
                                <Form.Label>Contact Person</Form.Label>
                                <Form.Control 
                                    value={supplierForm.contact_person}
                                    onChange={e => setSupplierForm({ ...supplierForm, contact_person: e.target.value })}
                                    placeholder="e.g. Rajesh Verma"
                                />
                            </Col>
                            <Col md={6}>
                                <Form.Label>Phone Number</Form.Label>
                                <Form.Control 
                                    value={supplierForm.phone}
                                    onChange={e => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                                    placeholder="e.g. 9876543210"
                                />
                            </Col>
                        </Row>
                        <Row className="mb-3">
                            <Col md={6}>
                                <Form.Label>GSTIN</Form.Label>
                                <Form.Control 
                                    value={supplierForm.gstin}
                                    onChange={e => setSupplierForm({ ...supplierForm, gstin: e.target.value })}
                                    placeholder="e.g. 07AAACC1206D1ZS"
                                />
                            </Col>
                            <Col md={6}>
                                <Form.Label>Payment Terms</Form.Label>
                                <Form.Select 
                                    value={supplierForm.payment_terms}
                                    onChange={e => setSupplierForm({ ...supplierForm, payment_terms: e.target.value })}
                                >
                                    <option value="Net 15">Net 15</option>
                                    <option value="Net 30">Net 30</option>
                                    <option value="Net 45">Net 45</option>
                                    <option value="Advance">Advance Payment</option>
                                </Form.Select>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Email Address</Form.Label>
                            <Form.Control 
                                type="email"
                                value={supplierForm.email}
                                onChange={e => setSupplierForm({ ...supplierForm, email: e.target.value })}
                                placeholder="supply@pharma.com"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Registered Address</Form.Label>
                            <Form.Control 
                                as="textarea" 
                                rows={2}
                                value={supplierForm.address}
                                onChange={e => setSupplierForm({ ...supplierForm, address: e.target.value })}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowAddSupplierModal(false)}>Cancel</Button>
                        <Button variant="primary" type="submit" disabled={supplierSaving}>
                            {supplierSaving ? 'Saving...' : 'Register Supplier'}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Modal: Enterprise GRN Processing */}
            <Modal show={showReceiveModal} onHide={() => setShowReceiveModal(false)} size="lg" backdrop="static">
                <Modal.Header closeButton>
                    <Modal.Title style={{ color: 'var(--text-primary, #ffffff)' }}>
                        Goods Received Note (GRN) — Receive Stock for PO #{receivingPO?.id}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleReceiveStockSubmit}>
                    <Modal.Body>
                        <Alert variant="info" className="py-2 small">
                            Receiving stock generates an official audit GRN number and creates/updates inventory batches according to FEFO protocols.
                        </Alert>
                        <Row className="mb-3">
                            <Col md={6}>
                                <Form.Label>Vendor Invoice Number *</Form.Label>
                                <Form.Control 
                                    required
                                    value={grnForm.invoice_number}
                                    onChange={e => setGrnForm({ ...grnForm, invoice_number: e.target.value })}
                                    placeholder="e.g. INV-2026-4412"
                                />
                            </Col>
                            <Col md={6}>
                                <Form.Label>Invoice Date *</Form.Label>
                                <Form.Control 
                                    type="date"
                                    required
                                    value={grnForm.invoice_date}
                                    onChange={e => setGrnForm({ ...grnForm, invoice_date: e.target.value })}
                                />
                            </Col>
                        </Row>

                        <h6 className="fw-bold text-primary mb-2 mt-3">Batch & Expiry Allocation per Line Item</h6>
                        <Table size="sm" bordered hover responsive>
                            <thead className="bg-light">
                                <tr>
                                    <th>Item</th>
                                    <th width="15%">Qty</th>
                                    <th width="25%">Batch No. *</th>
                                    <th width="20%">Mfg Date</th>
                                    <th width="20%">Expiry Date *</th>
                                </tr>
                            </thead>
                            <tbody>
                                {grnForm.items.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="text-center text-muted py-3">
                                            Direct receipt for PO #{receivingPO?.id} (Quantity: {receivingPO?.total_amount ? 'Auto' : '1'})
                                        </td>
                                    </tr>
                                ) : (
                                    grnForm.items.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="fw-semibold small">{item.item_name}</td>
                                            <td>
                                                <Form.Control 
                                                    type="number"
                                                    size="sm"
                                                    value={item.quantity}
                                                    onChange={e => handleGrnItemChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td>
                                                <Form.Control 
                                                    size="sm"
                                                    required
                                                    value={item.batch_number}
                                                    onChange={e => handleGrnItemChange(idx, 'batch_number', e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <Form.Control 
                                                    type="date"
                                                    size="sm"
                                                    value={item.mfg_date}
                                                    onChange={e => handleGrnItemChange(idx, 'mfg_date', e.target.value)}
                                                />
                                            </td>
                                            <td>
                                                <Form.Control 
                                                    type="date"
                                                    size="sm"
                                                    required
                                                    value={item.expiry_date}
                                                    onChange={e => handleGrnItemChange(idx, 'expiry_date', e.target.value)}
                                                />
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>

                        <Form.Group className="mt-3">
                            <Form.Label>Receiving Notes / Inspection Comments</Form.Label>
                            <Form.Control 
                                as="textarea"
                                rows={2}
                                value={grnForm.notes}
                                onChange={e => setGrnForm({ ...grnForm, notes: e.target.value })}
                                placeholder="e.g. All packaging intact, temperature log verified (<25°C)."
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowReceiveModal(false)}>Cancel</Button>
                        <Button variant="success" type="submit" disabled={receivingStock}>
                            {receivingStock ? <><Spinner size="sm" animation="border" className="me-2" />Processing GRN...</> : <><CheckCircle size={16} className="me-1" /> Process GRN & Accept Stock</>}
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default ProcurementDashboard;
