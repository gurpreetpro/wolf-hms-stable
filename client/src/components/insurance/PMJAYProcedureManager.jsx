/**
 * PMJAY Procedure Manager
 * Admin interface for managing hospital procedure mappings to PMJAY packages
 * 
 * Features:
 * - View all PMJAY packages and procedures
 * - Map hospital procedures to PMJAY codes
 * - Sync rates from NHA
 * - Manage hospital empanelment
 * 
 * WOLF HMS
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
    Container, Row, Col, Card, Badge, Button, Form, Table, 
    Modal, InputGroup, Spinner, Alert, Tab, Tabs 
} from 'react-bootstrap';
import { 
    Settings, Package, Link2, RefreshCw, Search, Plus, 
    Edit2, Trash2, Save, Check, X, AlertTriangle, Building
} from 'lucide-react';
import api from '../../utils/axiosInstance';

const PMJAYProcedureManager = ({ isDark = false }) => {
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('packages');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Data
    const [specialties, setSpecialties] = useState([]);
    const [packages, setPackages] = useState([]);
    const [mappings, setMappings] = useState([]);
    const [empanelment, setEmpanelment] = useState(null);
    
    // Modal state
    const [showMappingModal, setShowMappingModal] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [mappingForm, setMappingForm] = useState({
        hospitalProcedure: '',
        hospitalCode: '',
        department: ''
    });
    
    // Sync state
    const [syncing, setSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [specRes, pkgRes] = await Promise.all([
                api.get('/pmjay/hbp/specialties'),
                api.get('/pmjay/hbp/packages')
            ]);

            if (specRes.data.success) {
                setSpecialties(specRes.data.data || []);
            }

            if (pkgRes.data.success) {
                setPackages(pkgRes.data.data || []);
            }

            // Fetch mappings
            try {
                const mappingRes = await api.get('/pmjay/hbp/hospital/mappings');
                if (mappingRes.data.success) {
                    setMappings(mappingRes.data.data || []);
                }
            } catch {
                // No mappings yet
                setMappings([]);
            }

            // Fetch empanelment
            try {
                const empRes = await api.get('/pmjay/hbp/hospital/empanelment');
                if (empRes.data.success) {
                    setEmpanelment(empRes.data.data);
                }
            } catch {
                setEmpanelment(null);
            }

        } catch (err) {
            console.error('Failed to fetch PMJAY data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSync = async () => {
        setSyncing(true);
        setSyncMessage(null);
        try {
            const res = await api.post('/pmjay/hbp/sync');
            if (res.data.success) {
                setSyncMessage({ type: 'success', text: 'Rates synced successfully from NHA' });
                fetchData();
            }
        } catch (err) {
            setSyncMessage({ type: 'danger', text: 'Sync failed. Using cached rates.' });
        } finally {
            setSyncing(false);
        }
    };

    const handleSaveMapping = async () => {
        if (!selectedPackage) return;
        
        try {
            await api.post('/pmjay/hbp/hospital/mappings', {
                pmjayPackageCode: selectedPackage.code,
                hospitalProcedure: mappingForm.hospitalProcedure,
                hospitalCode: mappingForm.hospitalCode,
                department: mappingForm.department
            });
            
            setShowMappingModal(false);
            setMappingForm({ hospitalProcedure: '', hospitalCode: '', department: '' });
            fetchData();
        } catch (err) {
            console.error('Failed to save mapping:', err);
            alert('Failed to save mapping');
        }
    };

    const openMappingModal = (pkg) => {
        setSelectedPackage(pkg);
        const existing = mappings.find(m => m.pmjay_package_code === pkg.code);
        if (existing) {
            setMappingForm({
                hospitalProcedure: existing.hospital_procedure || '',
                hospitalCode: existing.hospital_code || '',
                department: existing.department || ''
            });
        } else {
            setMappingForm({ hospitalProcedure: '', hospitalCode: '', department: '' });
        }
        setShowMappingModal(true);
    };

    const filteredPackages = searchQuery.trim()
        ? packages.filter(p => 
            p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.code?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : packages;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', { 
            style: 'currency', 
            currency: 'INR',
            maximumFractionDigits: 0 
        }).format(amount);
    };

    const cardStyle = isDark ? 'bg-dark text-white border-secondary' : '';

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" />
                <div className="mt-2">Loading PMJAY configuration...</div>
            </Container>
        );
    }

    return (
        <Container fluid className="py-4">
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1 fw-bold d-flex align-items-center gap-2">
                        <Settings size={28} className="text-primary" />
                        PMJAY Procedure Manager
                    </h2>
                    <small className="text-muted">Manage packages, procedures, and hospital mappings</small>
                </div>
                <div className="d-flex gap-2">
                    <Button 
                        variant="outline-success" 
                        onClick={handleSync}
                        disabled={syncing}
                    >
                        {syncing ? (
                            <>
                                <Spinner size="sm" className="me-1" />
                                Syncing...
                            </>
                        ) : (
                            <>
                                <RefreshCw size={14} className="me-1" />
                                Sync from NHA
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {syncMessage && (
                <Alert variant={syncMessage.type} dismissible onClose={() => setSyncMessage(null)}>
                    {syncMessage.text}
                </Alert>
            )}

            {/* Hospital Empanelment Status */}
            <Card className={`mb-4 border-0 shadow-sm ${cardStyle}`}>
                <Card.Body>
                    <Row className="align-items-center">
                        <Col md={8}>
                            <div className="d-flex align-items-center gap-3">
                                <Building size={32} className="text-primary" />
                                <div>
                                    <h5 className="mb-0">Hospital Empanelment</h5>
                                    {empanelment ? (
                                        <div className="d-flex gap-3 mt-1">
                                            <span>SHA Code: <code>{empanelment.sha_code}</code></span>
                                            <span>Tier: <Badge bg="info">{empanelment.city_tier}</Badge></span>
                                            <Badge bg={empanelment.active ? 'success' : 'danger'}>
                                                {empanelment.active ? 'Active' : 'Inactive'}
                                            </Badge>
                                        </div>
                                    ) : (
                                        <span className="text-muted">Not registered with PMJAY</span>
                                    )}
                                </div>
                            </div>
                        </Col>
                        <Col md={4} className="text-end">
                            <div className="text-muted small">Total Packages</div>
                            <h3 className="mb-0 fw-bold">{packages.length}</h3>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Tabs */}
            <Tabs
                activeKey={activeTab}
                onSelect={k => setActiveTab(k)}
                className="mb-4"
            >
                <Tab eventKey="packages" title={<span><Package size={14} className="me-1" />Packages</span>}>
                    {/* Search */}
                    <InputGroup className="mb-3" style={{ maxWidth: 400 }}>
                        <InputGroup.Text className={isDark ? 'bg-secondary border-secondary' : ''}>
                            <Search size={14} />
                        </InputGroup.Text>
                        <Form.Control
                            placeholder="Search packages..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className={isDark ? 'bg-dark text-white border-secondary' : ''}
                        />
                    </InputGroup>

                    <Card className={`border-0 shadow-sm ${cardStyle}`}>
                        <Card.Body className="p-0">
                            <Table hover responsive className={`mb-0 ${isDark ? 'table-dark' : ''}`}>
                                <thead className={isDark ? '' : 'bg-light'}>
                                    <tr>
                                        <th>Code</th>
                                        <th>Package Name</th>
                                        <th>Specialty</th>
                                        <th className="text-center">Pre-Auth</th>
                                        <th className="text-end">Rate (T2)</th>
                                        <th className="text-center">Mapped</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPackages.map(pkg => {
                                        const isMapped = mappings.some(m => m.pmjay_package_code === pkg.code);
                                        return (
                                            <tr key={pkg.code}>
                                                <td><code>{pkg.code}</code></td>
                                                <td>{pkg.name}</td>
                                                <td>
                                                    <Badge bg="secondary">{pkg.specialty_code}</Badge>
                                                </td>
                                                <td className="text-center">
                                                    {pkg.requires_preauth ? (
                                                        <Check size={16} className="text-success" />
                                                    ) : (
                                                        <X size={16} className="text-muted" />
                                                    )}
                                                </td>
                                                <td className="text-end fw-bold">
                                                    {formatCurrency(pkg.base_rate || pkg.tier_2_rate || 0)}
                                                </td>
                                                <td className="text-center">
                                                    {isMapped ? (
                                                        <Badge bg="success">
                                                            <Link2 size={10} /> Mapped
                                                        </Badge>
                                                    ) : (
                                                        <Badge bg="warning" text="dark">Unmapped</Badge>
                                                    )}
                                                </td>
                                                <td>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline-primary"
                                                        onClick={() => openMappingModal(pkg)}
                                                    >
                                                        <Edit2 size={12} />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>

                <Tab eventKey="specialties" title={<span><Building size={14} className="me-1" />Specialties</span>}>
                    <Row className="g-3">
                        {specialties.map(spec => (
                            <Col md={4} lg={3} key={spec.code}>
                                <Card className={`h-100 border-0 shadow-sm ${cardStyle}`}>
                                    <Card.Body>
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div>
                                                <h6 className="mb-1">{spec.name}</h6>
                                                <code className="small">{spec.code}</code>
                                            </div>
                                            <Badge bg={spec.active !== false ? 'success' : 'secondary'}>
                                                {spec.package_count || packages.filter(p => p.specialty_code === spec.code).length} pkgs
                                            </Badge>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Tab>

                <Tab eventKey="mappings" title={<span><Link2 size={14} className="me-1" />Mappings</span>}>
                    {mappings.length === 0 ? (
                        <Card className={`border-0 shadow-sm text-center py-5 ${cardStyle}`}>
                            <Card.Body>
                                <AlertTriangle size={48} className="text-warning mb-3" />
                                <h5>No Procedure Mappings</h5>
                                <p className="text-muted">
                                    Map your hospital procedures to PMJAY packages for accurate billing
                                </p>
                                <Button variant="primary" onClick={() => setActiveTab('packages')}>
                                    <Plus size={14} className="me-1" />
                                    Create Mapping
                                </Button>
                            </Card.Body>
                        </Card>
                    ) : (
                        <Card className={`border-0 shadow-sm ${cardStyle}`}>
                            <Card.Body className="p-0">
                                <Table hover responsive className={`mb-0 ${isDark ? 'table-dark' : ''}`}>
                                    <thead className={isDark ? '' : 'bg-light'}>
                                        <tr>
                                            <th>PMJAY Package</th>
                                            <th>Hospital Procedure</th>
                                            <th>Hospital Code</th>
                                            <th>Department</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {mappings.map((m, i) => (
                                            <tr key={i}>
                                                <td><code>{m.pmjay_package_code}</code></td>
                                                <td>{m.hospital_procedure}</td>
                                                <td><code>{m.hospital_code}</code></td>
                                                <td>{m.department}</td>
                                                <td>
                                                    <Button size="sm" variant="outline-danger">
                                                        <Trash2 size={12} />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card.Body>
                        </Card>
                    )}
                </Tab>
            </Tabs>

            {/* Mapping Modal */}
            <Modal show={showMappingModal} onHide={() => setShowMappingModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Map Hospital Procedure</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedPackage && (
                        <>
                            <div className="p-3 bg-light rounded mb-3">
                                <div className="small text-muted">PMJAY Package</div>
                                <div className="fw-bold">{selectedPackage.name}</div>
                                <code>{selectedPackage.code}</code>
                            </div>

                            <Form.Group className="mb-3">
                                <Form.Label>Hospital Procedure Name</Form.Label>
                                <Form.Control
                                    value={mappingForm.hospitalProcedure}
                                    onChange={e => setMappingForm(f => ({ ...f, hospitalProcedure: e.target.value }))}
                                    placeholder="e.g., Cataract Surgery - Left Eye"
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Hospital Procedure Code</Form.Label>
                                <Form.Control
                                    value={mappingForm.hospitalCode}
                                    onChange={e => setMappingForm(f => ({ ...f, hospitalCode: e.target.value }))}
                                    placeholder="e.g., OPH-001"
                                />
                            </Form.Group>

                            <Form.Group className="mb-3">
                                <Form.Label>Department</Form.Label>
                                <Form.Control
                                    value={mappingForm.department}
                                    onChange={e => setMappingForm(f => ({ ...f, department: e.target.value }))}
                                    placeholder="e.g., Ophthalmology"
                                />
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowMappingModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSaveMapping}>
                        <Save size={14} className="me-1" />
                        Save Mapping
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default PMJAYProcedureManager;
