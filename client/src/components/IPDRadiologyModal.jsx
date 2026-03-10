import React, { useState } from 'react';
import { Modal, Form, Button, Row, Col, ListGroup, Badge, InputGroup, Alert, Table } from 'react-bootstrap';
import { Camera, Search, Plus, Clock, AlertTriangle } from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Common imaging studies in Indian hospitals
const IMAGING_STUDIES = [
    { id: 'xray-chest', name: 'Chest X-Ray (PA View)', category: 'X-Ray', price: 300 },
    { id: 'xray-abdomen', name: 'Abdomen X-Ray', category: 'X-Ray', price: 350 },
    { id: 'xray-kub', name: 'KUB X-Ray', category: 'X-Ray', price: 350 },
    { id: 'xray-spine', name: 'Spine X-Ray', category: 'X-Ray', price: 400 },
    { id: 'xray-pelvis', name: 'Pelvis X-Ray', category: 'X-Ray', price: 350 },
    { id: 'ct-brain', name: 'CT Brain (Plain)', category: 'CT Scan', price: 2500 },
    { id: 'ct-brain-contrast', name: 'CT Brain (Contrast)', category: 'CT Scan', price: 4000 },
    { id: 'ct-chest', name: 'CT Chest (HRCT)', category: 'CT Scan', price: 4500 },
    { id: 'ct-abdomen', name: 'CT Abdomen', category: 'CT Scan', price: 5000 },
    { id: 'ct-kub', name: 'CT KUB', category: 'CT Scan', price: 3500 },
    { id: 'mri-brain', name: 'MRI Brain', category: 'MRI', price: 6000 },
    { id: 'mri-spine', name: 'MRI Spine', category: 'MRI', price: 7000 },
    { id: 'mri-knee', name: 'MRI Knee', category: 'MRI', price: 6500 },
    { id: 'usg-abdomen', name: 'USG Abdomen', category: 'Ultrasound', price: 800 },
    { id: 'usg-pelvis', name: 'USG Pelvis', category: 'Ultrasound', price: 800 },
    { id: 'usg-kub', name: 'USG KUB', category: 'Ultrasound', price: 700 },
    { id: 'usg-obstetric', name: 'USG Obstetric', category: 'Ultrasound', price: 1000 },
    { id: 'echo-2d', name: '2D Echocardiogram', category: 'Cardiac', price: 1500 },
    { id: 'ecg', name: 'ECG (12 Lead)', category: 'Cardiac', price: 200 },
    { id: 'tmt', name: 'TMT (Treadmill Test)', category: 'Cardiac', price: 1200 },
    { id: 'doppler', name: 'Doppler Study (Arterial/Venous)', category: 'Vascular', price: 2000 },
];

// Priority options
const PRIORITY_OPTIONS = [
    { value: 'Routine', label: 'Routine', color: 'secondary' },
    { value: 'Urgent', label: 'Urgent', color: 'warning' },
    { value: 'STAT', label: 'STAT (Emergency)', color: 'danger' }
];

// Category filters
const CATEGORIES = ['All', 'X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Cardiac', 'Vascular'];

