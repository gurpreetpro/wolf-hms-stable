import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axiosInstance';
import { Shield, Lock } from 'lucide-react';

const SECURITY_QUESTIONS = [
    "What is the name of your first pet?",
    "What is your mother's maiden name?",
    "What was the name of your first school?",
    "What city were you born in?",
    "What is your favorite food?",
    "What is the name of your favorite teacher?",
    "What is your childhood nickname?"
];

const SecuritySetup = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        q1: SECURITY_QUESTIONS[0], a1: '',
        q2: SECURITY_QUESTIONS[1], a2: '',
        q3: SECURITY_QUESTIONS[2], a3: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (formData.q1 === formData.q2 || formData.q1 === formData.q3 || formData.q2 === formData.q3) {
            setError('Please choose 3 different questions.');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const userStr = localStorage.getItem('user');
            // Guard against "undefined" string
            if (!userStr || userStr === 'undefined' || userStr === 'null') {
                setError('Session expired. Please login again.');
                setLoading(false);
                return;
            }
            const user = JSON.parse(userStr);

            await api.post('/api/auth/setup-security', {
                username: user.username,
                questions: [formData.q1, formData.q2, formData.q3],
                answers: [formData.a1, formData.a2, formData.a3]
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Update user state if needed, or just redirect
            // We assume the check happens on login, so next login is fine. 
            // In current session, we just proceed.
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.message || 'Setup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container fluid className="vh-100 bg-light d-flex align-items-center justify-content-center">
            <Card className="border-0 shadow-lg" style={{ maxWidth: '600px', width: '100%' }}>
                <Card.Header className="bg-primary text-white py-3 text-center">
                    <Shield size={32} className="mb-2" />
                    <h4 className="mb-0 fw-bold">Security Setup Required</h4>
                </Card.Header>
                <Card.Body className="p-4">
                    <Alert variant="info" className="mb-4">
                        <Lock size={16} className="me-2" />
                        For your account security, you must set up 3 recovery questions before accessing the dashboard.
                    </Alert>

                    {error && <Alert variant="danger">{error}</Alert>}

                    <Form onSubmit={handleSubmit}>
                        {[1, 2, 3].map(num => (
                            <div key={num} className="mb-4 p-3 border rounded bg-white">
                                <Form.Group className="mb-2">
                                    <Form.Label className="fw-bold text-muted">Question {num}</Form.Label>
                                    <Form.Select
                                        name={`q${num}`}
                                        value={formData[`q${num}`]}
                                        onChange={handleChange}
                                    >
                                        {SECURITY_QUESTIONS.map((q, i) => (
                                            <option key={i} value={q}>{q}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                                <Form.Control
                                    type="text"
                                    name={`a${num}`}
                                    placeholder="Your Answer"
                                    required
                                    value={formData[`a${num}`]}
                                    onChange={handleChange}
                                />
                            </div>
                        ))}

                        <Button variant="primary" size="lg" type="submit" className="w-100" disabled={loading}>
                            {loading ? 'Saving Security Profile...' : 'Save & Continue to Dashboard'}
                        </Button>
                    </Form>
                </Card.Body>
            </Card>
        </Container>
    );
};

export default SecuritySetup;
