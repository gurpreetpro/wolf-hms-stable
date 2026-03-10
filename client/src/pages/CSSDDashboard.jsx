import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Form, Modal, Spinner, Tab, Tabs } from 'react-bootstrap';
import { Archive, Play, CheckCircle, RotateCcw, Truck } from 'lucide-react';
import axios from 'axios';

const CSSDDashboard = () => {
    const [inventory, setInventory] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItems, setSelectedItems] = useState([]);

    const [showBatchModal, setShowBatchModal] = useState(false);
    
    const fetchData = async () => {
        try {
            setLoading(true);
            const [invRes, batchRes] = await Promise.all([
                axios.get('/api/cssd/inventory'),
                axios.get('/api/cssd/batches')
            ]);
            setInventory(invRes.data);
            setBatches(batchRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAction = async (id, action, toLocation) => {
        try {
            await axios.post('/api/cssd/log', {
                inventory_id: id,
                action: action,
                to_location: toLocation,
                performed_by: 'CurrentStaff' 
            });
            fetchData();
        } catch (err) {
            alert('Failed to log action');
        }
    };

    const handleStartBatch = async () => {
        try {
            await axios.post('/api/cssd/batches', {
                machine_id: 'Autoclave-01',
                cycle_type: 'Standard 121C',
                operator_id: 'StaffUser',
                inventory_ids: selectedItems
            });
            setShowBatchModal(false);
            setSelectedItems([]);
            fetchData();
            alert('Batch Started!');
        } catch (err) {
            alert('Batch Start Failed');
        }
    };

    const handleCompleteBatch = async (batchId) => {
        try {
            await axios.put(`/api/cssd/batches/${batchId}/complete`, {
                status: 'Completed'
            });
            fetchData();
        } catch (err) {
            alert('Failed to complete batch');
        }
    };

    const toggleSelect = (id) => {
        if (selectedItems.includes(id)) {
            setSelectedItems(selectedItems.filter(i => i !== id));
        } else {
            setSelectedItems([...selectedItems, id]);
        }
    };

    return (
        <Container fluid className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2><Archive className="me-2 text-info" />CSSD Control Center</h2>
                <Button variant="primary" disabled={selectedItems.length === 0} onClick={() => setShowBatchModal(true)}>
                    <Play size={18} className="me-1" /> Start Autoclave Batch ({selectedItems.length})
                </Button>
            </div>

            <Tabs defaultActiveKey="inventory" className="mb-3">
                <Tab eventKey="inventory" title="Inventory & Actions">
                    {loading ? <Spinner animation="border" /> : (
                        <Card className="shadow-sm">
                            <Table hover responsive>
                                <thead>
                                    <tr>
                                        <th>Select</th>
                                        <th>Set Name</th>
                                        <th>Status</th>
                                        <th>Location</th>
                                        <th>Expiry</th>
                                        <th>Quick Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventory.map(item => (
                                        <tr key={item.id}>
                                            <td>
                                                <Form.Check 
                                                    checked={selectedItems.includes(item.id)}
                                                    onChange={() => toggleSelect(item.id)}
                                                    disabled={item.current_status === 'Autoclaving' || item.current_status === 'Issued'}
                                                />
                                            </td>
                                            <td>{item.name} <Badge bg="secondary" className="ms-1">{item.category}</Badge></td>
                                            <td><Badge bg={item.current_status === 'Sterile' ? 'success' : 'warning'}>{item.current_status}</Badge></td>
                                            <td>{item.location}</td>
                                            <td>{item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}</td>
                                            <td>
                                                <Button size="sm" variant="outline-primary" className="me-1" onClick={() => handleAction(item.id, 'Received', 'CSSD')}>
                                                    <RotateCcw size={14} /> Recv
                                                </Button>
                                                <Button size="sm" variant="outline-success" onClick={() => handleAction(item.id, 'Issued', 'OT-1')}>
                                                    <Truck size={14} /> Issue
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card>
                    )}
                </Tab>

                <Tab eventKey="batches" title="Autoclave Log">
                     <Card className="shadow-sm">
                        <Table striped>
                            <thead>
                                <tr>
                                    <th>Batch ID</th>
                                    <th>Machine</th>
                                    <th>Start Time</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {batches.map(b => (
                                    <tr key={b.id}>
                                        <td>#{b.id}</td>
                                        <td>{b.machine_id}</td>
                                        <td>{new Date(b.start_time).toLocaleString()}</td>
                                        <td>
                                            <Badge bg={b.status === 'Completed' ? 'success' : (b.status === 'Running' ? 'danger' : 'secondary')}>
                                                {b.status}
                                            </Badge>
                                        </td>
                                        <td>
                                            {b.status === 'Running' && (
                                                <Button size="sm" variant="warning" onClick={() => handleCompleteBatch(b.id)}>
                                                    Stop & Mark Complete
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                     </Card>
                </Tab>
            </Tabs>
            
            {/* Batch Modal */}
            <Modal show={showBatchModal} onHide={() => setShowBatchModal(false)}>
                <Modal.Header closeButton><Modal.Title>Start Sterilization Cycle</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p>Starting standard gravity cycle (121°C, 30 min) for <strong>{selectedItems.length} items</strong>.</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowBatchModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleStartBatch}>Confirm Start</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default CSSDDashboard;
