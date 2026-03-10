import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert, Badge, Spinner, InputGroup } from 'react-bootstrap';
import { Droplet, AlertCircle, Clock, Plus, User, Activity } from 'lucide-react';
import api from '../utils/axiosInstance';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const COMPONENT_TYPES = [
    { id: 1, name: 'Packed Red Blood Cells (PRBC)', code: 'PRBC' },
    { id: 2, name: 'Fresh Frozen Plasma (FFP)', code: 'FFP' },
    { id: 3, name: 'Platelet Concentrate', code: 'PLT' },
    { id: 4, name: 'Whole Blood', code: 'WB' },
    { id: 5, name: 'Cryoprecipitate', code: 'CRYO' }
];
const PRIORITIES = ['Routine', 'Urgent', 'Emergency'];

/**
 * IPDBloodRequestModal - Doctor CPOE for blood ordering
 * Allows doctors to request blood for IPD patients with priority selection
 */
const IPDBloodRequestModal = ({ show, onHide, patient, admissionId, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [stockInfo, setStockInfo] = useState({});
    const [fetchingStock, setFetchingStock] = useState(false);
    
    const [form, setForm] = useState({
        blood_group: '',
        component_type_id: 1,
        units_required: 1,
        priority: 'Routine',
        indication: '',
        hemoglobin_level: '',
        notes: ''
    });

    // Fetch stock availability when blood group is selected
    useEffect(() => {
        if (form.blood_group && show) {
            fetchStock(form.blood_group);
        }
    }, [form.blood_group, show]);

    // Pre-fill patient blood group if known
    useEffect(() => {
        if (patient?.blood_group) {
            setForm(prev => ({ ...prev, blood_group: patient.blood_group }));
        }
    }, [patient]);

    const fetchStock = async (bloodGroup) => {
        try {
            setFetchingStock(true);
            const token = localStorage.getItem('token');
            const res = await api.get('/api/blood-bank/inventory', {
                headers: { Authorization: `Bearer ${token}` },
                params: { blood_group: bloodGroup }
            });
            const data = res.data?.data || res.data;
            setStockInfo(data);
        } catch (err) {
            console.error('Failed to fetch stock:', err);
        } finally {
            setFetchingStock(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem('token');
            await api.post('/api/blood-bank/requests', {
                patient_id: patient?.id || patient?.patient_id,
                admission_id: admissionId,
                blood_group_required: form.blood_group,
                component_type_id: form.component_type_id,
                units_required: parseInt(form.units_required),
                priority: form.priority,
                indication: form.indication,
                hemoglobin_level: form.hemoglobin_level ? parseFloat(form.hemoglobin_level) : null,
                notes: form.notes,
                department: 'IPD',
                requested_by: 'Doctor' // Will be filled by backend from token
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
            console.error('Failed to request blood:', err);
            setError(err.response?.data?.message || 'Failed to submit blood request');
        } finally {
            setLoading(false);
        }
    };

    const getStockBadge = () => {
        if (fetchingStock) return <Spinner animation="border" size="sm" />;
        if (!stockInfo?.inventory) return null;
        
        const stock = stockInfo.inventory.find(i => i.blood_group === form.blood_group);
        const units = stock?.units || 0;
        
        if (units === 0) return <Badge bg="danger">Out of Stock</Badge>;
        if (units < 5) return <Badge bg="warning">{units} units (Low)</Badge>;
        return <Badge bg="success">{units} units available</Badge>;
    };

    const selectedComponent = COMPONENT_TYPES.find(c => c.id === parseInt(form.component_type_id));

    return (
        <Modal show={show} onHide={onHide} size="lg" centered>
            <Modal.Header closeButton className="bg-danger text-white">
                <Modal.Title>
                    <Droplet size={20} className="me-2" />
                    Request Blood Transfusion
                </Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
                    {success && <Alert variant="success"><Activity size={16} className="me-1" /> Blood request submitted successfully!</Alert>}

                    {/* Patient Info */}
                    <Alert variant="info" className="d-flex align-items-center">
                        <User size={18} className="me-2" />
                        <div>
                            <strong>{patient?.name || patient?.patient_name}</strong>
                            {patient?.blood_group && <Badge bg="danger" className="ms-2">{patient.blood_group}</Badge>}
                            {patient?.bed_number && <span className="ms-2">Bed: {patient.bed_number}</span>}
                        </div>
                    </Alert>

                    <Row className="g-3">
                        {/* Blood Group */}
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Blood Group Required *</Form.Label>
                                <div className="d-flex gap-2 align-items-center">
                                    <Form.Select 
                                        name="blood_group" 
                                        value={form.blood_group}
                                        onChange={handleChange}
                                        required
                                    >
                                        <option value="">Select</option>
                                        {BLOOD_GROUPS.map(g => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </Form.Select>
                                    {form.blood_group && getStockBadge()}
                                </div>
                            </Form.Group>
                        </Col>

                        {/* Component Type */}
                        <Col md={5}>
                            <Form.Group>
                                <Form.Label>Blood Component *</Form.Label>
                                <Form.Select 
                                    name="component_type_id" 
                                    value={form.component_type_id}
                                    onChange={handleChange}
                                    required
                                >
                                    {COMPONENT_TYPES.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        {/* Units */}
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label>Units Required *</Form.Label>
                                <Form.Control 
                                    type="number" 
                                    name="units_required"
                                    min="1" 
                                    max="10"
                                    value={form.units_required}
                                    onChange={handleChange}
                                    required
                                />
                            </Form.Group>
                        </Col>

                        {/* Priority */}
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Priority *</Form.Label>
                                <Form.Select 
                                    name="priority" 
                                    value={form.priority}
                                    onChange={handleChange}
                                    required
                                >
                                    {PRIORITIES.map(p => (
                                        <option key={p} value={p}>{p}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        {/* Hemoglobin Level */}
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Current Hemoglobin (g/dL)</Form.Label>
                                <InputGroup>
                                    <Form.Control 
                                        type="number" 
                                        step="0.1"
                                        name="hemoglobin_level"
                                        placeholder="e.g., 7.5"
                                        value={form.hemoglobin_level}
                                        onChange={handleChange}
                                    />
                                    <InputGroup.Text>g/dL</InputGroup.Text>
                                </InputGroup>
                            </Form.Group>
                        </Col>

                        {/* Indication */}
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Indication</Form.Label>
                                <Form.Select 
                                    name="indication" 
                                    value={form.indication}
                                    onChange={handleChange}
                                >
                                    <option value="">Select</option>
                                    <option value="Anemia">Anemia</option>
                                    <option value="Surgery">Surgery</option>
                                    <option value="Hemorrhage">Hemorrhage</option>
                                    <option value="Coagulopathy">Coagulopathy</option>
                                    <option value="Thrombocytopenia">Thrombocytopenia</option>
                                    <option value="Trauma">Trauma</option>
                                    <option value="Other">Other</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>

                        {/* Notes */}
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label>Clinical Notes</Form.Label>
                                <Form.Control 
                                    as="textarea" 
                                    rows={2}
                                    name="notes"
                                    placeholder="Additional clinical information..."
                                    value={form.notes}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    {/* Priority Warning */}
                    {form.priority === 'Emergency' && (
                        <Alert variant="danger" className="mt-3 mb-0">
                            <AlertCircle size={16} className="me-2" />
                            <strong>Emergency Request:</strong> This will alert Blood Bank staff immediately. 
                            O-negative may be issued if crossmatch cannot wait.
                        </Alert>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide} disabled={loading}>Cancel</Button>
                    <Button variant="danger" type="submit" disabled={loading || !form.blood_group}>
                        {loading ? (
                            <><Spinner size="sm" className="me-1" /> Submitting...</>
                        ) : (
                            <><Droplet size={16} className="me-1" /> Request Blood</>
                        )}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default IPDBloodRequestModal;
