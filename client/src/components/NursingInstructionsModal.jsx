import React, { useState } from 'react';
import { Modal, Form, Button, Row, Col, Badge, Alert, ListGroup } from 'react-bootstrap';
import { MessageSquare, Send, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Pre-defined nursing instruction templates for Indian hospitals
const INSTRUCTION_TEMPLATES = [
    { category: 'Monitoring', instructions: [
        'Monitor vitals every 4 hours',
        'Monitor vitals every 2 hours (critical)',
        'Hourly neuro check',
        'Strict I/O charting',
        'Daily weight monitoring',
        'Blood sugar monitoring QID'
    ]},
    { category: 'Activity', instructions: [
        'Strict bed rest',
        'Bed rest with bathroom privileges',
        'Ambulate with assistance TID',
        'Chair sit for 30 minutes TID',
        'Physiotherapy mobilization'
    ]},
    { category: 'Precautions', instructions: [
        'Fall precautions - high risk',
        'Aspiration precautions',
        'Contact isolation precautions',
        'Droplet precautions',
        'Neutropenic precautions',
        'Seizure precautions'
    ]},
    { category: 'Diet/Fluids', instructions: [
        'NPO from midnight',
        'Clear liquids only',
        'Sips of water only',
        'Encourage oral fluids',
        'Fluid restriction - 1500ml/day',
        'High protein diet'
    ]},
    { category: 'Wound/Tube Care', instructions: [
        'Wound dressing change daily',
        'Drain care and measurement',
        'Foley catheter care',
        'NG tube care - confirm placement before feeds',
        'Central line dressing per protocol',
        'Tracheostomy care'
    ]},
    { category: 'Other', instructions: [
        'Notify doctor if BP > 180/100',
        'Notify doctor if temperature > 101°F',
        'Notify doctor if urine output < 30ml/hr',
        'Pain reassessment after PRN medication',
        'Pre-op preparation as per checklist',
        'Post-op protocol - Day 1'
    ]}
];

// Priority options
const PRIORITY_OPTIONS = [
    { value: 'Routine', label: 'Routine', color: 'secondary' },
    { value: 'Important', label: 'Important', color: 'warning' },
    { value: 'Urgent', label: 'Urgent', color: 'danger' }
];

const NursingInstructionsModal = ({ show, onHide, admissionId, patientId, patientName, onInstructionSent }) => {
    const [selectedInstructions, setSelectedInstructions] = useState([]);
    const [customInstruction, setCustomInstruction] = useState('');
    const [priority, setPriority] = useState('Routine');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [activeCategory, setActiveCategory] = useState('Monitoring');

    const handleToggleInstruction = (instruction) => {
        if (selectedInstructions.includes(instruction)) {
            setSelectedInstructions(selectedInstructions.filter(i => i !== instruction));
        } else {
            setSelectedInstructions([...selectedInstructions, instruction]);
        }
    };

    const handleAddCustom = () => {
        if (customInstruction.trim() && !selectedInstructions.includes(customInstruction.trim())) {
            setSelectedInstructions([...selectedInstructions, customInstruction.trim()]);
            setCustomInstruction('');
        }
    };

    const handleRemoveInstruction = (instruction) => {
        setSelectedInstructions(selectedInstructions.filter(i => i !== instruction));
    };

    const handleSubmit = async () => {
        if (selectedInstructions.length === 0) {
            setError('Please select or add at least one instruction');
            return;
        }

        setSubmitting(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            
            // Create care tasks for each instruction
            for (const instruction of selectedInstructions) {
                await axios.post(`${API}/api/clinical/tasks`, {
                    admission_id: admissionId,
                    patient_id: patientId,
                    type: 'Nursing Instruction',
                    description: `[${priority.toUpperCase()}] ${instruction}`,
                    scheduled_time: new Date().toISOString()
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            setSuccess(`${selectedInstructions.length} nursing instruction(s) sent!`);
            setTimeout(() => {
                onInstructionSent?.();
                handleClose();
            }, 1000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send instructions');
        } finally {
            setSubmitting(false);
        }
    };

    const handleClose = () => {
        setSelectedInstructions([]);
        setCustomInstruction('');
        setPriority('Routine');
        setError('');
        setSuccess('');
        setActiveCategory('Monitoring');
        onHide();
    };

    const currentCategory = INSTRUCTION_TEMPLATES.find(c => c.category === activeCategory);

    return (
        <Modal show={show} onHide={handleClose} size="lg" centered>
            <Modal.Header closeButton className="bg-success text-white">
                <Modal.Title className="d-flex align-items-center">
                    <MessageSquare size={20} className="me-2" />
                    Nursing Instructions for {patientName}
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
                {success && <Alert variant="success"><CheckCircle size={16} className="me-1" />{success}</Alert>}

                <Row>
                    {/* Instruction Templates */}
                    <Col md={7}>
                        {/* Category Tabs */}
                        <div className="d-flex gap-1 flex-wrap mb-2">
                            {INSTRUCTION_TEMPLATES.map(cat => (
                                <Button
                                    key={cat.category}
                                    variant={activeCategory === cat.category ? 'success' : 'outline-secondary'}
                                    size="sm"
                                    onClick={() => setActiveCategory(cat.category)}
                                    className="py-0 px-2"
                                >
                                    {cat.category}
                                </Button>
                            ))}
                        </div>

                        <div className="border rounded p-2" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                            {currentCategory?.instructions.map((instr, idx) => (
                                <Form.Check
                                    key={idx}
                                    type="checkbox"
                                    id={`instr-${idx}`}
                                    label={instr}
                                    checked={selectedInstructions.includes(instr)}
                                    onChange={() => handleToggleInstruction(instr)}
                                    className="mb-2 small"
                                />
                            ))}
                        </div>

                        {/* Custom Instruction Input */}
                        <div className="d-flex gap-2 mt-2">
                            <Form.Control
                                placeholder="Add custom instruction..."
                                value={customInstruction}
                                onChange={(e) => setCustomInstruction(e.target.value)}
                                size="sm"
                                onKeyPress={(e) => e.key === 'Enter' && handleAddCustom()}
                            />
                            <Button variant="outline-success" size="sm" onClick={handleAddCustom}>
                                +
                            </Button>
                        </div>
                    </Col>

                    {/* Selected Instructions */}
                    <Col md={5}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="fw-bold small">Selected ({selectedInstructions.length})</span>
                        </div>
                        
                        <div className="border rounded p-2" style={{ minHeight: '180px', maxHeight: '220px', overflowY: 'auto' }}>
                            {selectedInstructions.length === 0 ? (
                                <div className="text-center text-muted py-4 small">
                                    Select instructions from templates or add custom
                                </div>
                            ) : (
                                <ListGroup variant="flush">
                                    {selectedInstructions.map((instr, idx) => (
                                        <ListGroup.Item key={idx} className="d-flex justify-content-between align-items-start py-1 px-2 small">
                                            <span>{instr}</span>
                                            <Button 
                                                variant="link" 
                                                className="p-0 text-danger"
                                                onClick={() => handleRemoveInstruction(instr)}
                                            >
                                                ✕
                                            </Button>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            )}
                        </div>

                        {/* Priority Selection */}
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

                        {priority === 'Urgent' && (
                            <Alert variant="danger" className="mt-2 py-1 px-2 small mb-0">
                                <AlertTriangle size={12} className="me-1" />
                                Urgent instructions will be highlighted on nurse dashboard
                            </Alert>
                        )}
                    </Col>
                </Row>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" size="sm" onClick={handleClose}>Cancel</Button>
                <Button 
                    variant="success" 
                    size="sm"
                    onClick={handleSubmit} 
                    disabled={selectedInstructions.length === 0 || submitting}
                >
                    {submitting ? 'Sending...' : <><Send size={14} className="me-1" /> Send {selectedInstructions.length} Instruction(s)</>}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default NursingInstructionsModal;
