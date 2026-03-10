import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Badge, Button, Spinner, Form, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import {
    CheckCircle, Clock, AlertTriangle, User, Pill, Activity,
    Stethoscope, FileText, Filter, RefreshCw, ChevronRight, Bell
} from 'lucide-react';
import axios from 'axios';

// Task type icons
const TASK_TYPE_ICONS = {
    'Medication': Pill,
    'Vitals': Activity,
    'Instruction': FileText,
    'Lab': Stethoscope,
    'Surgery': AlertTriangle
};

// Task type colors
const TASK_TYPE_COLORS = {
    'Medication': '#17a2b8',
    'Vitals': '#28a745',
    'Instruction': '#6c757d',
    'Lab': '#ffc107',
    'Surgery': '#dc3545'
};

const CareTaskBoard = ({ ward = null, refreshInterval = 60000 }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterType, setFilterType] = useState('all');
    const [overdueCount, setOverdueCount] = useState(0);
    const [lastRefresh, setLastRefresh] = useState(new Date());
    const [completing, setCompleting] = useState(null);

    // Fetch tasks from API
    const fetchTasks = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');
            let url = '/api/clinical/tasks';
            const params = new URLSearchParams();

            if (ward) params.append('ward', ward);
            if (filterType !== 'all') params.append('type', filterType);

            if (params.toString()) url += '?' + params.toString();

            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const fetchedTasks = res.data.data || [];
            setTasks(fetchedTasks);

            // Count overdue tasks
            const now = new Date();
            const overdue = fetchedTasks.filter(t =>
                t.status === 'Pending' &&
                new Date(t.scheduled_time) < now
            ).length;
            setOverdueCount(overdue);

            setLastRefresh(new Date());
            setError(null);
        } catch (err) {
            console.error('Failed to fetch tasks:', err);
            setError('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    }, [ward, filterType]);

    // Initial load and polling
    useEffect(() => {
        fetchTasks();
        const interval = setInterval(fetchTasks, refreshInterval);
        return () => clearInterval(interval);
    }, [fetchTasks, refreshInterval]);

    // Complete a task
    const handleCompleteTask = async (taskId) => {
        setCompleting(taskId);
        try {
            const token = localStorage.getItem('token');
            await axios.put(`/api/clinical/tasks/${taskId}`,
                { status: 'Completed' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            await fetchTasks();
        } catch (err) {
            console.error('Failed to complete task:', err);
            setError('Failed to complete task');
        } finally {
            setCompleting(null);
        }
    };

    // Group tasks by status
    const pendingTasks = tasks.filter(t => t.status === 'Pending');
    const inProgressTasks = tasks.filter(t => t.status === 'In-Progress');
    const completedTasks = tasks.filter(t => t.status === 'Completed').slice(0, 10); // Last 10

    // Check if task is overdue
    const isOverdue = (task) => {
        if (task.status !== 'Pending') return false;
        return new Date(task.scheduled_time) < new Date();
    };

    // Format time
    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    // Render single task card
    const TaskCard = ({ task, showComplete = true }) => {
        const IconComponent = TASK_TYPE_ICONS[task.type] || FileText;
        const typeColor = TASK_TYPE_COLORS[task.type] || '#6c757d';
        const overdue = isOverdue(task);

        return (
            <Card
                className={`mb-2 border-start border-4 ${overdue ? 'border-danger bg-danger bg-opacity-10' : ''}`}
                style={{ borderLeftColor: overdue ? undefined : typeColor }}
            >
                <Card.Body className="py-2 px-3">
                    <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-1">
                                <IconComponent size={16} style={{ color: typeColor }} />
                                <Badge bg="secondary" className="small">{task.type}</Badge>
                                {overdue && (
                                    <Badge bg="danger" className="small">
                                        <AlertTriangle size={10} className="me-1" />
                                        OVERDUE
                                    </Badge>
                                )}
                            </div>
                            <p className="mb-1 small fw-medium">{task.description}</p>
                            <div className="d-flex align-items-center gap-3 text-muted small">
                                <span>
                                    <User size={12} className="me-1" />
                                    {task.patient_name || 'Unknown Patient'}
                                </span>
                                <span>
                                    <Clock size={12} className="me-1" />
                                    {formatTime(task.scheduled_time)}
                                </span>
                            </div>
                        </div>
                        {showComplete && task.status === 'Pending' && (
                            <OverlayTrigger
                                placement="top"
                                overlay={<Tooltip>Mark Complete</Tooltip>}
                            >
                                <Button
                                    size="sm"
                                    variant={overdue ? 'danger' : 'success'}
                                    onClick={() => handleCompleteTask(task.id)}
                                    disabled={completing === task.id}
                                    className="ms-2"
                                >
                                    {completing === task.id ? (
                                        <Spinner animation="border" size="sm" />
                                    ) : (
                                        <CheckCircle size={16} />
                                    )}
                                </Button>
                            </OverlayTrigger>
                        )}
                    </div>
                </Card.Body>
            </Card>
        );
    };

    // Render column
    const TaskColumn = ({ title, tasks, icon: Icon, color, showComplete = true }) => (
        <Card className="h-100 shadow-sm">
            <Card.Header className="d-flex align-items-center justify-content-between py-2" style={{ backgroundColor: color + '15' }}>
                <div className="d-flex align-items-center gap-2">
                    <Icon size={18} style={{ color }} />
                    <span className="fw-bold" style={{ color }}>{title}</span>
                </div>
                <Badge bg="dark" pill>{tasks.length}</Badge>
            </Card.Header>
            <Card.Body className="p-2" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                {tasks.length === 0 ? (
                    <div className="text-center text-muted py-4">
                        <Icon size={32} className="opacity-25 mb-2" />
                        <p className="small mb-0">No tasks</p>
                    </div>
                ) : (
                    tasks.map(task => (
                        <TaskCard key={task.id} task={task} showComplete={showComplete} />
                    ))
                )}
            </Card.Body>
        </Card>
    );

    if (loading) {
        return (
            <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="text-muted mt-2">Loading care tasks...</p>
            </div>
        );
    }

    return (
        <div className="care-task-board">
            {/* Header with alerts */}
            {overdueCount > 0 && (
                <Alert variant="danger" className="d-flex align-items-center justify-content-between mb-3">
                    <div>
                        <Bell size={18} className="me-2" />
                        <strong>{overdueCount} overdue task{overdueCount > 1 ? 's' : ''}</strong> require immediate attention!
                    </div>
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setFilterType('all')}
                    >
                        View All
                    </Button>
                </Alert>
            )}

            {error && (
                <Alert variant="warning" dismissible onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Toolbar */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex align-items-center gap-3">
                    <Filter size={18} className="text-muted" />
                    <Form.Select
                        size="sm"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        style={{ width: '150px' }}
                    >
                        <option value="all">All Types</option>
                        <option value="Medication">Medication</option>
                        <option value="Vitals">Vitals</option>
                        <option value="Instruction">Instructions</option>
                        <option value="Lab">Lab</option>
                        <option value="Surgery">Surgery</option>
                    </Form.Select>
                </div>
                <div className="d-flex align-items-center gap-2 text-muted small">
                    <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
                    <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={fetchTasks}
                        title="Refresh"
                    >
                        <RefreshCw size={14} />
                    </Button>
                </div>
            </div>

            {/* Kanban Board */}
            <Row className="g-3">
                <Col md={4}>
                    <TaskColumn
                        title="Pending"
                        tasks={pendingTasks}
                        icon={Clock}
                        color="#ffc107"
                        showComplete={true}
                    />
                </Col>
                <Col md={4}>
                    <TaskColumn
                        title="In Progress"
                        tasks={inProgressTasks}
                        icon={ChevronRight}
                        color="#17a2b8"
                        showComplete={true}
                    />
                </Col>
                <Col md={4}>
                    <TaskColumn
                        title="Completed"
                        tasks={completedTasks}
                        icon={CheckCircle}
                        color="#28a745"
                        showComplete={false}
                    />
                </Col>
            </Row>

            {/* Summary footer */}
            <div className="mt-3 p-2 bg-light rounded d-flex justify-content-around text-center">
                <div>
                    <div className="text-warning fw-bold h5 mb-0">{pendingTasks.length}</div>
                    <small className="text-muted">Pending</small>
                </div>
                <div>
                    <div className="text-info fw-bold h5 mb-0">{inProgressTasks.length}</div>
                    <small className="text-muted">In Progress</small>
                </div>
                <div>
                    <div className="text-success fw-bold h5 mb-0">{completedTasks.length}</div>
                    <small className="text-muted">Completed</small>
                </div>
                <div>
                    <div className="text-danger fw-bold h5 mb-0">{overdueCount}</div>
                    <small className="text-muted">Overdue</small>
                </div>
            </div>
        </div>
    );
};

export default CareTaskBoard;
