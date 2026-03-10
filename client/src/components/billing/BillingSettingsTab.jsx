import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, Modal, Badge, Row, Col, InputGroup, Tab, Tabs, Alert } from 'react-bootstrap';
import { Settings, Package, Percent, IndianRupee, Plus, Edit2, Trash2, Save, Calendar, Lock, Unlock, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { formatCurrency } from '../../utils/currency';

/**
 * BillingSettingsTab - Integrated billing configuration
 * Services, Packages, Discounts, Tariffs
 */
const BillingSettingsTab = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState('services');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');
    
    // Pre-configured demo data
    const DEFAULT_SERVICES = [
        { id: 1, code: 'CONS-GEN', name: 'General Consultation', department: 'General Medicine', base_rate: 500, gst_percentage: 0 },
        { id: 2, code: 'CONS-SPL', name: 'Specialist Consultation', department: 'Specialist', base_rate: 800, gst_percentage: 0 },
        { id: 3, code: 'LAB-CBC', name: 'Complete Blood Count', department: 'Laboratory', base_rate: 350, gst_percentage: 5 },
        { id: 4, code: 'LAB-LFT', name: 'Liver Function Test', department: 'Laboratory', base_rate: 800, gst_percentage: 5 },
        { id: 5, code: 'LAB-KFT', name: 'Kidney Function Test', department: 'Laboratory', base_rate: 700, gst_percentage: 5 },
        { id: 6, code: 'RAD-XRAY', name: 'X-Ray (Single View)', department: 'Radiology', base_rate: 400, gst_percentage: 5 },
        { id: 7, code: 'RAD-USG', name: 'Ultrasound Abdomen', department: 'Radiology', base_rate: 1200, gst_percentage: 5 },
        { id: 8, code: 'RAD-CT', name: 'CT Scan', department: 'Radiology', base_rate: 5000, gst_percentage: 5 },
        { id: 9, code: 'RAD-MRI', name: 'MRI Scan', department: 'Radiology', base_rate: 8000, gst_percentage: 5 },
        { id: 10, code: 'BED-GEN', name: 'General Ward (Per Day)', department: 'IPD', base_rate: 1500, gst_percentage: 12 },
        { id: 11, code: 'BED-SEM', name: 'Semi-Private Room (Per Day)', department: 'IPD', base_rate: 3000, gst_percentage: 12 },
        { id: 12, code: 'BED-PVT', name: 'Private Room (Per Day)', department: 'IPD', base_rate: 5000, gst_percentage: 12 },
        { id: 13, code: 'BED-ICU', name: 'ICU (Per Day)', department: 'IPD', base_rate: 15000, gst_percentage: 12 },
        { id: 14, code: 'NUR-CHG', name: 'Nursing Charges (Per Day)', department: 'IPD', base_rate: 500, gst_percentage: 0 },
        { id: 15, code: 'OT-MIN', name: 'OT Charges - Minor', department: 'Surgery', base_rate: 5000, gst_percentage: 18 },
        { id: 16, code: 'OT-MAJ', name: 'OT Charges - Major', department: 'Surgery', base_rate: 15000, gst_percentage: 18 },
        { id: 17, code: 'EMR-REG', name: 'Emergency Registration', department: 'Emergency', base_rate: 200, gst_percentage: 0 },
        { id: 18, code: 'EMR-OBS', name: 'Emergency Observation (Per Hour)', department: 'Emergency', base_rate: 300, gst_percentage: 0 }
    ];

    const DEFAULT_PACKAGES = [
        { 
            id: 1, 
            name: 'Normal Delivery Package', 
            department: 'Obstetrics',
            total_amount: 35000,
            description: '3 days stay, normal delivery, nursing care',
            inclusions: ['Room charges (3 days)', 'Delivery charges', 'Nursing care', 'Baby care', 'Routine medicines']
        },
        { 
            id: 2, 
            name: 'C-Section Delivery Package', 
            department: 'Obstetrics',
            total_amount: 75000,
            description: '5 days stay, cesarean section, nursing care',
            inclusions: ['Room charges (5 days)', 'OT charges', 'Surgeon fees', 'Anesthesia', 'Nursing care', 'Baby care', 'Medicines']
        },
        { 
            id: 3, 
            name: 'Appendectomy Package', 
            department: 'General Surgery',
            total_amount: 45000,
            description: 'Laparoscopic appendix removal, 2-day stay',
            inclusions: ['Room charges (2 days)', 'OT charges', 'Surgeon fees', 'Anesthesia', 'Post-op care', 'Medicines']
        },
        { 
            id: 4, 
            name: 'Hernia Repair Package', 
            department: 'General Surgery',
            total_amount: 55000,
            description: 'Laparoscopic hernia repair, 2-day stay',
            inclusions: ['Room charges (2 days)', 'OT charges', 'Mesh cost', 'Surgeon fees', 'Anesthesia', 'Nursing']
        },
        { 
            id: 5, 
            name: 'Cholecystectomy Package', 
            department: 'General Surgery',
            total_amount: 65000,
            description: 'Gallbladder removal, 3-day stay',
            inclusions: ['Room charges (3 days)', 'OT charges', 'Surgeon fees', 'Anesthesia', 'Diagnostics', 'Medicines']
        },
        { 
            id: 6, 
            name: 'Knee Replacement Package', 
            department: 'Orthopedics',
            total_amount: 250000,
            description: 'Total knee replacement, 7-day stay',
            inclusions: ['Room charges (7 days)', 'Implant cost', 'OT charges', 'Physiotherapy', 'Nursing', 'Medicines']
        },
        { 
            id: 7, 
            name: 'Cataract Surgery Package', 
            department: 'Ophthalmology',
            total_amount: 25000,
            description: 'Phaco with IOL, day care',
            inclusions: ['Day care', 'OT charges', 'IOL lens', 'Surgeon fees', 'Medicines', 'Post-op followup']
        },
        { 
            id: 8, 
            name: 'Master Health Checkup', 
            department: 'Preventive',
            total_amount: 5000,
            description: 'Comprehensive health screening',
            inclusions: ['CBC', 'LFT', 'KFT', 'Lipid Profile', 'Blood Sugar', 'Thyroid', 'ECG', 'X-Ray Chest', 'Doctor Consultation']
        },
        { 
            id: 9, 
            name: 'Cardiac Health Checkup', 
            department: 'Cardiology',
            total_amount: 8000,
            description: 'Heart health screening',
            inclusions: ['ECG', 'Echo', 'TMT', 'Lipid Profile', 'Blood Sugar', 'Cardiologist Consultation']
        },
        {
            id: 10,
            name: 'Dialysis Package (Per Session)',
            department: 'Nephrology',
            total_amount: 2500,
            description: 'Single dialysis session',
            inclusions: ['Dialysis', 'Consumables', 'Nursing care', 'Monitoring']
        }
    ];

    const DEFAULT_DISCOUNTS = [
        { id: 1, name: 'Senior Citizen Discount', type: 'percentage', value: 10, applicable_to: 'age_above_60' },
        { id: 2, name: 'Staff Discount', type: 'percentage', value: 20, applicable_to: 'staff' },
        { id: 3, name: 'Corporate Discount', type: 'percentage', value: 15, applicable_to: 'corporate' },
        { id: 4, name: 'BPL Card Holder', type: 'percentage', value: 50, applicable_to: 'bpl' },
        { id: 5, name: 'Follow-up Discount', type: 'fixed', value: 200, applicable_to: 'followup' }
    ];
    const [services, setServices] = useState(() => {
        try {
            const saved = localStorage.getItem('billing_services');
            if (saved && saved !== 'undefined') return JSON.parse(saved);
        } catch (e) {
            console.error('Error loading services:', e);
        }
        // Save defaults if not present
        localStorage.setItem('billing_services', JSON.stringify(DEFAULT_SERVICES));
        return DEFAULT_SERVICES;
    });
    
    const [showServiceModal, setShowServiceModal] = useState(false);
    const [serviceForm, setServiceForm] = useState({
        code: '', name: '', department: 'General', base_rate: '', gst_percentage: 18
    });
    const [editingService, setEditingService] = useState(null);

    // Packages State - Lazy load
    const [packages, setPackages] = useState(() => {
        try {
            const saved = localStorage.getItem('billing_packages');
            if (saved && saved !== 'undefined') return JSON.parse(saved);
        } catch (e) {
            console.error('Error loading packages:', e);
        }
        localStorage.setItem('billing_packages', JSON.stringify(DEFAULT_PACKAGES));
        return DEFAULT_PACKAGES;
    });

    const [showPackageModal, setShowPackageModal] = useState(false);
    const [packageForm, setPackageForm] = useState({
        name: '', department: '', total_amount: '', description: '', inclusions: []
    });
    const [editingPackage, setEditingPackage] = useState(null);

    // Discounts State - Lazy load
    const [discounts, setDiscounts] = useState(() => {
        try {
            const saved = localStorage.getItem('billing_discounts');
            if (saved && saved !== 'undefined') return JSON.parse(saved);
        } catch (e) {
            console.error('Error loading discounts:', e);
        }
        localStorage.setItem('billing_discounts', JSON.stringify(DEFAULT_DISCOUNTS));
        return DEFAULT_DISCOUNTS;
    });

    const [showDiscountModal, setShowDiscountModal] = useState(false);

    // Accounting Periods State
    const [periods, setPeriods] = useState([]);
    const [showPeriodModal, setShowPeriodModal] = useState(false);
    const [periodForm, setPeriodForm] = useState({ name: '', start_date: '', end_date: '' });

    const fetchPeriods = async () => {
        try {
            const res = await axios.get('/api/finance/periods');
            // Check if response is { data: [periods], ... } or { data: { data: [periods] } } depending on axiosInstance
            setPeriods(Array.isArray(res.data) ? res.data : (res.data.data || [])); 
        } catch (e) {
            console.error('Error fetching periods:', e);
        }
    };

    useEffect(() => {
        if (activeTab === 'periods') fetchPeriods();
    }, [activeTab]);

    const handleCreatePeriod = async () => {
        try {
            await axios.post('/api/finance/periods', periodForm);
            setSuccess('Fiscal period created!');
            setShowPeriodModal(false);
            fetchPeriods();
            setPeriodForm({ name: '', start_date: '', end_date: '' });
        } catch (e) {
            alert(e.response?.data?.message || 'Error creating period');
        }
    };

    const handleTogglePeriod = async (id, currentStatus) => {
        try {
            const endpoint = currentStatus === 'Open' ? 'close' : 'reopen';
            if (endpoint === 'close' && !window.confirm('Are you sure? Closing this period will prevent further changes.')) return;
            
            await axios.post(`/api/finance/periods/${id}/${endpoint}`);
            setSuccess(`Period ${endpoint}d successfully!`);
            fetchPeriods();
        } catch (e) {
            alert(e.response?.data?.message || 'Error updating period');
        }
    };


    const [discountForm, setDiscountForm] = useState({
        name: '', type: 'percentage', value: '', applicable_to: 'all'
    });





    const saveToStorage = (key, data) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    // Service CRUD
    const handleSaveService = () => {
        const newService = {
            ...serviceForm,
            id: editingService?.id || Date.now(),
            base_rate: parseFloat(serviceForm.base_rate),
            gst_percentage: parseFloat(serviceForm.gst_percentage)
        };

        let updated;
        if (editingService) {
            updated = services.map(s => s.id === editingService.id ? newService : s);
        } else {
            updated = [...services, newService];
        }

        setServices(updated);
        saveToStorage('billing_services', updated);
        setShowServiceModal(false);
        setServiceForm({ code: '', name: '', department: 'General', base_rate: '', gst_percentage: 18 });
        setEditingService(null);
        setSuccess('Service saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
    };

    const handleDeleteService = (id) => {
        if (!window.confirm('Delete this service?')) return;
        const updated = services.filter(s => s.id !== id);
        setServices(updated);
        saveToStorage('billing_services', updated);
    };

    // Package CRUD
    const handleSavePackage = () => {
        const newPackage = {
            ...packageForm,
            id: editingPackage?.id || Date.now(),
            total_amount: parseFloat(packageForm.total_amount),
            inclusions: packageForm.inclusions.length ? packageForm.inclusions : packageForm.description.split(',').map(s => s.trim())
        };

        let updated;
        if (editingPackage) {
            updated = packages.map(p => p.id === editingPackage.id ? newPackage : p);
        } else {
            updated = [...packages, newPackage];
        }

        setPackages(updated);
        saveToStorage('billing_packages', updated);
        setShowPackageModal(false);
        setPackageForm({ name: '', department: '', total_amount: '', description: '', inclusions: [] });
        setEditingPackage(null);
        setSuccess('Package saved!');
        setTimeout(() => setSuccess(''), 3000);
    };

    const handleDeletePackage = (id) => {
        if (!window.confirm('Delete this package?')) return;
        const updated = packages.filter(p => p.id !== id);
        setPackages(updated);
        saveToStorage('billing_packages', updated);
    };

    // Discount CRUD
    const handleSaveDiscount = () => {
        const newDiscount = {
            ...discountForm,
            id: Date.now(),
            value: parseFloat(discountForm.value)
        };

        const updated = [...discounts, newDiscount];
        setDiscounts(updated);
        saveToStorage('billing_discounts', updated);
        setShowDiscountModal(false);
        setDiscountForm({ name: '', type: 'percentage', value: '', applicable_to: 'all' });
        setSuccess('Discount rule saved!');
        setTimeout(() => setSuccess(''), 3000);
    };

    const handleDeleteDiscount = (id) => {
        if (!window.confirm('Delete this discount?')) return;
        const updated = discounts.filter(d => d.id !== id);
        setDiscounts(updated);
        saveToStorage('billing_discounts', updated);
    };

    const DEPARTMENTS = [
        'General Medicine', 'Specialist', 'Laboratory', 'Radiology', 'IPD', 
        'Surgery', 'Emergency', 'Obstetrics', 'Orthopedics', 'Ophthalmology',
        'Cardiology', 'Nephrology', 'Preventive', 'Pharmacy'
    ];

    return (
        <Card className="border-0 shadow-sm">
            <Card.Header className="bg-gradient d-flex justify-content-between align-items-center" 
                style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)' }}>
                <h5 className="text-white mb-0 d-flex align-items-center gap-2">
                    <Settings size={20} /> Billing Settings
                </h5>
                {onClose && <Button variant="light" size="sm" onClick={onClose}>Close</Button>}
            </Card.Header>
            <Card.Body className="p-0">
                {success && <Alert variant="success" className="m-3 py-2">{success}</Alert>}
                
                <Tabs activeKey={activeTab} onSelect={setActiveTab} className="px-3 pt-3">
                    {/* Services Tab */}
                    <Tab eventKey="services" title={<span><IndianRupee size={14} className="me-1" />Services ({services.length})</span>}>
                        <div className="p-3">
                            <div className="d-flex justify-content-between mb-3">
                                <small className="text-muted">Define all billable services with rates</small>
                                <Button size="sm" variant="success" onClick={() => { setEditingService(null); setShowServiceModal(true); }}>
                                    <Plus size={14} className="me-1" /> Add Service
                                </Button>
                            </div>
                            <Table hover size="sm" responsive>
                                <thead className="bg-light">
                                    <tr>
                                        <th>Code</th>
                                        <th>Service Name</th>
                                        <th>Department</th>
                                        <th className="text-end">Rate</th>
                                        <th className="text-center">GST</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {services.map(s => (
                                        <tr key={s.id}>
                                            <td><code>{s.code}</code></td>
                                            <td>{s.name}</td>
                                            <td><Badge bg="secondary">{s.department}</Badge></td>
                                            <td className="text-end fw-bold">{formatCurrency(s.base_rate)}</td>
                                            <td className="text-center">{s.gst_percentage}%</td>
                                            <td className="text-end">
                                                <Button variant="link" size="sm" className="p-0 me-2" 
                                                    onClick={() => { setEditingService(s); setServiceForm(s); setShowServiceModal(true); }}>
                                                    <Edit2 size={14} />
                                                </Button>
                                                <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => handleDeleteService(s.id)}>
                                                    <Trash2 size={14} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </Tab>

                    {/* Packages Tab */}
                    <Tab eventKey="packages" title={<span><Package size={14} className="me-1" />Packages ({packages.length})</span>}>
                        <div className="p-3">
                            <div className="d-flex justify-content-between mb-3">
                                <small className="text-muted">Pre-defined treatment packages with bundled pricing</small>
                                <Button size="sm" variant="success" onClick={() => { setEditingPackage(null); setShowPackageModal(true); }}>
                                    <Plus size={14} className="me-1" /> Add Package
                                </Button>
                            </div>
                            <Row className="g-3">
                                {packages.map(p => (
                                    <Col md={6} lg={4} key={p.id}>
                                        <Card className="h-100 border">
                                            <Card.Body>
                                                <div className="d-flex justify-content-between align-items-start mb-2">
                                                    <h6 className="mb-0">{p.name}</h6>
                                                    <Badge bg="primary">{p.department}</Badge>
                                                </div>
                                                <h4 className="text-success mb-2">{formatCurrency(p.total_amount)}</h4>
                                                <p className="small text-muted mb-2">{p.description}</p>
                                                <div className="small">
                                                    <strong>Includes:</strong>
                                                    <ul className="mb-0 ps-3">
                                                        {(p.inclusions || []).slice(0, 4).map((inc, i) => (
                                                            <li key={i}>{inc}</li>
                                                        ))}
                                                        {(p.inclusions || []).length > 4 && <li>+{p.inclusions.length - 4} more...</li>}
                                                    </ul>
                                                </div>
                                            </Card.Body>
                                            <Card.Footer className="bg-light d-flex justify-content-end gap-2">
                                                <Button variant="outline-primary" size="sm" 
                                                    onClick={() => { setEditingPackage(p); setPackageForm(p); setShowPackageModal(true); }}>
                                                    <Edit2 size={12} /> Edit
                                                </Button>
                                                <Button variant="outline-danger" size="sm" onClick={() => handleDeletePackage(p.id)}>
                                                    <Trash2 size={12} />
                                                </Button>
                                            </Card.Footer>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        </div>
                    </Tab>

                    {/* Discounts Tab */}
                    <Tab eventKey="discounts" title={<span><Percent size={14} className="me-1" />Discounts ({discounts.length})</span>}>
                        <div className="p-3">
                            <div className="d-flex justify-content-between mb-3">
                                <small className="text-muted">Configure discount rules for different categories</small>
                                <Button size="sm" variant="success" onClick={() => setShowDiscountModal(true)}>
                                    <Plus size={14} className="me-1" /> Add Discount
                                </Button>
                            </div>
                            <Table hover size="sm">
                                <thead className="bg-light">
                                    <tr>
                                        <th>Discount Name</th>
                                        <th>Type</th>
                                        <th className="text-center">Value</th>
                                        <th>Applicable To</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {discounts.map(d => (
                                        <tr key={d.id}>
                                            <td className="fw-bold">{d.name}</td>
                                            <td><Badge bg={d.type === 'percentage' ? 'info' : 'warning'}>{d.type}</Badge></td>
                                            <td className="text-center fw-bold">
                                                {d.type === 'percentage' ? `${d.value}%` : formatCurrency(d.value)}
                                            </td>
                                            <td>{d.applicable_to.replace(/_/g, ' ')}</td>
                                            <td className="text-end">
                                                <Button variant="link" size="sm" className="p-0 text-danger" onClick={() => handleDeleteDiscount(d.id)}>
                                                    <Trash2 size={14} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </Tab>

                    {/* Fiscal Periods Tab */}
                    <Tab eventKey="periods" title={<span><Calendar size={14} className="me-1" />Fiscal Periods</span>}>
                        <div className="p-3">
                            <div className="d-flex justify-content-between mb-3">
                                <div>
                                    <small className="text-muted d-block">Manage accounting periods (Hard Closing)</small>
                                    <Badge bg="danger" className="mt-1"><Lock size={10} className="me-1" />Audit Control</Badge>
                                </div>
                                <Button size="sm" variant="success" onClick={() => setShowPeriodModal(true)}>
                                    <Plus size={14} className="me-1" /> New Period
                                </Button>
                            </div>

                            <Table hover size="sm">
                                <thead className="bg-light">
                                    <tr>
                                        <th>Period Name</th>
                                        <th>Start Date</th>
                                        <th>End Date</th>
                                        <th>Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {periods.map(p => (
                                        <tr key={p.id}>
                                            <td className="fw-bold">{p.name}</td>
                                            <td>{new Date(p.start_date).toLocaleDateString()}</td>
                                            <td>{new Date(p.end_date).toLocaleDateString()}</td>
                                            <td>
                                                <Badge bg={p.status === 'Open' ? 'success' : 'secondary'}>
                                                    {p.status === 'Open' ? <Unlock size={12} className="me-1" /> : <Lock size={12} className="me-1" />}
                                                    {p.status}
                                                </Badge>
                                            </td>
                                            <td>
                                                {p.status === 'Open' ? (
                                                    <Button variant="outline-danger" size="sm" onClick={() => handleTogglePeriod(p.id, 'Open')}>
                                                        Close
                                                    </Button>
                                                ) : (
                                                    <Button variant="outline-secondary" size="sm" onClick={() => handleTogglePeriod(p.id, 'Closed')}>
                                                        Reopen
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {periods.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="text-center text-muted p-3">
                                                No accounting periods defined. System is running in "Continuous" mode.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </Tab>

                </Tabs>
            </Card.Body>

            {/* Period Modal */}
            <Modal show={showPeriodModal} onHide={() => setShowPeriodModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Create Fiscal Period</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Period Name</Form.Label>
                            <Form.Control 
                                placeholder="e.g., January 2025" 
                                value={periodForm.name}
                                onChange={e => setPeriodForm({...periodForm, name: e.target.value})} 
                            />
                        </Form.Group>
                        <Row>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label>Start Date</Form.Label>
                                    <Form.Control type="date" 
                                        value={periodForm.start_date}
                                        onChange={e => setPeriodForm({...periodForm, start_date: e.target.value})} 
                                    />
                                </Form.Group>
                            </Col>
                            <Col>
                                <Form.Group className="mb-3">
                                    <Form.Label>End Date</Form.Label>
                                    <Form.Control type="date" 
                                        value={periodForm.end_date}
                                        onChange={e => setPeriodForm({...periodForm, end_date: e.target.value})} 
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPeriodModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleCreatePeriod} disabled={!periodForm.name || !periodForm.start_date || !periodForm.end_date}>
                        Create Period
                    </Button>
                </Modal.Footer>
            </Modal>



            {/* Service Modal */}
            <Modal show={showServiceModal} onHide={() => setShowServiceModal(false)}>
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>{editingService ? 'Edit Service' : 'Add New Service'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Row>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Code*</Form.Label>
                                    <Form.Control value={serviceForm.code} 
                                        onChange={e => setServiceForm({...serviceForm, code: e.target.value.toUpperCase()})}
                                        placeholder="CONS-GEN" />
                                </Form.Group>
                            </Col>
                            <Col md={8}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Service Name*</Form.Label>
                                    <Form.Control value={serviceForm.name} 
                                        onChange={e => setServiceForm({...serviceForm, name: e.target.value})}
                                        placeholder="General Consultation" />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Department</Form.Label>
                            <Form.Select value={serviceForm.department}
                                onChange={e => setServiceForm({...serviceForm, department: e.target.value})}>
                                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                            </Form.Select>
                        </Form.Group>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Base Rate (₹)*</Form.Label>
                                    <Form.Control type="number" value={serviceForm.base_rate}
                                        onChange={e => setServiceForm({...serviceForm, base_rate: e.target.value})}
                                        placeholder="500" />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>GST %</Form.Label>
                                    <Form.Select value={serviceForm.gst_percentage}
                                        onChange={e => setServiceForm({...serviceForm, gst_percentage: e.target.value})}>
                                        <option value="0">0% (Exempt)</option>
                                        <option value="5">5%</option>
                                        <option value="12">12%</option>
                                        <option value="18">18%</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowServiceModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSaveService} disabled={!serviceForm.code || !serviceForm.name || !serviceForm.base_rate}>
                        <Save size={16} className="me-1" /> Save Service
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Package Modal */}
            <Modal show={showPackageModal} onHide={() => setShowPackageModal(false)} size="lg">
                <Modal.Header closeButton className="bg-success text-white">
                    <Modal.Title>{editingPackage ? 'Edit Package' : 'Add New Package'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Row>
                            <Col md={8}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Package Name*</Form.Label>
                                    <Form.Control value={packageForm.name}
                                        onChange={e => setPackageForm({...packageForm, name: e.target.value})}
                                        placeholder="Normal Delivery Package" />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Total Amount (₹)*</Form.Label>
                                    <Form.Control type="number" value={packageForm.total_amount}
                                        onChange={e => setPackageForm({...packageForm, total_amount: e.target.value})}
                                        placeholder="35000" />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Department</Form.Label>
                            <Form.Select value={packageForm.department}
                                onChange={e => setPackageForm({...packageForm, department: e.target.value})}>
                                <option value="">Select Department</option>
                                {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control as="textarea" rows={2} value={packageForm.description}
                                onChange={e => setPackageForm({...packageForm, description: e.target.value})}
                                placeholder="Brief description of what's included" />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Inclusions (comma-separated)</Form.Label>
                            <Form.Control as="textarea" rows={3}
                                value={(packageForm.inclusions || []).join(', ')}
                                onChange={e => setPackageForm({...packageForm, inclusions: e.target.value.split(',').map(s => s.trim())})}
                                placeholder="Room charges, OT charges, Surgeon fees, Medicines, Nursing care" />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPackageModal(false)}>Cancel</Button>
                    <Button variant="success" onClick={handleSavePackage} disabled={!packageForm.name || !packageForm.total_amount}>
                        <Save size={16} className="me-1" /> Save Package
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Discount Modal */}
            <Modal show={showDiscountModal} onHide={() => setShowDiscountModal(false)}>
                <Modal.Header closeButton className="bg-warning">
                    <Modal.Title>Add Discount Rule</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Discount Name*</Form.Label>
                            <Form.Control value={discountForm.name}
                                onChange={e => setDiscountForm({...discountForm, name: e.target.value})}
                                placeholder="Senior Citizen Discount" />
                        </Form.Group>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Type</Form.Label>
                                    <Form.Select value={discountForm.type}
                                        onChange={e => setDiscountForm({...discountForm, type: e.target.value})}>
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount (₹)</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Value*</Form.Label>
                                    <InputGroup>
                                        <Form.Control type="number" value={discountForm.value}
                                            onChange={e => setDiscountForm({...discountForm, value: e.target.value})}
                                            placeholder="10" />
                                        <InputGroup.Text>{discountForm.type === 'percentage' ? '%' : '₹'}</InputGroup.Text>
                                    </InputGroup>
                                </Form.Group>
                            </Col>
                        </Row>
                        <Form.Group className="mb-3">
                            <Form.Label>Applicable To</Form.Label>
                            <Form.Select value={discountForm.applicable_to}
                                onChange={e => setDiscountForm({...discountForm, applicable_to: e.target.value})}>
                                <option value="all">All Patients</option>
                                <option value="age_above_60">Senior Citizens (60+)</option>
                                <option value="staff">Hospital Staff</option>
                                <option value="corporate">Corporate Patients</option>
                                <option value="bpl">BPL Card Holders</option>
                                <option value="followup">Follow-up Visits</option>
                            </Form.Select>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDiscountModal(false)}>Cancel</Button>
                    <Button variant="warning" onClick={handleSaveDiscount} disabled={!discountForm.name || !discountForm.value}>
                        <Save size={16} className="me-1" /> Save Discount
                    </Button>
                </Modal.Footer>
            </Modal>
        </Card>
    );
};

export default BillingSettingsTab;
