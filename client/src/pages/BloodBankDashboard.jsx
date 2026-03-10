import { useState, useEffect, useCallback } from 'react';
import {
    Container, Row, Col, Card, Table, Button, Form, Modal, Badge, Tab, Tabs,
    Alert, Spinner, InputGroup, ProgressBar
} from 'react-bootstrap';
import {
    Droplet, Users, Package, AlertTriangle, Plus, Search, Calendar,
    CheckCircle, XCircle, Activity, RefreshCw, Filter, Thermometer,
    Heart, TrendingUp, Clock
} from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';

// Blood Group Colors
const bloodGroupColors = {
    'A+': '#dc3545', 'A-': '#c82333',
    'B+': '#28a745', 'B-': '#218838',
    'O+': '#007bff', 'O-': '#0056b3',
    'AB+': '#6f42c1', 'AB-': '#5a32a3'
};

export default function BloodBankDashboard() {
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({});
    const [donors, setDonors] = useState([]);
    const [units, setUnits] = useState([]);
    const [requests, setRequests] = useState([]);
    const [componentTypes, setComponentTypes] = useState([]);
    
    // Modals
    const [showDonorModal, setShowDonorModal] = useState(false);
    const [showCollectModal, setShowCollectModal] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);
    
    // Forms
    const [donorForm, setDonorForm] = useState({
        name: '', phone: '', blood_group: '', gender: '', date_of_birth: '',
        address: '', city: '', weight: '', hemoglobin: '', is_voluntary: true
    });
    const [collectForm, setCollectForm] = useState({
        donor_id: '', blood_group: '', component_type_id: 1, volume_ml: 450,
        collection_date: new Date().toISOString().split('T')[0]
    });
    
    // Filters
    const [donorFilter, setDonorFilter] = useState({ blood_group: '', search: '' });
    const [unitFilter, setUnitFilter] = useState({ status: 'Available', blood_group: '' });

    // Fetch dashboard stats
    const fetchStats = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/blood-bank/dashboard');
            setStats(res.data.data || res.data);
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    }, []);

    // Fetch donors
    const fetchDonors = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (donorFilter.blood_group) params.append('blood_group', donorFilter.blood_group);
            if (donorFilter.search) params.append('search', donorFilter.search);
            
            const res = await axiosInstance.get(`/blood-bank/donors?${params}`);
            const data = res.data.data || res.data;
            setDonors(data.donors || []);
        } catch (err) {
            console.error('Failed to fetch donors:', err);
        }
    }, [donorFilter]);

    // Fetch blood units
    const fetchUnits = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (unitFilter.status) params.append('status', unitFilter.status);
            if (unitFilter.blood_group) params.append('blood_group', unitFilter.blood_group);
            
            const res = await axiosInstance.get(`/blood-bank/units?${params}`);
            const data = res.data.data || res.data;
            setUnits(data.units || []);
        } catch (err) {
            console.error('Failed to fetch units:', err);
        }
    }, [unitFilter]);

    // Fetch pending requests
    const fetchRequests = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/blood-bank/requests');
            const data = res.data.data || res.data;
            setRequests(data.requests || []);
        } catch (err) {
            console.error('Failed to fetch requests:', err);
        }
    }, []);

    // Fetch component types
    const fetchComponentTypes = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/blood-bank/component-types');
            const data = res.data.data || res.data;
            setComponentTypes(data.componentTypes || []);
        } catch (err) {
            console.error('Failed to fetch component types:', err);
        }
    }, []);

    // Initial load
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([
                fetchStats(),
                fetchDonors(),
                fetchUnits(),
                fetchRequests(),
                fetchComponentTypes()
            ]);
            setLoading(false);
        };
        loadData();
    }, [fetchStats, fetchDonors, fetchUnits, fetchRequests, fetchComponentTypes]);

    // Register donor
    const handleRegisterDonor = async (e) => {
        e.preventDefault();
        try {
            await axiosInstance.post('/blood-bank/donors', donorForm);
            setShowDonorModal(false);
            setDonorForm({
                name: '', phone: '', blood_group: '', gender: '', date_of_birth: '',
                address: '', city: '', weight: '', hemoglobin: '', is_voluntary: true
            });
            fetchDonors();
            fetchStats();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to register donor');
        }
    };

    // Collect blood
    const handleCollectBlood = async (e) => {
        e.preventDefault();
        try {
            await axiosInstance.post('/blood-bank/units', collectForm);
            setShowCollectModal(false);
            setCollectForm({
                donor_id: '', blood_group: '', component_type_id: 1, volume_ml: 450,
                collection_date: new Date().toISOString().split('T')[0]
            });
            fetchUnits();
            fetchStats();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to add blood unit');
        }
    };

    // Process request (approve/reject)
    const handleProcessRequest = async (id, action, reason = '') => {
        try {
            await axiosInstance.put(`/blood-bank/requests/${id}/process`, { action, rejection_reason: reason });
            fetchRequests();
            fetchStats();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to process request');
        }
    };

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="danger" />
                <p className="mt-3">Loading Blood Bank...</p>
            </Container>
        );
    }

    return (
        <Container fluid className="py-4">
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex align-items-center justify-content-between">
                        <div>
                            <h2 className="mb-1">
                                <Droplet className="me-2 text-danger" size={28} />
                                Blood Bank Management
                            </h2>
                            <p className="text-muted mb-0">Donor registration, inventory & transfusion services</p>
                        </div>
                        <div className="d-flex gap-2">
                            <Button variant="outline-danger" onClick={() => setShowDonorModal(true)}>
                                <Users size={16} className="me-1" /> New Donor
                            </Button>
                            <Button variant="danger" onClick={() => setShowCollectModal(true)}>
                                <Plus size={16} className="me-1" /> Collect Blood
                            </Button>
                        </div>
                    </div>
                </Col>
            </Row>

            {/* Stats Cards */}
            <Row className="mb-4 g-3">
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-danger text-white">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="mb-1 opacity-75">Total Available</h6>
                                    <h2 className="mb-0">{stats.inventory?.reduce((sum, i) => sum + parseInt(i.units), 0) || 0}</h2>
                                </div>
                                <Droplet size={40} className="opacity-25" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="mb-1 text-muted">Pending Requests</h6>
                                    <h2 className="mb-0 text-warning">{stats.pendingRequests || 0}</h2>
                                </div>
                                <Clock size={40} className="text-warning opacity-25" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="mb-1 text-muted">Expiring Soon</h6>
                                    <h2 className="mb-0 text-danger">{stats.expiringSoon || 0}</h2>
                                </div>
                                <AlertTriangle size={40} className="text-danger opacity-25" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm">
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <h6 className="mb-1 text-muted">Registered Donors</h6>
                                    <h2 className="mb-0 text-success">{stats.totalDonors || 0}</h2>
                                </div>
                                <Users size={40} className="text-success opacity-25" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Blood Group Inventory Visual */}
            <Row className="mb-4">
                <Col>
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white">
                            <h5 className="mb-0"><Package size={18} className="me-2" />Blood Stock by Group</h5>
                        </Card.Header>
                        <Card.Body>
                            <Row className="g-3">
                                {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(group => {
                                    const count = stats.inventory?.find(i => i.blood_group === group)?.units || 0;
                                    const maxUnits = 50;
                                    const percentage = Math.min((count / maxUnits) * 100, 100);
                                    return (
                                        <Col md={3} key={group}>
                                            <Card 
                                                className="text-center border-0" 
                                                style={{ 
                                                    backgroundColor: `${bloodGroupColors[group]}15`,
                                                    borderLeft: `4px solid ${bloodGroupColors[group]}` 
                                                }}
                                            >
                                                <Card.Body className="py-3">
                                                    <h3 className="mb-1" style={{ color: bloodGroupColors[group] }}>{group}</h3>
                                                    <h4 className="mb-2">{count} units</h4>
                                                    <ProgressBar 
                                                        now={percentage} 
                                                        variant={percentage < 20 ? 'danger' : percentage < 50 ? 'warning' : 'success'}
                                                        style={{ height: '8px' }}
                                                    />
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    );
                                })}
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Tabs */}
            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-4">
                <Tab eventKey="overview" title={<><Activity size={16} className="me-1" /> Overview</>}>
                    <Row className="g-4">
                        {/* Pending Requests */}
                        <Col md={6}>
                            <Card className="border-0 shadow-sm h-100">
                                <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                                    <h5 className="mb-0"><Clock size={18} className="me-2" />Pending Requests</h5>
                                    <Badge bg="warning">{requests.length}</Badge>
                                </Card.Header>
                                <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    {requests.length === 0 ? (
                                        <Alert variant="success" className="mb-0">
                                            <CheckCircle size={16} className="me-2" />No pending requests
                                        </Alert>
                                    ) : (
                                        <Table hover size="sm">
                                            <thead>
                                                <tr>
                                                    <th>Patient</th>
                                                    <th>Blood</th>
                                                    <th>Units</th>
                                                    <th>Priority</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {requests.map(req => (
                                                    <tr key={req.id}>
                                                        <td>{req.patient_name}</td>
                                                        <td>
                                                            <Badge bg="danger">{req.blood_group_required}</Badge>
                                                        </td>
                                                        <td>{req.units_required}</td>
                                                        <td>
                                                            <Badge bg={
                                                                req.priority === 'Emergency' ? 'danger' :
                                                                req.priority === 'Urgent' ? 'warning' : 'secondary'
                                                            }>{req.priority}</Badge>
                                                        </td>
                                                        <td>
                                                            <Button 
                                                                size="sm" 
                                                                variant="success" 
                                                                className="me-1"
                                                                onClick={() => handleProcessRequest(req.id, 'approve')}
                                                            >
                                                                <CheckCircle size={12} />
                                                            </Button>
                                                            <Button 
                                                                size="sm" 
                                                                variant="danger"
                                                                onClick={() => handleProcessRequest(req.id, 'reject', 'Insufficient stock')}
                                                            >
                                                                <XCircle size={12} />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Today's Activity */}
                        <Col md={6}>
                            <Card className="border-0 shadow-sm h-100">
                                <Card.Header className="bg-white">
                                    <h5 className="mb-0"><TrendingUp size={18} className="me-2" />Today's Activity</h5>
                                </Card.Header>
                                <Card.Body>
                                    <Row className="g-3">
                                        <Col md={6}>
                                            <div className="p-3 bg-light rounded text-center">
                                                <h4 className="text-success mb-1">{stats.todayCollections || 0}</h4>
                                                <small className="text-muted">Units Collected</small>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="p-3 bg-light rounded text-center">
                                                <h4 className="text-primary mb-1">{stats.issuedToday || 0}</h4>
                                                <small className="text-muted">Units Issued</small>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="p-3 bg-light rounded text-center">
                                                <h4 className="text-info mb-1">{stats.eligibleDonors || 0}</h4>
                                                <small className="text-muted">Eligible Donors</small>
                                            </div>
                                        </Col>
                                        <Col md={6}>
                                            <div className="p-3 bg-light rounded text-center">
                                                <h4 className="text-danger mb-1">{stats.expiringSoon || 0}</h4>
                                                <small className="text-muted">Expiring (7 days)</small>
                                            </div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Tab>

                <Tab eventKey="donors" title={<><Users size={16} className="me-1" /> Donors</>}>
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white">
                            <Row className="align-items-center">
                                <Col md={4}>
                                    <InputGroup>
                                        <InputGroup.Text><Search size={16} /></InputGroup.Text>
                                        <Form.Control 
                                            placeholder="Search donors..."
                                            value={donorFilter.search}
                                            onChange={(e) => setDonorFilter({...donorFilter, search: e.target.value})}
                                            onKeyUp={(e) => e.key === 'Enter' && fetchDonors()}
                                        />
                                    </InputGroup>
                                </Col>
                                <Col md={3}>
                                    <Form.Select 
                                        value={donorFilter.blood_group}
                                        onChange={(e) => { setDonorFilter({...donorFilter, blood_group: e.target.value}); }}
                                    >
                                        <option value="">All Blood Groups</option>
                                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </Form.Select>
                                </Col>
                                <Col md={2}>
                                    <Button variant="outline-secondary" onClick={fetchDonors}>
                                        <RefreshCw size={16} className="me-1" /> Refresh
                                    </Button>
                                </Col>
                            </Row>
                        </Card.Header>
                        <Card.Body>
                            <Table hover responsive>
                                <thead>
                                    <tr>
                                        <th>Donor ID</th>
                                        <th>Name</th>
                                        <th>Phone</th>
                                        <th>Blood Group</th>
                                        <th>Last Donation</th>
                                        <th>Total</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {donors.map(d => (
                                        <tr key={d.id}>
                                            <td><code>{d.donor_id}</code></td>
                                            <td>{d.name}</td>
                                            <td>{d.phone}</td>
                                            <td><Badge bg="danger">{d.blood_group}</Badge></td>
                                            <td>{d.last_donation_date ? new Date(d.last_donation_date).toLocaleDateString() : '-'}</td>
                                            <td>{d.total_donations || 0}</td>
                                            <td>
                                                <Badge bg={d.is_eligible ? 'success' : 'secondary'}>
                                                    {d.is_eligible ? 'Eligible' : 'Deferred'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>

                <Tab eventKey="inventory" title={<><Package size={16} className="me-1" /> Inventory</>}>
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white">
                            <Row className="align-items-center">
                                <Col md={3}>
                                    <Form.Select 
                                        value={unitFilter.status}
                                        onChange={(e) => setUnitFilter({...unitFilter, status: e.target.value})}
                                    >
                                        <option value="Available">Available</option>
                                        <option value="Quarantine">Quarantine</option>
                                        <option value="Reserved">Reserved</option>
                                        <option value="Issued">Issued</option>
                                        <option value="Expired">Expired</option>
                                    </Form.Select>
                                </Col>
                                <Col md={3}>
                                    <Form.Select 
                                        value={unitFilter.blood_group}
                                        onChange={(e) => setUnitFilter({...unitFilter, blood_group: e.target.value})}
                                    >
                                        <option value="">All Blood Groups</option>
                                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </Form.Select>
                                </Col>
                                <Col md={2}>
                                    <Button variant="outline-secondary" onClick={fetchUnits}>
                                        <Filter size={16} className="me-1" /> Apply
                                    </Button>
                                </Col>
                            </Row>
                        </Card.Header>
                        <Card.Body>
                            <Table hover responsive>
                                <thead>
                                    <tr>
                                        <th>Unit ID</th>
                                        <th>Blood Group</th>
                                        <th>Component</th>
                                        <th>Volume</th>
                                        <th>Collection Date</th>
                                        <th>Expiry Date</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {units.map(u => {
                                        const daysToExpiry = Math.ceil((new Date(u.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                                        return (
                                            <tr key={u.id}>
                                                <td><code>{u.unit_id}</code></td>
                                                <td><Badge bg="danger">{u.blood_group}</Badge></td>
                                                <td>{u.component_name || 'Whole Blood'}</td>
                                                <td>{u.volume_ml} ml</td>
                                                <td>{new Date(u.collection_date).toLocaleDateString()}</td>
                                                <td>
                                                    {new Date(u.expiry_date).toLocaleDateString()}
                                                    {daysToExpiry <= 7 && daysToExpiry > 0 && (
                                                        <Badge bg="warning" className="ms-2">{daysToExpiry}d</Badge>
                                                    )}
                                                    {daysToExpiry <= 0 && (
                                                        <Badge bg="danger" className="ms-2">Expired</Badge>
                                                    )}
                                                </td>
                                                <td>
                                                    <Badge bg={
                                                        u.status === 'Available' ? 'success' :
                                                        u.status === 'Quarantine' ? 'warning' :
                                                        u.status === 'Issued' ? 'info' : 'secondary'
                                                    }>{u.status}</Badge>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>

                <Tab eventKey="requests" title={<><Heart size={16} className="me-1" /> Requests</>}>
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Blood Requests</h5>
                            <Button variant="danger" onClick={() => setShowRequestModal(true)}>
                                <Plus size={16} className="me-1" /> New Request
                            </Button>
                        </Card.Header>
                        <Card.Body>
                            <Table hover responsive>
                                <thead>
                                    <tr>
                                        <th>Request ID</th>
                                        <th>Patient</th>
                                        <th>Blood Group</th>
                                        <th>Component</th>
                                        <th>Units</th>
                                        <th>Department</th>
                                        <th>Priority</th>
                                        <th>Status</th>
                                        <th>Requested</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {requests.map(r => (
                                        <tr key={r.id}>
                                            <td><code>{r.request_id}</code></td>
                                            <td>{r.patient_name}</td>
                                            <td><Badge bg="danger">{r.blood_group_required}</Badge></td>
                                            <td>{r.component_name || 'PRBC'}</td>
                                            <td>{r.units_issued}/{r.units_required}</td>
                                            <td>{r.department}</td>
                                            <td>
                                                <Badge bg={
                                                    r.priority === 'Emergency' ? 'danger' :
                                                    r.priority === 'Urgent' ? 'warning' : 'secondary'
                                                }>{r.priority}</Badge>
                                            </td>
                                            <td>
                                                <Badge bg={
                                                    r.status === 'Pending' ? 'warning' :
                                                    r.status === 'Approved' ? 'info' :
                                                    r.status === 'Completed' ? 'success' : 'secondary'
                                                }>{r.status}</Badge>
                                            </td>
                                            <td>{new Date(r.created_at).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>

            {/* Register Donor Modal */}
            <Modal show={showDonorModal} onHide={() => setShowDonorModal(false)} size="lg">
                <Modal.Header closeButton className="bg-danger text-white">
                    <Modal.Title><Users size={20} className="me-2" />Register New Donor</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleRegisterDonor}>
                    <Modal.Body>
                        <Row className="g-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Full Name *</Form.Label>
                                    <Form.Control 
                                        required 
                                        value={donorForm.name}
                                        onChange={(e) => setDonorForm({...donorForm, name: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Phone *</Form.Label>
                                    <Form.Control 
                                        required 
                                        value={donorForm.phone}
                                        onChange={(e) => setDonorForm({...donorForm, phone: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Blood Group *</Form.Label>
                                    <Form.Select 
                                        required
                                        value={donorForm.blood_group}
                                        onChange={(e) => setDonorForm({...donorForm, blood_group: e.target.value})}
                                    >
                                        <option value="">Select</option>
                                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Gender</Form.Label>
                                    <Form.Select 
                                        value={donorForm.gender}
                                        onChange={(e) => setDonorForm({...donorForm, gender: e.target.value})}
                                    >
                                        <option value="">Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Date of Birth</Form.Label>
                                    <Form.Control 
                                        type="date"
                                        value={donorForm.date_of_birth}
                                        onChange={(e) => setDonorForm({...donorForm, date_of_birth: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Weight (kg)</Form.Label>
                                    <Form.Control 
                                        type="number"
                                        value={donorForm.weight}
                                        onChange={(e) => setDonorForm({...donorForm, weight: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>Hemoglobin (g/dL)</Form.Label>
                                    <Form.Control 
                                        type="number" 
                                        step="0.1"
                                        value={donorForm.hemoglobin}
                                        onChange={(e) => setDonorForm({...donorForm, hemoglobin: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label>City</Form.Label>
                                    <Form.Control 
                                        value={donorForm.city}
                                        onChange={(e) => setDonorForm({...donorForm, city: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label>Address</Form.Label>
                                    <Form.Control 
                                        as="textarea" 
                                        rows={2}
                                        value={donorForm.address}
                                        onChange={(e) => setDonorForm({...donorForm, address: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowDonorModal(false)}>Cancel</Button>
                        <Button variant="danger" type="submit">Register Donor</Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Collect Blood Modal */}
            <Modal show={showCollectModal} onHide={() => setShowCollectModal(false)}>
                <Modal.Header closeButton className="bg-danger text-white">
                    <Modal.Title><Droplet size={20} className="me-2" />Collect Blood</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleCollectBlood}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Donor</Form.Label>
                            <Form.Select 
                                value={collectForm.donor_id}
                                onChange={(e) => {
                                    const donor = donors.find(d => d.id === parseInt(e.target.value));
                                    setCollectForm({
                                        ...collectForm, 
                                        donor_id: e.target.value,
                                        blood_group: donor?.blood_group || ''
                                    });
                                }}
                            >
                                <option value="">Select Donor</option>
                                {donors.filter(d => d.is_eligible).map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.name} - {d.blood_group} ({d.phone})
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Row className="g-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Blood Group *</Form.Label>
                                    <Form.Select 
                                        required
                                        value={collectForm.blood_group}
                                        onChange={(e) => setCollectForm({...collectForm, blood_group: e.target.value})}
                                    >
                                        <option value="">Select</option>
                                        {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Component Type</Form.Label>
                                    <Form.Select 
                                        value={collectForm.component_type_id}
                                        onChange={(e) => setCollectForm({...collectForm, component_type_id: e.target.value})}
                                    >
                                        {componentTypes.map(c => (
                                            <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Volume (ml)</Form.Label>
                                    <Form.Control 
                                        type="number"
                                        value={collectForm.volume_ml}
                                        onChange={(e) => setCollectForm({...collectForm, volume_ml: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Collection Date</Form.Label>
                                    <Form.Control 
                                        type="date"
                                        value={collectForm.collection_date}
                                        onChange={(e) => setCollectForm({...collectForm, collection_date: e.target.value})}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowCollectModal(false)}>Cancel</Button>
                        <Button variant="danger" type="submit">Add Blood Unit</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
}
