import React, { useState, useEffect } from 'react';
import { Form, Button, Alert, Card, Row, Col, Spinner } from 'react-bootstrap';
import { CreditCard, Smartphone, CheckCircle, Save, AlertCircle } from 'lucide-react';
import axios from 'axios';

const PaymentSettings = () => {
    const [razorpayKey, setRazorpayKey] = useState('');
    const [razorpaySecret, setRazorpaySecret] = useState('');
    const [razorpayWebhook, setRazorpayWebhook] = useState('');
    const [razorpayEnabled, setRazorpayEnabled] = useState(false);
    
    const [posIp, setPosIp] = useState('');
    const [posPort, setPosPort] = useState('8080');
    const [posId, setPosId] = useState('');
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await axios.get('/api/settings/payment', config);
            const data = res.data.data || res.data;
            
            setRazorpayKey(data.razorpay_key_id || '');
            setRazorpayEnabled(data.razorpay_enabled || false);
            // Secret is not returned for security - only show placeholder if set
            if (data.razorpay_has_secret) {
                setRazorpaySecret('••••••••••••••••');
            }
        } catch (error) {
            console.error('Failed to fetch payment settings:', error);
            // Fallback to localStorage for backwards compatibility
            setRazorpayKey(localStorage.getItem('razorpay_key') || '');
            setRazorpaySecret(localStorage.getItem('razorpay_secret') || '');
            setPosIp(localStorage.getItem('pos_ip') || '');
            setPosPort(localStorage.getItem('pos_port') || '8080');
            setPosId(localStorage.getItem('pos_device_id') || '');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        
        try {
            // Save to API (database) - proper multi-tenant storage
            await axios.put('/api/settings/payment', {
                razorpay_enabled: razorpayEnabled,
                razorpay_key_id: razorpayKey,
                razorpay_key_secret: razorpaySecret.includes('••••') ? '' : razorpaySecret, // Don't overwrite if masked
                razorpay_webhook_secret: razorpayWebhook
            }, config);
            
            // Also save POS settings to localStorage for now (POS uses different system)
            localStorage.setItem('pos_ip', posIp);
            localStorage.setItem('pos_port', posPort);
            localStorage.setItem('pos_device_id', posId);

            setMessage({ type: 'success', text: '✅ Payment settings saved to database successfully!' });
        } catch (error) {
            console.error('Failed to save payment settings:', error);
            setMessage({ type: 'danger', text: error.response?.data?.message || 'Failed to save settings' });
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = () => {
        setMessage({ type: 'info', text: '📡 Testing POS connection...' });
        // Simulate connection test
        setTimeout(() => {
            if (posIp && posPort) {
                setMessage({ type: 'success', text: '✅ POS device is reachable (simulated)' });
            } else {
                setMessage({ type: 'warning', text: '⚠️ Please enter IP address and port first' });
            }
        }, 1000);
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center p-5" style={{ color: 'white' }}>
                <Spinner animation="border" variant="light" />
            </div>
        );
    }

    return (
        <div style={{ color: 'white' }}>
            <h3 className="mb-4">💳 Payment Configuration</h3>

            {message && (
                <Alert variant={message.type} className="d-flex align-items-center mb-4">
                    {message.type === 'success' && <CheckCircle size={18} className="me-2" />}
                    {message.type === 'danger' && <AlertCircle size={18} className="me-2" />}
                    {message.text}
                </Alert>
            )}

            {/* Razorpay Section */}
            <Card className="mb-4" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white' }}>
                <Card.Header style={{ background: 'rgba(255,255,255,0.1)', fontWeight: 'bold' }} className="d-flex justify-content-between align-items-center">
                    <span><CreditCard size={18} className="me-2 mb-1" /> Razorpay Integration</span>
                    <Form.Check 
                        type="switch"
                        checked={razorpayEnabled}
                        onChange={(e) => setRazorpayEnabled(e.target.checked)}
                        label={razorpayEnabled ? "Active" : "Disabled"}
                    />
                </Card.Header>
                <Card.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>API Key ID</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="rzp_live_..."
                            value={razorpayKey}
                            onChange={(e) => setRazorpayKey(e.target.value)}
                            style={{ background: '#2d3748', border: '1px solid #4a5568', color: 'white' }}
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Key Secret</Form.Label>
                        <Form.Control
                            type="password"
                            placeholder="Enter Secret (leave blank to keep existing)"
                            value={razorpaySecret}
                            onChange={(e) => setRazorpaySecret(e.target.value)}
                            style={{ background: '#2d3748', border: '1px solid #4a5568', color: 'white' }}
                        />
                        <Form.Text className="text-muted">
                            Leave blank to keep existing secret. Secrets are stored securely in the database.
                        </Form.Text>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Webhook Secret</Form.Label>
                        <Form.Control
                            type="password"
                            placeholder="For payment confirmations"
                            value={razorpayWebhook}
                            onChange={(e) => setRazorpayWebhook(e.target.value)}
                            style={{ background: '#2d3748', border: '1px solid #4a5568', color: 'white' }}
                        />
                    </Form.Group>
                </Card.Body>
            </Card>

            {/* POS Device Section */}
            <Card className="mb-4" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white' }}>
                <Card.Header style={{ background: 'rgba(255,255,255,0.1)', fontWeight: 'bold' }}>
                    <Smartphone size={18} className="me-2 mb-1" /> POS Machine Setup
                </Card.Header>
                <Card.Body>
                    <Row>
                        <Col md={8}>
                            <Form.Group className="mb-3">
                                <Form.Label>Device IP Address</Form.Label>
                                <Form.Control
                                    type="text"
                                    placeholder="192.168.1.XXX"
                                    value={posIp}
                                    onChange={(e) => setPosIp(e.target.value)}
                                    style={{ background: '#2d3748', border: '1px solid #4a5568', color: 'white' }}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <Form.Label>Port</Form.Label>
                                <Form.Control
                                    type="text"
                                    value={posPort}
                                    onChange={(e) => setPosPort(e.target.value)}
                                    style={{ background: '#2d3748', border: '1px solid #4a5568', color: 'white' }}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Form.Group className="mb-3">
                        <Form.Label>Device ID / Terminal ID</Form.Label>
                        <Form.Control
                            type="text"
                            placeholder="TID-12345"
                            value={posId}
                            onChange={(e) => setPosId(e.target.value)}
                            style={{ background: '#2d3748', border: '1px solid #4a5568', color: 'white' }}
                        />
                    </Form.Group>
                    <Button variant="outline-info" size="sm" className="w-100" onClick={handleTestConnection}>
                        Test Connection
                    </Button>
                </Card.Body>
            </Card>

            <Button 
                variant="primary" 
                onClick={handleSave} 
                className="w-100 py-2 fw-bold"
                disabled={saving}
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
            >
                {saving ? (
                    <>
                        <Spinner size="sm" className="me-2" />
                        Saving...
                    </>
                ) : (
                    <>
                        <Save size={18} className="me-2" />
                        Save Configuration
                    </>
                )}
            </Button>
        </div>
    );
};

export default PaymentSettings;
