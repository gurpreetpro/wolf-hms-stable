import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Badge, Button, Form, Row, Col, Spinner, Pagination, Alert } from 'react-bootstrap';
import { Shield, Download, Search, Filter, RefreshCw, Clock, User, Activity } from 'lucide-react';
import api from '../utils/axiosInstance';

/**
 * AuditTrailDashboard - View and export system audit logs
 * Gold Standard Phase 4 - Admin-only feature
 */
const AuditTrailDashboard = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
    const [stats, setStats] = useState(null);
    
    // Filters
    const [filters, setFilters] = useState({
        action: '',
        entity_type: '',
        user_id: '',
        search: '',
        from_date: '',
        to_date: ''
    });

    useEffect(() => {
        fetchLogs();
        fetchStats();
    }, [pagination.page, filters]);

    const fetchLogs = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                page: pagination.page,
                limit: pagination.limit,
                ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
            });
            
            const res = await api.get(`/api/audit/logs?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const responseData = res.data.data || res.data;
            setLogs(responseData.logs || []);
            setPagination(prev => ({ ...prev, ...responseData.pagination }));
        } catch (err) {
            console.error('Fetch audit logs error:', err);
            setError('Failed to load audit logs. Admin access required.');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/api/audit/stats?days=7', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(res.data);
        } catch (err) {
            console.error('Fetch stats error:', err);
        }
    };

    const handleExport = async () => {
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams(
                Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
            );
            
            window.open(`/api/audit/export?${params}`, '_blank');
        } catch (err) {
            alert('Failed to export logs');
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const getActionBadgeColor = (action) => {
        if (action.includes('DELETE') || action.includes('CANCEL')) return 'danger';
        if (action.includes('CREATE') || action.includes('REGISTER')) return 'success';
        if (action.includes('UPDATE') || action.includes('CHANGE')) return 'warning';
        if (action.includes('LOGIN')) return 'info';
        return 'secondary';
    };

    return (
        <Container fluid className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0 fw-bold">
                    <Shield size={28} className="me-2 text-primary" />
                    Audit Trail
                </h2>
                <div className="d-flex gap-2">
                    <Button variant="outline-primary" onClick={fetchLogs}>
                        <RefreshCw size={16} className="me-1" /> Refresh
                    </Button>
                    <Button variant="success" onClick={handleExport}>
                        <Download size={16} className="me-1" /> Export CSV
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            {stats && (
                <Row className="mb-4 g-3">
                    <Col md={4}>
                        <Card className="border-0 shadow-sm h-100">
                            <Card.Body>
                                <div className="d-flex align-items-center">
                                    <Activity size={32} className="text-primary me-3" />
                                    <div>
                                        <h3 className="mb-0">{pagination.total}</h3>
                                        <small className="text-muted">Total Events</small>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={4}>
                        <Card className="border-0 shadow-sm h-100">
                            <Card.Body>
                                <div className="d-flex align-items-center">
                                    <User size={32} className="text-success me-3" />
                                    <div>
                                        <h3 className="mb-0">{stats.user_activity?.length || 0}</h3>
                                        <small className="text-muted">Active Users (7d)</small>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={4}>
                        <Card className="border-0 shadow-sm h-100">
                            <Card.Body>
                                <div className="d-flex align-items-center">
                                    <Clock size={32} className="text-warning me-3" />
                                    <div>
                                        <h3 className="mb-0">{stats.action_breakdown?.length || 0}</h3>
                                        <small className="text-muted">Event Types</small>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Filters */}
            <Card className="mb-4 border-0 shadow-sm">
                <Card.Body>
                    <Row className="g-3 align-items-end">
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small text-muted">Search</Form.Label>
                                <div className="position-relative">
                                    <Search size={16} className="position-absolute top-50 translate-middle-y ms-2 text-muted" />
                                    <Form.Control 
                                        placeholder="User or description..."
                                        value={filters.search}
                                        onChange={e => handleFilterChange('search', e.target.value)}
                                        className="ps-4"
                                    />
                                </div>
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group>
                                <Form.Label className="small text-muted">Action</Form.Label>
                                <Form.Select 
                                    value={filters.action}
                                    onChange={e => handleFilterChange('action', e.target.value)}
                                >
                                    <option value="">All Actions</option>
                                    <option value="LOGIN">Login</option>
                                    <option value="CREATE">Create</option>
                                    <option value="UPDATE">Update</option>
                                    <option value="DELETE">Delete</option>
                                    <option value="PAYMENT_RECEIVED">Payment</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group>
                                <Form.Label className="small text-muted">Entity</Form.Label>
                                <Form.Select 
                                    value={filters.entity_type}
                                    onChange={e => handleFilterChange('entity_type', e.target.value)}
                                >
                                    <option value="">All Entities</option>
                                    <option value="patient">Patient</option>
                                    <option value="opd_visit">OPD Visit</option>
                                    <option value="admission">Admission</option>
                                    <option value="payment">Payment</option>
                                    <option value="user">User</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group>
                                <Form.Label className="small text-muted">From Date</Form.Label>
                                <Form.Control 
                                    type="date"
                                    value={filters.from_date}
                                    onChange={e => handleFilterChange('from_date', e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <Form.Group>
                                <Form.Label className="small text-muted">To Date</Form.Label>
                                <Form.Control 
                                    type="date"
                                    value={filters.to_date}
                                    onChange={e => handleFilterChange('to_date', e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={1}>
                            <Button 
                                variant="outline-secondary" 
                                className="w-100"
                                onClick={() => setFilters({ action: '', entity_type: '', user_id: '', search: '', from_date: '', to_date: '' })}
                            >
                                <Filter size={16} /> Clear
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Logs Table */}
            <Card className="border-0 shadow-sm">
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="primary" />
                        </div>
                    ) : error ? (
                        <Alert variant="danger" className="m-3">{error}</Alert>
                    ) : logs.length === 0 ? (
                        <Alert variant="info" className="m-3">No audit logs found</Alert>
                    ) : (
                        <div className="table-responsive">
                            <Table hover className="mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Timestamp</th>
                                        <th>Action</th>
                                        <th>Entity</th>
                                        <th>User</th>
                                        <th>Description</th>
                                        <th>IP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => (
                                        <tr key={log.id}>
                                            <td className="text-muted small">
                                                {new Date(log.created_at).toLocaleString()}
                                            </td>
                                            <td>
                                                <Badge bg={getActionBadgeColor(log.action)}>
                                                    {log.action}
                                                </Badge>
                                            </td>
                                            <td>
                                                <small>{log.entity_type}</small>
                                                {log.entity_id && <small className="text-muted"> #{log.entity_id}</small>}
                                            </td>
                                            <td>
                                                <div>{log.user_name || 'System'}</div>
                                                <small className="text-muted">{log.user_role}</small>
                                            </td>
                                            <td className="small">{log.description || '-'}</td>
                                            <td className="text-muted small">{log.ip_address || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </Card.Body>
                
                {/* Pagination */}
                {pagination.pages > 1 && (
                    <Card.Footer className="bg-white">
                        <div className="d-flex justify-content-between align-items-center">
                            <small className="text-muted">
                                Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                            </small>
                            <Pagination className="mb-0">
                                <Pagination.Prev 
                                    disabled={pagination.page === 1}
                                    onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                                />
                                {[...Array(Math.min(5, pagination.pages))].map((_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                        <Pagination.Item 
                                            key={pageNum}
                                            active={pageNum === pagination.page}
                                            onClick={() => setPagination(p => ({ ...p, page: pageNum }))}
                                        >
                                            {pageNum}
                                        </Pagination.Item>
                                    );
                                })}
                                <Pagination.Next 
                                    disabled={pagination.page === pagination.pages}
                                    onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                                />
                            </Pagination>
                        </div>
                    </Card.Footer>
                )}
            </Card>
        </Container>
    );
};

export default AuditTrailDashboard;
