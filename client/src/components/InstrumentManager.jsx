import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Row, Col, Alert, Spinner, Modal, Form, ProgressBar } from 'react-bootstrap';
import { Usb, RefreshCw, Settings, Activity, Plus, CheckCircle, XCircle, Play, Square, Trash2, Wifi, WifiOff } from 'lucide-react';
import api from '../utils/axiosInstance';

const InstrumentManager = () => {
    const [instruments, setInstruments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [liveData, setLiveData] = useState([]);
    const [driverRegistry, setDriverRegistry] = useState({ data: [], byManufacturer: {} });
    
    // Wizard State
    const [showAddModal, setShowAddModal] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [connectionConfig, setConnectionConfig] = useState({
        name: '',
        host: '192.168.1.100',
        port: 5100,
        mode: 'server'
    });
    const [testResult, setTestResult] = useState(null);
    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);

    const fetchInstruments = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/api/instruments', { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            setInstruments(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const fetchDriverRegistry = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/api/instruments/registry', { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            setDriverRegistry(res.data || { data: [], byManufacturer: {} });
        } catch (err) {
            console.error('Registry fetch error:', err);
        }
    };

    const fetchLiveData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/api/instruments/live-results', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLiveData(res.data?.data || []);
        } catch (err) {
            console.error('Live Data Error:', err);
        }
    };

    useEffect(() => {
        fetchInstruments();
        fetchDriverRegistry();
        const interval = setInterval(fetchLiveData, 5000);
        return () => clearInterval(interval);
    }, []);

    // Wizard Actions
    const openAddWizard = () => {
        setWizardStep(1);
        setSelectedDriver(null);
        setConnectionConfig({ name: '', host: '192.168.1.100', port: 5100, mode: 'server' });
        setTestResult(null);
        setShowAddModal(true);
    };

    const selectDriver = (driver) => {
        setSelectedDriver(driver);
        setConnectionConfig(prev => ({
            ...prev,
            name: `${driver.manufacturer} ${driver.model}`,
            port: driver.defaultPort || 5100
        }));
        setWizardStep(2);
    };

    const testConnection = async () => {
        setTesting(true);
        setTestResult(null);
        
        // Simulate test for now - in production this would test actual connection
        await new Promise(r => setTimeout(r, 1500));
        
        // Check if port is valid
        const port = parseInt(connectionConfig.port);
        if (isNaN(port) || port < 1 || port > 65535) {
            setTestResult({ success: false, message: 'Invalid port number' });
        } else if (!connectionConfig.host || connectionConfig.host.length < 7) {
            setTestResult({ success: false, message: 'Invalid IP address' });
        } else {
            setTestResult({ success: true, message: `Port ${port} ready for ${connectionConfig.mode} mode` });
        }
        
        setTesting(false);
    };

    const saveInstrument = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            await api.post('/api/instruments', {
                name: connectionConfig.name,
                manufacturer: selectedDriver.manufacturer,
                model: selectedDriver.model,
                category: selectedDriver.category,
                connection_type: 'TCP_IP',
                connection_config: {
                    host: connectionConfig.host,
                    port: parseInt(connectionConfig.port),
                    mode: connectionConfig.mode
                },
                protocol: selectedDriver.protocol,
                is_bidirectional: true
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            setShowAddModal(false);
            fetchInstruments();
        } catch (err) {
            console.error('Save error:', err);
            alert('Failed to save instrument');
        }
        setSaving(false);
    };

    const deleteInstrument = async (id) => {
        if (!window.confirm('Delete this instrument?')) return;
        try {
            const token = localStorage.getItem('token');
            await api.delete(`/api/instruments/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            fetchInstruments();
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const startInstrument = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await api.post(`/api/instruments/${id}/start`, {}, { headers: { Authorization: `Bearer ${token}` } });
            fetchInstruments();
        } catch (err) {
            alert('Failed to start: ' + (err.response?.data?.message || err.message));
        }
    };

    const stopInstrument = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await api.post(`/api/instruments/${id}/stop`, {}, { headers: { Authorization: `Bearer ${token}` } });
            fetchInstruments();
        } catch (err) {
            console.error('Stop error:', err);
        }
    };

    return (
        <>
            <Row className="g-4">
                <Col md={8}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                            <span className="fw-bold"><Usb size={18} className="me-2"/>Connected Instruments</span>
                            <div className="d-flex gap-2">
                                <Button size="sm" variant="success" onClick={openAddWizard}>
                                    <Plus size={14} className="me-1"/> Add Instrument
                                </Button>
                                <Button size="sm" variant="outline-primary" onClick={fetchInstruments} disabled={loading}>
                                    <RefreshCw size={14} className={loading ? 'spin' : ''} />
                                </Button>
                            </div>
                        </Card.Header>
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th>Name</th>
                                    <th>Protocol</th>
                                    <th>Connection</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {instruments.map(inst => {
                                    const config = typeof inst.connection_config === 'string' 
                                        ? JSON.parse(inst.connection_config) 
                                        : inst.connection_config || {};
                                    return (
                                        <tr key={inst.id}>
                                            <td>
                                                <div className="fw-medium">{inst.name}</div>
                                                <small className="text-muted">{inst.manufacturer} {inst.model}</small>
                                            </td>
                                            <td>
                                                <Badge bg="secondary">{inst.protocol}</Badge>
                                                <br/><small className="text-muted">{config.host}:{config.port}</small>
                                            </td>
                                            <td>
                                                {inst.is_active ? (
                                                    <Badge bg="success"><Wifi size={10} className="me-1"/>Online</Badge>
                                                ) : (
                                                    <Badge bg="secondary"><WifiOff size={10} className="me-1"/>Offline</Badge>
                                                )}
                                            </td>
                                            <td>
                                                {inst.last_error ? (
                                                    <span className="text-danger small" title={inst.last_error}>
                                                        <XCircle size={12} className="me-1"/>Error
                                                    </span>
                                                ) : inst.last_communication ? (
                                                    <span className="text-success small">
                                                        <Activity size={12} className="me-1"/>Active
                                                    </span>
                                                ) : (
                                                    <span className="text-muted small">Ready</span>
                                                )}
                                            </td>
                                            <td>
                                                <div className="d-flex gap-1">
                                                    {inst.is_active ? (
                                                        <Button size="sm" variant="outline-warning" onClick={() => stopInstrument(inst.id)} title="Stop">
                                                            <Square size={12}/>
                                                        </Button>
                                                    ) : (
                                                        <Button size="sm" variant="outline-success" onClick={() => startInstrument(inst.id)} title="Start">
                                                            <Play size={12}/>
                                                        </Button>
                                                    )}
                                                    <Button size="sm" variant="outline-secondary" title="Settings">
                                                        <Settings size={12}/>
                                                    </Button>
                                                    <Button size="sm" variant="outline-danger" onClick={() => deleteInstrument(inst.id)} title="Delete">
                                                        <Trash2 size={12}/>
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {instruments.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan="5" className="text-center text-muted p-5">
                                            <Usb size={48} className="mb-3 opacity-25"/>
                                            <p>No instruments configured</p>
                                            <Button variant="primary" size="sm" onClick={openAddWizard}>
                                                <Plus size={14} className="me-1"/> Add Your First Instrument
                                            </Button>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card>
                </Col>

                <Col md={4}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-dark text-white fw-bold">
                            <Activity size={18} className="me-2"/> Live Data Stream
                        </Card.Header>
                        <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }} className="bg-light">
                            {liveData.length === 0 ? (
                                <div className="text-center text-muted py-5">
                                    <Activity size={32} className="mb-2 opacity-50"/><br/>
                                    Waiting for data...
                                </div>
                            ) : (
                                <div className="d-flex flex-column gap-2">
                                    {liveData.map((res, idx) => (
                                        <Alert key={idx} variant="info" className="mb-0 py-2 small shadow-sm border-0">
                                            <div className="d-flex justify-content-between">
                                                <strong>{res.test_name}</strong>
                                                <Badge bg="primary">{res.value} {res.unit}</Badge>
                                            </div>
                                            <div className="text-muted extra-small mt-1">
                                                {new Date(res.timestamp).toLocaleTimeString()}
                                            </div>
                                        </Alert>
                                    ))}
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Add Instrument Wizard Modal */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)} size="lg" centered>
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title><Usb className="me-2"/>Add Lab Instrument</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {/* Progress Bar */}
                    <ProgressBar now={wizardStep * 33.33} className="mb-4" style={{ height: '3px' }}/>
                    
                    {/* Step 1: Select Driver */}
                    {wizardStep === 1 && (
                        <div>
                            <h5 className="mb-3">Step 1: Select Instrument Type</h5>
                            <p className="text-muted small mb-4">Choose your lab analyzer from the list below</p>
                            
                            {Object.entries(driverRegistry.byManufacturer || {}).map(([manufacturer, models]) => (
                                <div key={manufacturer} className="mb-4">
                                    <h6 className="text-uppercase text-muted small">{manufacturer}</h6>
                                    <Row xs={1} md={2} className="g-2">
                                        {models.map(model => {
                                            const fullDriver = driverRegistry.data?.find(d => d.id === model.id) || model;
                                            return (
                                                <Col key={model.id}>
                                                    <Card 
                                                        className={`cursor-pointer border-2 ${selectedDriver?.id === model.id ? 'border-primary bg-primary bg-opacity-10' : 'hover-shadow'}`}
                                                        onClick={() => selectDriver(fullDriver)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <Card.Body className="py-2">
                                                            <div className="d-flex justify-content-between align-items-center">
                                                                <div>
                                                                    <strong>{model.model}</strong>
                                                                    <div className="small text-muted">{model.category}</div>
                                                                </div>
                                                                <Badge bg="outline-secondary" className="border">{model.protocol}</Badge>
                                                            </div>
                                                        </Card.Body>
                                                    </Card>
                                                </Col>
                                            );
                                        })}
                                    </Row>
                                </div>
                            ))}
                            
                            {Object.keys(driverRegistry.byManufacturer || {}).length === 0 && (
                                <Alert variant="info">Loading available drivers...</Alert>
                            )}
                        </div>
                    )}

                    {/* Step 2: Connection Settings */}
                    {wizardStep === 2 && selectedDriver && (
                        <div>
                            <h5 className="mb-3">Step 2: Connection Settings</h5>
                            <Alert variant="info" className="small">
                                <strong>{selectedDriver.manufacturer} {selectedDriver.model}</strong> uses {selectedDriver.protocol} protocol
                            </Alert>
                            
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>Display Name</Form.Label>
                                    <Form.Control 
                                        type="text" 
                                        value={connectionConfig.name}
                                        onChange={(e) => setConnectionConfig({...connectionConfig, name: e.target.value})}
                                        placeholder="e.g., Hematology Lab 1"
                                    />
                                </Form.Group>
                                
                                <Row>
                                    <Col md={4}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Mode</Form.Label>
                                            <Form.Select 
                                                value={connectionConfig.mode}
                                                onChange={(e) => setConnectionConfig({...connectionConfig, mode: e.target.value})}
                                            >
                                                <option value="server">Server (Listen)</option>
                                                <option value="client">Client (Connect)</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={5}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>IP Address</Form.Label>
                                            <Form.Control 
                                                type="text" 
                                                value={connectionConfig.host}
                                                onChange={(e) => setConnectionConfig({...connectionConfig, host: e.target.value})}
                                                placeholder="192.168.1.100"
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={3}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Port</Form.Label>
                                            <Form.Control 
                                                type="number" 
                                                value={connectionConfig.port}
                                                onChange={(e) => setConnectionConfig({...connectionConfig, port: e.target.value})}
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Button variant="outline-primary" className="w-100" onClick={testConnection} disabled={testing}>
                                    {testing ? (
                                        <><Spinner size="sm" className="me-2"/>Testing Connection...</>
                                    ) : (
                                        <><Wifi size={16} className="me-2"/>Test Connection</>
                                    )}
                                </Button>
                                
                                {testResult && (
                                    <Alert variant={testResult.success ? 'success' : 'danger'} className="mt-3 small">
                                        {testResult.success ? <CheckCircle size={16} className="me-2"/> : <XCircle size={16} className="me-2"/>}
                                        {testResult.message}
                                    </Alert>
                                )}
                            </Form>
                        </div>
                    )}

                    {/* Step 3: Confirm */}
                    {wizardStep === 3 && (
                        <div className="text-center py-4">
                            <CheckCircle size={64} className="text-success mb-3"/>
                            <h5>Ready to Add Instrument</h5>
                            <p className="text-muted">
                                <strong>{connectionConfig.name}</strong><br/>
                                {selectedDriver?.protocol} on {connectionConfig.host}:{connectionConfig.port}
                            </p>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer className="d-flex justify-content-between">
                    <div>
                        {wizardStep > 1 && (
                            <Button variant="outline-secondary" onClick={() => setWizardStep(wizardStep - 1)}>
                                Back
                            </Button>
                        )}
                    </div>
                    <div>
                        <Button variant="secondary" onClick={() => setShowAddModal(false)} className="me-2">
                            Cancel
                        </Button>
                        {wizardStep === 2 && testResult?.success && (
                            <Button variant="primary" onClick={() => setWizardStep(3)}>
                                Next
                            </Button>
                        )}
                        {wizardStep === 3 && (
                            <Button variant="success" onClick={saveInstrument} disabled={saving}>
                                {saving ? <><Spinner size="sm" className="me-2"/>Saving...</> : 'Add Instrument'}
                            </Button>
                        )}
                    </div>
                </Modal.Footer>
            </Modal>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .cursor-pointer { cursor: pointer; }
                .hover-shadow:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            `}</style>
        </>
    );
};

export default InstrumentManager;
