import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Table, Modal, Form, Tabs, Tab, Toast, ToastContainer, Spinner, Badge, Alert } from 'react-bootstrap';
import { Upload, FileText, CheckCircle, Activity, Clock, Database, Usb, Package, BarChart2, FlaskConical, DollarSign, Settings } from 'lucide-react';
import api from '../utils/axiosInstance';
import { io } from '../utils/socket-stub';
import { StatsCard } from '../components/ui';
import FloatingAIButton from '../components/FloatingAIButton';
import LabBarcodeDisplay from '../components/LabBarcodeDisplay';
import { CriticalValueBadge } from '../components/CriticalValueBadge';
import LabAuditLog from '../components/LabAuditLog';

// Modular Components
import LabQueueTab from '../components/lab/LabQueueTab';
import LabHistoryTab from '../components/lab/LabHistoryTab';
import LabEntryForm from '../components/lab/LabEntryForm';

// Phase 2-8 Imports
import TATAnalyticsChart from '../components/TATAnalyticsChart';
import CriticalAlertWidget from '../components/CriticalAlertWidget';
import ReagentInventory from '../components/ReagentInventory';
import QCDashboard from '../components/QCDashboard';
import LabRevenueChart from '../components/LabRevenueChart';
import InstrumentManager from '../components/InstrumentManager';
import LabTestParamsAdmin from '../components/LabTestParamsAdmin';
import LabPackageBuilder from '../components/LabPackageBuilder';

