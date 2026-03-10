import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Form, Button, Modal } from 'react-bootstrap';

const AutoReorderEngine = () => {
    const [showConfig, setShowConfig] = useState(false);
    const [configItem, setConfigItem] = useState(null);

    const inventory = [
        { id: 1, name: 'Paracetamol 500mg', category: 'Pharma', stock: 120, min: 500, max: 5000, unit: 'tabs', reorder: true, supplier: 'Cipla', lastOrder: '2026-02-15' },
        { id: 2, name: 'Surgical Gloves (L)', category: 'Consumable', stock: 80, min: 200, max: 2000, unit: 'pairs', reorder: true, supplier: 'MedSupply', lastOrder: '2026-02-20' },
        { id: 3, name: 'Normal Saline 500ml', category: 'IV Fluids', stock: 45, min: 100, max: 1000, unit: 'bottles', reorder: true, supplier: 'Baxter India', lastOrder: '2026-02-18' },
        { id: 4, name: 'Amoxicillin 250mg', category: 'Pharma', stock: 800, min: 300, max: 3000, unit: 'caps', reorder: false, supplier: 'Cipla', lastOrder: '2026-02-25' },
        { id: 5, name: 'CBC Reagent Kit', category: 'Lab', stock: 8, min: 20, max: 100, unit: 'kits', reorder: true, supplier: 'Labline', lastOrder: '2026-02-10' },
        { id: 6, name: 'N95 Masks', category: 'PPE', stock: 50, min: 100, max: 1000, unit: 'pcs', reorder: true, supplier: 'MedSupply', lastOrder: '2026-02-22' },
        { id: 7, name: 'Insulin Glargine', category: 'Pharma', stock: 35, min: 50, max: 200, unit: 'vials', reorder: true, supplier: 'Sanofi', lastOrder: '2026-02-12' },
        { id: 8, name: 'Atorvastatin 20mg', category: 'Pharma', stock: 2400, min: 500, max: 5000, unit: 'tabs', reorder: false, supplier: 'Sun Pharma', lastOrder: '2026-02-28' },
    ];

    const criticalItems = inventory.filter(i => i.stock <= i.min);
    const autoReorderItems = criticalItems.filter(i => i.reorder);
    const safeItems = inventory.filter(i => i.stock > i.min);

    const getStockStatus = (item) => {
        const pct = (item.stock / item.min) * 100;
        if (pct <= 25) return { bg: 'danger', text: 'CRITICAL' };
        if (pct <= 75) return { bg: 'warning', text: 'LOW' };
        if (pct <= 100) return { bg: 'info', text: 'REORDER' };
        return { bg: 'success', text: 'OK' };
    };

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold">🔄 Auto Reorder Engine — Inventory Intelligence</h3>
                <div className="d-flex gap-2">
                    <Button variant="warning" onClick={() => alert(`🚀 Generating ${autoReorderItems.length} auto POs...\n\n${autoReorderItems.map(i => `• ${i.name}: Order ${i.max - i.stock} ${i.unit} from ${i.supplier}`).join('\n')}\n\n✅ POs queued for approval`)}>
                        🚀 Run Auto-Reorder ({autoReorderItems.length} items)
                    </Button>
                </div>
            </div>

            <Row className="mb-4 g-3">
                {[
                    { t: 'Critical Items', v: criticalItems.length, c: 'danger' },
                    { t: 'Auto-Reorder Queued', v: autoReorderItems.length, c: 'warning' },
                    { t: 'Items in Stock', v: safeItems.length, c: 'success' },
                    { t: 'Total SKUs', v: inventory.length, c: 'primary' },
                ].map((k, i) => (
                    <Col md={3} key={i}><Card className="border-0 shadow-sm text-center"><Card.Body className="py-3"><small className="text-muted">{k.t}</small><h4 className={`fw-bold text-${k.c} mb-0`}>{k.v}</h4></Card.Body></Card></Col>
                ))}
            </Row>

            {/* Critical Items - Auto Reorder Candidates */}
            <Card className="shadow-sm border-0 mb-4" style={{ borderLeft: '4px solid #dc3545' }}>
                <Card.Header className="bg-white fw-bold text-danger">⚠️ Below Min Stock — Auto Reorder Candidates</Card.Header>
                <Table hover responsive className="mb-0 align-middle">
                    <thead className="bg-light">
                        <tr><th>Item</th><th>Category</th><th>Stock</th><th>Min</th><th>Max</th><th>Order Qty</th><th>Supplier</th><th>Auto</th><th>Status</th><th>Action</th></tr>
                    </thead>
                    <tbody>
                        {criticalItems.map(item => {
                            const status = getStockStatus(item);
                            return (
                                <tr key={item.id} className="table-danger">
                                    <td><strong>{item.name}</strong></td>
                                    <td><Badge bg="secondary">{item.category}</Badge></td>
                                    <td className="text-danger fw-bold">{item.stock} {item.unit}</td>
                                    <td>{item.min}</td>
                                    <td>{item.max}</td>
                                    <td className="fw-bold text-primary">{item.max - item.stock} {item.unit}</td>
                                    <td>{item.supplier}</td>
                                    <td>{item.reorder ? <Badge bg="success">✅ ON</Badge> : <Badge bg="secondary">OFF</Badge>}</td>
                                    <td><Badge bg={status.bg}>{status.text}</Badge></td>
                                    <td>
                                        <Button size="sm" variant="outline-primary" className="me-1" onClick={() => { setConfigItem(item); setShowConfig(true); }}>⚙️</Button>
                                        <Button size="sm" variant="primary" onClick={() => alert(`📦 Manual PO created for ${item.name}: ${item.max - item.stock} ${item.unit}`)}>📦 Order</Button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>
            </Card>

            {/* Safe Stock */}
            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white fw-bold text-success">✅ Adequate Stock</Card.Header>
                <Table hover responsive className="mb-0 align-middle">
                    <thead className="bg-light">
                        <tr><th>Item</th><th>Category</th><th>Stock</th><th>Min</th><th>Max</th><th>Supplier</th><th>Auto</th><th>Last Order</th></tr>
                    </thead>
                    <tbody>
                        {safeItems.map(item => (
                            <tr key={item.id}>
                                <td>{item.name}</td>
                                <td><Badge bg="secondary">{item.category}</Badge></td>
                                <td className="text-success fw-bold">{item.stock} {item.unit}</td>
                                <td>{item.min}</td><td>{item.max}</td>
                                <td>{item.supplier}</td>
                                <td>{item.reorder ? <Badge bg="success">ON</Badge> : <Badge bg="secondary">OFF</Badge>}</td>
                                <td>{item.lastOrder}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Card>

            {/* Config Modal */}
            <Modal show={showConfig} onHide={() => setShowConfig(false)}>
                <Modal.Header closeButton><Modal.Title>⚙️ Reorder Config — {configItem?.name}</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3"><Form.Label>Minimum Level</Form.Label><Form.Control type="number" defaultValue={configItem?.min} /></Form.Group>
                    <Form.Group className="mb-3"><Form.Label>Maximum Level</Form.Label><Form.Control type="number" defaultValue={configItem?.max} /></Form.Group>
                    <Form.Group className="mb-3"><Form.Label>Preferred Supplier</Form.Label><Form.Control defaultValue={configItem?.supplier} /></Form.Group>
                    <Form.Check type="switch" label="Enable Auto-Reorder" defaultChecked={configItem?.reorder} className="mb-3" />
                </Modal.Body>
                <Modal.Footer><Button variant="secondary" onClick={() => setShowConfig(false)}>Cancel</Button><Button variant="primary" onClick={() => { alert('✅ Config saved'); setShowConfig(false); }}>💾 Save</Button></Modal.Footer>
            </Modal>
        </Container>
    );
};

export default AutoReorderEngine;
