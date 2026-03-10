/**
 * Lab Package Builder Component
 * Allows creating and editing custom lab test packages
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Badge, Spinner, Alert } from 'react-bootstrap';
import { Package, Plus, Edit2, Trash2, Save, X, FlaskConical } from 'lucide-react';
import api from '../utils/axiosInstance';

const LabPackageBuilder = () => {
    const [packages, setPackages] = useState([]);
    const [testTypes, setTestTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    
    // Modal state
    const [showModal, setShowModal] = useState(false);
    const [editingPackage, setEditingPackage] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        description: '',
        category: 'Custom',
        test_ids: []
    });
    const [saving, setSaving] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            
            const [pkgRes, testRes] = await Promise.all([
                api.get('/api/lab/packages', { headers }),
                api.get('/api/lab/test-types', { headers })
            ]);
            
            setPackages(Array.isArray(pkgRes.data) ? pkgRes.data : (pkgRes.data?.data || []));
            setTestTypes(Array.isArray(testRes.data) ? testRes.data : (testRes.data?.data || []));
            setError(null);
        } catch (err) {
            setError('Failed to load data');
            console.error(err);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const openCreateModal = () => {
        setEditingPackage(null);
        setFormData({
            name: '',
            price: '',
            description: '',
            category: 'Custom',
            test_ids: []
        });
        setShowModal(true);
    };

    const openEditModal = async (pkg) => {
        setEditingPackage(pkg);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/api/lab/package/${pkg.id}/full`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setFormData({
                name: pkg.name,
                price: pkg.price,
                description: pkg.description || '',
                category: pkg.category || 'Custom',
                test_ids: res.data.tests?.map(t => t.test_id) || []
            });
            setShowModal(true);
        } catch (err) {
            setError('Failed to load package details');
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.price) {
            setError('Name and price are required');
            return;
        }

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            
            if (editingPackage) {
                await api.put(`/api/lab/packages/${editingPackage.id}`, formData, { headers });
                setSuccess('Package updated successfully');
            } else {
                await api.post('/api/lab/packages', formData, { headers });
                setSuccess('Package created successfully');
            }
            
            setShowModal(false);
            loadData();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save package');
        }
        setSaving(false);
    };

    const handleDelete = async (pkg) => {
        if (!window.confirm(`Delete package "${pkg.name}"?`)) return;
        
        try {
            const token = localStorage.getItem('token');
            await api.delete(`/api/lab/packages/${pkg.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess('Package deleted');
            loadData();
        } catch (err) {
            setError('Failed to delete package');
        }
    };

    const toggleTest = (testId) => {
        setFormData(prev => ({
            ...prev,
            test_ids: prev.test_ids.includes(testId)
                ? prev.test_ids.filter(id => id !== testId)
                : [...prev.test_ids, testId]
        }));
    };

    // Group test types by category
    const groupedTests = testTypes.reduce((acc, test) => {
        const cat = test.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(test);
        return acc;
    }, {});

    if (loading) {
        return (
            <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2">Loading packages...</p>
            </div>
        );
    }

    return (
        <Container fluid className="py-3">
            {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert variant="success" dismissible onClose={() => setSuccess(null)}>{success}</Alert>}

            <Card className="shadow-sm">
                <Card.Header className="d-flex justify-content-between align-items-center bg-success text-white">
                    <div>
                        <Package size={20} className="me-2" />
                        <strong>Lab Test Packages</strong>
                        <Badge bg="light" text="dark" className="ms-2">{packages.length}</Badge>
                    </div>
                    <Button variant="light" size="sm" onClick={openCreateModal}>
                        <Plus size={16} className="me-1" /> Create Package
                    </Button>
                </Card.Header>
                <Card.Body className="p-0">
                    <Table hover responsive className="mb-0">
                        <thead className="table-light">
                            <tr>
                                <th>Package Name</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Tests</th>
                                <th className="text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {packages.map(pkg => (
                                <tr key={pkg.id}>
                                    <td>
                                        <strong>{pkg.name}</strong>
                                        {pkg.description && (
                                            <small className="d-block text-muted">{pkg.description}</small>
                                        )}
                                    </td>
                                    <td>
                                        <Badge bg={pkg.category === 'Custom' ? 'info' : 'secondary'}>
                                            {pkg.category || 'Standard'}
                                        </Badge>
                                    </td>
                                    <td className="text-success fw-bold">₹{pkg.price}</td>
                                    <td>{pkg.test_count || '-'}</td>
                                    <td className="text-center">
                                        <Button variant="outline-primary" size="sm" className="me-1" onClick={() => openEditModal(pkg)}>
                                            <Edit2 size={14} />
                                        </Button>
                                        <Button variant="outline-danger" size="sm" onClick={() => handleDelete(pkg)}>
                                            <Trash2 size={14} />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {packages.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center py-4 text-muted">
                                        No packages found. Create your first package!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* Create/Edit Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton className="bg-success text-white">
                    <Modal.Title>
                        <Package size={20} className="me-2" />
                        {editingPackage ? 'Edit Package' : 'Create New Package'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Package Name *</Form.Label>
                                <Form.Control
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Senior Citizen Checkup"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label>Price (₹) *</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={formData.price}
                                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                                    placeholder="e.g., 1499"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label>Category</Form.Label>
                                <Form.Select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    <option>Custom</option>
                                    <option>Basic</option>
                                    <option>Advanced</option>
                                    <option>Specialized</option>
                                    <option>Women</option>
                                    <option>Men</option>
                                    <option>Senior</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                    
                    <Form.Group className="mb-3">
                        <Form.Label>Description</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Brief description of the package..."
                        />
                    </Form.Group>

                    <hr />
                    
                    <div className="mb-2 d-flex justify-content-between align-items-center">
                        <strong>
                            <FlaskConical size={16} className="me-1" />
                            Select Tests
                        </strong>
                        <Badge bg="primary">{formData.test_ids.length} selected</Badge>
                    </div>

                    <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="border rounded p-2">
                        {Object.entries(groupedTests).map(([category, tests]) => (
                            <div key={category} className="mb-3">
                                <strong className="text-muted small">{category}</strong>
                                <div className="d-flex flex-wrap gap-1 mt-1">
                                    {tests.map(test => (
                                        <Badge
                                            key={test.id}
                                            bg={formData.test_ids.includes(test.id) ? 'success' : 'light'}
                                            text={formData.test_ids.includes(test.id) ? 'white' : 'dark'}
                                            style={{ cursor: 'pointer' }}
                                            onClick={() => toggleTest(test.id)}
                                        >
                                            {formData.test_ids.includes(test.id) && '✓ '}
                                            {test.name}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>
                        <X size={16} className="me-1" /> Cancel
                    </Button>
                    <Button variant="success" onClick={handleSave} disabled={saving}>
                        {saving ? <Spinner size="sm" className="me-1" /> : <Save size={16} className="me-1" />}
                        {editingPackage ? 'Update Package' : 'Create Package'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default LabPackageBuilder;
