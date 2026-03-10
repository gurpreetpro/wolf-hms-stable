import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Badge, Button, Form, Spinner } from 'react-bootstrap';
import { Brush, CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';

import api from '../utils/axiosInstance';

const HousekeepingDashboard = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('All');
    const [filterType, setFilterType] = useState('All');

    const fetchTasks = React.useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/api/housekeeping?status=${filterStatus}&type=${filterType}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTasks(res.data.data || res.data);
        } catch (err) {
            console.error('Error fetching housekeeping tasks:', err);
        } finally {
            setLoading(false);
        }
    }, [filterStatus, filterType]);

    useEffect(() => {
        fetchTasks();
        const interval = setInterval(fetchTasks, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [fetchTasks]);

    const handleUpdateStatus = async (taskId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            await api.put(`/api/housekeeping/${taskId}`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchTasks(); // Refresh
        } catch (err) {
            console.error('Error updating task:', err);
            alert('Failed to update task');
        }
    };

    const getPriorityColor = (p) => {
        if (p === 'STAT') return 'danger';
        if (p === 'Urgent') return 'warning';
        return 'info';
    };

    const getStatusBadge = (s) => {
        if (s === 'Pending') return <Badge bg="danger">Pending</Badge>;
        if (s === 'In Progress') return <Badge bg="warning" text="dark">In Progress</Badge>;
        if (s === 'Completed') return <Badge bg="success">Completed</Badge>;
        return <Badge bg="secondary">{s}</Badge>;
    };

    return (

            <Container fluid className="p-4">
                {/* Header & Filters */}
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2 className="mb-1"><Brush className="me-2" /> Housekeeping Tasks</h2>
                        <p className="text-muted">Manage cleaning, repairs, and maintenance requests.</p>
                    </div>
                    <Button variant="outline-primary" onClick={fetchTasks}>
                        <RefreshCw size={18} className={loading ? 'spin' : ''} /> Refresh
                    </Button>
                </div>

                <Card className="mb-4 shadow-sm border-0">
                    <Card.Body>
                        <Row>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="fw-bold small text-muted">Filter Status</Form.Label>
                                    <Form.Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                        <option value="All">All Statuses</option>
                                        <option value="Pending">Pending</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="fw-bold small text-muted">Filter Type</Form.Label>
                                    <Form.Select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                                        <option value="All">All Types</option>
                                        <option value="Cleaning">Cleaning</option>
                                        <option value="Spill">Spill</option>
                                        <option value="Repair">Repair</option>
                                        <option value="Inspection">Inspection</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                {/* Task Grid */}
                {loading && tasks.length === 0 ? (
                    <div className="text-center py-5"><Spinner animation="border" /></div>
                ) : (
                    <Row>
                        {tasks.map(task => (
                            <Col md={6} lg={4} key={task.id} className="mb-4">
                                <Card className="h-100 shadow-sm border-0">
                                    <Card.Header className={`d-flex justify-content-between align-items-center bg-${getPriorityColor(task.priority)}-subtle`}>
                                        <span className="fw-bold">{task.type}</span>
                                        <Badge bg="light" text="dark">{task.priority}</Badge>
                                    </Card.Header>
                                    <Card.Body>
                                        <h5 className="card-title text-primary">{task.location}</h5>
                                        <p className="card-text text-muted small">{new Date(task.created_at).toLocaleString()}</p>
                                        <p className="card-text">{task.description || <i>No description provided.</i>}</p>
                                        
                                        <div className="d-flex justify-content-between align-items-center mt-3">
                                            {getStatusBadge(task.status)}
                                            
                                            <div className="d-flex gap-2">
                                                {task.status === 'Pending' && (
                                                    <Button size="sm" variant="outline-warning" onClick={() => handleUpdateStatus(task.id, 'In Progress')}>
                                                        Start
                                                    </Button>
                                                )}
                                                {task.status === 'In Progress' && (
                                                    <Button size="sm" variant="outline-success" onClick={() => handleUpdateStatus(task.id, 'Completed')}>
                                                        Mark Done
                                                    </Button>
                                                )}
                                                {task.status === 'Completed' && (
                                                    <span className="text-success small"><CheckCircle size={14}/> Verified</span>
                                                )}
                                            </div>
                                        </div>
                                    </Card.Body>
                                    <Card.Footer className="text-muted small">
                                        Requested by: {task.requester_name || 'System'}
                                    </Card.Footer>
                                </Card>
                            </Col>
                        ))}
                        {tasks.length === 0 && (
                            <Col xs={12} className="text-center py-5 text-muted">
                                <CheckCircle size={48} className="mb-3 text-success opacity-50"/>
                                <h5>All Caught Up!</h5>
                                <p>No tasks found matching your filters.</p>
                            </Col>
                        )}
                    </Row>
                )}
            </Container>

    );
};

export default HousekeepingDashboard;
