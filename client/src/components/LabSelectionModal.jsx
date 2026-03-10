import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal, Form, Button, ListGroup, Badge, InputGroup, Accordion } from 'react-bootstrap';
import { Search, Check, X } from 'lucide-react';

const LabSelectionModal = ({ show, onHide, availableTests, selectedTests, onConfirm }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [tempSelected, setTempSelected] = useState([]);
    const [packages, setPackages] = useState([]);

    useEffect(() => {
        if (show) {
            setTempSelected([...selectedTests]);
            setSearchQuery('');

            const fetchPackages = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const res = await axios.get('/api/lab/packages', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setPackages(res.data);
                } catch (err) {
                    console.error('Packages fetch error:', err);
                }
            };
            fetchPackages();
        }
    }, [show, selectedTests]);

    // Group tests by category - defensive check for array
    const testList = Array.isArray(availableTests) ? availableTests : [];
    const groupedTests = testList.reduce((acc, test) => {
        const category = test.category || 'Uncategorized';
        if (!acc[category]) acc[category] = [];
        acc[category].push(test);
        return acc;
    }, {});

    // Filter tests based on search
    const filteredGrouped = Object.keys(groupedTests).reduce((acc, category) => {
        const filtered = groupedTests[category].filter(test =>
            test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            category.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filtered.length > 0) {
            acc[category] = filtered;
        }
        return acc;
    }, {});

    const handleToggle = (testName) => {
        if (tempSelected.includes(testName)) {
            setTempSelected(tempSelected.filter(t => t !== testName));
        } else {
            setTempSelected([...tempSelected, testName]);
        }
    };

    const handlePackageSelect = (pkg) => {
        // Fix: Add the package itself to the selection, do NOT expand into individual tests
        if (!tempSelected.includes(pkg.name)) {
            setTempSelected([...tempSelected, pkg.name]);
        }
    };

    const handleConfirm = () => {
        onConfirm(tempSelected);
        onHide();
    };

    const handleClearAll = () => {
        setTempSelected([]);
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="bg-primary text-white">
                <Modal.Title>🔬 Select Lab Tests</Modal.Title>
            </Modal.Header>
            <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Search Bar - Sticky */}
                <div className="position-sticky top-0 bg-white pb-3 mb-3 border-bottom" style={{ zIndex: 10 }}>
                    <InputGroup>
                        <InputGroup.Text>
                            <Search size={18} />
                        </InputGroup.Text>
                        <Form.Control
                            placeholder="Search 102 tests..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                        {searchQuery && (
                            <Button variant="outline-secondary" onClick={() => setSearchQuery('')}>
                                <X size={18} />
                            </Button>
                        )}
                    </InputGroup>

                    {/* Selected Count Badge */}
                    <div className="mt-2 d-flex justify-content-between align-items-center">
                        <Badge bg="info" className="px-3 py-2">
                            {tempSelected.length} test{tempSelected.length !== 1 ? 's' : ''} selected
                        </Badge>
                        {tempSelected.length > 0 && (
                            <Button size="sm" variant="outline-danger" onClick={handleClearAll}>
                                Clear All
                            </Button>
                        )}
                    </div>
                </div>

                {/* Packages Section */}
                {packages.length > 0 && (
                    <div className="mb-3">
                        <h6 className="fw-bold text-primary mb-2">📦 Wellness Packages</h6>
                        <div className="d-flex flex-wrap gap-2">
                            {packages.map(pkg => (
                                <Button
                                    key={pkg.id}
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handlePackageSelect(pkg)}
                                    title={`Includes: ${pkg.tests.join(', ')}`}
                                >
                                    {pkg.name} <Badge bg="secondary">₹{pkg.price}</Badge>
                                </Button>
                            ))}
                        </div>
                        <hr />
                    </div>
                )}

                {/* Categorized Test List */}
                <Accordion defaultActiveKey={['0']} alwaysOpen>
                    {Object.keys(filteredGrouped).map((category, idx) => (
                        <Accordion.Item eventKey={idx.toString()} key={category}>
                            <Accordion.Header>
                                <strong>{category}</strong>
                                <Badge bg="secondary" className="ms-2">
                                    {filteredGrouped[category].length} tests
                                </Badge>
                            </Accordion.Header>
                            <Accordion.Body className="p-0">
                                <ListGroup variant="flush">
                                    {filteredGrouped[category].map(test => {
                                        const isSelected = tempSelected.includes(test.name);
                                        return (
                                            <ListGroup.Item
                                                key={test.id || test.name}
                                                action
                                                onClick={() => handleToggle(test.name)}
                                                className={`d-flex align-items-center ${isSelected ? 'bg-light border-primary' : ''}`}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <Form.Check
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => { }} // Handled by parent onClick
                                                    className="me-3"
                                                />
                                                <div className="flex-grow-1">
                                                    {test.name}
                                                </div>
                                                {isSelected && (
                                                    <Check size={18} className="text-primary" />
                                                )}
                                            </ListGroup.Item>
                                        );
                                    })}
                                </ListGroup>
                            </Accordion.Body>
                        </Accordion.Item>
                    ))}
                </Accordion>

                {/* No Results */}
                {Object.keys(filteredGrouped).length === 0 && (
                    <div className="text-center text-muted py-5">
                        <Search size={48} className="mb-3 opacity-25" />
                        <h5>No tests found</h5>
                        <p>Try a different search term</p>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>
                    Cancel
                </Button>
                <Button variant="primary" onClick={handleConfirm}>
                    Add Selected ({tempSelected.length})
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default LabSelectionModal;
