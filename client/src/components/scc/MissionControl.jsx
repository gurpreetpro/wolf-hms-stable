import React, { useState } from 'react';
import { Card, Badge, Button, Modal, Form, ListGroup, Row, Col } from 'react-bootstrap';
import { ClipboardList, Plus, Send, UserRound } from 'lucide-react';

const MissionControl = ({ missions = [], activeGuards = [], onDispatch }) => {
    const [show, setShow] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        type: 'PATROL',
        priority: 'ROUTINE',
        location_name: '',
        assigned_to_id: '',
        description: ''
    });

    const handleDispatch = () => {
        onDispatch(formData);
        setShow(false);
        setFormData({ title: '', type: 'PATROL', priority: 'ROUTINE', location_name: '', assigned_to_id: '', description: '' });
    };

    return (
        <Card bg="dark" text="white" className="h-100 border-secondary">
            <Card.Body>
                <div className="d-flex align-items-center mb-3">
                    <Card.Title className="flex-grow-1 mb-0" style={{ color: '#ff9100' }}>
                        MISSION CONTROL
                    </Card.Title>
                    <Button variant="warning" size="sm" onClick={() => setShow(true)} className="d-flex align-items-center gap-1">
                        <Plus size={14} /> DISPATCH
                    </Button>
                </div>

                <ListGroup variant="flush" style={{ maxHeight: 300, overflow: 'auto' }}>
                    {missions.map((mission) => (
                        <ListGroup.Item
                            key={mission.id}
                            className="d-flex align-items-center border-0 mb-1 rounded"
                            style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                        >
                            <div
                                className="rounded-circle d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                                style={{
                                    width: 40, height: 40,
                                    backgroundColor: mission.priority === 'CRITICAL' ? '#dc3545' : '#198754'
                                }}
                            >
                                <ClipboardList size={18} color="white" />
                            </div>
                            <div className="flex-grow-1 text-white">
                                <div className="fw-semibold small">{mission.title}</div>
                                <small className="text-muted">
                                    {mission.location_name} • {mission.assigned_guard_name || 'Unassigned'}
                                </small>
                            </div>
                            <Badge
                                bg={mission.status === 'RESOLVED' ? 'success' : 'secondary'}
                                className="border border-secondary"
                            >
                                {mission.status}
                            </Badge>
                        </ListGroup.Item>
                    ))}
                    {missions.length === 0 && (
                        <div className="text-center text-muted py-4">
                            No active missions. Sector quiet.
                        </div>
                    )}
                </ListGroup>

                {/* Dispatch Modal */}
                <Modal show={show} onHide={() => setShow(false)} centered>
                    <Modal.Header closeButton>
                        <Modal.Title>Dispatch New Mission</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Mission Title</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter mission title"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </Form.Group>

                        <Row className="mb-3">
                            <Col>
                                <Form.Group>
                                    <Form.Label>Type</Form.Label>
                                    <Form.Select
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="PATROL">Patrol</option>
                                        <option value="INVESTIGATE">Investigate</option>
                                        <option value="ESCORT">Escort</option>
                                        <option value="CODE_RESPONSE">Code Response</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col>
                                <Form.Group>
                                    <Form.Label>Priority</Form.Label>
                                    <Form.Select
                                        value={formData.priority}
                                        onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                    >
                                        <option value="ROUTINE">Routine</option>
                                        <option value="HIGH">High</option>
                                        <option value="CRITICAL">Critical</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>Location</Form.Label>
                            <Form.Control
                                type="text"
                                placeholder="Enter location"
                                value={formData.location_name}
                                onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Assign To (Optional)</Form.Label>
                            <Form.Select
                                value={formData.assigned_to_id}
                                onChange={(e) => setFormData({ ...formData, assigned_to_id: e.target.value })}
                            >
                                <option value="">Auto-Assign</option>
                                {activeGuards.map(g => (
                                    <option key={g.guard_id} value={g.guard_id}>{g.guard_name}</option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Description</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Form.Group>

                        <Button variant="primary" className="w-100 d-flex align-items-center justify-content-center gap-2" onClick={handleDispatch}>
                            TRANSMIT ORDERS <Send size={16} />
                        </Button>
                    </Modal.Body>
                </Modal>
            </Card.Body>
        </Card>
    );
};

export default MissionControl;
