import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Tabs, Tab, Table, Badge, Modal } from 'react-bootstrap';
import { Send, Clock, User } from 'lucide-react';
import axios from 'axios';

const SBARHandoffPanel = () => {
    const [handoffs, setHandoffs] = useState([]);
    const [showModal, setShowModal] = useState(false);

    // New Handoff Form State
    const [formData, setFormData] = useState({
        shift: 'Morning',
        unit: 'General Ward',
        situation: '',
        recommendation: ''
    });

    useEffect(() => {
        fetchHandoffs();
    }, []);

    const fetchHandoffs = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/transitions/handoffs', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHandoffs(res.data);
        } catch (err) {
            console.error('Error fetching handoffs:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            // Auto-fill Background/Assessment mock data for now (in real app, fetch statistics)
            const payload = {
                ...formData,
                background: { census: 12, critical: 2 },
                assessment: { stable: 10, watch: 2 }
            };

            await axios.post('/api/transitions/handoff', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowModal(false);
            setFormData({ shift: 'Morning', unit: 'General Ward', situation: '', recommendation: '' });
            fetchHandoffs();
        } catch (err) {
            console.error('Error creating handoff:', err);
            alert('Failed to submit report');
        }
    };

    return (
        <div className="handoff-panel">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="fw-bold mb-0">Shift Handovers (SBAR)</h4>
                <Button variant="primary" onClick={() => setShowModal(true)}>
                    <Send size={18} className="me-2" />
                    New Shift Report
                </Button>
            </div>

            <div className="row">
                <div className="col-12">
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white py-3">
                            <h6 className="mb-0 fw-bold">Recent Reports</h6>
                        </Card.Header>
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th>Date/Time</th>
                                    <th>Shift</th>
                                    <th>Created By</th>
                                    <th>Situation Summary</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {handoffs.length > 0 ? handoffs.map(h => (
                                    <tr key={h.id}>
                                        <td>
                                            <div className="d-flex align-items-center">
                                                <Clock size={16} className="text-muted me-2" />
                                                {new Date(h.created_at).toLocaleString()}
                                            </div>
                                        </td>
                                        <td><Badge bg="info" text="dark">{h.shift}</Badge></td>
                                        <td>{h.doctor_name || 'Dr. Unknown'}</td>
                                        <td className="text-truncate" style={{ maxWidth: '300px' }}>{h.situation}</td>
                                        <td>
                                            <Button size="sm" variant="outline-secondary">View Full</Button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="5" className="text-center py-4 text-muted">
                                            No recent handoff reports found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card>
                </div>
            </div>

            {/* Create Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Create Shift Handoff (SBAR)</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <div className="row mb-3">
                            <div className="col-md-6">
                                <Form.Group>
                                    <Form.Label>Shift</Form.Label>
                                    <Form.Select
                                        value={formData.shift}
                                        onChange={e => setFormData({ ...formData, shift: e.target.value })}
                                    >
                                        <option>Morning</option>
                                        <option>Evening</option>
                                        <option>Night</option>
                                    </Form.Select>
                                </Form.Group>
                            </div>
                            <div className="col-md-6">
                                <Form.Group>
                                    <Form.Label>Unit</Form.Label>
                                    <Form.Select
                                        value={formData.unit}
                                        onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                    >
                                        <option>General Ward</option>
                                        <option>ICU</option>
                                        <option>Emergency</option>
                                    </Form.Select>
                                </Form.Group>
                            </div>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold text-primary">Situation</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                placeholder="Brief summary of shift status (e.g., 'Quiet shift, 2 new admissions')"
                                value={formData.situation}
                                onChange={e => setFormData({ ...formData, situation: e.target.value })}
                                required
                            />
                        </Form.Group>

                        <div className="p-3 bg-light rounded mb-3 border">
                            <div className="d-flex justify-content-between">
                                <span className="small fw-bold">Background & Assessment (Auto-Filled)</span>
                                <Badge bg="secondary">System Generated</Badge>
                            </div>
                            <p className="small text-muted mb-0 mt-2">
                                * Census count, critical patient list, and active alerts will be attached automatically.
                            </p>
                        </div>

                        <Form.Group className="mb-3">
                            <Form.Label className="fw-bold text-danger">Recommendation / To-Do</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                placeholder="Key actions for next shift (e.g., 'Bed 4 needs Labs at 6 PM')"
                                value={formData.recommendation}
                                onChange={e => setFormData({ ...formData, recommendation: e.target.value })}
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="primary" type="submit">Submit Report</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </div>
    );
};

export default SBARHandoffPanel;
