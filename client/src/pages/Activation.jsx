import React, { useState, useEffect } from 'react';
import { Container, Card, Form, Button, Alert } from 'react-bootstrap';
import { ShieldCheck, Lock, Key } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const Activation = () => {
    const [key, setKey] = useState('');
    const [status, setStatus] = useState(null); // { success: bool, message: str }
    const navigate = useNavigate();

    // Check if already active
    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const res = await axios.get('/api/license/status');
            if (res.data.active) {
                navigate('/');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleActivate = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/license/activate', { key });
            setStatus({ success: true, message: 'Activation Successful! Redirecting...' });
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setStatus({ success: false, message: err.response?.data?.message || 'Activation Failed' });
        }
    };

    const handleGenerateDemo = async () => {
        try {
            const res = await axios.post('/api/license/generate', { hospital: 'Demo Hospital', days: 365 });
            setKey(res.data.key);
        } catch (err) {
            alert('Failed to generate demo key');
        }
    };

    return (
        <Container className="d-flex align-items-center justify-content-center vh-100 bg-dark">
            <Card className="shadow-lg border-0" style={{ maxWidth: '500px', width: '100%' }}>
                <Card.Body className="p-5">
                    <div className="text-center mb-4">
                        <ShieldCheck size={64} className="text-primary mb-3" />
                        <h2 className="fw-bold">HMS Premium</h2>
                        <p className="text-muted">Product Activation</p>
                    </div>

                    {status && (
                        <Alert variant={status.success ? 'success' : 'danger'}>
                            {status.message}
                        </Alert>
                    )}

                    <Form onSubmit={handleActivate}>
                        <Form.Group className="mb-4">
                            <Form.Label className="fw-bold"><Key size={16} className="me-2" />License Key</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="HMS-XXXX-XXXX-XXXX"
                                value={key}
                                onChange={(e) => setKey(e.target.value)}
                                size="lg"
                                className="text-center font-monospace"
                                required
                            />
                        </Form.Group>

                        <div className="d-grid gap-3">
                            <Button variant="primary" size="lg" type="submit" className="fw-bold">
                                <Lock size={18} className="me-2" /> Activate Now
                            </Button>
                            <Button variant="link" className="text-muted text-decoration-none" onClick={handleGenerateDemo}>
                                Generate Demo Key (Dev Only)
                            </Button>
                        </div>
                    </Form>
                </Card.Body>
                <Card.Footer className="text-center bg-light text-muted small">
                    &copy; 2025 Antigravity Systems. All rights reserved.
                </Card.Footer>
            </Card>
        </Container>
    );
};

export default Activation;
