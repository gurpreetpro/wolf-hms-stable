import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Badge, Form, Row, Col, Alert } from 'react-bootstrap';
import { Plus, CheckCircle, Clock } from 'lucide-react';
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

    useEffect(() => {
        fetchSuppliers();
        fetchPurchaseOrders();
    }, [refreshTrigger]);

    const fetchSuppliers = async () => {
        try {
            const res = await api.get('/api/pharmacy/suppliers');
            const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setSuppliers(data);
            if (data.length > 0) setSelectedSupplier(data[0].id);
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
        // Auto-populate name if ID selected
        if (field === 'inventory_item_id') {
            const selectedInv = inventory.find(inv => inv.id.toString() === value);
            if (selectedInv) {
                newItems[index].item_name = selectedInv.name;
                newItems[index].unit_price = selectedInv.price_per_unit || 0; // Default price
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
            setMessage({ type: 'danger', text: 'Select a supplier' });
            return;
        }
        try {
            const payload = {
                supplier_id: selectedSupplier,
                items: items.filter(i => i.inventory_item_id && i.quantity > 0),
                expected_delivery_date: deliveryDate,
                notes: 'Generated from Dashboard'
            };
            await api.post('/api/pharmacy/purchase-orders', payload);
            setMessage({ type: 'success', text: 'Purchase Order Created Successfully!' });
            setItems([{ inventory_item_id: '', item_name: '', quantity: 1, unit_price: 0 }]); // Reset
            setRefreshTrigger(prev => prev + 1); // Refresh List
        } catch (err) {
            setMessage({ type: 'danger', text: 'Failed to create PO' });
        }
    };

    const receiveStock = async (poId) => {
        try {
            await api.post('/api/pharmacy/purchase-orders/receive', { po_id: poId });
            setMessage({ type: 'success', text: 'Stock Received & Inventory Updated!' });
            setRefreshTrigger(prev => prev + 1);
        } catch (err) {
            setMessage({ type: 'danger', text: 'Failed to receive stock' });
        }
    };

    // Calculate Total
    const grandTotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

    return (
        <div className="p-3">
            {message && <Alert variant={message.type} onClose={() => setMessage(null)} dismissible>{message.text}</Alert>}

            <Row>
                <Col md={7}>
                    <Card className="shadow-sm border-0 mb-4 h-100">
                        <Card.Header className="bg-white fw-bold">Create New Purchase Order</Card.Header>
                        <Card.Body>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <Form.Label>Select Supplier</Form.Label>
                                    <Form.Select value={selectedSupplier} onChange={e => setSelectedSupplier(e.target.value)}>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </Form.Select>
                                </Col>
                                <Col md={6}>
                                    <Form.Label>Expected Delivery</Form.Label>
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
                                                        <option key={inv.id} value={inv.id}>{inv.name} (Stock: {inv.stock_quantity})</option>
                                                    ))}
                                                </Form.Select>
                                            </td>
                                            <td>
                                                <Form.Control
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={e => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                                                    size="sm"
                                                />
                                            </td>
                                            <td>
                                                <Form.Control
                                                    type="number"
                                                    value={item.unit_price}
                                                    onChange={e => handleItemChange(index, 'unit_price', parseFloat(e.target.value))}
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
                                <Button variant="outline-secondary" size="sm" onClick={addItem}><Plus size={16} /> Add Item</Button>
                                <Button variant="success" onClick={createPO}>Send Purchase Order</Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={5}>
                    <Card className="shadow-sm border-0 bg-light h-100">
                        <Card.Body>
                            <h6 className="fw-bold text-muted mb-3"><Clock size={16} className="me-2" />Active Purchase Orders</h6>

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
                                                    </div>
                                                    <Badge bg={po.status === 'Received' ? 'success' : 'warning'}>{po.status}</Badge>
                                                </div>
                                                <div className="d-flex justify-content-between align-items-center mt-3">
                                                    <div>
                                                        <div className="text-muted small">Total Amount</div>
                                                        <strong className="text-primary">₹{po.total_amount || 0}</strong>
                                                    </div>
                                                    {po.status !== 'Received' && (
                                                        <Button
                                                            variant="outline-success"
                                                            size="sm"
                                                            onClick={() => receiveStock(po.id)}
                                                        >
                                                            <CheckCircle size={14} className="me-1" /> Receive Stock
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
        </div>
    );
};

export default ProcurementDashboard;
