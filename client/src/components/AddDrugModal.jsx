import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import api from '../utils/axiosInstance';

const AddDrugModal = ({ show, onHide, refreshData }) => {
    const initialFormState = {
        name: '',
        generic_name: '',
        category: 'Analgesic',
        dosage_form: 'Tablet',
        strength: '',
        pack_size: '10s Strip',
        batch_number: '',
        mfg_date: '',
        expiry_date: '',
        manufacturer: '',
        rack_location: '',
        hsn_code: '30049099',
        price_per_unit: '',
        cost_price: '',
        mrp: '',
        gst_percent: 12.00,
        stock_quantity: 0,
        reorder_level: 100,
        schedule_type: 'OTC',
        is_controlled: false,
        barcode: ''
    };

    const [formData, setFormData] = useState(initialFormState);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({ 
            ...formData, 
            [name]: type === 'checkbox' ? checked : value 
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            await api.post('/api/pharmacy/inventory', formData);
            setSuccess('Drug added successfully with enterprise master data!');
            if (typeof refreshData === 'function') refreshData();
            setTimeout(() => {
                setSuccess(null);
                setFormData(initialFormState);
                onHide();
            }, 1000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add drug');
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" backdrop="static">
            <Modal.Header closeButton>
                <Modal.Title style={{ color: 'var(--text-primary, #ffffff)' }}>
                    Add New Drug (Enterprise Master Data)
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                    {error && <Alert variant="danger">{error}</Alert>}
                    {success && <Alert variant="success">{success}</Alert>}

                    {/* Section 1: Clinical Identification */}
                    <h6 className="fw-bold text-primary mb-3">1. Drug Identification & Category</h6>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Brand Name *</Form.Label>
                                <Form.Control 
                                    name="name" 
                                    required 
                                    value={formData.name} 
                                    onChange={handleChange} 
                                    placeholder="e.g. Dolo 650" 
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Generic Name</Form.Label>
                                <Form.Control 
                                    name="generic_name" 
                                    value={formData.generic_name} 
                                    onChange={handleChange} 
                                    placeholder="e.g. Paracetamol" 
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Therapeutic Category</Form.Label>
                                <Form.Select name="category" value={formData.category} onChange={handleChange}>
                                    <option value="Analgesic">Analgesic / Antipyretic</option>
                                    <option value="Antibiotic">Antibiotic</option>
                                    <option value="Cardiac">Cardiac / Antihypertensive</option>
                                    <option value="Diabetic">Diabetic / Endocrine</option>
                                    <option value="Gastro">Gastrointestinal</option>
                                    <option value="Respiratory">Respiratory</option>
                                    <option value="Antihistamine">Antihistamine</option>
                                    <option value="Infusion">Infusion / Fluid</option>
                                    <option value="Surgical">Surgical / Consumable</option>
                                    <option value="General">General</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Dosage Form *</Form.Label>
                                <Form.Select name="dosage_form" value={formData.dosage_form} onChange={handleChange}>
                                    <option value="Tablet">Tablet</option>
                                    <option value="Capsule">Capsule</option>
                                    <option value="IV Fluid">IV Fluid</option>
                                    <option value="Injection (IV/IM)">Injection (IV/IM)</option>
                                    <option value="Syrup">Syrup</option>
                                    <option value="Ointment">Ointment / Gel</option>
                                    <option value="Drops">Drops (Eye/Ear)</option>
                                    <option value="Inhaler">Inhaler / Respule</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Strength</Form.Label>
                                <Form.Control 
                                    name="strength" 
                                    value={formData.strength} 
                                    onChange={handleChange} 
                                    placeholder="e.g. 500mg, 1g, 0.9%" 
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Section 2: Batch & Regulatory Tracking */}
                    <h6 className="fw-bold text-primary mb-3 mt-4">2. Batch No., Expiry & Regulatory Schedule</h6>
                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Batch Number *</Form.Label>
                                <Form.Control 
                                    name="batch_number" 
                                    required 
                                    value={formData.batch_number} 
                                    onChange={handleChange} 
                                    placeholder="e.g. PCM-2601" 
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Mfg Date</Form.Label>
                                <Form.Control 
                                    type="date" 
                                    name="mfg_date" 
                                    value={formData.mfg_date} 
                                    onChange={handleChange} 
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Expiry Date *</Form.Label>
                                <Form.Control 
                                    type="date" 
                                    name="expiry_date" 
                                    required 
                                    value={formData.expiry_date} 
                                    onChange={handleChange} 
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Schedule Type</Form.Label>
                                <Form.Select name="schedule_type" value={formData.schedule_type} onChange={handleChange}>
                                    <option value="OTC">OTC (Over the Counter)</option>
                                    <option value="H">Schedule H (Prescription)</option>
                                    <option value="H1">Schedule H1 (High Risk / Antibiotic)</option>
                                    <option value="X">Schedule X (Narcotic / Controlled)</option>
                                    <option value="G">Schedule G</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Pack Size</Form.Label>
                                <Form.Control 
                                    name="pack_size" 
                                    value={formData.pack_size} 
                                    onChange={handleChange} 
                                    placeholder="e.g. 10s Strip, 100ml Bottle" 
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4} className="d-flex align-items-center mt-3">
                            <Form.Check 
                                type="checkbox"
                                id="is_controlled_check"
                                name="is_controlled"
                                label="Controlled Substance (Log Mandated)"
                                checked={formData.is_controlled}
                                onChange={handleChange}
                                className="fw-semibold text-danger"
                            />
                        </Col>
                    </Row>

                    {/* Section 3: Pricing, GST & Inventory */}
                    <h6 className="fw-bold text-primary mb-3 mt-4">3. Pricing, GST & Storage Location</h6>
                    <Row className="mb-3">
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Selling Price (₹) *</Form.Label>
                                <Form.Control 
                                    type="number" 
                                    step="0.01" 
                                    name="price_per_unit" 
                                    required 
                                    value={formData.price_per_unit} 
                                    onChange={handleChange} 
                                    placeholder="₹ 2.00"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Cost Price (₹)</Form.Label>
                                <Form.Control 
                                    type="number" 
                                    step="0.01" 
                                    name="cost_price" 
                                    value={formData.cost_price} 
                                    onChange={handleChange} 
                                    placeholder="₹ 1.40"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>MRP (₹)</Form.Label>
                                <Form.Control 
                                    type="number" 
                                    step="0.01" 
                                    name="mrp" 
                                    value={formData.mrp} 
                                    onChange={handleChange} 
                                    placeholder="₹ 3.00"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>GST (%)</Form.Label>
                                <Form.Control 
                                    type="number" 
                                    step="0.01" 
                                    name="gst_percent" 
                                    value={formData.gst_percent} 
                                    onChange={handleChange} 
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row className="mb-3">
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Initial Stock</Form.Label>
                                <Form.Control 
                                    type="number" 
                                    name="stock_quantity" 
                                    value={formData.stock_quantity} 
                                    onChange={handleChange} 
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Reorder Level</Form.Label>
                                <Form.Control 
                                    type="number" 
                                    name="reorder_level" 
                                    value={formData.reorder_level} 
                                    onChange={handleChange} 
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Rack Location</Form.Label>
                                <Form.Control 
                                    name="rack_location" 
                                    value={formData.rack_location} 
                                    onChange={handleChange} 
                                    placeholder="e.g. A-1" 
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>HSN Code</Form.Label>
                                <Form.Control 
                                    name="hsn_code" 
                                    value={formData.hsn_code} 
                                    onChange={handleChange} 
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Manufacturer</Form.Label>
                                <Form.Control 
                                    name="manufacturer" 
                                    value={formData.manufacturer} 
                                    onChange={handleChange} 
                                    placeholder="e.g. Cipla Ltd."
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Barcode / SKU</Form.Label>
                                <Form.Control 
                                    name="barcode" 
                                    value={formData.barcode} 
                                    onChange={handleChange} 
                                    placeholder="e.g. BAR-PCM-500" 
                                />
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
