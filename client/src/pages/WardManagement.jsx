import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Card, Row, Col, Table, Button, Modal, Form, Badge, Spinner, Alert, Tabs, Tab } from 'react-bootstrap';
import { Building2, Bed, Plus, Edit2, Trash2, Users, Activity, RefreshCw, Package, IndianRupee, Tag, AlertTriangle, UserCheck, Calendar, Clock, Check, ArrowRightLeft, Zap } from 'lucide-react';
import api from '../utils/axiosInstance';
import { formatCurrency } from '../utils/currency';
import ClinicalModal from '../components/ClinicalModal';

const WardManagement = () => {
    const navigate = useNavigate();
    const [wards, setWards] = useState([]);
    const [beds, setBeds] = useState([]);
    const [consumables, setConsumables] = useState([]);
    const [charges, setCharges] = useState([]);
    const [nurses, setNurses] = useState([]); // List of nurses
    const [roster, setRoster] = useState([]); // Current assignments
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('wards');

    // Equipment State
    const [equipmentTypes, setEquipmentTypes] = useState([]);
    const [showEquipmentModal, setShowEquipmentModal] = useState(false);
    const [equipmentForm, setEquipmentForm] = useState({ name: '', category: 'Respiratory', rate_per_24hr: '', description: '' });
    const [editingEquipment, setEditingEquipment] = useState(null);

    // Equipment Assignment State
    const [showAssignEquipmentModal, setShowAssignEquipmentModal] = useState(false);
    const [assignEquipmentBed, setAssignEquipmentBed] = useState(null);
    const [selectedEquipmentId, setSelectedEquipmentId] = useState('');

    // Ward Modal State
    const [showWardModal, setShowWardModal] = useState(false);
    const [editingWard, setEditingWard] = useState(null);
    const [wardForm, setWardForm] = useState({ name: '', type: 'General', floor: '', capacity: 10, billing_cycle: 24 });

    // Bed Modal State
    const [showBedModal, setShowBedModal] = useState(false);
    const [editingBed, setEditingBed] = useState(null);
    const [bedForm, setBedForm] = useState({ ward_id: '', bed_number: '', bed_type: 'Standard', daily_rate: '' });

    // Price Request Modal State
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [requestItem, setRequestItem] = useState(null);
    const [requestType, setRequestType] = useState('PRICE_CHANGE'); // PRICE_CHANGE, TOGGLE_STATUS, NEW_ITEM
    const [itemType, setItemType] = useState('CONSUMABLE'); // CONSUMABLE, SERVICE
    const [requestForm, setRequestForm] = useState({ new_name: '', new_price: '', notes: '' });

    // Roster State
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedShift, setSelectedShift] = useState('Morning'); // Morning, Evening, Night, General
    const [rosterWard, setRosterWard] = useState(null); // Selected ward for roster
    const [selectedNurse, setSelectedNurse] = useState('');
    const [selectedBeds, setSelectedBeds] = useState([]); // Array of bed IDs

    // Selected Ward for Bed View
    const [selectedWard, setSelectedWard] = useState(null);

    // Clinical Modal State
    const [showClinicalModal, setShowClinicalModal] = useState(false);
    const [clinicalBed, setClinicalBed] = useState(null);

    // Transfer Modal State
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferFromBed, setTransferFromBed] = useState(null);
    const [transferTargetWard, setTransferTargetWard] = useState('');
    const [transferTargetBed, setTransferTargetBed] = useState('');



    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [wardsRes, bedsRes, consRes, chargesRes, eqRes] = await Promise.all([
                api.get('/api/ward/wards'),
                api.get('/api/ward/beds'),
                api.get('/api/ward/consumables'),
                api.get('/api/ward/charges'),
                api.get('/api/equipment/types').catch(() => ({ data: [] }))
            ]);
            
            // Fix: Handle wrapped responses (res.data.data) locally or unwrapped (res.data)
            // The backend ResponseHandler wraps data in 'data' key for success.
            const getListData = (res) => Array.isArray(res.data) ? res.data : (res.data?.data || []);

            setWards(getListData(wardsRes));
            setBeds(getListData(bedsRes));
            setConsumables(getListData(consRes));
            setCharges(getListData(chargesRes));
            setEquipmentTypes(getListData(eqRes));

            const wardsData = getListData(wardsRes);
            if (wardsData.length > 0 && !rosterWard) {
                setRosterWard(wardsData[0].id); // Default to first ward for roster
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Failed to load ward data');
        } finally {
            setLoading(false);
        }
    };

    const fetchNurses = async () => {
        try {
            const res = await api.get('/api/roster/nurses');
            setNurses(res.data.data || res.data || []);
        } catch (err) {
            console.error('Failed to fetch nurses:', err);
        }
    };

    const fetchRoster = async () => {
        if (!rosterWard) return;
        try {
            const res = await api.get(`/api/roster/roster?ward_id=${rosterWard}&date=${selectedDate}`);
            setRoster(res.data.data || res.data || []);
        } catch (err) {
            console.error('Failed to fetch roster:', err);
        }
    };

    useEffect(() => {
        fetchData();
        fetchNurses();
    }, []);

    useEffect(() => {
        if (rosterWard && selectedDate) {
            fetchRoster();
        }
    }, [rosterWard, selectedDate]);

    const handleAssignShift = async () => {
        if (!selectedNurse || selectedBeds.length === 0) {
            alert('Please select a nurse and at least one bed.');
            return;
        }

        try {
            await api.post('/api/roster/assign', {
                nurse_id: selectedNurse,
                ward_id: rosterWard,
                shift_type: selectedShift,
                assignment_date: selectedDate,
                bed_ids: selectedBeds
            });
            alert('✅ Assignment saved successfully!');
            fetchRoster();
            setSelectedNurse('');
            setSelectedBeds([]);
        } catch (err) {
            console.error(err);
            alert('Failed to save assignment');
        }
    };

    const toggleBedSelection = (bedId) => {
        if (selectedBeds.includes(bedId)) {
            setSelectedBeds(selectedBeds.filter(id => id !== bedId));
        } else {
            setSelectedBeds([...selectedBeds, bedId]);
        }
    };

    const openRequestModal = (item, iType, rType) => {
        setRequestItem(item);
        setItemType(iType);
        setRequestType(rType);
        setRequestForm({
            new_name: rType === 'NEW_ITEM' ? '' : item.name,
            new_price: rType === 'NEW_ITEM' ? '' : item.price || item.unit_price,
            notes: ''
        });
        setShowRequestModal(true);
    };

    const handleRequestSubmit = async () => {
        try {
            await api.post('/api/ward/change-request', {
                request_type: requestType,
                item_type: itemType,
                item_id: requestItem?.id,
                new_name: requestForm.new_name,
                new_price: parseFloat(requestForm.new_price),
                notes: requestForm.notes
            });
            alert('✅ Request submitted for approval');
            setShowRequestModal(false);
        } catch (err) {
            console.error(err);
            alert(`❌ Failed to submit request: ${err.response?.data?.error || err.message}`);
        }
    };

    // Ward CRUD
    const openWardModal = (ward = null) => {
        if (ward) {
            setEditingWard(ward);
            setWardForm({ name: ward.name, type: ward.type, floor: ward.floor || '', capacity: ward.capacity });
        } else {
            setEditingWard(null);
            setWardForm({ name: '', type: 'General', floor: '', capacity: 10 });
        }
        setShowWardModal(true);
    };

    const handleSaveWard = async (e) => {
        e.preventDefault();
        try {
            if (editingWard) {
                await api.put(`/api/ward/wards/${editingWard.id}`, wardForm);
            } else {
                await api.post('/api/ward/wards', wardForm);
            }
            setShowWardModal(false);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to save ward');
        }
    };

    const handleDeleteWard = async (id) => {
        if (!window.confirm('Are you sure you want to delete this ward?')) return;
        try {
            await api.delete(`/api/ward/wards/${id}`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete ward');
        }
    };

    // Bed CRUD
    const openBedModal = (bed = null, wardId = null) => {
        if (bed) {
            setEditingBed(bed);
            setBedForm({ ward_id: bed.ward_id, bed_number: bed.bed_number, bed_type: bed.bed_type });
        } else {
            setEditingBed(null);
            setBedForm({ ward_id: wardId || (wards[0]?.id || ''), bed_number: '', bed_type: 'Standard' });
        }
        setShowBedModal(true);
    };

    const handleSaveBed = async (e) => {
        e.preventDefault();
        try {
            if (editingBed) {
                await api.put(`/api/ward/beds/${editingBed.id}`, bedForm);
            } else {
                await api.post('/api/ward/beds', bedForm);
            }
            setShowBedModal(false);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to save bed');
        }
    };

    const handleDeleteBed = async (id) => {
        if (!window.confirm('Are you sure you want to delete this bed?')) return;
        try {
            await api.delete(`/api/ward/beds/${id}`);
            fetchData();
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to delete bed');
        }
    };

    const openTransferModal = (bed) => {
        setTransferFromBed(bed);
        setTransferTargetWard(bed.ward_id); // Default to current ward
        setTransferTargetBed('');
        setShowTransferModal(true);
    };

    const handleTransfer = async () => {
        if (!transferFromBed || !transferTargetWard || !transferTargetBed) {
            alert('Please select a target ward and bed.');
            return;
        }

        const targetWardName = wards.find(w => w.id == transferTargetWard)?.name;
        const targetBedNum = beds.find(b => b.id == transferTargetBed)?.bed_number;

        if(!targetWardName || !targetBedNum) return;

        try {
            await api.post('/api/admissions/transfer', {
                admission_id: transferFromBed.admission_id,
                to_ward: targetWardName,
                to_bed: targetBedNum
            });
            alert('✅ Patient transferred successfully');
            setShowTransferModal(false);
            fetchData();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || 'Transfer failed');
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Available': return <Badge bg="success">Available</Badge>;
            case 'Occupied': return <Badge bg="danger">Occupied</Badge>;
            case 'Maintenance': return <Badge bg="warning">Maintenance</Badge>;
            case 'Reserved': return <Badge bg="info">Reserved</Badge>;
            default: return <Badge bg="secondary">{status}</Badge>;
        }
    };

    const filteredBeds = selectedWard
        ? beds.filter(b => b.ward_id === selectedWard.id)
        : beds;

    // Roster: Get beds for the selected roster ward
    const rosterBeds = rosterWard ? beds.filter(b => b.ward_id === parseInt(rosterWard)) : [];

    // Helper to check if a bed is assigned in the current view
    const getAssignedNurse = (bedId) => {
        // Find an assignment that includes this bedId and matches the selected shift
        // Note: The roster fetched is for the ward and date.
        // We filter locally by shift to show coverage.
        const assignment = roster.find(r => r.shift_type === selectedShift && r.bed_ids.includes(bedId));
        return assignment ? assignment.nurse_name : null;
    };

    if (loading) {
        return (
            <Container className="d-flex justify-content-center align-items-center min-vh-100">
                <Spinner animation="border" variant="primary" />
            </Container>
        );
    }

    return (
        <Container fluid className="p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold d-flex align-items-center gap-2">
                    <Building2 size={28} className="text-primary" />
                    Ward & Bed Management
                </h2>
                <div className="d-flex gap-2">
                    <Button variant="success" onClick={() => navigate('/ward')}>
                        <Activity size={16} className="me-1" /> Go to Clinical Dashboard
                    </Button>
                    <Button variant="outline-primary" onClick={fetchData}>
                        <RefreshCw size={16} className="me-1" /> Refresh
                    </Button>
                </div>
            </div>

            {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

            {/* Summary Cards */}
            <Row className="mb-4">
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-primary text-white">
                        <Card.Body className="d-flex align-items-center">
                            <Building2 size={40} className="me-3 opacity-75" />
                            <div>
                                <div className="h3 mb-0">{wards.length}</div>
                                <div className="small">Total Wards</div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-success text-white">
                        <Card.Body className="d-flex align-items-center">
                            <Bed size={40} className="me-3 opacity-75" />
                            <div>
                                <div className="h3 mb-0">{beds.length}</div>
                                <div className="small">Total Beds</div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-info text-white">
                        <Card.Body className="d-flex align-items-center">
                            <Activity size={40} className="me-3 opacity-75" />
                            <div>
                                <div className="h3 mb-0">{beds.filter(b => b.status === 'Available').length}</div>
                                <div className="small">Available Beds</div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-warning text-dark">
                        <Card.Body className="d-flex align-items-center">
                            <Users size={40} className="me-3 opacity-75" />
                            <div>
                                <div className="h3 mb-0">{beds.filter(b => b.status === 'Occupied').length}</div>
                                <div className="small">Occupied Beds</div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
                {/* Wards Tab */}
                <Tab eventKey="wards" title={<span><Building2 size={16} className="me-1" />Wards</span>}>
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                            <h5 className="mb-0 fw-bold">Ward List</h5>
                            <Button variant="primary" size="sm" onClick={() => openWardModal()}>
                                <Plus size={16} className="me-1" /> Add Ward
                            </Button>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Table hover responsive className="mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th>Ward Name</th>
                                        <th>Type</th>
                                        <th>Floor</th>
                                        <th>Capacity</th>
                                        <th>Available</th>
                                        <th>Occupied</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {wards.map(ward => (
                                        <tr key={ward.id}>
                                            <td className="fw-bold">{ward.name}</td>
                                            <td><Badge bg="secondary">{ward.type}</Badge></td>
                                            <td>{ward.floor || '-'}</td>
                                            <td>{ward.capacity}</td>
                                            <td><Badge bg="success">{ward.available_beds || 0}</Badge></td>
                                            <td><Badge bg="danger">{ward.occupied_beds || 0}</Badge></td>
                                            <td>
                                                <Button variant="outline-primary" size="sm" className="me-1" onClick={() => openWardModal(ward)}>
                                                    <Edit2 size={14} />
                                                </Button>
                                                <Button variant="outline-danger" size="sm" className="me-1" type="button" onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteWard(ward.id); }}>
                                                    <Trash2 size={14} />
                                                </Button>
                                                <Button variant="outline-info" size="sm" onClick={() => { setSelectedWard(ward); setActiveTab('beds'); }}>
                                                    <Bed size={14} className="me-1" /> View Beds
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {wards.length === 0 && (
                                        <tr><td colSpan="7" className="text-center text-muted py-4">No wards found. Add your first ward!</td></tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>

                {/* Beds Tab */}
                <Tab eventKey="beds" title={<span><Bed size={16} className="me-1" />Beds</span>}>
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center gap-3">
                                <h5 className="mb-0 fw-bold">
                                    {selectedWard ? `Beds in ${selectedWard.name}` : 'All Beds'}
                                </h5>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <Form.Select 
                                    size="sm" 
                                    style={{ width: '180px' }}
                                    value={selectedWard?.id || ''}
                                    onChange={(e) => {
                                        if (e.target.value === '') {
                                            setSelectedWard(null);
                                        } else {
                                            const ward = wards.find(w => w.id === parseInt(e.target.value));
                                            setSelectedWard(ward || null);
                                        }
                                    }}
                                >
                                    <option value="">All Wards</option>
                                    {wards.map(w => (
                                        <option key={w.id} value={w.id}>{w.name}</option>
                                    ))}
                                </Form.Select>
                                <Button variant="primary" size="sm" onClick={() => openBedModal(null, selectedWard?.id)}>
                                    <Plus size={16} className="me-1" /> Add Bed
                                </Button>
                            </div>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Table hover responsive className="mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th>Bed Number</th>
                                        <th>Ward</th>
                                        <th>Type</th>
                                        <th>Status</th>
                                        <th>Patient</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBeds.map(bed => (
                                        <tr key={bed.id}>
                                            <td className="fw-bold">{bed.bed_number}</td>
                                            <td>{bed.ward_name}</td>
                                            <td><Badge bg="secondary">{bed.bed_type}</Badge></td>
                                            <td>{getStatusBadge(bed.status)}</td>
                                            <td>{bed.patient_name || '-'}</td>
                                            <td>
                                                <Button variant="outline-primary" size="sm" className="me-1" onClick={() => openBedModal(bed)}>
                                                    <Edit2 size={14} />
                                                </Button>
                                                {bed.status === 'Occupied' && (
                                                    <Button 
                                                        variant="outline-success" 
                                                        size="sm" 
                                                        className="me-1"
                                                        onClick={() => { setClinicalBed(bed); setShowClinicalModal(true); }}
                                                        title="Clinical View (Vitals & eMAR)"
                                                    >
                                                        <Activity size={14} />
                                                    </Button>
                                                )}
                                                {(bed.status === 'Occupied' || bed.patient_name) && (
                                                    <Button
                                                        variant="warning"
                                                        size="sm"
                                                        className="me-1 text-dark fw-bold"
                                                        onClick={() => openTransferModal(bed)}
                                                        title="Transfer Patient"
                                                        style={{ minWidth: '90px' }}
                                                    >
                                                        <ArrowRightLeft size={14} className="me-1" /> Transfer
                                                    </Button>
                                                )}
                                                {bed.status === 'Occupied' && (
                                                    <Button
                                                        variant="outline-info"
                                                        size="sm"
                                                        className="me-1"
                                                        onClick={() => {
                                                            setAssignEquipmentBed(bed);
                                                            setSelectedEquipmentId('');
                                                            setShowAssignEquipmentModal(true);
                                                        }}
                                                        title="Assign Equipment"
                                                    >
                                                        <Zap size={14} />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => handleDeleteBed(bed.id)}
                                                    disabled={bed.status === 'Occupied'}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredBeds.length === 0 && (
                                        <tr><td colSpan="6" className="text-center text-muted py-4">No beds found.</td></tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>

                {/* Nurse Assignments Tab - NEW */}
                <Tab eventKey="roster" title={<span><UserCheck size={16} className="me-1" />Nurse Assignments</span>}>
                    <Card className="border-0 shadow-sm mb-3">
                        <Card.Body>
                            <Row className="g-3 align-items-end">
                                <Col md={3}>
                                    <Form.Label className="d-flex align-items-center"><Building2 size={14} className="me-1" /> Select Ward</Form.Label>
                                    <Form.Select value={rosterWard || ''} onChange={e => setRosterWard(e.target.value)}>
                                        {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                    </Form.Select>
                                </Col>
                                <Col md={3}>
                                    <Form.Label className="d-flex align-items-center"><Calendar size={14} className="me-1" /> Date</Form.Label>
                                    <Form.Control type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                                </Col>
                                <Col md={3}>
                                    <Form.Label className="d-flex align-items-center"><Clock size={14} className="me-1" /> Shift</Form.Label>
                                    <Form.Select value={selectedShift} onChange={e => setSelectedShift(e.target.value)}>
                                        <option value="Morning">Morning (8 AM - 2 PM)</option>
                                        <option value="Evening">Evening (2 PM - 8 PM)</option>
                                        <option value="Night">Night (8 PM - 8 AM)</option>
                                        <option value="General">General (8 AM - 5 PM)</option>
                                    </Form.Select>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    <Row>
                        <Col md={4}>
                            <Card className="border-0 shadow-sm h-100">
                                <Card.Header className="bg-white fw-bold">Assign Nurse</Card.Header>
                                <Card.Body>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Select Nurse</Form.Label>
                                        <Form.Select value={selectedNurse} onChange={e => setSelectedNurse(e.target.value)}>
                                            <option value="">Select a Nurse...</option>
                                            {nurses.map(n => (
                                                <option key={n.id} value={n.id}>{n.username} ({n.department || 'Nursing'})</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>

                                    <div className="d-grid">
                                        <Button variant="primary" onClick={handleAssignShift} disabled={!selectedNurse || selectedBeds.length === 0}>
                                            <UserCheck size={16} className="me-2" />
                                            Assign {selectedBeds.length} Beds
                                        </Button>
                                    </div>

                                    <Alert variant="info" className="mt-3 small">
                                        Select beds from the list on the right, then click Assign.
                                        Existing assignments for this nurse on this shift will be overwritten.
                                    </Alert>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={8}>
                            <Card className="border-0 shadow-sm h-100">
                                <Card.Header className="bg-white fw-bold d-flex justify-content-between align-items-center">
                                    <span>Bed Coverage ({selectedShift})</span>
                                    <Badge bg="primary">{rosterBeds.length} Beds</Badge>
                                </Card.Header>
                                <Card.Body className="p-0">
                                    <Table hover responsive className="mb-0">
                                        <thead className="bg-light">
                                            <tr>
                                                <th style={{ width: '50px' }}>Select</th>
                                                <th>Bed No</th>
                                                <th>Status</th>
                                                <th>Current Patient</th>
                                                <th>Assigned Nurse ({selectedShift})</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rosterBeds.map(bed => {
                                                const assignedTo = getAssignedNurse(bed.id);
                                                const isOccupied = bed.status === 'Occupied';
                                                return (
                                                    <tr key={bed.id} className={selectedBeds.includes(bed.id) ? 'table-primary' : (!isOccupied ? 'opacity-50' : '')}>
                                                        <td>
                                                            <Form.Check
                                                                type="checkbox"
                                                                checked={selectedBeds.includes(bed.id)}
                                                                onChange={() => toggleBedSelection(bed.id)}
                                                                disabled={!isOccupied}
                                                                title={!isOccupied ? 'Cannot assign nurse to empty bed' : ''}
                                                            />
                                                        </td>
                                                        <td className="fw-bold">{bed.bed_number}</td>
                                                        <td>{getStatusBadge(bed.status)}</td>
                                                        <td>{bed.patient_name || <span className="text-muted fst-italic">No patient</span>}</td>
                                                        <td>
                                                            {assignedTo ? (
                                                                <Badge bg="success" className="d-flex align-items-center w-auto" style={{ width: 'fit-content' }}>
                                                                    <UserCheck size={12} className="me-1" /> {assignedTo}
                                                                </Badge>
                                                            ) : (
                                                                isOccupied ? 
                                                                    <span className="text-muted small">Unassigned</span> :
                                                                    <span className="text-muted small fst-italic">N/A (empty bed)</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {rosterBeds.length === 0 && (
                                                <tr><td colSpan="5" className="text-center py-4 text-muted">No beds in this ward.</td></tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Tab>

                {/* Consumables Tab */}
                <Tab eventKey="consumables" title={<span><Package size={16} className="me-1" />Consumables</span>}>
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                            <h5 className="mb-0 fw-bold">Ward Consumables</h5>
                            <Button variant="primary" size="sm" onClick={() => openRequestModal(null, 'CONSUMABLE', 'NEW_ITEM')}>
                                <Plus size={16} className="me-1" /> Request New Item
                            </Button>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Table hover responsive className="mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th>Item Name</th>
                                        <th>Category</th>
                                        <th>Unit Price</th>
                                        <th>Stock</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {consumables.map(item => (
                                        <tr key={item.id}>
                                            <td className="fw-bold">{item.name}</td>
                                            <td><Badge bg="info" className="text-dark bg-opacity-25">{item.category}</Badge></td>
                                            <td className="fw-bold text-success">{formatCurrency(item.price)}</td>
                                            <td>{item.stock_quantity}</td>
                                            <td>
                                                <Badge bg={item.active ? 'success' : 'secondary'}>{item.active ? 'Active' : 'Inactive'}</Badge>
                                            </td>
                                            <td>
                                                <Button variant="outline-primary" size="sm" className="me-1" onClick={() => openRequestModal(item, 'CONSUMABLE', 'PRICE_CHANGE')}>
                                                    <IndianRupee size={14} className="me-1" /> Price
                                                </Button>
                                                <Button variant="outline-warning" size="sm" onClick={() => openRequestModal(item, 'CONSUMABLE', 'TOGGLE_STATUS')}>
                                                    {item.active ? 'Exclude' : 'Include'}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>

                {/* Service Charges Tab */}
                <Tab eventKey="charges" title={<span><Tag size={16} className="me-1" />Charges</span>}>
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                            <h5 className="mb-0 fw-bold">Bed & Service Charges</h5>
                            {/* Typically charges are predefined but allowing new ones via request */}
                            <Button variant="primary" size="sm" onClick={() => openRequestModal(null, 'SERVICE', 'NEW_ITEM')}>
                                <Plus size={16} className="me-1" /> Request New Charge
                            </Button>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Table hover responsive className="mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th>Service Name</th>
                                        <th>Category</th>
                                        <th>12-Hour Cycle Rate</th>
                                        <th>Description</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {charges.map(charge => (
                                        <tr key={charge.id}>
                                            <td className="fw-bold">{charge.name}</td>
                                            <td><Badge bg="secondary">{charge.category}</Badge></td>
                                            <td className="fw-bold text-primary">{formatCurrency(charge.price)}</td>
                                            <td className="text-muted small">{charge.description || '-'}</td>
                                            <td>
                                                <Button variant="outline-primary" size="sm" onClick={() => openRequestModal(charge, 'SERVICE', 'PRICE_CHANGE')}>
                                                    <Edit2 size={14} className="me-1" /> Edit Price
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>

                {/* Equipment Tab */}
                <Tab eventKey="equipment" title={<span><Zap size={16} className="me-1" />Equipment</span>}>
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                            <h5 className="mb-0 fw-bold">Medical Equipment (24-Hour Billing)</h5>
                            <Button variant="primary" size="sm" onClick={() => {
                                setEditingEquipment(null);
                                setEquipmentForm({ name: '', category: 'Respiratory', rate_per_24hr: '', description: '' });
                                setShowEquipmentModal(true);
                            }}>
                                <Plus size={16} className="me-1" /> Request New Equipment
                            </Button>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Table hover responsive className="mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th>Equipment Name</th>
                                        <th>Category</th>
                                        <th>24-Hour Rate</th>
                                        <th>Description</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {equipmentTypes.map(eq => (
                                        <tr key={eq.id}>
                                            <td className="fw-bold">{eq.name}</td>
                                            <td><Badge bg="info" className="text-dark bg-opacity-25">{eq.category}</Badge></td>
                                            <td className="fw-bold text-success">{formatCurrency(eq.rate_per_24hr)}/day</td>
                                            <td className="text-muted small">{eq.description || '-'}</td>
                                            <td>
                                                <Button 
                                                    variant="outline-primary" 
                                                    size="sm" 
                                                    className="me-1"
                                                    onClick={() => {
                                                        setEditingEquipment(eq);
                                                        setEquipmentForm({
                                                            name: eq.name,
                                                            category: eq.category,
                                                            rate_per_24hr: eq.rate_per_24hr,
                                                            description: eq.description || ''
                                                        });
                                                        setShowEquipmentModal(true);
                                                    }}
                                                >
                                                    <Edit2 size={14} /> Edit
                                                </Button>
                                                <Button 
                                                    variant="outline-danger" 
                                                    size="sm"
                                                    onClick={async () => {
                                                        if (window.confirm(`Request to delete "${eq.name}"? Admin approval required.`)) {
                                                            try {
                                                                await api.post(`/api/equipment/types/${eq.id}/request-delete`);
                                                                alert('Delete request submitted for admin approval');
                                                            } catch (err) {
                                                                alert(err.response?.data?.error || 'Failed to submit request');
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <Trash2 size={14} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {equipmentTypes.length === 0 && (
                                        <tr><td colSpan="5" className="text-center text-muted py-4">No equipment types found.</td></tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>

            {/* Ward Modal */}
            <Modal show={showWardModal} onHide={() => setShowWardModal(false)} centered>
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>{editingWard ? 'Edit Ward' : 'Add New Ward'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSaveWard}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Ward Name *</Form.Label>
                            <Form.Control
                                value={wardForm.name}
                                onChange={e => setWardForm({ ...wardForm, name: e.target.value })}
                                required
                                placeholder="e.g., ICU, General Ward"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Type</Form.Label>
                            <Form.Select value={wardForm.type} onChange={e => setWardForm({ ...wardForm, type: e.target.value })}>
                                <option value="General">General</option>
                                <option value="ICU">ICU</option>
                                <option value="NICU">NICU</option>
                                <option value="PICU">PICU</option>
                                <option value="CCU">CCU</option>
                                <option value="HDU">HDU</option>
                                <option value="Emergency">Emergency</option>
                                <option value="Maternity">Maternity</option>
                                <option value="Pediatric">Pediatric</option>
                                <option value="Surgical">Surgical</option>
                                <option value="Orthopedic">Orthopedic</option>
                                <option value="Private">Private</option>
                            </Form.Select>
                        </Form.Group>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Floor</Form.Label>
                                    <Form.Control
                                        value={wardForm.floor}
                                        onChange={e => setWardForm({ ...wardForm, floor: e.target.value })}
                                        placeholder="e.g., Ground Floor, 1st Floor"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Capacity</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={wardForm.capacity}
                                        onChange={e => setWardForm({ ...wardForm, capacity: parseInt(e.target.value) || 0 })}
                                        min={1}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Billing Cycle</Form.Label>
                                    <Form.Select 
                                        value={wardForm.billing_cycle || 24} 
                                        onChange={e => setWardForm({ ...wardForm, billing_cycle: parseInt(e.target.value) })}
                                    >
                                        <option value={24}>24-Hour Cycle</option>
                                        <option value={12}>12-Hour Cycle</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowWardModal(false)}>Cancel</Button>
                        <Button variant="primary" type="submit">{editingWard ? 'Update' : 'Create'} Ward</Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Bed Modal */}
            <Modal show={showBedModal} onHide={() => setShowBedModal(false)} centered>
                <Modal.Header closeButton className="bg-success text-white">
                    <Modal.Title>{editingBed ? 'Edit Bed' : 'Add New Bed'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSaveBed}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Ward *</Form.Label>
                            <Form.Select
                                value={bedForm.ward_id}
                                onChange={e => setBedForm({ ...bedForm, ward_id: parseInt(e.target.value) })}
                                required
                                disabled={editingBed}
                            >
                                <option value="">Select Ward...</option>
                                {wards.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Bed Number *</Form.Label>
                            <Form.Control
                                value={bedForm.bed_number}
                                onChange={e => setBedForm({ ...bedForm, bed_number: e.target.value })}
                                required
                                placeholder="e.g., ICU-1, GEN-10"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Bed Type</Form.Label>
                            <Form.Select value={bedForm.bed_type} onChange={e => setBedForm({ ...bedForm, bed_type: e.target.value })}>
                                <option value="Standard">Standard</option>
                                <option value="ICU">ICU</option>
                                <option value="Ventilator">Ventilator</option>
                                <option value="Isolation">Isolation</option>
                                <option value="Private">Private</option>
                                <option value="Semi-Private">Semi-Private</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>
                                Rate (₹) {bedForm.ward_id && wards.find(w => w.id === parseInt(bedForm.ward_id))?.billing_cycle === 12 ? '/ 12 hrs' : '/ 24 hrs'}
                            </Form.Label>
                            <Form.Control
                                type="number"
                                value={bedForm.daily_rate}
                                onChange={e => setBedForm({ ...bedForm, daily_rate: e.target.value })}
                                required
                                placeholder="2000"
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowBedModal(false)}>Cancel</Button>
                        <Button variant="success" type="submit">{editingBed ? 'Update' : 'Create'} Bed</Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Request Modal */}
            <Modal show={showRequestModal} onHide={() => setShowRequestModal(false)} centered>
                <Modal.Header closeButton className="bg-warning text-dark">
                    <Modal.Title>
                        {requestType === 'NEW_ITEM' && 'Request New Item'}
                        {requestType === 'PRICE_CHANGE' && 'Price Change Request'}
                        {requestType === 'TOGGLE_STATUS' && 'Change Status Request'}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        {itemType && (
                            <Alert variant="info" className="py-2 mb-3">
                                <small>Requesting change for <strong>{itemType}</strong></small>
                            </Alert>
                        )}

                        {(requestType === 'NEW_ITEM' || requestType === 'PRICE_CHANGE') && (
                            <Form.Group className="mb-3">
                                <Form.Label>Name</Form.Label>
                                <Form.Control
                                    value={requestForm.new_name}
                                    onChange={e => setRequestForm({ ...requestForm, new_name: e.target.value })}
                                    disabled={requestType === 'PRICE_CHANGE'}
                                    placeholder={requestType === 'NEW_ITEM' ? "Enter item name" : ""}
                                />
                            </Form.Group>
                        )}

                        {(requestType === 'PRICE_CHANGE' || requestType === 'NEW_ITEM') && (
                            <Form.Group className="mb-3">
                                <Form.Label>New Price (₹)</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={requestForm.new_price}
                                    onChange={e => setRequestForm({ ...requestForm, new_price: e.target.value })}
                                    placeholder="0.00"
                                />
                            </Form.Group>
                        )}

                        <Form.Group className="mb-3">
                            <Form.Label>Reason / Notes</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={requestForm.notes}
                                onChange={e => setRequestForm({ ...requestForm, notes: e.target.value })}
                                placeholder="Explain why this change is needed..."
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRequestModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleRequestSubmit}>Submit Request</Button>
                </Modal.Footer>
            </Modal>

            {/* Equipment Modal */}
            <Modal show={showEquipmentModal} onHide={() => setShowEquipmentModal(false)} centered>
                <Modal.Header closeButton className="bg-warning">
                    <Modal.Title>{editingEquipment ? 'Request Equipment Edit' : 'Request New Equipment'}</Modal.Title>
                </Modal.Header>
                <Form onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                        if (editingEquipment) {
                            await api.post(`/api/equipment/types/${editingEquipment.id}/request-edit`, equipmentForm);
                            alert('Edit request submitted for admin approval');
                        } else {
                            await api.post('/api/equipment/types/request-add', equipmentForm);
                            alert('Add request submitted for admin approval');
                        }
                        setShowEquipmentModal(false);
                    } catch (err) {
                        alert(err.response?.data?.error || 'Failed to submit request');
                    }
                }}>
                    <Modal.Body>
                        <Alert variant="info" className="mb-3">
                            <AlertTriangle size={16} className="me-2" />
                            All equipment changes require admin approval before taking effect.
                        </Alert>
                        <Form.Group className="mb-3">
                            <Form.Label>Equipment Name *</Form.Label>
                            <Form.Control
                                value={equipmentForm.name}
                                onChange={e => setEquipmentForm({ ...equipmentForm, name: e.target.value })}
                                required
                                placeholder="e.g., Ventilator, Oxygen Concentrator"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Category</Form.Label>
                            <Form.Select 
                                value={equipmentForm.category} 
                                onChange={e => setEquipmentForm({ ...equipmentForm, category: e.target.value })}
                            >
                                <option value="Respiratory">Respiratory</option>
                                <option value="Monitoring">Monitoring</option>
                                <option value="IV/Medication">IV/Medication</option>
                                <option value="Nutrition">Nutrition</option>
                                <option value="Emergency">Emergency</option>
                                <option value="Other">Other</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>24-Hour Rate (₹) *</Form.Label>
                            <Form.Control
                                type="number"
                                value={equipmentForm.rate_per_24hr}
                                onChange={e => setEquipmentForm({ ...equipmentForm, rate_per_24hr: e.target.value })}
                                required
                                placeholder="e.g., 3000"
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={equipmentForm.description}
                                onChange={e => setEquipmentForm({ ...equipmentForm, description: e.target.value })}
                                placeholder="Brief description of the equipment"
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowEquipmentModal(false)}>Cancel</Button>
                        <Button variant="warning" type="submit">
                            <Check size={16} className="me-1" /> Submit for Approval
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Assign Equipment to Patient Modal */}
            <Modal show={showAssignEquipmentModal} onHide={() => setShowAssignEquipmentModal(false)} centered>
                <Modal.Header closeButton className="bg-info text-white">
                    <Modal.Title><Zap size={20} className="me-2" />Assign Equipment</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {assignEquipmentBed && (
                        <Alert variant="light" className="mb-3">
                            <strong>Patient:</strong> {assignEquipmentBed.patient_name || 'Unknown'}<br />
                            <strong>Bed:</strong> {assignEquipmentBed.bed_number} ({assignEquipmentBed.ward_name})
                        </Alert>
                    )}
                    <Form.Group className="mb-3">
                        <Form.Label>Select Equipment *</Form.Label>
                        <Form.Select 
                            value={selectedEquipmentId} 
                            onChange={e => setSelectedEquipmentId(e.target.value)}
                        >
                            <option value="">-- Select Equipment --</option>
                            {equipmentTypes.map(eq => (
                                <option key={eq.id} value={eq.id}>
                                    {eq.name} ({eq.category}) - {formatCurrency(eq.rate_per_24hr)}/day
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                    <Alert variant="warning" className="small">
                        <Clock size={14} className="me-1" />
                        Equipment billing: <strong>24-hour cycle</strong>. Even 1 hour of use = full day charge.
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAssignEquipmentModal(false)}>Cancel</Button>
                    <Button 
                        variant="info" 
                        onClick={async () => {
                            if (!selectedEquipmentId) {
                                alert('Please select equipment');
                                return;
                            }
                            try {
                                await api.post('/api/equipment/assign', {
                                    admission_id: assignEquipmentBed.admission_id,
                                    patient_id: assignEquipmentBed.patient_id,
                                    bed_id: assignEquipmentBed.id,
                                    equipment_type_id: parseInt(selectedEquipmentId)
                                });
                                alert('Equipment assigned successfully!');
                                setShowAssignEquipmentModal(false);
                            } catch (err) {
                                alert(err.response?.data?.error || 'Failed to assign equipment');
                            }
                        }}
                    >
                        <Zap size={16} className="me-1" /> Assign Equipment
                    </Button>
                </Modal.Footer>
            </Modal>

            
            {/* Transfer Modal */}
            <Modal show={showTransferModal} onHide={() => setShowTransferModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Transfer Patient</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {transferFromBed && (
                        <div>
                            <Alert variant="info" className="d-flex align-items-center mb-3">
                                <UserCheck size={18} className="me-2" />
                                <div>
                                    <strong>Patient:</strong> {transferFromBed.patient_name}<br/>
                                    <small>Moving from {transferFromBed.ward_name} (Bed {transferFromBed.bed_number})</small>
                                </div>
                            </Alert>
                            
                            <Form>
                                <Form.Group className="mb-3">
                                    <Form.Label>Target Ward</Form.Label>
                                    <Form.Select 
                                        value={transferTargetWard} 
                                        onChange={(e) => {
                                            setTransferTargetWard(e.target.value);
                                            setTransferTargetBed('');
                                        }}
                                    >
                                        <option value="">Select Ward...</option>
                                        {wards.map(w => (
                                            <option key={w.id} value={w.id}>{w.name} (Free: {w.available_beds})</option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>

                                <Form.Group className="mb-3">
                                    <Form.Label>Target Bed</Form.Label>
                                    <Form.Select 
                                        value={transferTargetBed} 
                                        onChange={(e) => setTransferTargetBed(e.target.value)}
                                        disabled={!transferTargetWard}
                                    >
                                        <option value="">Select Available Bed...</option>
                                        {beds
                                            .filter(b => b.ward_id == transferTargetWard && b.status === 'Available')
                                            .map(b => (
                                                <option key={b.id} value={b.id}>
                                                    Bed {b.bed_number} ({b.bed_type}) - ₹{b.daily_rate}
                                                </option>
                                            ))
                                        }
                                        {beds.filter(b => b.ward_id == transferTargetWard && b.status === 'Available').length === 0 && (
                                            <option disabled>No available beds in this ward</option>
                                        )}
                                    </Form.Select>
                                </Form.Group>
                            </Form>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowTransferModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleTransfer} disabled={!transferTargetBed}>
                        Confirm Transfer
                    </Button>
                </Modal.Footer>
            </Modal>

            <ClinicalModal show={showClinicalModal} onHide={() => setShowClinicalModal(false)} bed={clinicalBed} />
        </Container >
    );
};

export default WardManagement;
