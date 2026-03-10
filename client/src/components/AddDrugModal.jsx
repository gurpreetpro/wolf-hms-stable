import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import api from '../utils/axiosInstance';

const AddDrugModal = ({ show, onHide, refreshData }) => {
    const [formData, setFormData] = useState({
        name: '',
        generic_name: '',
        category: 'Tablet',
        manufacturer: '',
        rack_location: '',
        hsn_code: '',
        price_per_unit: '',
        stock_quantity: 0,
        reorder_level: 100
    });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            await api.post('/api/pharmacy/inventory', formData);
            setSuccess('Drug added successfully!');
            refreshData(); // Reload inventory
            setTimeout(() => {
                setSuccess(null);
                setFormData({
                    name: '', generic_name: '', category: 'Tablet', manufacturer: '',
                    rack_location: '', hsn_code: '', price_per_unit: '', stock_quantity: 0, reorder_level: 100
                });
                onHide();
            }, 1000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add drug');
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Add New Drug (Master Data)</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && <Alert variant="danger">{error}</Alert>}
                    {success && <Alert variant="success">{success}</Alert>}

                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Brand Name *</Form.Label>
                                <Form.Control name="name" required value={formData.name} onChange={handleChange} placeholder="e.g. Dololo 650" />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Generic Name</Form.Label>
                                <Form.Control name="generic_name" value={formData.generic_name} onChange={handleChange} placeholder="e.g. Paracetamol" />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Category</Form.Label>
                                <Form.Select name="category" value={formData.category} onChange={handleChange}>
                                    <option>Tablet</option>
                                    <option>Capsule</option>
                                    <option>Syrup</option>
                                    <option>Injection</option>
                                    <option>Ointment</option>
                                    <option>Drops</option>
                                    <option>Surgical</option>
                                    <option>Consumable</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Manufacturer</Form.Label>
                                <Form.Control name="manufacturer" value={formData.manufacturer} onChange={handleChange} />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Rack Location</Form.Label>
                                <Form.Control name="rack_location" value={formData.rack_location} onChange={handleChange} placeholder="e.g. A-12" />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Price Per Unit (₹) *</Form.Label>
                                <Form.Control type="number" step="0.01" name="price_per_unit" required value={formData.price_per_unit} onChange={handleChange} />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Initial Stock</Form.Label>
                                <Form.Control type="number" name="stock_quantity" value={formData.stock_quantity} onChange={handleChange} />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Reorder Level</Form.Label>
                                <Form.Control type="number" name="reorder_level" value={formData.reorder_level} onChange={handleChange} />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>HSN Code</Form.Label>
                                <Form.Control name="hsn_code" value={formData.hsn_code} onChange={handleChange} />
                            </Form.Group>
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>Cancel</Button>
                    <Button variant="primary" type="submit">Save Drug</Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default AddDrugModal;
