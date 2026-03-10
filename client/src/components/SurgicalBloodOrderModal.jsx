import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Badge, Spinner, Table, Card } from 'react-bootstrap';
import { Droplet, AlertCircle, Clock, Calendar, User, Scissors, CheckCircle } from 'lucide-react';
import api from '../utils/axiosInstance';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const COMPONENT_TYPES = [
    { id: 1, name: 'Packed Red Blood Cells (PRBC)', code: 'PRBC', typical: 2 },
    { id: 2, name: 'Fresh Frozen Plasma (FFP)', code: 'FFP', typical: 2 },
    { id: 3, name: 'Platelet Concentrate', code: 'PLT', typical: 4 },
    { id: 4, name: 'Whole Blood', code: 'WB', typical: 2 },
    { id: 5, name: 'Cryoprecipitate', code: 'CRYO', typical: 1 }
];

const SURGERY_TYPES = [
    { name: 'Minor Surgery', bloodRequired: false, typicalUnits: 0 },
    { name: 'Major Abdominal', bloodRequired: true, typicalUnits: 2 },
    { name: 'Cardiac Surgery', bloodRequired: true, typicalUnits: 4 },
    { name: 'Orthopedic (Major)', bloodRequired: true, typicalUnits: 2 },
    { name: 'Neurosurgery', bloodRequired: true, typicalUnits: 2 },
    { name: 'Vascular Surgery', bloodRequired: true, typicalUnits: 4 },
    { name: 'Obstetric (C-Section)', bloodRequired: true, typicalUnits: 2 },
    { name: 'Trauma Surgery', bloodRequired: true, typicalUnits: 4 },
    { name: 'Liver Transplant', bloodRequired: true, typicalUnits: 10 },
    { name: 'Other', bloodRequired: false, typicalUnits: 0 }
];

/**
 * SurgicalBloodOrderModal - Pre-operative blood reservation
 * Allows surgeons to reserve blood units before scheduled surgeries
 */
