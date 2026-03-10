import React, { useState, useEffect } from 'react';
import { Card, Button, ProgressBar, ListGroup, Badge, Modal, Form, Spinner } from 'react-bootstrap';
import { ClipboardList, Plus, CheckCircle, Clock } from 'lucide-react';
import axios from 'axios';

const CarePlanManager = ({ admissionId, patientId }) => {
    const [plans, setPlans] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    useEffect(() => {
        if (admissionId) {
            fetchPlans();
        }
    }, [admissionId]);

    const fetchPlans = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/care-plans/patient/${admissionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const rawData = res.data;
            const plans = Array.isArray(rawData) ? rawData : (rawData.data || []);
            setPlans(plans);
        } catch (err) {
            console.error('Error fetching care plans:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchTemplates = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/care-plans/templates', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const rawData = res.data;
            const templates = Array.isArray(rawData) ? rawData : (rawData.data || []);
            setTemplates(templates);
        } catch (err) {
            console.error('Error fetching templates:', err);
        }
    };

    const handleAssignPlan = async () => {
        if (!selectedTemplate) return;

        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/care-plans/assign', {
                template_id: selectedTemplate,
                patient_id: patientId,
                admission_id: admissionId
            }, { headers: { Authorization: `Bearer ${token}` } });

            setShowAssignModal(false);
            fetchPlans();
            alert('Care plan assigned successfully');
        } catch (err) {
            console.error('Error assigning plan:', err);
            alert('Failed to assign plan');
        }
    };

    const handleToggleItem = async (planId, itemIndex, currentStatus, currentItems) => {
        const newStatus = currentStatus === 'Completed' ? 'Pending' : 'Completed';
        const newItems = [...currentItems];
        newItems[itemIndex] = {
            ...newItems[itemIndex],
            status: newStatus,
            completed_at: newStatus === 'Completed' ? new Date().toISOString() : null
        };

        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/care-plans/${planId}/progress`, {
                items_json: newItems,
                status: 'Active' // Keep active unless all done logic is added
            }, { headers: { Authorization: `Bearer ${token}` } });

            fetchPlans();
        } catch (err) {
            console.error('Error updating progress:', err);
        }
    };

    return (
        <div className="care-plan-manager">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">Active Care Pathways</h6>
                <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => { fetchTemplates(); setShowAssignModal(true); }}
                >
                    <Plus size={16} className="me-1" /> Assign Pathway
                </Button>
            </div>

            {loading ? <div className="text-center py-3"><Spinner animation="border" size="sm" /></div> : (
                <div className="d-flex flex-column gap-3">
                    {plans.length > 0 ? plans.map(plan => (
                        <Card key={plan.id} className="border shadow-sm">
                            <Card.Header className="bg-light d-flex justify-content-between align-items-center py-2">
                                <div>
                                    <strong>{plan.template_name}</strong>
                                    <div className="text-muted small">Started: {new Date(plan.start_date).toLocaleDateString()}</div>
                                </div>
                                <Badge bg={plan.progress === 100 ? 'success' : 'primary'}>{plan.progress}% Complete</Badge>
                            </Card.Header>
                            <Card.Body className="p-0">
                                <ProgressBar now={plan.progress} variant="success" style={{ height: '4px' }} />
                                <ListGroup variant="flush">
                                    {plan.custom_items_json && plan.custom_items_json.map((item, idx) => (
                                        <ListGroup.Item
                                            key={idx}
                                            action
                                            onClick={() => handleToggleItem(plan.id, idx, item.status, plan.custom_items_json)}
                                            className="d-flex align-items-center justify-content-between"
                                        >
                                            <div className="d-flex align-items-center">
                                                {item.status === 'Completed' ?
                                                    <CheckCircle size={18} className="text-success me-2" /> :
                                                    <Clock size={18} className="text-muted me-2" />
                                                }
                                                <span className={item.status === 'Completed' ? 'text-muted text-decoration-line-through' : ''}>
                                                    {item.text}
                                                </span>
                                            </div>
                                            <Badge bg="light" text="dark" className="border">{item.type}</Badge>
                                        </ListGroup.Item>
                                    ))}
                                </ListGroup>
                            </Card.Body>
                        </Card>
                    )) : (
                        <div className="text-center text-muted py-4 border rounded bg-light">
                            <ClipboardList size={32} className="mb-2 opacity-50" />
                            <p className="mb-0">No active care plans assigned.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Assign Modal */}
            <Modal show={showAssignModal} onHide={() => setShowAssignModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Assign Clinical Pathway</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Select
                        onChange={(e) => setSelectedTemplate(e.target.value)}
                        value={selectedTemplate || ''}
                    >
                        <option value="">Select a pathway...</option>
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </Form.Select>
                    {selectedTemplate && (
                        <div className="mt-3 p-3 bg-light rounded border">
                            <small className="text-muted d-block mb-1">Description:</small>
                            <div>{templates.find(t => t.id == selectedTemplate)?.description}</div>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAssignModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleAssignPlan} disabled={!selectedTemplate}>
                        Assign Plan
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default CarePlanManager;