const IPDRadiologyModal = ({ show, onHide, admissionId, patientId, patientName, onImagingOrdered }) => {
    const [studySearch, setStudySearch] = useState('');
    const [selectedStudies, setSelectedStudies] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [priority, setPriority] = useState('Routine');
    const [notes, setNotes] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [contrastRequired, setContrastRequired] = useState(false);

    // Filter studies based on search and category
    const filteredStudies = IMAGING_STUDIES.filter(study => {
        const matchesSearch = study.name.toLowerCase().includes(studySearch.toLowerCase());
        const matchesCategory = categoryFilter === 'All' || study.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const handleSelectStudy = (study) => {
        if (!selectedStudies.find(s => s.id === study.id)) {
            setSelectedStudies([...selectedStudies, study]);
        }
    };

    const handleRemoveStudy = (studyId) => {
        setSelectedStudies(selectedStudies.filter(s => s.id !== studyId));
    };

    const handleSubmit = async () => {
        if (selectedStudies.length === 0) {
            setError('Please select at least one imaging study');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            
            // Order each imaging study using the lab order endpoint (radiology uses same table)
            for (const study of selectedStudies) {
                await axios.post(`${API}/api/clinical/order-lab`, {
                    admission_id: admissionId,
                    patient_id: patientId,
                    test_name: study.name + (contrastRequired && study.category !== 'X-Ray' ? ' (with Contrast)' : ''),
                    priority,
                    notes: notes + (contrastRequired ? ' | Contrast: Required' : '')
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            setSuccess(`${selectedStudies.length} imaging study(s) ordered successfully!`);
            setTimeout(() => {
                onImagingOrdered?.();
                handleClose();
            }, 1000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to order imaging studies');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setSelectedStudies([]);
        setStudySearch('');
        setPriority('Routine');
        setNotes('');
        setError('');
        setSuccess('');
        setCategoryFilter('All');
        setContrastRequired(false);
        onHide();
    };

    const totalCost = selectedStudies.reduce((sum, s) => sum + (s.price || 0), 0);

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton className="bg-purple text-white" style={{ backgroundColor: '#6f42c1' }}>
                <Modal.Title className="d-flex align-items-center">
                    <Camera size={20} className="me-2" />
                    Order Radiology/Imaging for {patientName}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
                {success && <Alert variant="success">{success}</Alert>}

                <Row>
                    {/* Study Search Column */}
                    <Col md={6}>
                        {/* Category Filter */}
                        <div className="d-flex gap-1 flex-wrap mb-2">
                            {CATEGORIES.map(cat => (
                                <Button
                                    key={cat}
                                    variant={categoryFilter === cat ? 'primary' : 'outline-secondary'}
                                    size="sm"
                                    onClick={() => setCategoryFilter(cat)}
                                    className="py-0 px-2"
                                >
                                    {cat}
                                </Button>
                            ))}
                        </div>

                        <Form.Group className="mb-2">
                            <InputGroup size="sm">
                                <InputGroup.Text><Search size={14} /></InputGroup.Text>
                                <Form.Control
                                    placeholder="Search imaging studies..."
                                    value={studySearch}
                                    onChange={e => setStudySearch(e.target.value)}
                                />
                            </InputGroup>
                        </Form.Group>

                        <div className="border rounded" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                            <ListGroup variant="flush">
                                {filteredStudies.map(study => (
                                    <ListGroup.Item 
                                        key={study.id} 
                                        action 
                                        onClick={() => handleSelectStudy(study)}
                                        className="d-flex justify-content-between align-items-center py-2"
                                        disabled={selectedStudies.find(s => s.id === study.id)}
                                    >
                                        <div>
                                            <div className="fw-bold small">{study.name}</div>
                                            <Badge bg="secondary" className="me-1" style={{ fontSize: '0.65rem' }}>{study.category}</Badge>
                                        </div>
                                        <Badge bg="light" text="dark">₹{study.price}</Badge>
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        </div>
                    </Col>

                    {/* Selected Studies Column */}
                    <Col md={6}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="fw-bold small">Selected ({selectedStudies.length})</span>
                            <Badge bg="success">Total: ₹{totalCost.toLocaleString()}</Badge>
                        </div>
                        
                        <div className="border rounded p-2" style={{ minHeight: '120px' }}>
                            {selectedStudies.length === 0 ? (
                                <div className="text-center text-muted py-3 small">
                                    Click studies on the left to add
                                </div>
                            ) : (
                                <Table size="sm" className="mb-0 small">
                                    <tbody>
                                        {selectedStudies.map(study => (
                                            <tr key={study.id}>
                                                <td>{study.name}</td>
                                                <td className="text-end">₹{study.price}</td>
                                                <td style={{ width: '20px' }}>
                                                    <Button 
                                                        variant="link" 
                                                        className="p-0 text-danger"
                                                        onClick={() => handleRemoveStudy(study.id)}
                                                    >
                                                        ✕
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            )}
                        </div>

                        {/* Priority & Options */}
                        <Form.Group className="mt-2">
                            <Form.Label className="fw-bold small mb-1">Priority</Form.Label>
                            <div className="d-flex gap-2">
                                {PRIORITY_OPTIONS.map(p => (
                                    <Button
                                        key={p.value}
                                        variant={priority === p.value ? p.color : `outline-${p.color}`}
                                        size="sm"
                                        onClick={() => setPriority(p.value)}
                                        className="py-0"
                                    >
                                        {p.label}
                                    </Button>
                                ))}
                            </div>
                        </Form.Group>

                        <Form.Check
                            type="checkbox"
                            label="Contrast Required"
                            className="mt-2 small"
                            checked={contrastRequired}
                            onChange={(e) => setContrastRequired(e.target.checked)}
                        />

                        {contrastRequired && (
                            <Alert variant="warning" className="mt-2 py-1 px-2 small">
                                <AlertTriangle size={12} className="me-1" />
                                Ensure patient has no contrast allergy and adequate renal function
                            </Alert>
                        )}

                        <Form.Group className="mt-2">
                            <Form.Label className="fw-bold small mb-1">Clinical Notes</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                placeholder="e.g., R/O pneumonia, Evaluate for fracture"
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="small"
                            />
                        </Form.Group>
                    </Col>
                </Row>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
                <Button 
                    variant="primary" 
                    size="sm"
                    onClick={handleSubmit} 
                    disabled={selectedStudies.length === 0 || submitting}
                    style={{ backgroundColor: '#6f42c1', borderColor: '#6f42c1' }}
                >
                    {submitting ? 'Ordering...' : <><Plus size={14} className="me-1" /> Order {selectedStudies.length} Study(s)</>}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default IPDRadiologyModal;
