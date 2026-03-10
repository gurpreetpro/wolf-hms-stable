import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Badge, ProgressBar, Spinner, Table, Alert } from 'react-bootstrap';
import { Activity, Wifi, WifiOff, Zap, Clock, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../utils/axiosInstance';

const InstrumentStatusWidget = ({ compact = false }) => {
    const [status, setStatus] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);

    // Fetch connection status
    const fetchStatus = useCallback(async () => {
        try {
            const [statusRes, instrumentsRes] = await Promise.all([
                api.get('/api/instruments/status'),
                api.get('/api/instruments')
            ]);

            // Merge status with instrument details
            const instruments = Array.isArray(instrumentsRes.data) ? instrumentsRes.data : [];
            const statusMap = {};
            if (Array.isArray(statusRes.data)) {
                statusRes.data.forEach(s => {
                    statusMap[s.instrumentId] = s;
                });
            }

            const merged = instruments.map(inst => ({
                ...inst,
                isConnected: statusMap[inst.id]?.isConnected || false,
                connectionType: statusMap[inst.id]?.type || 'unknown'
            }));

            setStatus(merged);
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Fetch status error:', error);
        }
    }, []);

    // Fetch processing stats
    const fetchStats = useCallback(async () => {
        try {
            // In a full implementation, this would call a stats endpoint
            setStats({
                messagesReceived: 0,
                resultsUploaded: 0,
                ordersSent: 0,
                errorRate: 0
            });
        } catch (error) {
            console.error('Fetch stats error:', error);
        }
    }, []);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchStatus(), fetchStats()]);
            setLoading(false);
        };

        loadData();

        // Poll every 5 seconds
        const interval = setInterval(() => {
            fetchStatus();
            fetchStats();
        }, 5000);

        return () => clearInterval(interval);
    }, [fetchStatus, fetchStats]);

    // Count active connections
    const activeCount = status.filter(s => s.isConnected).length;
    const totalCount = status.length;

    if (loading) {
        return (
            <div className="text-center p-3">
                <Spinner animation="border" size="sm" />
                <small className="ms-2">Loading status...</small>
            </div>
        );
    }

    if (compact) {
        // Compact view for sidebar or header
        return (
            <Card className="border-0 bg-transparent">
                <Card.Body className="p-2">
                    <div className="d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center">
                            {activeCount > 0 ? (
                                <Wifi className="text-success me-2" size={18} />
                            ) : (
                                <WifiOff className="text-secondary me-2" size={18} />
                            )}
                            <span className="small">
                                <strong>{activeCount}</strong>/{totalCount} instruments
                            </span>
                        </div>
                        {activeCount > 0 && (
                            <Badge bg="success" className="pulse-animation">
                                <Zap size={10} /> Live
                            </Badge>
                        )}
                    </div>
                </Card.Body>
            </Card>
        );
    }

    // Full view
    return (
        <Card className="h-100">
            <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center">
                <span>
                    <Activity size={16} className="me-2" />
                    Instrument Status
                </span>
                <small className="text-muted">
                    {lastUpdate && (
                        <>
                            <Clock size={12} className="me-1" />
                            {lastUpdate.toLocaleTimeString()}
                        </>
                    )}
                </small>
            </Card.Header>
            <Card.Body>
                {status.length === 0 ? (
                    <Alert variant="info" className="mb-0">
                        No instruments registered. Add instruments in the Instruments tab.
                    </Alert>
                ) : (
                    <>
                        {/* Connection Summary */}
                        <Row className="mb-3">
                            <Col>
                                <div className="d-flex align-items-center mb-2">
                                    <span className="me-2">Connections:</span>
                                    <Badge bg={activeCount > 0 ? 'success' : 'secondary'}>
                                        {activeCount} / {totalCount} online
                                    </Badge>
                                </div>
                                <ProgressBar>
                                    <ProgressBar
                                        variant="success"
                                        now={(activeCount / totalCount) * 100}
                                        key={1}
                                    />
                                    <ProgressBar
                                        variant="secondary"
                                        now={((totalCount - activeCount) / totalCount) * 100}
                                        key={2}
                                    />
                                </ProgressBar>
                            </Col>
                        </Row>

                        {/* Instrument List */}
                        <Table size="sm" className="mb-0">
                            <tbody>
                                {status.map(inst => (
                                    <tr key={inst.id}>
                                        <td style={{ width: '24px' }}>
                                            {inst.isConnected ? (
                                                <CheckCircle className="text-success" size={16} />
                                            ) : (
                                                <AlertTriangle className="text-warning" size={16} />
                                            )}
                                        </td>
                                        <td>
                                            <strong>{inst.name}</strong>
                                            <br />
                                            <small className="text-muted">
                                                {inst.manufacturer} {inst.model}
                                            </small>
                                        </td>
                                        <td className="text-end">
                                            <Badge bg={inst.isConnected ? 'success' : 'secondary'}>
                                                {inst.isConnected ? 'Online' : 'Offline'}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>

                        {/* Message Stats */}
                        {stats && (
                            <div className="mt-3 pt-3 border-top">
                                <Row className="text-center small">
                                    <Col>
                                        <div className="text-primary">
                                            <strong>{stats.messagesReceived}</strong>
                                        </div>
                                        <div className="text-muted">Messages</div>
                                    </Col>
                                    <Col>
                                        <div className="text-success">
                                            <strong>{stats.resultsUploaded}</strong>
                                        </div>
                                        <div className="text-muted">Results</div>
                                    </Col>
                                    <Col>
                                        <div className="text-info">
                                            <strong>{stats.ordersSent}</strong>
                                        </div>
                                        <div className="text-muted">Orders</div>
                                    </Col>
                                    <Col>
                                        <div className={stats.errorRate > 5 ? 'text-danger' : 'text-muted'}>
                                            <strong>{stats.errorRate}%</strong>
                                        </div>
                                        <div className="text-muted">Errors</div>
                                    </Col>
                                </Row>
                            </div>
                        )}
                    </>
                )}
            </Card.Body>
        </Card>
    );
};

export default InstrumentStatusWidget;
