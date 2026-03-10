import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Alert, Badge, Tabs, Tab, InputGroup, Spinner } from 'react-bootstrap';
import { 
    CreditCard, Smartphone, Settings, Check, AlertCircle, 
    MessageSquare, QrCode, Wifi, Save, Eye, EyeOff 
} from 'lucide-react';
import axios from 'axios';

/**
 * PaymentSettingsTab - Configure payment providers, UPI, POS, and SMS
 * Now uses API calls for database storage (multi-tenant support)
 */
const PaymentSettingsTab = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState('payment');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [showSecrets, setShowSecrets] = useState({});

    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    // Payment Gateway Settings
    const [paymentSettings, setPaymentSettings] = useState({
        razorpay_enabled: false,
        razorpay_key_id: '',
        razorpay_key_secret: '',
        razorpay_webhook_secret: '',
        upi_enabled: false,
        upi_id: '',
        upi_merchant_name: ''
    });

    // POS Settings (still localStorage for now - uses different system)
    const [posSettings, setPosSettings] = useState({
        provider: '',
        terminal_id: '',
        merchant_id: '',
        is_enabled: false
    });

    // SMS Settings (Fast2SMS)
    const [smsSettings, setSmsSettings] = useState({
        provider: 'fast2sms',
        api_key: '',
        sender_id: '',
        dlt_entity_id: '',
        is_enabled: false,
        templates: {
            payment_confirmation: 'Dear {name}, payment of Rs.{amount} for Invoice #{invoice} received. Thank you. -{hospital}',
            payment_reminder: 'Dear {name}, reminder for pending payment Rs.{amount} for Invoice #{invoice}. -{hospital}',
            receipt_sent: 'Dear {name}, receipt for Rs.{amount} ready. Download: {link} -{hospital}'
        }
    });

    // Confirmation Settings
    const [confirmSettings, setConfirmSettings] = useState({
        auto_sms_on_payment: true,
        auto_print_receipt: false,
        auto_email_receipt: false,
        require_payment_reference: true
    });

    // Load settings from API on mount
    useEffect(() => {
        fetchAllSettings();
    }, []);

    const fetchAllSettings = async () => {
        setLoading(true);
        try {
            // Fetch all settings in parallel
            const [paymentRes, smsRes, confirmRes] = await Promise.all([
                axios.get('/api/settings/payment', config).catch(() => ({ data: { data: {} } })),
                axios.get('/api/settings/sms', config).catch(() => ({ data: { data: {} } })),
                axios.get('/api/settings/confirmation', config).catch(() => ({ data: { data: {} } }))
            ]);

            // Update payment settings
            const payment = paymentRes.data?.data || paymentRes.data || {};
            setPaymentSettings(prev => ({
                ...prev,
                razorpay_enabled: payment.razorpay_enabled || false,
                razorpay_key_id: payment.razorpay_key_id || '',
                razorpay_key_secret: payment.razorpay_has_secret ? '••••••••••••••••' : '',
                upi_enabled: payment.upi_enabled || false,
                upi_id: payment.upi_id || '',
                upi_merchant_name: payment.upi_merchant_name || ''
            }));

            // Update SMS settings
            const sms = smsRes.data?.data || smsRes.data || {};
            setSmsSettings(prev => ({
                ...prev,
                provider: sms.provider || 'fast2sms',
                api_key: sms.api_key_set ? '••••••••••••••••' : '',
                sender_id: sms.sender_id || '',
                dlt_entity_id: sms.dlt_entity_id || '',
                is_enabled: sms.is_enabled || false,
                templates: sms.templates || prev.templates
            }));

            // Update confirmation settings
            const confirm = confirmRes.data?.data || confirmRes.data || {};
            setConfirmSettings(prev => ({
                ...prev,
                auto_sms_on_payment: confirm.auto_sms_on_payment ?? true,
                auto_print_receipt: confirm.auto_print_receipt ?? false,
                auto_email_receipt: confirm.auto_email_receipt ?? false,
                require_payment_reference: confirm.require_payment_reference ?? true
            }));

            // Load POS from localStorage (different system)
            try {
                const pos = localStorage.getItem('pos_settings');
                if (pos && pos !== 'undefined') {
                    setPosSettings(JSON.parse(pos));
                }
            } catch (e) { console.error(e); }

        } catch (err) {
            console.error('Failed to load settings:', err);
            setError('Failed to load settings from server');
        } finally {
            setLoading(false);
        }
    };

    // Save all settings to API
    const handleSaveAll = async () => {
        setSaving(true);
        setSuccess('');
        setError('');

        try {
            // Save payment settings
            await axios.put('/api/settings/payment', {
                razorpay_enabled: paymentSettings.razorpay_enabled,
                razorpay_key_id: paymentSettings.razorpay_key_id,
                razorpay_key_secret: paymentSettings.razorpay_key_secret.includes('••••') ? '' : paymentSettings.razorpay_key_secret,
                razorpay_webhook_secret: paymentSettings.razorpay_webhook_secret.includes('••••') ? '' : paymentSettings.razorpay_webhook_secret,
                upi_enabled: paymentSettings.upi_enabled,
                upi_id: paymentSettings.upi_id,
                upi_merchant_name: paymentSettings.upi_merchant_name
            }, config);

            // Save SMS settings
            await axios.put('/api/settings/sms', {
                provider: smsSettings.provider,
                api_key: smsSettings.api_key.includes('••••') ? '' : smsSettings.api_key,
                sender_id: smsSettings.sender_id,
                dlt_entity_id: smsSettings.dlt_entity_id,
                is_enabled: smsSettings.is_enabled,
                templates: smsSettings.templates
            }, config);

            // Save confirmation settings
            await axios.put('/api/settings/confirmation', {
                auto_sms_on_payment: confirmSettings.auto_sms_on_payment,
                auto_print_receipt: confirmSettings.auto_print_receipt,
                auto_email_receipt: confirmSettings.auto_email_receipt,
                require_payment_reference: confirmSettings.require_payment_reference
            }, config);

            // Save POS to localStorage (uses different system)
            localStorage.setItem('pos_settings', JSON.stringify(posSettings));

            setSuccess('✅ All settings saved to database successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Failed to save settings:', err);
            setError(err.response?.data?.message || 'Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const toggleShowSecret = (key) => {
        setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const posProviders = [
        { id: 'pinelab', name: 'Pine Labs', logo: '🌲' },
        { id: 'razorpay', name: 'Razorpay POS', logo: '💳' },
        { id: 'paytm', name: 'Paytm EDC', logo: '📱' },
        { id: 'phonepe', name: 'PhonePe POS', logo: '💜' }
    ];

    if (loading) {
        return (
            <Card className="border-0 shadow-lg">
                <Card.Body className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3 text-muted">Loading payment settings...</p>
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-lg">
            <Card.Header className="bg-gradient text-white py-3" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0 d-flex align-items-center gap-2">
                        <Settings size={20} /> Payment & SMS Configuration
                    </h5>
                    <Button variant="light" size="sm" onClick={onClose}>✕ Close</Button>
                </div>
            </Card.Header>
            <Card.Body>
                {success && <Alert variant="success" className="py-2">{success}</Alert>}
                {error && <Alert variant="danger" className="py-2">{error}</Alert>}

                <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
                    {/* Payment Gateway Tab */}
                    <Tab eventKey="payment" title={<span>💳 Payment Gateway</span>}>
                        <Row className="g-4">
                            {/* Razorpay Section */}
                            <Col md={6}>
                                <Card className="h-100 border-primary">
                                    <Card.Header className="bg-primary bg-opacity-10 d-flex justify-content-between align-items-center">
                                        <span className="fw-bold">🔵 Razorpay</span>
                                        <Form.Check 
                                            type="switch"
                                            checked={paymentSettings.razorpay_enabled}
                                            onChange={(e) => setPaymentSettings({...paymentSettings, razorpay_enabled: e.target.checked})}
                                            label={paymentSettings.razorpay_enabled ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Disabled</Badge>}
                                        />
                                    </Card.Header>
                                    <Card.Body>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">API Key ID</Form.Label>
                                            <Form.Control 
                                                placeholder="rzp_live_xxxxxxxxxx"
                                                value={paymentSettings.razorpay_key_id}
                                                onChange={(e) => setPaymentSettings({...paymentSettings, razorpay_key_id: e.target.value})}
                                            />
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">API Key Secret</Form.Label>
                                            <InputGroup>
                                                <Form.Control 
                                                    type={showSecrets.razorpay_secret ? 'text' : 'password'}
                                                    placeholder="Leave blank to keep existing"
                                                    value={paymentSettings.razorpay_key_secret}
                                                    onChange={(e) => setPaymentSettings({...paymentSettings, razorpay_key_secret: e.target.value})}
                                                />
                                                <Button variant="outline-secondary" onClick={() => toggleShowSecret('razorpay_secret')}>
                                                    {showSecrets.razorpay_secret ? <EyeOff size={16}/> : <Eye size={16}/>}
                                                </Button>
                                            </InputGroup>
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Webhook Secret</Form.Label>
                                            <InputGroup>
                                                <Form.Control 
                                                    type={showSecrets.webhook ? 'text' : 'password'}
                                                    placeholder="For payment confirmations"
                                                    value={paymentSettings.razorpay_webhook_secret}
                                                    onChange={(e) => setPaymentSettings({...paymentSettings, razorpay_webhook_secret: e.target.value})}
                                                />
                                                <Button variant="outline-secondary" onClick={() => toggleShowSecret('webhook')}>
                                                    {showSecrets.webhook ? <EyeOff size={16}/> : <Eye size={16}/>}
                                                </Button>
                                            </InputGroup>
                                            <Form.Text className="text-muted">Get from Razorpay Dashboard → Webhooks</Form.Text>
                                        </Form.Group>
                                    </Card.Body>
                                </Card>
                            </Col>

                            {/* UPI Section */}
                            <Col md={6}>
                                <Card className="h-100 border-success">
                                    <Card.Header className="bg-success bg-opacity-10 d-flex justify-content-between align-items-center">
                                        <span className="fw-bold">🟢 UPI Direct</span>
                                        <Form.Check 
                                            type="switch"
                                            checked={paymentSettings.upi_enabled}
                                            onChange={(e) => setPaymentSettings({...paymentSettings, upi_enabled: e.target.checked})}
                                            label={paymentSettings.upi_enabled ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Disabled</Badge>}
                                        />
                                    </Card.Header>
                                    <Card.Body>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">UPI ID</Form.Label>
                                            <Form.Control 
                                                placeholder="hospital@okicici"
                                                value={paymentSettings.upi_id}
                                                onChange={(e) => setPaymentSettings({...paymentSettings, upi_id: e.target.value})}
                                            />
                                            <Form.Text className="text-muted">Patients will pay to this UPI ID</Form.Text>
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Merchant Name</Form.Label>
                                            <Form.Control 
                                                placeholder="ABC Hospital"
                                                value={paymentSettings.upi_merchant_name}
                                                onChange={(e) => setPaymentSettings({...paymentSettings, upi_merchant_name: e.target.value})}
                                            />
                                            <Form.Text className="text-muted">Shown on patient's payment app</Form.Text>
                                        </Form.Group>
                                        {paymentSettings.upi_id && (
                                            <div className="text-center p-3 bg-light rounded">
                                                <QrCode size={64} className="text-success mb-2" />
                                                <div className="small text-muted">QR Code will be generated</div>
                                            </div>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    </Tab>

                    {/* POS Machine Tab */}
                    <Tab eventKey="pos" title={<span>🖥️ POS Machine</span>}>
                        <Card className="mb-4">
                            <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                                <span className="fw-bold">Select POS Provider</span>
                                <Form.Check 
                                    type="switch"
                                    checked={posSettings.is_enabled}
                                    onChange={(e) => setPosSettings({...posSettings, is_enabled: e.target.checked})}
                                    label={posSettings.is_enabled ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Disabled</Badge>}
                                />
                            </Card.Header>
                            <Card.Body>
                                <Row className="g-3 mb-4">
                                    {posProviders.map(provider => (
                                        <Col md={3} key={provider.id}>
                                            <Card 
                                                className={`text-center cursor-pointer ${posSettings.provider === provider.id ? 'border-primary border-2' : ''}`}
                                                onClick={() => setPosSettings({...posSettings, provider: provider.id})}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <Card.Body className="py-4">
                                                    <div className="fs-1 mb-2">{provider.logo}</div>
                                                    <div className="fw-bold">{provider.name}</div>
                                                    {posSettings.provider === provider.id && (
                                                        <Badge bg="primary" className="mt-2">Selected</Badge>
                                                    )}
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    ))}
                                </Row>

                                {posSettings.provider && (
                                    <Row className="g-3">
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small fw-bold">Terminal ID</Form.Label>
                                                <Form.Control 
                                                    placeholder="TID-XXXXX"
                                                    value={posSettings.terminal_id}
                                                    onChange={(e) => setPosSettings({...posSettings, terminal_id: e.target.value})}
                                                />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group>
                                                <Form.Label className="small fw-bold">Merchant ID</Form.Label>
                                                <Form.Control 
                                                    placeholder="MID-XXXXX"
                                                    value={posSettings.merchant_id}
                                                    onChange={(e) => setPosSettings({...posSettings, merchant_id: e.target.value})}
                                                />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                )}
                            </Card.Body>
                        </Card>
                    </Tab>

                    {/* SMS Configuration Tab */}
                    <Tab eventKey="sms" title={<span>📲 SMS Service</span>}>
                        <Card className="mb-4">
                            <Card.Header className="bg-warning bg-opacity-10 d-flex justify-content-between align-items-center">
                                <span className="fw-bold">⚡ Fast2SMS Configuration</span>
                                <Form.Check 
                                    type="switch"
                                    checked={smsSettings.is_enabled}
                                    onChange={(e) => setSmsSettings({...smsSettings, is_enabled: e.target.checked})}
                                    label={smsSettings.is_enabled ? <Badge bg="success">Active</Badge> : <Badge bg="secondary">Disabled</Badge>}
                                />
                            </Card.Header>
                            <Card.Body>
                                <Row className="g-3">
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">API Key</Form.Label>
                                            <InputGroup>
                                                <Form.Control 
                                                    type={showSecrets.sms_api ? 'text' : 'password'}
                                                    placeholder="Your Fast2SMS API Key"
                                                    value={smsSettings.api_key}
                                                    onChange={(e) => setSmsSettings({...smsSettings, api_key: e.target.value})}
                                                />
                                                <Button variant="outline-secondary" onClick={() => toggleShowSecret('sms_api')}>
                                                    {showSecrets.sms_api ? <EyeOff size={16}/> : <Eye size={16}/>}
                                                </Button>
                                            </InputGroup>
                                            <Form.Text className="text-muted">
                                                Get from <a href="https://www.fast2sms.com/dev/wallet" target="_blank" rel="noreferrer">Fast2SMS Dev Portal</a>
                                            </Form.Text>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">Sender ID (6 characters)</Form.Label>
                                            <Form.Control 
                                                placeholder="e.g., ABCHSP"
                                                maxLength={6}
                                                value={smsSettings.sender_id}
                                                onChange={(e) => setSmsSettings({...smsSettings, sender_id: e.target.value.toUpperCase()})}
                                            />
                                            <Form.Text className="text-muted">Register on DLT portal</Form.Text>
                                        </Form.Group>
                                    </Col>
                                    <Col md={12}>
                                        <Form.Group className="mb-3">
                                            <Form.Label className="small fw-bold">DLT Entity ID (TRAI Registration)</Form.Label>
                                            <Form.Control 
                                                placeholder="11012XXXXXXXXXXX"
                                                value={smsSettings.dlt_entity_id}
                                                onChange={(e) => setSmsSettings({...smsSettings, dlt_entity_id: e.target.value})}
                                            />
                                            <Form.Text className="text-muted">Required for transactional SMS in India</Form.Text>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <hr />
                                <h6 className="fw-bold mb-3">📝 SMS Templates</h6>
                                <Alert variant="info" className="small py-2">
                                    <AlertCircle size={14} className="me-1" />
                                    Templates must match your DLT-registered templates exactly
                                </Alert>

                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Payment Confirmation</Form.Label>
                                    <Form.Control 
                                        as="textarea"
                                        rows={2}
                                        value={smsSettings.templates.payment_confirmation}
                                        onChange={(e) => setSmsSettings({
                                            ...smsSettings, 
                                            templates: {...smsSettings.templates, payment_confirmation: e.target.value}
                                        })}
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Label className="small fw-bold">Payment Reminder</Form.Label>
                                    <Form.Control 
                                        as="textarea"
                                        rows={2}
                                        value={smsSettings.templates.payment_reminder}
                                        onChange={(e) => setSmsSettings({
                                            ...smsSettings, 
                                            templates: {...smsSettings.templates, payment_reminder: e.target.value}
                                        })}
                                    />
                                </Form.Group>
                            </Card.Body>
                        </Card>
                    </Tab>

                    {/* Confirmation Settings Tab */}
                    <Tab eventKey="confirm" title={<span>✅ Confirmation</span>}>
                        <Card>
                            <Card.Header className="bg-light">
                                <span className="fw-bold">Payment Confirmation Settings</span>
                            </Card.Header>
                            <Card.Body>
                                <Form.Group className="mb-3">
                                    <Form.Check 
                                        type="switch"
                                        id="auto-sms"
                                        label={<span className="fw-semibold">📲 Auto-send SMS on payment</span>}
                                        checked={confirmSettings.auto_sms_on_payment}
                                        onChange={(e) => setConfirmSettings({...confirmSettings, auto_sms_on_payment: e.target.checked})}
                                    />
                                    <Form.Text className="text-muted ms-4">Send confirmation SMS immediately after payment</Form.Text>
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Check 
                                        type="switch"
                                        id="auto-print"
                                        label={<span className="fw-semibold">🖨️ Auto-print receipt</span>}
                                        checked={confirmSettings.auto_print_receipt}
                                        onChange={(e) => setConfirmSettings({...confirmSettings, auto_print_receipt: e.target.checked})}
                                    />
                                    <Form.Text className="text-muted ms-4">Open print dialog after payment</Form.Text>
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Check 
                                        type="switch"
                                        id="auto-email"
                                        label={<span className="fw-semibold">📧 Auto-email receipt</span>}
                                        checked={confirmSettings.auto_email_receipt}
                                        onChange={(e) => setConfirmSettings({...confirmSettings, auto_email_receipt: e.target.checked})}
                                    />
                                    <Form.Text className="text-muted ms-4">Email receipt to patient (if email available)</Form.Text>
                                </Form.Group>
                                <Form.Group className="mb-3">
                                    <Form.Check 
                                        type="switch"
                                        id="require-ref"
                                        label={<span className="fw-semibold">🔢 Require payment reference for non-cash</span>}
                                        checked={confirmSettings.require_payment_reference}
                                        onChange={(e) => setConfirmSettings({...confirmSettings, require_payment_reference: e.target.checked})}
                                    />
                                    <Form.Text className="text-muted ms-4">Staff must enter transaction ID for card/UPI</Form.Text>
                                </Form.Group>
                            </Card.Body>
                        </Card>
                    </Tab>
                </Tabs>

                {/* Save Button */}
                <div className="d-flex justify-content-end gap-2 mt-4">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button 
                        variant="primary" 
                        onClick={handleSaveAll}
                        disabled={saving}
                        className="d-flex align-items-center gap-2 px-4"
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none' }}
                    >
                        {saving ? (
                            <>
                                <Spinner size="sm" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save size={18} /> Save All Settings
                            </>
                        )}
                    </Button>
                </div>
            </Card.Body>
        </Card>
    );
};

export default PaymentSettingsTab;
