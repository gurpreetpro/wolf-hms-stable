import React, { useState } from 'react';
import { Card, Button, Modal, ListGroup, Form, Badge, Spinner } from 'react-bootstrap';
import { Package, CheckSquare, Square, ShoppingCart } from 'lucide-react';
import axios from 'axios';

const OrderSetSelector = ({ admissionId, patientId, onOrdersPlaced }) => {
    const [showModal, setShowModal] = useState(false);
    const [orderSets, setOrderSets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedSet, setSelectedSet] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]); // indices of items selected within the set

    const fetchOrderSets = async () => {
        setLoading(true);
        setShowModal(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/order-sets', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const rawData = res.data;
            const sets = Array.isArray(rawData) ? rawData : (rawData.data || []);
            setOrderSets(sets);
        } catch (err) {
            console.error('Error fetching order sets:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSetSelect = (set) => {
        setSelectedSet(set);
        // Default select all items
        setSelectedItems(set.items_json.map((_, idx) => idx));
    };

    const toggleItem = (idx) => {
        if (selectedItems.includes(idx)) {
            setSelectedItems(selectedItems.filter(i => i !== idx));
        } else {
            setSelectedItems([...selectedItems, idx]);
        }
    };

    const applyOrderSet = async () => {
        if (!selectedSet) return;

        const itemsToApply = selectedSet.items_json.filter((_, idx) => selectedItems.includes(idx));

        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/order-sets/apply', {
                admission_id: admissionId,
                patient_id: patientId,
                order_set_id: selectedSet.id,
                items: itemsToApply
            }, { headers: { Authorization: `Bearer ${token}` } });

            alert('Orders placed successfully!');
            setShowModal(false);
            setSelectedSet(null);
            if (onOrdersPlaced) onOrdersPlaced();

        } catch (err) {
            console.error('Error applying order set:', err);
            alert('Failed to place orders');
        }
    };

    return (
        <>
            <Button variant="outline-primary" className="w-100 d-flex align-items-center justify-content-center" onClick={fetchOrderSets}>
                <Package size={18} className="me-2" />
                Select Order Set
            </Button>

            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Order Sets / Clinical Pathways</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {loading ? <Spinner animation="border" className="d-block mx-auto" /> : (
                        <div className="d-flex" style={{ minHeight: '400px' }}>
                            {/* Left: List of Sets */}
                            <div className="w-40 border-end pe-3" style={{ minWidth: '250px' }}>
                                <h6 className="text-muted mb-3">Available Sets</h6>
                                <ListGroup variant="flush">
                                    {orderSets.map(set => (
                                        <ListGroup.Item
                                            key={set.id}
                                            action
                                            active={selectedSet?.id === set.id}
                                            onClick={() => handleSetSelect(set)}
                                        >
                                            <div className="fw-bold">{set.name}</div>
                                            <small className="text-muted">{set.category}</small>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            </div>

                            {/* Right: Set Details & Preview */}
                            <div className="w-60 ps-3 flex-grow-1">
                                {selectedSet ? (
                                    <>
                                        <h5 className="mb-2">{selectedSet.name}</h5>
                                        <p className="text-muted small">{selectedSet.description}</p>

                                        <h6 className="mt-4 mb-2">Review Orders ({selectedItems.length} selected)</h6>
                                        <ListGroup>
                                            {selectedSet.items_json.map((item, idx) => (
                                                <ListGroup.Item
                                                    key={idx}
                                                    className="d-flex align-items-start"
                                                    onClick={() => toggleItem(idx)}
                                                    action
                                                >
                                                    <div className="me-3 pt-1">
                                                        {selectedItems.includes(idx) ?
                                                            <CheckCircleIcon /> :
                                                            <Square size={18} className="text-muted" />
                                                        }
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <div className="d-flex justify-content-between">
                                                            <strong>
                                                                {item.type === 'medication' ? item.drug_name :
                                                                    item.type === 'lab' ? item.test_name :
                                                                        item.instruction || 'Item'}
                                                            </strong>
                                                            <Badge bg="secondary">{item.type.toUpperCase()}</Badge>
                                                        </div>
                                                        <small className="text-muted d-block">
                                                            {item.type === 'medication' && `${item.dosage} ${item.frequency} for ${item.duration}`}
                                                            {item.type === 'lab' && `Priority: ${item.priority}`}
                                                            {item.instruction}
                                                        </small>
                                                    </div>
                                                </ListGroup.Item>
                                            ))}
                                        </ListGroup>
                                    </>
                                ) : (
                                    <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted">
                                        <ShoppingCart size={48} className="mb-3 opacity-25" />
                                        <p>Select an order set from the list to view details</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button
                        variant="success"
                        onClick={applyOrderSet}
                        disabled={!selectedSet || selectedItems.length === 0}
                    >
                        Sign & Place Orders {selectedSet && `(${selectedItems.length})`}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

const CheckCircleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
);

export default OrderSetSelector;
