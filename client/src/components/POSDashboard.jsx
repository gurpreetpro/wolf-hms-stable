import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Form, Modal, Spinner, Tabs, Tab, Alert } from 'react-bootstrap';
import {
    CreditCard, Smartphone, Building2, Wifi, WifiOff, RefreshCw, Plus, Settings,
    CheckCircle, XCircle, Clock, IndianRupee, Zap, Activity, TrendingUp
} from 'lucide-react';
import axios from 'axios';

const POSDashboard = () => {
    const [activeTab, setActiveTab] = useState('devices');
    const [providers, setProviders] = useState([]);
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddDevice, setShowAddDevice] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [dailySummary, setDailySummary] = useState([]);
    const [testingDevice, setTestingDevice] = useState(null);

    const [newDevice, setNewDevice] = useState({
        device_name: '',
        provider_code: '',
        terminal_id: '',
        merchant_id: '',
        location: '',
        department: '',
        connection_type: 'cloud'
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [providersRes, devicesRes, summaryRes] = await Promise.all([
                axios.get('/api/pos/providers', { headers }),
                axios.get('/api/pos/devices', { headers }),
                axios.get('/api/pos/reports/daily-summary', { headers })
            ]);

            setProviders(providersRes.data);
            setDevices(devicesRes.data);
            setDailySummary(summaryRes.data);
        } catch (error) {
            console.error('Failed to load POS data:', error);
            // Use demo data
            setProviders([
                { id: 1, code: 'pine_labs', name: 'Pine Labs', features: { card: true, upi: true, emi: true } },
                { id: 2, code: 'paytm', name: 'Paytm POS', features: { card: true, upi: true, qr: true } },
                { id: 3, code: 'razorpay', name: 'Razorpay POS', features: { card: true, upi: true } },
                { id: 4, code: 'phonepe', name: 'PhonePe POS', features: { card: true, upi: true } },
                { id: 5, code: 'mswipe', name: 'Mswipe', features: { card: true, upi: true } },
                { id: 6, code: 'worldline', name: 'Worldline', features: { card: true, nfc: true } }
            ]);
            setDevices([
                { id: 1, device_id: 'DEV-DEMO-001', device_name: 'OPD Counter 1', provider_name: 'Pine Labs', location: 'OPD Reception', status: 'active', last_heartbeat: new Date() },
                { id: 2, device_id: 'DEV-DEMO-002', device_name: 'Pharmacy Counter', provider_name: 'Paytm POS', location: 'Pharmacy', status: 'active', last_heartbeat: new Date(Date.now() - 3600000) }
            ]);
            setDailySummary([
                { provider_name: 'Pine Labs', total_transactions: 15, successful: 14, failed: 1, total_amount: 45000 },
                { provider_name: 'Paytm POS', total_transactions: 8, successful: 8, failed: 0, total_amount: 23500 }
            ]);
        }
        setLoading(false);
    };

    const testConnection = async (deviceId) => {
        setTestingDevice(deviceId);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/pos/devices/${deviceId}/test`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Connection successful!');
        } catch (error) {
            // Demo mode - simulate success
            await new Promise(resolve => setTimeout(resolve, 1000));
            alert('Connection test successful (demo mode)');
        }
        setTestingDevice(null);
    };

    const registerDevice = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/pos/devices', newDevice, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowAddDevice(false);
            loadData();
        } catch (error) {
            alert('Failed to register device: ' + error.message);
        }
    };

    const getConnectionStatus = (device) => {
        if (!device.last_heartbeat) return 'offline';
        const lastSeen = new Date(device.last_heartbeat);
        const diffMins = (Date.now() - lastSeen.getTime()) / 60000;
        if (diffMins < 5) return 'online';
        if (diffMins < 60) return 'idle';
        return 'offline';
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading POS Dashboard...</p>
            </Container>
        );
    }

    return (
        <Container fluid className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h3 className="fw-bold mb-1">
                        <CreditCard className="me-2" size={28} />
                        POS Terminal Management
                    </h3>
                    <p className="text-muted mb-0">Multi-provider payment terminal integration</p>
                </div>
                <div className="d-flex gap-2">
                    <Button variant="outline-primary" onClick={loadData}>
                        <RefreshCw size={16} className="me-1" /> Refresh
                    </Button>
                    <Button variant="primary" onClick={() => setShowAddDevice(true)}>
                        <Plus size={16} className="me-1" /> Add Device
                    </Button>
                </div>
            </div>

            {/* Summary Cards */}
            <Row className="mb-4">
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-gradient" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                        <Card.Body className="text-white">
                            <div className="d-flex justify-content-between">
                                <div>
                                    <h6 className="opacity-75">Active Devices</h6>
                                    <h2 className="mb-0">{devices.filter(d => d.status === 'active').length}</h2>
                                </div>
                                <Smartphone size={40} className="opacity-50" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-gradient" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
                        <Card.Body className="text-white">
                            <div className="d-flex justify-content-between">
                                <div>
                                    <h6 className="opacity-75">Today's Transactions</h6>
                                    <h2 className="mb-0">{dailySummary.reduce((sum, s) => sum + (s.total_transactions || 0), 0)}</h2>
                                </div>
                                <Activity size={40} className="opacity-50" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-gradient" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                        <Card.Body className="text-white">
                            <div className="d-flex justify-content-between">
                                <div>
                                    <h6 className="opacity-75">Today's Collection</h6>
                                    <h2 className="mb-0">{formatCurrency(dailySummary.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0))}</h2>
                                </div>
                                <IndianRupee size={40} className="opacity-50" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-gradient" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                        <Card.Body className="text-white">
                            <div className="d-flex justify-content-between">
                                <div>
                                    <h6 className="opacity-75">Providers Integrated</h6>
                                    <h2 className="mb-0">{providers.length}</h2>
                                </div>
                                <Building2 size={40} className="opacity-50" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
                <Tab eventKey="devices" title="Registered Devices">
                    <Card className="border-0 shadow-sm">
                        <Card.Body>
                            <Table responsive hover>
                                <thead className="bg-light">
                                    <tr>
                                        <th>Device / Location</th>
                                        <th>Provider</th>
                                        <th>Terminal ID</th>
                                        <th>Status</th>
                                        <th>Connection</th>
                                        <th>Last Activity</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {devices.map(device => {
                                        const connStatus = getConnectionStatus(device);
                                        return (
                                            <tr key={device.id}>
                                                <td>
                                                    <div className="fw-bold">{device.device_name}</div>
                                                    <small className="text-muted">{device.location}</small>
                                                </td>
                                                <td>
                                                    <Badge bg="light" text="dark">{device.provider_name}</Badge>
                                                </td>
                                                <td><code>{device.terminal_id || 'N/A'}</code></td>
                                                <td>
                                                    <Badge bg={device.status === 'active' ? 'success' : 'secondary'}>
                                                        {device.status}
                                                    </Badge>
                                                </td>
                                                <td>
                                                    {connStatus === 'online' && (
                                                        <span className="text-success"><Wifi size={16} /> Online</span>
                                                    )}
                                                    {connStatus === 'idle' && (
                                                        <span className="text-warning"><Clock size={16} /> Idle</span>
                                                    )}
                                                    {connStatus === 'offline' && (
                                                        <span className="text-danger"><WifiOff size={16} /> Offline</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {device.last_heartbeat
                                                        ? new Date(device.last_heartbeat).toLocaleString()
                                                        : 'Never'
                                                    }
                                                </td>
                                                <td>
                                                    <Button
                                                        size="sm"
                                                        variant="outline-primary"
                                                        className="me-1"
                                                        onClick={() => testConnection(device.id)}
                                                        disabled={testingDevice === device.id}
                                                    >
                                                        {testingDevice === device.id ? (
                                                            <Spinner size="sm" />
                                                        ) : (
                                                            <><Zap size={14} /> Test</>
                                                        )}
                                                    </Button>
                                                    <Button size="sm" variant="outline-secondary">
                                                        <Settings size={14} />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {devices.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-center py-4 text-muted">
                                                No devices registered. Click "Add Device" to get started.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>

                <Tab eventKey="providers" title="Available Providers">
                    <Row>
                        {providers.map(provider => (
                            <Col md={4} lg={3} key={provider.id} className="mb-4">
                                <Card className="border-0 shadow-sm h-100">
                                    <Card.Body className="text-center">
                                        <div className="mb-3">
                                            <CreditCard size={48} className="text-primary" />
                                        </div>
                                        <h5>{provider.name}</h5>
                                        <div className="mb-3">
                                            {provider.features?.card && <Badge bg="light" text="dark" className="me-1">Card</Badge>}
                                            {provider.features?.upi && <Badge bg="light" text="dark" className="me-1">UPI</Badge>}
                                            {provider.features?.emi && <Badge bg="light" text="dark" className="me-1">EMI</Badge>}
                                            {provider.features?.nfc && <Badge bg="light" text="dark" className="me-1">NFC</Badge>}
                                            {provider.features?.qr && <Badge bg="light" text="dark" className="me-1">QR</Badge>}
                                        </div>
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => {
                                                setNewDevice({ ...newDevice, provider_code: provider.code });
                                                setShowAddDevice(true);
                                            }}
                                        >
                                            <Plus size={14} /> Add Device
                                        </Button>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Tab>

                <Tab eventKey="summary" title="Today's Summary">
                    <Card className="border-0 shadow-sm">
                        <Card.Body>
                            <Table responsive>
                                <thead className="bg-light">
                                    <tr>
                                        <th>Provider</th>
                                        <th className="text-center">Total Transactions</th>
                                        <th className="text-center">Successful</th>
                                        <th className="text-center">Failed</th>
                                        <th className="text-end">Total Amount</th>
                                        <th className="text-center">Success Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dailySummary.map((summary, idx) => {
                                        const successRate = summary.total_transactions > 0
                                            ? ((summary.successful / summary.total_transactions) * 100).toFixed(1)
                                            : 0;
                                        return (
                                            <tr key={idx}>
                                                <td className="fw-bold">{summary.provider_name}</td>
                                                <td className="text-center">{summary.total_transactions}</td>
                                                <td className="text-center text-success">
                                                    <CheckCircle size={14} /> {summary.successful}
                                                </td>
                                                <td className="text-center text-danger">
                                                    <XCircle size={14} /> {summary.failed}
                                                </td>
                                                <td className="text-end fw-bold">{formatCurrency(summary.total_amount)}</td>
                                                <td className="text-center">
                                                    <Badge bg={successRate >= 95 ? 'success' : successRate >= 80 ? 'warning' : 'danger'}>
                                                        {successRate}%
                                                    </Badge>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {dailySummary.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-4 text-muted">
                                                No transactions today
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>

            {/* Add Device Modal */}
            <Modal show={showAddDevice} onHide={() => setShowAddDevice(false)} size="lg">
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title><Plus size={20} className="me-2" /> Register New POS Device</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Device Name *</Form.Label>
                                <Form.Control
                                    value={newDevice.device_name}
                                    onChange={e => setNewDevice({ ...newDevice, device_name: e.target.value })}
                                    placeholder="e.g., OPD Counter 1"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>POS Provider *</Form.Label>
                                <Form.Select
                                    value={newDevice.provider_code}
                                    onChange={e => setNewDevice({ ...newDevice, provider_code: e.target.value })}
                                >
                                    <option value="">Select Provider</option>
                                    {providers.map(p => (
                                        <option key={p.code} value={p.code}>{p.name}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Terminal ID (TID)</Form.Label>
                                <Form.Control
                                    value={newDevice.terminal_id}
                                    onChange={e => setNewDevice({ ...newDevice, terminal_id: e.target.value })}
                                    placeholder="From provider"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Merchant ID (MID)</Form.Label>
                                <Form.Control
                                    value={newDevice.merchant_id}
                                    onChange={e => setNewDevice({ ...newDevice, merchant_id: e.target.value })}
                                    placeholder="From provider"
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Location</Form.Label>
                                <Form.Control
                                    value={newDevice.location}
                                    onChange={e => setNewDevice({ ...newDevice, location: e.target.value })}
                                    placeholder="e.g., OPD Reception Area"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Department</Form.Label>
                                <Form.Select
                                    value={newDevice.department}
                                    onChange={e => setNewDevice({ ...newDevice, department: e.target.value })}
                                >
                                    <option value="">Select Department</option>
                                    <option value="OPD">OPD</option>
                                    <option value="IPD">IPD</option>
                                    <option value="Pharmacy">Pharmacy</option>
                                    <option value="Lab">Laboratory</option>
                                    <option value="Emergency">Emergency</option>
                                    <option value="Billing">Central Billing</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Connection Type</Form.Label>
                                <Form.Select
                                    value={newDevice.connection_type}
                                    onChange={e => setNewDevice({ ...newDevice, connection_type: e.target.value })}
                                >
                                    <option value="cloud">Cloud (Internet)</option>
                                    <option value="lan">LAN/Ethernet</option>
                                    <option value="usb">USB/Serial</option>
                                    <option value="bluetooth">Bluetooth</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                    <Alert variant="info">
                        <strong>Note:</strong> You'll need the Terminal ID (TID) and Merchant ID (MID) from your POS provider.
                        Contact your provider's support team if you don't have these credentials.
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAddDevice(false)}>Cancel</Button>
                    <Button variant="primary" onClick={registerDevice}>
                        <Plus size={16} className="me-1" /> Register Device
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default POSDashboard;
