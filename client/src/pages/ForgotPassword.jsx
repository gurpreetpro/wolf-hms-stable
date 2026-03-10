import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Row, Col, ProgressBar } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Shield, Lock, CheckCircle, ArrowLeft } from 'lucide-react';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [username, setUsername] = useState('');
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleIdentifyUser = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await axios.post('/api/auth/recover-init', { username });
            setQuestion(res.data.question);
            setStep(2);
        } catch (err) {
            setError(err.response?.data?.message || 'User not found');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await axios.post('/api/auth/recover-verify', { username, answer, newPassword });
            setSuccess('Password reset successful! Redirecting to login...');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Incorrect answer or error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container fluid className="vh-100 p-0 overflow-hidden bg-white">
            <Row className="h-100 justify-content-center align-items-center">
                <Col md={5} lg={4}>
                    <div className="text-center mb-4">
                        <Shield size={48} className="text-primary mb-3" />
                        <h2 className="fw-bold">Account Recovery</h2>
                        <p className="text-muted">Secure offline password reset</p>
                    </div>

                    <Card className="border-0 shadow-sm">
                        <Card.Body className="p-4">
                            {error && <Alert variant="danger">{error}</Alert>}
                            {success && <Alert variant="success">{success}</Alert>}

                            {step === 1 && (
                                <Form onSubmit={handleIdentifyUser}>
                                    <Form.Label className="fw-bold">Enter your Username</Form.Label>
                                    <div className="input-group mb-4">
                                        <span className="input-group-text bg-light"><User size={18} /></span>
                                        <Form.Control
                                            type="text"
                                            required
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="e.g. dr.smith"
                                        />
                                    </div>
                                    <Button variant="primary" type="submit" className="w-100" disabled={loading}>
                                        {loading ? 'Searching...' : 'Find Account'}
                                    </Button>
                                </Form>
                            )}

                            {step === 2 && (
                                <Form onSubmit={handleResetPassword}>
                                    <div className="mb-4 text-center p-3 bg-light rounded">
                                        <small className="text-muted d-block mb-1">Security Question</small>
                                        <h5 className="text-dark mb-0">{question}</h5>
                                    </div>

                                    <Form.Group className="mb-3">
                                        <Form.Label>Your Answer</Form.Label>
                                        <Form.Control
                                            type="text"
                                            required
                                            value={answer}
                                            onChange={(e) => setAnswer(e.target.value)}
                                            placeholder="Type your secret answer"
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-4">
                                        <Form.Label>New Password</Form.Label>
                                        <Form.Control
                                            type="password"
                                            required
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Enter new password"
                                        />
                                    </Form.Group>

                                    <Button variant="success" type="submit" className="w-100" disabled={loading}>
                                        {loading ? 'Verifying...' : 'Reset Password'}
                                    </Button>
                                </Form>
                            )}
                        </Card.Body>
                        <Card.Footer className="bg-white text-center py-3">
                            <Link to="/login" className="text-decoration-none text-muted small">
                                <ArrowLeft size={14} className="me-1" /> Back to Login
                            </Link>
                        </Card.Footer>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default ForgotPassword;
