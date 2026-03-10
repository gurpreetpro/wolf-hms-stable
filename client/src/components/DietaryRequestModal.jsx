import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import { Utensils } from 'lucide-react';
import api from '../utils/axiosInstance';

const DietaryRequestModal = ({ show, onHide, patients, wardId }) => {
    const [formData, setFormData] = useState({
        patient_id: '',
        bed_number: '',
        meal_type: 'Breakfast',
        diet_type: 'Normal',
        allergies: '',
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updates = { [name]: value };
            // Auto-fill bed number if patient selected
            if (name === 'patient_id') {
                const patient = patients.find(p => p.id === value);
                if (patient) updates.bed_number = patient.bed_number;
            }
            return { ...prev, ...updates };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const token = localStorage.getItem('token');
            await api.post('/api/dietary', {
                ...formData,
                ward: wardId || 'General Ward' // Fallback if not provided
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess(true);
            setTimeout(() => {
                onHide();
                setSuccess(false);
                setFormData({
                    patient_id: '',
                    bed_number: '',
                    meal_type: 'Breakfast',
                    diet_type: 'Normal',
                    allergies: '',
                    notes: ''
                });
            }, 1000);
        } catch (err) {
            console.error('Dietary order error:', err);
            setError('Failed to place order. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton className="bg-success text-white">
                <Modal.Title><Utensils size={20} className="me-2"/> Order Patient Meal</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">Order placed successfully!</Alert>}

                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>Select Patient</Form.Label>
                        <Form.Select 
                            name="patient_id" 
                            value={formData.patient_id} 
                            onChange={handleChange} 
                            required
                        >
                            <option value="">-- Choose Patient --</option>
                            {patients.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.bed_number} - {p.name}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Meal Type</Form.Label>
                                <Form.Select name="meal_type" value={formData.meal_type} onChange={handleChange}>
                                    <option>Breakfast</option>
                                    <option>Lunch</option>
                                    <option>Dinner</option>
                                    <option>Snack</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Diet Type</Form.Label>
                                <Form.Select name="diet_type" value={formData.diet_type} onChange={handleChange}>
                                    <option>Normal</option>
                                    <option>Soft</option>
                                    <option>Liquid</option>
                                    <option>Diabetic</option>
                                    <option>Renaal</option>
                                    <option>Low Salt</option>
                                    <option>High Protein</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-3">
                        <Form.Label>Allergies / Restrictions</Form.Label>
                        <Form.Control 
                            type="text" 
                            name="allergies" 
                            value={formData.allergies} 
                            onChange={handleChange}
                            placeholder="e.g. Peanuts, Gluten"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Notes</Form.Label>
                        <Form.Control 
                            as="textarea" 
                            rows={2} 
                            name="notes" 
                            value={formData.notes} 
                            onChange={handleChange}
                            placeholder="Special instructions..."
                        />
                    </Form.Group>

                    <div className="d-flex justify-content-end gap-2">
                        <Button variant="secondary" onClick={onHide}>Cancel</Button>
                        <Button variant="success" type="submit" disabled={loading}>
                            {loading ? 'Ordering...' : 'Place Order'}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default DietaryRequestModal;