const SurgicalBloodOrderModal = ({ show, onHide, surgery, patient, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [stockInfo, setStockInfo] = useState([]);
    const [fetchingStock, setFetchingStock] = useState(false);
    
    const [form, setForm] = useState({
        blood_group: '',
        surgery_type: '',
        scheduled_date: '',
        scheduled_time: '',
        components: [{ type_id: 1, units: 2 }],
        special_requirements: '',
        crossmatch_required: true,
        notes: ''
    });

    // Fetch stock availability
    useEffect(() => {
        if (form.blood_group && show) {
            fetchStock();
        }
    }, [form.blood_group, show]);

    // Pre-fill patient blood group
    useEffect(() => {
        if (patient?.blood_group) {
            setForm(prev => ({ ...prev, blood_group: patient.blood_group }));
        }
        if (surgery?.scheduled_date) {
            const date = new Date(surgery.scheduled_date);
            setForm(prev => ({
                ...prev,
                scheduled_date: date.toISOString().split('T')[0],
                scheduled_time: date.toTimeString().slice(0, 5)
            }));
        }
    }, [patient, surgery]);

    const fetchStock = async () => {
        try {
            setFetchingStock(true);
            const token = localStorage.getItem('token');
            const res = await api.get('/api/blood-bank/dashboard', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = res.data?.data || res.data;
            setStockInfo(data.inventory || []);
        } catch (err) {
            console.error('Failed to fetch stock:', err);
        } finally {
            setFetchingStock(false);
        }
    };

    const handleSurgeryTypeChange = (surgeryType) => {
        const surgeryInfo = SURGERY_TYPES.find(s => s.name === surgeryType);
        setForm(prev => ({
            ...prev,
            surgery_type: surgeryType,
            components: surgeryInfo?.typicalUnits > 0 
                ? [{ type_id: 1, units: surgeryInfo.typicalUnits }]
                : prev.components
        }));
    };

    const updateComponent = (index, field, value) => {
        setForm(prev => ({
            ...prev,
            components: prev.components.map((c, i) => 
                i === index ? { ...c, [field]: value } : c
            )
        }));
    };

    const addComponent = () => {
        setForm(prev => ({
            ...prev,
            components: [...prev.components, { type_id: 1, units: 1 }]
        }));
    };

    const removeComponent = (index) => {
        setForm(prev => ({
            ...prev,
            components: prev.components.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            await api.post('/api/blood-bank/reserve', {
                patient_id: patient?.id || patient?.patient_id,
                surgery_id: surgery?.id,
                blood_group: form.blood_group,
                surgery_type: form.surgery_type,
                scheduled_datetime: `${form.scheduled_date}T${form.scheduled_time}`,
                components: form.components,
                crossmatch_required: form.crossmatch_required,
                special_requirements: form.special_requirements,
                notes: form.notes,
                reservation_type: 'pre-op'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onSuccess?.();
                onHide();
            }, 1500);
        } catch (err) {
            console.error('Failed to reserve blood:', err);
            setError(err.response?.data?.message || 'Failed to reserve blood');
        } finally {
            setLoading(false);
        }
    };

    const getStockForGroup = (bloodGroup) => {
        return stockInfo.find(s => s.blood_group === bloodGroup)?.units || 0;
    };

    const getTotalUnitsRequested = () => {
        return form.components.reduce((sum, c) => sum + parseInt(c.units || 0), 0);
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="bg-danger text-white">
                <Modal.Title>
                    <Scissors size={20} className="me-2" />
                    Pre-Operative Blood Reservation
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
                    {success && <Alert variant="success"><CheckCircle size={16} className="me-1" /> Blood reserved successfully!</Alert>}

                    {/* Patient & Surgery Info */}
                    <Card className="mb-3 bg-light border-0">
                        <Card.Body className="py-2">
                            <Row>
                                <Col md={6}>
                                    <small className="text-muted">Patient</small>
                                    <div className="fw-bold">
                                        <User size={14} className="me-1" />
                                        {patient?.name || patient?.patient_name || 'Unknown'}
                                        {patient?.blood_group && <Badge bg="danger" className="ms-2">{patient.blood_group}</Badge>}
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <small className="text-muted">Surgery</small>
                                    <div className="fw-bold">
                                        <Scissors size={14} className="me-1" />
                                        {surgery?.procedure_name || form.surgery_type || 'Not specified'}
                                    </div>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    <Row className="g-3">
                        {/* Blood Group */}
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Patient Blood Group *</Form.Label>
                                <Form.Select 
                                    value={form.blood_group}
                                    onChange={(e) => setForm({...form, blood_group: e.target.value})}
                                    required
                                >
                                    <option value="">Select</option>
                                    {BLOOD_GROUPS.map(g => (
                                        <option key={g} value={g}>
                                            {g} ({getStockForGroup(g)} available)
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        {/* Surgery Type */}
                        <Col md={8}>
                            <Form.Group>
                                <Form.Label>Surgery Type *</Form.Label>
                                <Form.Select 
                                    value={form.surgery_type}
                                    onChange={(e) => handleSurgeryTypeChange(e.target.value)}
                                    required
                                >
                                    <option value="">Select Surgery Type</option>
                                    {SURGERY_TYPES.map(s => (
                                        <option key={s.name} value={s.name}>
                                            {s.name} {s.bloodRequired && `(~${s.typicalUnits} units typical)`}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        {/* Scheduled Date/Time */}
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label><Calendar size={14} className="me-1" />Surgery Date *</Form.Label>
                                <Form.Control 
                                    type="date"
                                    value={form.scheduled_date}
                                    onChange={(e) => setForm({...form, scheduled_date: e.target.value})}
                                    required
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label><Clock size={14} className="me-1" />Surgery Time *</Form.Label>
                                <Form.Control 
                                    type="time"
                                    value={form.scheduled_time}
                                    onChange={(e) => setForm({...form, scheduled_time: e.target.value})}
                                    required
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Blood Components */}
                    <h6 className="mt-4 mb-3 fw-bold">
                        <Droplet size={16} className="me-2 text-danger" />
                        Blood Components to Reserve
                    </h6>
                    <Table size="sm" bordered>
                        <thead className="table-light">
                            <tr>
                                <th>Component</th>
                                <th style={{width: '100px'}}>Units</th>
                                <th style={{width: '50px'}}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {form.components.map((comp, idx) => (
                                <tr key={idx}>
                                    <td>
                                        <Form.Select 
                                            size="sm"
                                            value={comp.type_id}
                                            onChange={(e) => updateComponent(idx, 'type_id', e.target.value)}
                                        >
                                            {COMPONENT_TYPES.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </Form.Select>
                                    </td>
                                    <td>
                                        <Form.Control 
                                            type="number"
                                            size="sm"
                                            min="1"
                                            max="20"
                                            value={comp.units}
                                            onChange={(e) => updateComponent(idx, 'units', e.target.value)}
                                        />
                                    </td>
                                    <td className="text-center">
                                        {form.components.length > 1 && (
                                            <Button 
                                                variant="outline-danger" 
                                                size="sm"
                                                onClick={() => removeComponent(idx)}
                                            >×</Button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                    <Button variant="outline-primary" size="sm" onClick={addComponent}>
                        + Add Component
                    </Button>

                    <Row className="mt-3 g-3">
                        <Col md={6}>
                            <Form.Check 
                                type="checkbox"
                                label="Crossmatch required before surgery"
                                checked={form.crossmatch_required}
                                onChange={(e) => setForm({...form, crossmatch_required: e.target.checked})}
                            />
                        </Col>
                        <Col md={6}>
                            <div className="text-end">
                                <strong>Total Units: </strong>
                                <Badge bg="danger" className="fs-6">{getTotalUnitsRequested()}</Badge>
                            </div>
                        </Col>
                    </Row>

                    <Form.Group className="mt-3">
                        <Form.Label>Special Requirements / Notes</Form.Label>
                        <Form.Control 
                            as="textarea"
                            rows={2}
                            placeholder="e.g., Irradiated blood, CMV-negative, etc."
                            value={form.special_requirements}
                            onChange={(e) => setForm({...form, special_requirements: e.target.value})}
                        />
                    </Form.Group>

                    {/* Stock Warning */}
                    {form.blood_group && getStockForGroup(form.blood_group) < getTotalUnitsRequested() && (
                        <Alert variant="warning" className="mt-3 mb-0">
                            <AlertCircle size={16} className="me-2" />
                            <strong>Low Stock Warning:</strong> Only {getStockForGroup(form.blood_group)} units of {form.blood_group} available. 
                            Blood Bank will be notified to arrange additional units.
                        </Alert>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide} disabled={loading}>Cancel</Button>
                    <Button variant="danger" type="submit" disabled={loading || !form.blood_group || !form.surgery_type}>
                        {loading ? (
                            <><Spinner size="sm" className="me-1" /> Reserving...</>
                        ) : (
                            <><Droplet size={16} className="me-1" /> Reserve Blood</>
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default SurgicalBloodOrderModal;
