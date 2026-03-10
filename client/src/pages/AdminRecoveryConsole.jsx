import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Table, Button, Badge, Form, InputGroup, Modal, Alert, Spinner, Tabs, Tab, ProgressBar } from 'react-bootstrap';
import { Search, Plus, Edit2, Trash2, RotateCcw, Download, Eye, History, Shield, AlertTriangle, Users, Activity, IndianRupee, TrendingUp, TrendingDown, CreditCard, Building, Clock, FileText, PieChart } from 'lucide-react';
import axios from 'axios';

const AdminRecoveryConsole = () => {
    const [patients, setPatients] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [includeDeleted, setIncludeDeleted] = useState(true);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('view'); // view, edit, add, delete, restore
    const [reason, setReason] = useState('');
    const [message, setMessage] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [formData, setFormData] = useState({
        name: '', phone: '', dob: '', gender: '', address: '', blood_group: '', emergency_contact: ''
    });

    // Manual Entry State
    const [manualEntries, setManualEntries] = useState({ invoices: [], payments: [], summary: {} });
    const [patientSearchResults, setPatientSearchResults] = useState([]);
    const [invoiceForm, setInvoiceForm] = useState({
        patient_id: '', patient_name: '', invoice_date: '', status: 'Pending', notes: '', reason: ''
    });
    const [invoiceItems, setInvoiceItems] = useState([{ description: '', quantity: 1, unit_price: '' }]);
    const [paymentForm, setPaymentForm] = useState({
        patient_id: '', patient_name: '', invoice_id: '', amount: '', payment_date: '', payment_mode: 'Cash', notes: '', reason: ''
    });
    const [entrySubmitting, setEntrySubmitting] = useState(false);

    // Calculate invoice total from items
    const invoiceTotal = invoiceItems.reduce((sum, item) => sum + (parseFloat(item.unit_price || 0) * parseInt(item.quantity || 1)), 0);

    // Add new invoice item row
    const addInvoiceItem = () => {
        setInvoiceItems([...invoiceItems, { description: '', quantity: 1, unit_price: '' }]);
    };

    // Remove invoice item row
    const removeInvoiceItem = (index) => {
        if (invoiceItems.length > 1) {
            setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
        }
    };

    // Update invoice item
    const updateInvoiceItem = (index, field, value) => {
        const updated = [...invoiceItems];
        updated[index][field] = value;
        setInvoiceItems(updated);
    };

    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    useEffect(() => {
        fetchStats();
        fetchPatients();
        fetchAuditLogs();
        fetchManualEntries();
    }, [includeDeleted]);

    const fetchStats = async () => {
        try {
            const res = await axios.get('/api/admin/recovery/stats', config);
            setStats(res.data.data || res.data);
        } catch (err) {
            console.error('Stats error:', err);
        }
    };

    const fetchPatients = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/admin/recovery/patients?includeDeleted=${includeDeleted}&search=${search}`, config);
            setPatients(res.data.data?.patients || res.data.patients || []);
        } catch (err) {
            setMessage({ type: 'danger', text: 'Failed to load patients' });
        } finally {
            setLoading(false);
        }
    };

    const fetchAuditLogs = async () => {
        try {
            const res = await axios.get('/api/admin/recovery/audit-logs?limit=50', config);
            setAuditLogs(res.data.data || res.data || []);
        } catch (err) {
            console.error('Audit logs error:', err);
        }
    };

    const fetchManualEntries = async () => {
        try {
            const res = await axios.get('/api/admin/recovery/manual/entries?days=30', config);
            setManualEntries(res.data.data || res.data);
        } catch (err) {
            console.error('Manual entries error:', err);
        }
    };

    const searchPatientsForEntry = async (q) => {
        if (q.length < 2) { setPatientSearchResults([]); return; }
        try {
            const res = await axios.get(`/api/admin/recovery/manual/search-patients?q=${q}`, config);
            setPatientSearchResults(res.data.data || res.data || []);
        } catch (err) {
            setPatientSearchResults([]);
        }
    };

    const handleInvoiceSubmit = async (e) => {
        e.preventDefault();
        setEntrySubmitting(true);
        try {
            // Prepare items for submission
            const formattedItems = invoiceItems
                .filter(item => item.description && item.unit_price)
                .map(item => ({
                    description: item.description,
                    quantity: parseInt(item.quantity) || 1,
                    unit_price: parseFloat(item.unit_price),
                    total_price: (parseInt(item.quantity) || 1) * parseFloat(item.unit_price)
                }));
            
            await axios.post('/api/admin/recovery/manual/invoice', {
                ...invoiceForm,
                total_amount: invoiceTotal,
                items: formattedItems
            }, config);
            setMessage({ type: 'success', text: '✅ Manual invoice created successfully' });
            setInvoiceForm({ patient_id: '', patient_name: '', invoice_date: '', status: 'Pending', notes: '', reason: '' });
            setInvoiceItems([{ description: '', quantity: 1, unit_price: '' }]);
            fetchManualEntries();
            fetchStats();
        } catch (err) {
            setMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to create invoice' });
        } finally {
            setEntrySubmitting(false);
        }
    };

    const handlePaymentSubmit = async (e) => {
        e.preventDefault();
        setEntrySubmitting(true);
        try {
            await axios.post('/api/admin/recovery/manual/payment', paymentForm, config);
            setMessage({ type: 'success', text: '✅ Manual payment recorded successfully' });
            setPaymentForm({ patient_id: '', patient_name: '', invoice_id: '', amount: '', payment_date: '', payment_mode: 'Cash', notes: '', reason: '' });
            fetchManualEntries();
            fetchStats();
        } catch (err) {
            setMessage({ type: 'danger', text: err.response?.data?.message || 'Failed to record payment' });
        } finally {
            setEntrySubmitting(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetchPatients();
    };

    const openModal = (mode, patient = null) => {
        setModalMode(mode);
        setSelectedPatient(patient);
        setReason('');
        if (mode === 'edit' && patient) {
            setFormData({
                name: patient.name || '',
                phone: patient.phone || '',
                dob: patient.dob?.split('T')[0] || '',
                gender: patient.gender || '',
                address: patient.address || '',
                blood_group: patient.blood_group || '',
                emergency_contact: patient.emergency_contact || ''
            });
        } else if (mode === 'add') {
            setFormData({ name: '', phone: '', dob: '', gender: '', address: '', blood_group: '', emergency_contact: '' });
        }
        setShowModal(true);
    };

    const handleSubmit = async () => {
        setProcessing(true);
        setMessage(null);
        try {
            if (modalMode === 'add') {
                await axios.post('/api/admin/recovery/patients', formData, config);
                setMessage({ type: 'success', text: '✅ Patient created successfully' });
            } else if (modalMode === 'edit') {
                await axios.put(`/api/admin/recovery/patients/${selectedPatient.id}`, { ...formData, reason }, config);
                setMessage({ type: 'success', text: '✅ Patient updated successfully' });
            } else if (modalMode === 'delete') {
                if (!reason) {
                    setMessage({ type: 'warning', text: 'Reason is required for deletion (legal compliance)' });
                    setProcessing(false);
                    return;
                }
                await axios.delete(`/api/admin/recovery/patients/${selectedPatient.id}`, { ...config, data: { reason } });
                setMessage({ type: 'success', text: '✅ Patient soft-deleted successfully' });
            } else if (modalMode === 'restore') {
                if (!reason) {
                    setMessage({ type: 'warning', text: 'Reason is required for restoration (legal compliance)' });
                    setProcessing(false);
                    return;
                }
                await axios.post(`/api/admin/recovery/patients/${selectedPatient.id}/restore`, { reason }, config);
                setMessage({ type: 'success', text: '✅ Patient restored successfully' });
            }
            setShowModal(false);
            fetchPatients();
            fetchStats();
            fetchAuditLogs();
        } catch (err) {
            setMessage({ type: 'danger', text: err.response?.data?.message || 'Operation failed' });
        } finally {
            setProcessing(false);
        }
    };

    const handleExport = async (patientId) => {
        try {
            const res = await axios.get(`/api/admin/recovery/patients/${patientId}/export`, config);
            const data = res.data.data || res.data;
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `patient_${patientId}_export.json`;
            a.click();
            setMessage({ type: 'success', text: '✅ Patient data exported (Right to Access)' });
        } catch (err) {
            setMessage({ type: 'danger', text: 'Export failed' });
        }
    };

    return (
        <Container fluid className="py-4">
            <div className="d-flex align-items-center justify-content-between mb-4">
                <div>
                    <h2 className="mb-1 d-flex align-items-center gap-2">
                        <Shield className="text-danger" size={28} />
                        Admin Recovery Console
                    </h2>
                    <p className="text-muted mb-0">DPDP Act 2023 Compliant Patient Data Management</p>
                </div>
                <Button variant="primary" onClick={() => openModal('add')}>
                    <Plus size={18} className="me-2" /> Add Patient
                </Button>
            </div>

            {message && (
                <Alert variant={message.type} dismissible onClose={() => setMessage(null)} className="mb-4">
                    {message.text}
                </Alert>
            )}

            {/* Enhanced Stats Cards with Financial Overview */}
            {stats && (
                <>
                    {/* Patient/Admin Stats Row */}
                    <Row className="g-3 mb-3">
                        <Col md={2}>
                            <Card className="border-0 shadow-sm text-center h-100">
                                <Card.Body>
                                    <Users className="text-primary mb-2" size={24} />
                                    <h3 className="mb-0">{stats.active_patients || 0}</h3>
                                    <small className="text-muted">Active Patients</small>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={2}>
                            <Card className="border-0 shadow-sm text-center h-100 bg-warning bg-opacity-10">
                                <Card.Body>
                                    <Trash2 className="text-warning mb-2" size={24} />
                                    <h3 className="mb-0">{stats.deleted_patients || 0}</h3>
                                    <small className="text-muted">Deleted (Soft)</small>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={2}>
                            <Card className="border-0 shadow-sm text-center h-100">
                                <Card.Body>
                                    <Activity className="text-success mb-2" size={24} />
                                    <h3 className="mb-0">{stats.current_admissions || 0}</h3>
                                    <small className="text-muted">Admissions</small>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="border-0 shadow-sm text-center h-100 bg-danger bg-opacity-10">
                                <Card.Body>
                                    <AlertTriangle className="text-danger mb-2" size={24} />
                                    <h3 className="mb-0">₹{(stats.financial?.outstanding?.total || 0).toLocaleString('en-IN')}</h3>
                                    <small className="text-muted">Outstanding ({stats.financial?.outstanding?.count || 0} invoices)</small>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="border-0 shadow-sm text-center h-100 bg-info bg-opacity-10">
                                <Card.Body>
                                    <History className="text-info mb-2" size={24} />
                                    <h3 className="mb-0">{stats.actions_today || 0}</h3>
                                    <small className="text-muted">Actions Today</small>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Financial Overview Row */}
                    {stats.financial && (
                        <Row className="g-3 mb-4">
                            {/* Revenue Card */}
                            <Col md={4}>
                                <Card className="border-0 shadow-sm h-100 bg-success bg-opacity-10">
                                    <Card.Body>
                                        <div className="d-flex align-items-center mb-3">
                                            <TrendingUp className="text-success me-2" size={24} />
                                            <h5 className="mb-0">Revenue</h5>
                                        </div>
                                        <div className="mb-3">
                                            <h2 className="mb-0 text-success">₹{stats.financial.revenue.today.toLocaleString('en-IN')}</h2>
                                            <small className="text-muted">Today</small>
                                        </div>
                                        <Row className="text-center border-top pt-2">
                                            <Col xs={4}>
                                                <small className="text-muted d-block">Week</small>
                                                <strong>₹{(stats.financial.revenue.week / 1000).toFixed(1)}K</strong>
                                            </Col>
                                            <Col xs={4}>
                                                <small className="text-muted d-block">Month</small>
                                                <strong>₹{(stats.financial.revenue.month / 100000).toFixed(2)}L</strong>
                                            </Col>
                                            <Col xs={4}>
                                                <small className="text-muted d-block">Year</small>
                                                <strong>₹{(stats.financial.revenue.year / 100000).toFixed(2)}L</strong>
                                            </Col>
                                        </Row>
                                    </Card.Body>
                                </Card>
                            </Col>

                            {/* Outstanding/Overdue Card */}
                            <Col md={4}>
                                <Card className="border-0 shadow-sm h-100">
                                    <Card.Body>
                                        <div className="d-flex align-items-center mb-3">
                                            <Clock className="text-danger me-2" size={24} />
                                            <h5 className="mb-0">Outstanding</h5>
                                        </div>
                                        <div className="mb-3">
                                            <h2 className="mb-0 text-danger">₹{stats.financial.outstanding.total.toLocaleString('en-IN')}</h2>
                                            <small className="text-muted">{stats.financial.outstanding.count} pending invoices</small>
                                        </div>
                                        <div>
                                            <div className="d-flex justify-content-between text-muted small">
                                                <span>30+ days</span>
                                                <span>₹{stats.financial.outstanding.overdue_30.toLocaleString('en-IN')}</span>
                                            </div>
                                            <ProgressBar variant="warning" now={stats.financial.outstanding.overdue_30 / (stats.financial.outstanding.total || 1) * 100} className="mb-1" style={{height: '4px'}} />
                                            <div className="d-flex justify-content-between text-muted small">
                                                <span>60+ days</span>
                                                <span>₹{stats.financial.outstanding.overdue_60.toLocaleString('en-IN')}</span>
                                            </div>
                                            <ProgressBar variant="orange" now={stats.financial.outstanding.overdue_60 / (stats.financial.outstanding.total || 1) * 100} className="mb-1" style={{height: '4px'}} />
                                            <div className="d-flex justify-content-between text-muted small">
                                                <span>90+ days</span>
                                                <span>₹{stats.financial.outstanding.overdue_90.toLocaleString('en-IN')}</span>
                                            </div>
                                            <ProgressBar variant="danger" now={stats.financial.outstanding.overdue_90 / (stats.financial.outstanding.total || 1) * 100} style={{height: '4px'}} />
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>

                            {/* Refunds & Payment Methods */}
                            <Col md={4}>
                                <Card className="border-0 shadow-sm h-100">
                                    <Card.Body>
                                        <div className="d-flex align-items-center mb-3">
                                            <PieChart className="text-primary me-2" size={24} />
                                            <h5 className="mb-0">Payment Breakdown</h5>
                                        </div>
                                        {stats.financial.payment_breakdown?.length > 0 ? (
                                            <div>
                                                {stats.financial.payment_breakdown.slice(0, 4).map((pm, idx) => (
                                                    <div key={idx} className="d-flex justify-content-between align-items-center mb-2">
                                                        <span className="d-flex align-items-center">
                                                            <CreditCard size={14} className="me-2 text-muted" />
                                                            {pm.method}
                                                        </span>
                                                        <Badge bg="light" text="dark">₹{pm.total.toLocaleString('en-IN')}</Badge>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-muted mb-0">No payments this month</p>
                                        )}
                                        <hr />
                                        <div className="d-flex justify-content-between align-items-center text-danger">
                                            <span className="d-flex align-items-center">
                                                <TrendingDown size={14} className="me-2" />
                                                Refunds (month)
                                            </span>
                                            <strong>₹{stats.financial.refunds.month.toLocaleString('en-IN')}</strong>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        </Row>
                    )}
                </>
            )}

            <Tabs defaultActiveKey="patients" className="mb-4">
                <Tab eventKey="patients" title="👥 Patient Registry">
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white py-3">
                            <Form onSubmit={handleSearch} className="d-flex gap-3 align-items-center">
                                <InputGroup style={{ maxWidth: '400px' }}>
                                    <InputGroup.Text><Search size={18} /></InputGroup.Text>
                                    <Form.Control
                                        placeholder="Search by name, UHID, or phone..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                    />
                                </InputGroup>
                                <Form.Check
                                    type="switch"
                                    id="include-deleted"
                                    label="Show Deleted"
                                    checked={includeDeleted}
                                    onChange={(e) => setIncludeDeleted(e.target.checked)}
                                />
                                <Button type="submit" variant="outline-primary">Search</Button>
                            </Form>
                        </Card.Header>
                        <Card.Body className="p-0">
                            {loading ? (
                                <div className="text-center py-5">
                                    <Spinner animation="border" variant="primary" />
                                </div>
                            ) : (
                                <Table hover responsive className="mb-0">
                                    <thead className="bg-light">
                                        <tr>
                                            <th>UHID</th>
                                            <th>Name</th>
                                            <th>Phone</th>
                                            <th>Gender</th>
                                            <th>Status</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {patients.map(p => (
                                            <tr key={p.id} className={p.is_deleted ? 'table-warning' : ''}>
                                                <td><code>{p.uhid}</code></td>
                                                <td>{p.name}</td>
                                                <td>{p.phone}</td>
                                                <td>{p.gender}</td>
                                                <td>
                                                    {p.is_deleted ? (
                                                        <Badge bg="warning" text="dark">Deleted</Badge>
                                                    ) : (
                                                        <Badge bg="success">Active</Badge>
                                                    )}
                                                </td>
                                                <td>
                                                    <Button variant="outline-secondary" size="sm" className="me-1" onClick={() => openModal('view', p)}>
                                                        <Eye size={14} />
                                                    </Button>
                                                    <Button variant="outline-primary" size="sm" className="me-1" onClick={() => openModal('edit', p)}>
                                                        <Edit2 size={14} />
                                                    </Button>
                                                    {p.is_deleted ? (
                                                        <Button variant="outline-success" size="sm" className="me-1" onClick={() => openModal('restore', p)}>
                                                            <RotateCcw size={14} />
                                                        </Button>
                                                    ) : (
                                                        <Button variant="outline-danger" size="sm" className="me-1" onClick={() => openModal('delete', p)}>
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    )}
                                                    <Button variant="outline-info" size="sm" onClick={() => handleExport(p.id)}>
                                                        <Download size={14} />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {patients.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="text-center py-4 text-muted">No patients found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            )}
                        </Card.Body>
                    </Card>
                </Tab>

                <Tab eventKey="audit" title="📋 Audit Log">
                    <Card className="border-0 shadow-sm">
                        <Card.Body className="p-0">
                            <Table hover responsive className="mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th>Time</th>
                                        <th>User</th>
                                        <th>Action</th>
                                        <th>Entity</th>
                                        <th>Reason</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {auditLogs.map(log => (
                                        <tr key={log.id}>
                                            <td><small>{new Date(log.created_at).toLocaleString()}</small></td>
                                            <td>{log.username} <Badge bg="secondary" className="ms-1">{log.role}</Badge></td>
                                            <td><Badge bg="info">{log.action}</Badge></td>
                                            <td>{log.entity_type}: {log.entity_name || log.entity_id}</td>
                                            <td><small className="text-muted">{log.reason || '-'}</small></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>

                <Tab eventKey="manual" title="✏️ Manual Entry">
                    <Row className="g-4">
                        {/* Invoice Entry Form */}
                        <Col md={6}>
                            <Card className="border-0 shadow-sm h-100">
                                <Card.Header className="bg-success bg-opacity-10">
                                    <h5 className="mb-0"><FileText size={18} className="me-2" />Create Manual Invoice</h5>
                                    <small className="text-muted">For system downtime recovery</small>
                                </Card.Header>
                                <Card.Body>
                                    <Form onSubmit={handleInvoiceSubmit}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Patient *</Form.Label>
                                            <Form.Control
                                                placeholder="Search patient by name/UHID..."
                                                value={invoiceForm.patient_name}
                                                onChange={(e) => {
                                                    setInvoiceForm({...invoiceForm, patient_name: e.target.value});
                                                    searchPatientsForEntry(e.target.value);
                                                }}
                                            />
                                            {patientSearchResults.length > 0 && (
                                                <div className="border rounded mt-1 bg-white shadow-sm" style={{maxHeight: '150px', overflowY: 'auto'}}>
                                                    {patientSearchResults.map(p => (
                                                        <div key={p.id} className="p-2 border-bottom cursor-pointer" style={{cursor: 'pointer'}}
                                                            onClick={() => {
                                                                setInvoiceForm({...invoiceForm, patient_id: p.id, patient_name: `${p.name} (${p.uhid})`});
                                                                setPatientSearchResults([]);
                                                            }}>
                                                            <strong>{p.name}</strong> <small className="text-muted">({p.uhid})</small>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </Form.Group>
                                        
                                        {/* Invoice Items Section */}
                                        <div className="mb-3">
                                            <div className="d-flex justify-content-between align-items-center mb-2">
                                                <Form.Label className="mb-0">Line Items *</Form.Label>
                                                <Button variant="outline-success" size="sm" onClick={addInvoiceItem}>
                                                    <Plus size={14} className="me-1" /> Add Item
                                                </Button>
                                            </div>
                                            {invoiceItems.map((item, idx) => (
                                                <Row key={idx} className="g-2 mb-2 align-items-center">
                                                    <Col xs={5}>
                                                        <Form.Control
                                                            size="sm"
                                                            placeholder="Description (e.g., Consultation Fee)"
                                                            value={item.description}
                                                            onChange={(e) => updateInvoiceItem(idx, 'description', e.target.value)}
                                                            required
                                                        />
                                                    </Col>
                                                    <Col xs={2}>
                                                        <Form.Control
                                                            size="sm"
                                                            type="number"
                                                            min="1"
                                                            placeholder="Qty"
                                                            value={item.quantity}
                                                            onChange={(e) => updateInvoiceItem(idx, 'quantity', e.target.value)}
                                                        />
                                                    </Col>
                                                    <Col xs={3}>
                                                        <InputGroup size="sm">
                                                            <InputGroup.Text>₹</InputGroup.Text>
                                                            <Form.Control
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                placeholder="Price"
                                                                value={item.unit_price}
                                                                onChange={(e) => updateInvoiceItem(idx, 'unit_price', e.target.value)}
                                                                required
                                                            />
                                                        </InputGroup>
                                                    </Col>
                                                    <Col xs={2} className="text-end">
                                                        {invoiceItems.length > 1 && (
                                                            <Button variant="outline-danger" size="sm" onClick={() => removeInvoiceItem(idx)}>
                                                                <Trash2 size={14} />
                                                            </Button>
                                                        )}
                                                    </Col>
                                                </Row>
                                            ))}
                                            <div className="text-end mt-2 p-2 bg-light rounded">
                                                <strong>Total: ₹{invoiceTotal.toLocaleString('en-IN')}</strong>
                                            </div>
                                        </div>

                                        <Row>
                                            <Col>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Invoice Date *</Form.Label>
                                                    <Form.Control type="date" required
                                                        value={invoiceForm.invoice_date}
                                                        onChange={(e) => setInvoiceForm({...invoiceForm, invoice_date: e.target.value})}
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Status</Form.Label>
                                                    <Form.Select value={invoiceForm.status} onChange={(e) => setInvoiceForm({...invoiceForm, status: e.target.value})}>
                                                        <option value="Pending">Pending</option>
                                                        <option value="Paid">Paid</option>
                                                        <option value="Partial">Partial</option>
                                                    </Form.Select>
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Reason for Manual Entry *</Form.Label>
                                            <Form.Control as="textarea" rows={2} required
                                                placeholder="e.g., System was down on 10-Jan-2026"
                                                value={invoiceForm.reason}
                                                onChange={(e) => setInvoiceForm({...invoiceForm, reason: e.target.value})}
                                            />
                                        </Form.Group>
                                        <Button variant="success" type="submit" disabled={entrySubmitting || !invoiceForm.patient_id}>
                                            {entrySubmitting ? <Spinner size="sm" /> : 'Create Invoice'}
                                        </Button>
                                    </Form>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Payment Entry Form */}
                        <Col md={6}>
                            <Card className="border-0 shadow-sm h-100">
                                <Card.Header className="bg-primary bg-opacity-10">
                                    <h5 className="mb-0"><IndianRupee size={18} className="me-2" />Record Manual Payment</h5>
                                    <small className="text-muted">For payments collected during downtime</small>
                                </Card.Header>
                                <Card.Body>
                                    <Form onSubmit={handlePaymentSubmit}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Patient *</Form.Label>
                                            <Form.Control
                                                placeholder="Search patient by name/UHID..."
                                                value={paymentForm.patient_name}
                                                onChange={(e) => {
                                                    setPaymentForm({...paymentForm, patient_name: e.target.value});
                                                    searchPatientsForEntry(e.target.value);
                                                }}
                                            />
                                            {patientSearchResults.length > 0 && (
                                                <div className="border rounded mt-1 bg-white shadow-sm" style={{maxHeight: '150px', overflowY: 'auto'}}>
                                                    {patientSearchResults.map(p => (
                                                        <div key={p.id} className="p-2 border-bottom" style={{cursor: 'pointer'}}
                                                            onClick={() => {
                                                                setPaymentForm({...paymentForm, patient_id: p.id, patient_name: `${p.name} (${p.uhid})`});
                                                                setPatientSearchResults([]);
                                                            }}>
                                                            <strong>{p.name}</strong> <small className="text-muted">({p.uhid})</small>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </Form.Group>
                                        <Row>
                                            <Col>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Amount (₹) *</Form.Label>
                                                    <Form.Control type="number" min="0" step="0.01" required
                                                        value={paymentForm.amount}
                                                        onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                                                    />
                                                </Form.Group>
                                            </Col>
                                            <Col>
                                                <Form.Group className="mb-3">
                                                    <Form.Label>Payment Date *</Form.Label>
                                                    <Form.Control type="date" required
                                                        value={paymentForm.payment_date}
                                                        onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                                                    />
                                                </Form.Group>
                                            </Col>
                                        </Row>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Payment Mode</Form.Label>
                                            <Form.Select value={paymentForm.payment_mode} onChange={(e) => setPaymentForm({...paymentForm, payment_mode: e.target.value})}>
                                                <option value="Cash">Cash</option>
                                                <option value="Card">Card</option>
                                                <option value="UPI">UPI</option>
                                                <option value="NEFT">NEFT</option>
                                                <option value="Cheque">Cheque</option>
                                            </Form.Select>
                                        </Form.Group>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Reason for Manual Entry *</Form.Label>
                                            <Form.Control as="textarea" rows={2} required
                                                placeholder="e.g., Payment collected manually during system downtime"
                                                value={paymentForm.reason}
                                                onChange={(e) => setPaymentForm({...paymentForm, reason: e.target.value})}
                                            />
                                        </Form.Group>
                                        <Button variant="primary" type="submit" disabled={entrySubmitting || !paymentForm.patient_id}>
                                            {entrySubmitting ? <Spinner size="sm" /> : 'Record Payment'}
                                        </Button>
                                    </Form>
                                </Card.Body>
                            </Card>
                        </Col>

                        {/* Recent Manual Entries */}
                        <Col xs={12}>
                            <Card className="border-0 shadow-sm">
                                <Card.Header className="bg-warning bg-opacity-10 d-flex justify-content-between align-items-center">
                                    <div>
                                        <h5 className="mb-0"><History size={18} className="me-2" />Recent Manual Entries</h5>
                                        <small className="text-muted">Last 30 days</small>
                                    </div>
                                    {manualEntries.summary && (
                                        <div className="text-end">
                                            <Badge bg="success" className="me-2">Invoices: {manualEntries.summary.total_invoices || 0}</Badge>
                                            <Badge bg="primary">Payments: {manualEntries.summary.total_payments || 0}</Badge>
                                        </div>
                                    )}
                                </Card.Header>
                                <Card.Body className="p-0">
                                    <Table hover responsive className="mb-0">
                                        <thead className="bg-light">
                                            <tr>
                                                <th>Type</th>
                                                <th>Date</th>
                                                <th>Patient</th>
                                                <th>Amount</th>
                                                <th>Created By</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...(manualEntries.invoices || []).map(i => ({...i, type: 'Invoice', date: i.generated_at})),
                                              ...(manualEntries.payments || []).map(p => ({...p, type: 'Payment', date: p.received_at}))]
                                              .sort((a,b) => new Date(b.date) - new Date(a.date))
                                              .slice(0, 20)
                                              .map((entry, idx) => (
                                                <tr key={idx}>
                                                    <td><Badge bg={entry.type === 'Invoice' ? 'success' : 'primary'}>{entry.type}</Badge></td>
                                                    <td><small>{new Date(entry.date).toLocaleDateString()}</small></td>
                                                    <td>{entry.patient_name || '-'} <small className="text-muted">({entry.uhid})</small></td>
                                                    <td className="fw-bold">₹{parseFloat(entry.total_amount || entry.amount || 0).toLocaleString('en-IN')}</td>
                                                    <td><small>{entry.created_by_name}</small></td>
                                                </tr>
                                            ))}
                                            {(!manualEntries.invoices?.length && !manualEntries.payments?.length) && (
                                                <tr><td colSpan={5} className="text-center text-muted py-4">No manual entries yet</td></tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Tab>
            </Tabs>

            {/* Modal for Add/Edit/View/Delete/Restore */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        {modalMode === 'add' && '➕ Add New Patient'}
                        {modalMode === 'edit' && '✏️ Edit Patient'}
                        {modalMode === 'view' && '👁️ Patient Details'}
                        {modalMode === 'delete' && '🗑️ Soft Delete Patient'}
                        {modalMode === 'restore' && '♻️ Restore Patient'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {(modalMode === 'delete' || modalMode === 'restore') && (
                        <Alert variant={modalMode === 'delete' ? 'warning' : 'info'}>
                            <strong>{modalMode === 'delete' ? '⚠️ Compliance Notice' : 'ℹ️ Restoration Notice'}</strong><br />
                            {modalMode === 'delete' 
                                ? 'As per DPDP Act 2023, you must provide a reason for deletion. Record will be soft-deleted and retained per Clinical Establishments Act.'
                                : 'You must provide a reason for restoring this record. This action will be logged for compliance.'}
                        </Alert>
                    )}

                    {(modalMode === 'add' || modalMode === 'edit') && (
                        <Row className="g-3">
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Name *</Form.Label>
                                    <Form.Control value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Phone *</Form.Label>
                                    <Form.Control value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Date of Birth</Form.Label>
                                    <Form.Control type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Gender</Form.Label>
                                    <Form.Select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                                        <option value="">Select</option>
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Blood Group</Form.Label>
                                    <Form.Select value={formData.blood_group} onChange={e => setFormData({...formData, blood_group: e.target.value})}>
                                        <option value="">Select</option>
                                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                                            <option key={bg} value={bg}>{bg}</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group>
                                    <Form.Label>Emergency Contact</Form.Label>
                                    <Form.Control value={formData.emergency_contact} onChange={e => setFormData({...formData, emergency_contact: e.target.value})} />
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label>Address</Form.Label>
                                    <Form.Control as="textarea" rows={2} value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                                </Form.Group>
                            </Col>
                            {modalMode === 'edit' && (
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label>Reason for Edit</Form.Label>
                                        <Form.Control value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g., Correcting typo in name" />
                                    </Form.Group>
                                </Col>
                            )}
                        </Row>
                    )}

                    {modalMode === 'view' && selectedPatient && (
                        <div>
                            <Row className="g-3">
                                <Col md={6}><strong>UHID:</strong> {selectedPatient.uhid}</Col>
                                <Col md={6}><strong>Name:</strong> {selectedPatient.name}</Col>
                                <Col md={6}><strong>Phone:</strong> {selectedPatient.phone}</Col>
                                <Col md={6}><strong>Gender:</strong> {selectedPatient.gender}</Col>
                                <Col md={6}><strong>DOB:</strong> {selectedPatient.dob?.split('T')[0] || '-'}</Col>
                                <Col md={6}><strong>Status:</strong> {selectedPatient.is_deleted ? 'Deleted' : 'Active'}</Col>
                            </Row>
                            {selectedPatient.is_deleted && (
                                <Alert variant="warning" className="mt-3">
                                    <strong>Deletion Info:</strong><br />
                                    Deleted by: {selectedPatient.deleted_by_name || 'Unknown'}<br />
                                    Reason: {selectedPatient.deletion_reason || 'Not provided'}<br />
                                    Date: {new Date(selectedPatient.deleted_at).toLocaleString()}
                                </Alert>
                            )}
                        </div>
                    )}

                    {(modalMode === 'delete' || modalMode === 'restore') && (
                        <Form.Group className="mt-3">
                            <Form.Label className="fw-bold">Reason (Required) *</Form.Label>
                            <Form.Control 
                                as="textarea" 
                                rows={3} 
                                value={reason} 
                                onChange={e => setReason(e.target.value)}
                                placeholder={modalMode === 'delete' ? 'e.g., Duplicate record, Patient requested deletion' : 'e.g., Deleted by mistake, Record needed for audit'}
                            />
                        </Form.Group>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                    {modalMode !== 'view' && (
                        <Button 
                            variant={modalMode === 'delete' ? 'danger' : modalMode === 'restore' ? 'success' : 'primary'} 
                            onClick={handleSubmit}
                            disabled={processing}
                        >
                            {processing ? <Spinner size="sm" /> : (
                                <>
                                    {modalMode === 'add' && 'Create Patient'}
                                    {modalMode === 'edit' && 'Save Changes'}
                                    {modalMode === 'delete' && 'Confirm Delete'}
                                    {modalMode === 'restore' && 'Confirm Restore'}
                                </>
                            )}
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default AdminRecoveryConsole;