const LabDashboard = () => {
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false); // Upload Modal
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [manualResults, setManualResults] = useState('');
    const [stats, setStats] = useState({
        completed_today: 0,
        samples_collected: 0,
        avg_turnaround_hours: 0
    });
    const [showErrorToast, setShowErrorToast] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [fetchError, setFetchError] = useState(null);
    const [labHistory, setLabHistory] = useState([]);

    // Packages & Test Management State
    const [packages, setPackages] = useState([]);
    const [allTests, setAllTests] = useState([]);
    const [testManagementSearch, setTestManagementSearch] = useState('');
    const [showPriceRequestModal, setShowPriceRequestModal] = useState(false);
    const [selectedTestForChange, setSelectedTestForChange] = useState(null);
    const [newPrice, setNewPrice] = useState('');
    const [changeNotes, setChangeNotes] = useState('');

    const [criticalAlertCount, setCriticalAlertCount] = useState(0);

    const [showAddTestModal, setShowAddTestModal] = useState(false);
    const [newTestData, setNewTestData] = useState({ name: '', category: '', price: '', sample_type: '' });

    // File Upload Ref
    const fileInputRef = useRef(null);
    const [selectedFile, setSelectedFile] = useState(null);
    
    // Connected Instruments for Auto-Receive
    const [connectedInstruments, setConnectedInstruments] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setFetchError(null);
            try {
                await Promise.all([fetchQueue(), fetchStats()]);
            } catch (err) {
                setFetchError('Failed to load lab data. Please try again.');
            }
            setLoading(false);
        };
        loadData();

        // Socket.IO Connection
        const socket = io('/', { path: '/socket.io' });
        socket.on('lab_update', () => {
            fetchQueue();
            fetchStats();
        });
        return () => {
            socket.disconnect();
        };
    }, []);

    const fetchQueue = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/api/lab/queue', { headers: { Authorization: `Bearer ${token}` } });
            setQueue(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (err) {
            console.error(err);
            setQueue([]);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/api/lab/stats', { headers: { Authorization: `Bearer ${token}` } });
            setStats(res.data?.data || res.data || { completed_today: 0, samples_collected: 0, avg_turnaround_hours: 0 });
        } catch (err) {
            console.error(err);
        }
    };

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/api/lab/history', { headers: { Authorization: `Bearer ${token}` } });
            setLabHistory(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (err) {
            console.error('History fetch error:', err);
        }
    };

    const fetchPackages = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/api/lab/packages', { headers: { Authorization: `Bearer ${token}` } });
            setPackages(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (err) {
            console.error('Packages fetch error:', err);
        }
    };

    const fetchAllTests = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/api/lab/tests', { headers: { Authorization: `Bearer ${token}` } });
            setAllTests(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (err) {
            console.error('All tests fetch error:', err);
        }
    };

    const openPriceRequestModal = (test) => {
        setSelectedTestForChange(test);
        setNewPrice(test.price || 0); // Assuming price is available in test object
        setChangeNotes('');
        setShowPriceRequestModal(true);
    };

    const handleSubmitPriceRequest = async () => {
        try {
            const token = localStorage.getItem('token');
            await api.post('/api/lab/change-request', {
                request_type: 'PRICE_CHANGE',
                test_id: selectedTestForChange.id,
                new_price: parseFloat(newPrice),
                notes: changeNotes
            }, { headers: { Authorization: `Bearer ${token}` } });
            alert('✅ Price change request submitted');
            setShowPriceRequestModal(false);
        } catch (err) {
            console.error(err);
            alert('❌ Failed to submit request');
        }
    };

    const handleUploadClick = (req) => {
        setSelectedRequest(req);
        setShowModal(true);
    };

    const handleUpload = async (uploadType, resultData) => {
        try {
            const token = localStorage.getItem('token');
            let parsed;

            if (uploadType === 'manual' || uploadType === 'form') {
                 if (uploadType === 'manual') {
                     // Legacy JSON Box 
                      try {
                        parsed = JSON.parse(manualResults);
                        if (typeof parsed !== 'object' || parsed === null) throw new Error('Result must be a JSON object');
                    } catch (jsonError) {
                        setErrorMessage(jsonError instanceof SyntaxError ? 'Invalid JSON Format' : jsonError.message);
                        setShowErrorToast(true);
                        return;
                    }
                 } else {
                     // From LabEntryForm
                     parsed = resultData;
                 }
            } else {
                // AI Parsing via Backend
                if (!selectedFile) {
                    setErrorMessage('Please select a file to process.');
                    setShowErrorToast(true);
                    return;
                }
                 const formData = new FormData();
                 formData.append('file', selectedFile);
                 try {
                     const parserRes = await api.post('/api/lab/parse-result', formData, {
                         headers: { 
                             Authorization: `Bearer ${token}`,
                             'Content-Type': 'multipart/form-data'
                         }
                     });
                     if (parserRes.data && parserRes.data.data) {
                         parsed = parserRes.data.data;
                     } else {
                          throw new Error('Failed to parse document');
                     }
                 } catch (parseErr) {
                     setErrorMessage('AI Parsing Failed. Please try manually or check the image quality.');
                     setShowErrorToast(true);
                     return;
                 }
            }

            await api.post('/api/lab/upload-result', {
                request_id: selectedRequest.id,
                result_json: parsed
            }, { headers: { Authorization: `Bearer ${token}` } });

            alert('✅ Result Uploaded Successfully');
            setShowModal(false);
            setManualResults('');
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            fetchQueue();
            fetchStats();
        } catch (err) {
            console.error(err);
            setErrorMessage('Upload Failed. Server Error.');
            setShowErrorToast(true);
        }
    };

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-muted">Loading laboratory data...</p>
            </Container>
        );
    }

    if (fetchError) {
        return (
            <Container className="py-5 text-center">
                <Upload size={48} className="text-danger mb-3" />
                <h5 className="text-danger">{fetchError}</h5>
                <Button variant="primary" className="mt-3" onClick={() => window.location.reload()}>Retry</Button>
            </Container>
        );
    }

    return (
        <Container className="py-4 position-relative">
            <div className="d-flex justify-content-between align-items-center mb-4">
                 <h3 className="fw-bold mb-0">Laboratory (LIMS)</h3>
                 {/* Fixed: Widget relative to header or container, not screen */}
                 {criticalAlertCount > 0 && (
                     <div style={{ width: 280 }}>
                         <CriticalAlertWidget onAlertCount={setCriticalAlertCount} />
                     </div>
                 )}
            </div>

            {/* Stats Overview */}
            <Row className="mb-4 g-3">
                <Col md={4}><StatsCard title="Pending Requests" value={queue.length} icon={<Clock />} variant="primary" /></Col>
                <Col md={4}><StatsCard title="Completed Today" value={stats.completed_today} icon={<CheckCircle />} variant="success" /></Col>
                <Col md={4}><StatsCard title="Samples Collected" value={stats.samples_collected} icon={<Database />} variant="info" /></Col>
            </Row>

            <Tabs defaultActiveKey="pending" className="mb-3" mountOnEnter={true} unmountOnExit={true}>
                <Tab eventKey="pending" title="Pending Queue">
                    <LabQueueTab 
                        queue={queue} 
                        fetchQueue={fetchQueue} 
                        fetchStats={fetchStats} 
                        onUploadClick={handleUploadClick} 
                    />
                </Tab>

                <Tab eventKey="history" title="Test History" onEnter={fetchHistory}>
                    <LabHistoryTab labHistory={labHistory} fetchHistory={fetchHistory} />
                </Tab>

                <Tab eventKey="packages" title="Wellness Packages" onEnter={fetchPackages}>
                    <Row xs={1} md={2} lg={3} className="g-4">
                        {packages.map(pkg => (
                            <Col key={pkg.id}>
                                <Card className="h-100 shadow-sm border-0">
                                    <Card.Header className="bg-white fw-bold d-flex justify-content-between">
                                        <span>{pkg.name}</span>
                                        <Badge bg="success">₹{pkg.price}</Badge>
                                    </Card.Header>
                                    <Card.Body>
                                        <Card.Text className="text-muted small mb-3">{pkg.description}</Card.Text>
                                        <h6 className="small fw-bold text-uppercase text-secondary">Includes {pkg.tests?.length} Tests:</h6>
                                        <ul className="small ps-3 mb-0 text-muted">
                                            {pkg.tests?.slice(0, 5).map((t, i) => <li key={i}>{t}</li>)}
                                            {pkg.tests?.length > 5 && <li>...and {pkg.tests.length - 5} more</li>}
                                        </ul>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Tab>

                <Tab eventKey="manage" title="Manage Tests" onEnter={fetchAllTests}>
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                            <span className="fw-bold">All Lab Tests</span>
                            <div className="d-flex gap-2">
                                <Form.Control
                                    type="text"
                                    placeholder="Search tests..."
                                    className="w-auto"
                                    value={testManagementSearch}
                                    onChange={e => setTestManagementSearch(e.target.value)}
                                    size="sm"
                                />
                                <Button size="sm" variant="primary" onClick={() => setShowAddTestModal(true)}>+ Add New Test</Button>
                            </div>
                        </Card.Header>
                        <Table hover responsive className="align-middle mb-0">
                            <thead className="bg-light">
                                <tr><th>Test Name</th><th>Category</th><th>Standard Price</th><th>Action</th></tr>
                            </thead>
                            <tbody>
                                {allTests.filter(t => t.name.toLowerCase().includes(testManagementSearch.toLowerCase())).map(t => (
                                    <tr key={t.id}>
                                        <td className="fw-medium">{t.name}</td>
                                        <td>{t.category || '-'}</td>
                                        <td>₹{t.price || 0}</td>
                                        <td><Button size="sm" variant="outline-warning" onClick={() => openPriceRequestModal(t)}>Modify Price</Button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>

                {/* Advanced Tabs */}
                <Tab eventKey="analytics" title={<><BarChart2 size={16} className="me-1" /> Analytics</>}>
                    <Row>
                        <Col md={12}><TATAnalyticsChart /></Col>
                    </Row>
                </Tab>

                <Tab eventKey="inventory" title={<><Package size={16} className="me-1" /> Inventory</>}>
                    <ReagentInventory />
                </Tab>

                <Tab eventKey="qc" title={<><FlaskConical size={16} className="me-1" /> Quality Control</>}>
                    <QCDashboard />
                </Tab>

                <Tab eventKey="revenue" title={<><DollarSign size={16} className="me-1" /> Revenue</>}>
                    <LabRevenueChart />
                </Tab>

                <Tab eventKey="instruments" title={<><Usb size={16} className="me-1" /> Instruments</>}>
                    <InstrumentManager />
                </Tab>

                <Tab eventKey="params" title={<><Settings size={16} className="me-1" /> Test Params</>}>
                    <LabTestParamsAdmin />
                </Tab>

                <Tab eventKey="packages-builder" title={<><Package size={16} className="me-1" /> Package Builder</>}>
                    <LabPackageBuilder />
                </Tab>
                
                 {/* Added back Audit Log Tab */}
                <Tab eventKey="audit" title={<><Activity size={16} className="me-1" /> Audit Log</>}>
                    <LabAuditLog />
                </Tab>
            </Tabs>

            {/* IMPROVED UPLOAD MODAL WITH TABS */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>Upload Result: {selectedRequest?.test_name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Tabs defaultActiveKey="ai" className="mb-3">
                        <Tab eventKey="ai" title={<span><FileText size={16} className="me-2" />AI PDF Parser</span>}>
                            <div className="text-center p-5 border border-dashed rounded bg-light">
                                <FileText size={64} className="text-muted mb-3" />
                                <h5>Drag & Drop PDF Report Here</h5>
                                <p className="text-muted">AI will automatically extract test values</p>
                                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setSelectedFile(e.target.files[0])} />
                                <Button variant="primary" className="mt-3" onClick={() => fileInputRef.current.click()}>
                                    <Upload size={18} className="me-2" /> {selectedFile ? selectedFile.name : 'Browse Files'}
                                </Button>
                            </div>
                            <div className="d-grid gap-2 mt-3">
                                <Button variant="success" onClick={() => handleUpload('ai')}>
                                    <CheckCircle size={16} className="me-1" /> Process with AI
                                </Button>
                            </div>
                        </Tab>

                        <Tab eventKey="manual" title={<span><Activity size={16} className="me-2" />Manual Entry</span>}>
                            <LabEntryForm 
                                selectedRequest={selectedRequest}
                                onSave={(data) => handleUpload('form', data)}
                            />
                        </Tab>

                        <Tab eventKey="instrument" title={<span><Usb size={16} className="me-2" />Receive from Instrument</span>}>
                             {/* Simplified Instrument Tab Body as it was mostly static logic */}
                             <Alert variant="info" className="mb-3">
                                <strong>📡 Auto-Receive:</strong> Fetch results directly from connected lab analyzers.
                            </Alert>
                             <div className="d-flex justify-content-end mb-2">
                                <Button size="sm" variant="outline-primary" onClick={async () => {
                                      try {
                                          const res = await api.get('/instruments');
                                          setConnectedInstruments(Array.isArray(res.data) ? res.data : []);
                                      } catch(e){ console.error(e) }
                                }}>Check Connectivity</Button>
                             </div>
                             <p className="text-muted text-center py-4">
                                 Select an instrument from the <strong>Instruments</strong> tab to configure.
                             </p>
                        </Tab>
                    </Tabs>
                </Modal.Body >
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal >

            {/* Price Request Modal */}
            <Modal show={showPriceRequestModal} onHide={() => setShowPriceRequestModal(false)} centered >
                <Modal.Header closeButton className="bg-warning text-dark">
                    <Modal.Title>Request Price Change</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="info"><small>Changes require Admin approval.</small></Alert>
                    <Form.Group className="mb-3">
                        <Form.Label>Test Name</Form.Label>
                        <Form.Control value={selectedTestForChange?.name || ''} readOnly disabled className="bg-light"/>
                    </Form.Group>
                    <Row>
                        <Col>
                            <Form.Group className="mb-3">
                                <Form.Label>Current Price</Form.Label>
                                <Form.Control value={selectedTestForChange?.price || ''} readOnly disabled className="bg-light"/>
                            </Form.Group>
                        </Col>
                        <Col>
                            <Form.Group className="mb-3">
                                <Form.Label className="fw-bold text-primary">New Price</Form.Label>
                                <Form.Control type="number" value={newPrice} onChange={e => setNewPrice(e.target.value)} autoFocus />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Form.Group className="mb-3">
                        <Form.Label>Reason</Form.Label>
                        <Form.Control as="textarea" rows={2} value={changeNotes} onChange={e => setChangeNotes(e.target.value)} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPriceRequestModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmitPriceRequest}>Submit Request</Button>
                </Modal.Footer>
            </Modal >

            {/* Add New Test Modal */}
            <Modal show={showAddTestModal} onHide={() => setShowAddTestModal(false)}>
                <Modal.Header closeButton className="bg-success text-white">
                    <Modal.Title>Add New Lab Test</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Test Name *</Form.Label>
                            <Form.Control type="text" value={newTestData.name} onChange={e => setNewTestData({ ...newTestData, name: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Category *</Form.Label>
                            <Form.Select value={newTestData.category} onChange={e => setNewTestData({ ...newTestData, category: e.target.value })}>
                                <option value="">Select</option>
                                <option value="Haematology">Haematology</option>
                                <option value="Biochemistry">Biochemistry</option>
                                <option value="Microbiology">Microbiology</option>
                                <option value="Radiology">Radiology</option>
                            </Form.Select>
                        </Form.Group>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Price (₹) *</Form.Label>
                                    <Form.Control type="number" value={newTestData.price} onChange={e => setNewTestData({ ...newTestData, price: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Sample Type</Form.Label>
                                    <Form.Select value={newTestData.sample_type} onChange={e => setNewTestData({ ...newTestData, sample_type: e.target.value })}>
                                        <option value="">Select</option>
                                        <option value="Blood">Blood</option>
                                        <option value="Urine">Urine</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAddTestModal(false)}>Cancel</Button>
                    <Button variant="success" onClick={async () => {
                        try {
                            await api.post('/lab/tests', newTestData);
                            setShowAddTestModal(false);
                            setNewTestData({ name: '', category: '', price: '', sample_type: '' });
                            fetchAllTests();
                        } catch (err) {
                            setErrorMessage('Failed to add test');
                            setShowErrorToast(true);
                        }
                    }} disabled={!newTestData.name || !newTestData.category || !newTestData.price}>Add Test</Button>
                </Modal.Footer>
            </Modal>

            {/* Error Toast */}
            <ToastContainer position="top-end" className="p-3">
                <Toast show={showErrorToast} onClose={() => setShowErrorToast(false)} delay={5000} autohide bg="danger">
                    <Toast.Header><strong className="me-auto">Error</strong></Toast.Header>
                    <Toast.Body className="text-white">{errorMessage}</Toast.Body>
                </Toast>
            </ToastContainer>

            <FloatingAIButton patientContext={selectedRequest} />
        </Container>
    );
};

export default LabDashboard;
