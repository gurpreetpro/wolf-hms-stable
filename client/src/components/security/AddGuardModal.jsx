import React, { useState } from 'react';
import { Modal, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { UserPlus, Shield } from 'lucide-react';
import securityService from '../../services/securityService';

const AddGuardModal = ({ show, onHide, onGuardAdded }) => {
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            await securityService.registerGuard({
                username: formData.username,
                full_name: formData.full_name,
                email: formData.email,
                password: formData.password
            });

            setSuccess("Guard ID created successfully!");
            if (onGuardAdded) onGuardAdded();
            
            // Reset form after short delay or keep open? 
            // Usually correct to close or reset.
            setTimeout(() => {
                onHide();
                setFormData({ username: '', full_name: '', email: '', password: '', confirmPassword: '' });
                setSuccess(null);
            }, 1500);

        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Failed to create Guard ID");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton className="bg-dark text-white border-0">
                <Modal.Title className="d-flex align-items-center">
                    <Shield className="me-2 text-info" size={24} />
                    New Guard Onboarding
                </Modal.Title>
            </Modal.Header>
            <Modal.Body className="bg-dark text-white">
                {error && <Alert variant="danger">{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                <Form onSubmit={handleSubmit}>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Wolf ID (Username)</Form.Label>
                                <Form.Control 
                                    type="text" 
                                    name="username" 
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="e.g. guard_042"
                                    required 
                                    className="bg-secondary text-white border-0"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Full Name</Form.Label>
                                <Form.Control 
                                    type="text" 
                                    name="full_name" 
                                    value={formData.full_name}
                                    onChange={handleChange}
                                    placeholder="Officer Name"
                                    required
                                    className="bg-secondary text-white border-0"
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    
                    <Form.Group className="mb-3">
                        <Form.Label>Official Email</Form.Label>
                        <Form.Control 
                            type="email" 
                            name="email" 
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="guard@wolf.com"
                            required
                            className="bg-secondary text-white border-0"
                        />
                    </Form.Group>

                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Password</Form.Label>
                                <Form.Control 
                                    type="password" 
                                    name="password" 
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className="bg-secondary text-white border-0"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Confirm Password</Form.Label>
                                <Form.Control 
                                    type="password" 
                                    name="confirmPassword" 
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    className="bg-secondary text-white border-0"
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Alert variant="info" className="d-flex align-items-center mt-2 py-2">
                        <UserPlus size={18} className="me-2" />
                        <small>Role will be automatically set to: <strong>security_guard</strong></small>
                    </Alert>

                    <div className="d-flex justify-content-end mt-4">
                        <Button variant="outline-secondary" className="me-2" onClick={onHide}>Cancel</Button>
                        <Button variant="info" type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Guard ID'}
                        </Button>
                    </div>
                </Form>
            </Modal.Body>
        </Modal>
    );
};

export default AddGuardModal;
