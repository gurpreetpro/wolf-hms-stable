import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, ListGroup, Badge, InputGroup, Alert, Table } from 'react-bootstrap';
import { FlaskConical, Search, Plus, Clock } from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Priority options
const PRIORITY_OPTIONS = [
    { value: 'Routine', label: 'Routine', color: 'secondary' },
    { value: 'Urgent', label: 'Urgent', color: 'warning' },
    { value: 'STAT', label: 'STAT', color: 'danger' }
];

const IPDLabOrderModal = ({ show, onHide, admissionId, patientId, patientName, onLabOrdered }) => {
    const [testSearch, setTestSearch] = useState('');
    const [testTypes, setTestTypes] = useState([]);
    const [filteredTests, setFilteredTests] = useState([]);
    const [selectedTests, setSelectedTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [priority, setPriority] = useState('Routine');
    const [notes, setNotes] = useState('');

    // Fetch all test types on mount
    useEffect(() => {
        const fetchTests = async () => {
            if (!show) return;
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API}/api/lab/tests`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                // Handle various response formats
                let tests = [];
                if (Array.isArray(res.data)) {
                    tests = res.data;
                } else if (res.data?.data && Array.isArray(res.data.data)) {
                    tests = res.data.data;
                } else if (res.data?.tests && Array.isArray(res.data.tests)) {
                    tests = res.data.tests;
                }
                setTestTypes(tests);
                setFilteredTests(tests.slice(0, 20));
            } catch (err) {
                console.error('Failed to load test types:', err);
                setError('Failed to load lab tests. Please try again.');
                setTestTypes([]);
                setFilteredTests([]);
            } finally {
                setLoading(false);
            }
        };
        fetchTests();
    }, [show]);

    // Filter tests based on search
    useEffect(() => {
        // Ensure testTypes is always an array before filtering
        const safeTestTypes = Array.isArray(testTypes) ? testTypes : [];
        if (testSearch.length < 1) {
            setFilteredTests(safeTestTypes.slice(0, 20));
        } else {
            const filtered = safeTestTypes.filter(t => 
                t.name?.toLowerCase().includes(testSearch.toLowerCase()) ||
                t.code?.toLowerCase().includes(testSearch.toLowerCase())
            );
            setFilteredTests(filtered.slice(0, 20));
        }
    }, [testSearch, testTypes]);

    const handleSelectTest = (test) => {
        if (!selectedTests.find(t => t.id === test.id)) {
            setSelectedTests([...selectedTests, test]);
        }
    };

    const handleRemoveTest = (testId) => {
        setSelectedTests(selectedTests.filter(t => t.id !== testId));
    };

    const handleSubmit = async () => {
        if (selectedTests.length === 0) {
            setError('Please select at least one test');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            
            // Order each test
            for (const test of selectedTests) {
                await axios.post(`${API}/api/clinical/order-lab`, {
                    admission_id: admissionId,
                    patient_id: patientId,
                    test_type_id: test.id,
                    test_name: test.name,
                    priority,
                    notes
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            setSuccess(`${selectedTests.length} lab test(s) ordered successfully!`);
            setTimeout(() => {
                onLabOrdered?.();
                handleClose();
            }, 1000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to order lab tests');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setSelectedTests([]);
        setTestSearch('');
        setPriority('Routine');
        setNotes('');
        setError('');
        setSuccess('');
        onHide();
    };

    const totalCost = selectedTests.reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0);

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton className="bg-info text-white">
                <Modal.Title className="d-flex align-items-center">
                    <FlaskConical size={20} className="me-2" />
                    Order Lab Tests for {patientName}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                <Row>
                    {/* Test Search Column */}
                    <Col md={6}>
                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold">Search Tests</Form.Label>
                            <InputGroup>
                                <InputGroup.Text><Search size={16} /></InputGroup.Text>
                                <Form.Control
                                    placeholder="Type test name or code..."
                                    value={testSearch}
                                    onChange={e => setTestSearch(e.target.value)}
                                />
                            </InputGroup>
                        </Form.Group>

                        <div className="border rounded" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {loading ? (
                                <div className="text-center py-3 text-muted">Loading tests...</div>
                            ) : (
                                <ListGroup variant="flush">
                                    {(Array.isArray(filteredTests) ? filteredTests : []).map(test => (
                                        <ListGroup.Item 
                                            key={test.id} 
                                            action 
                                            onClick={() => handleSelectTest(test)}
                                            className="d-flex justify-content-between align-items-center py-2"
                                            disabled={selectedTests.find(t => t.id === test.id)}
                                        >
                                            <div>
                                                <div className="fw-bold">{test.name}</div>
                                                {test.code && <small className="text-muted">{test.code}</small>}
                                            </div>
                                            <Badge bg="light" text="dark">₹{test.price || 0}</Badge>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            )}
                        </div>
                    </Col>

                    {/* Selected Tests Column */}
                    <Col md={6}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="fw-bold">Selected Tests ({selectedTests.length})</span>
                            <Badge bg="success">Total: ₹{totalCost.toFixed(0)}</Badge>
                        </div>
                        
                        <div className="border rounded p-2" style={{ minHeight: '200px' }}>
                            {selectedTests.length === 0 ? (
                                <div className="text-center text-muted py-4">
                                    Click tests on the left to add
                                </div>
                            ) : (
                                <Table size="sm" className="mb-0">
                                    <tbody>
                                        {selectedTests.map(test => (
                                            <tr key={test.id}>
                                                <td>{test.name}</td>
                                                <td className="text-end">₹{test.price || 0}</td>
                                                <td className="text-end" style={{ width: '30px' }}>
                                                    <Button 
                                                        variant="link" 
                                                        className="p-0 text-danger"
                                                        onClick={() => handleRemoveTest(test.id)}
                                                    >
                                                        ✕
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </div>

                        {/* Priority & Notes */}
                        <Form.Group className="mt-3">
                            <Form.Label className="fw-bold">Priority</Form.Label>
                            <div className="d-flex gap-2">
                                {PRIORITY_OPTIONS.map(p => (
                                    <Button
                                        key={p.value}
                                        variant={priority === p.value ? p.color : `outline-${p.color}`}
                                        size="sm"
                                        onClick={() => setPriority(p.value)}
                                    >
                                        {p.label}
                                    </Button>
                                ))}
                            </div>
                        </Form.Group>

                        <Form.Group className="mt-3">
                            <Form.Label className="fw-bold">Clinical Notes (Optional)</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                placeholder="e.g., Rule out sepsis, Fasting sample required"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </Form.Group>
                    </Col>
                </Row>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Cancel</Button>
                <Button 
                    variant="info" 
                    onClick={handleSubmit} 
                    disabled={selectedTests.length === 0 || submitting}
                >
                    {submitting ? 'Ordering...' : <><Plus size={16} className="me-1" /> Order {selectedTests.length} Test(s)</>}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default IPDLabOrderModal;
