import React, { useState, useEffect } from 'react';
import { Card, ListGroup, Badge, Button, Spinner } from 'react-bootstrap';
import { AlertTriangle, Bell, Check, User, Clock } from 'lucide-react';
import api from '../utils/axiosInstance';

/**
 * CriticalAlertWidget - Real-time critical value alerts panel
 */
const CriticalAlertWidget = ({ onAlertCount }) => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAlerts = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/api/lab/critical-alerts/pending', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAlerts(res.data);
            if (onAlertCount) onAlertCount(res.data.length);
            setLoading(false);
        } catch (err) {
            console.error('Critical alerts fetch error:', err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
        // Poll every 30 seconds
        const interval = setInterval(fetchAlerts, 30000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const acknowledgeAlert = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await api.post(`/api/lab/critical-alerts/${id}/acknowledge`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchAlerts(); // Refresh
        } catch (err) {
            console.error('Acknowledge error:', err);
        }
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = (now - date) / 1000 / 60; // minutes

        if (diff < 1) return 'Just now';
        if (diff < 60) return `${Math.floor(diff)}m ago`;
        if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
        return date.toLocaleDateString('en-IN');
    };

    if (loading) {
        return (
            <Card className="shadow-sm border-0 border-start border-danger border-4">
                <Card.Body className="text-center py-4">
                    <Spinner animation="border" variant="danger" size="sm" />
                    <div className="small text-muted mt-2">Loading alerts...</div>
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className="shadow-sm border-0 border-start border-danger border-4">
            <Card.Header className="bg-danger bg-opacity-10 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2 fw-bold text-danger">
                    <AlertTriangle size={18} />
                    🚨 Critical Alerts
                </div>
                {alerts.length > 0 && (
                    <Badge bg="danger" pill className="pulse-animation">
                        {alerts.length}
                    </Badge>
                )}
            </Card.Header>

            {alerts.length === 0 ? (
                <Card.Body className="text-center text-muted py-4">
                    <Check size={32} className="text-success mb-2" />
                    <div>No critical alerts</div>
                </Card.Body>
            ) : (
                <ListGroup variant="flush" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {alerts.map(alert => (
                        <ListGroup.Item
                            key={alert.id}
                            className="d-flex justify-content-between align-items-start py-3"
                        >
                            <div className="flex-grow-1">
                                <div className="d-flex align-items-center gap-2 mb-1">
                                    <Bell size={14} className="text-danger" />
                                    <strong className="text-danger">
                                        {alert.parameter}: {alert.value} {alert.unit}
                                    </strong>
                                </div>
                                <div className="small text-muted">
                                    <User size={12} className="me-1" />
                                    {alert.patient_name || 'Unknown'} • {alert.test_name || 'Lab Test'}
                                </div>
                                <div className="small text-muted">
                                    <Clock size={12} className="me-1" />
                                    {formatTime(alert.created_at)}
                                    <Badge
                                        bg={alert.alert_type === 'CRITICAL_HIGH' ? 'danger' : 'info'}
                                        className="ms-2"
                                    >
                                        {alert.alert_type === 'CRITICAL_HIGH' ? '↑ HIGH' : '↓ LOW'}
                                    </Badge>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline-success"
                                onClick={() => acknowledgeAlert(alert.id)}
                                className="ms-2"
                                title="Acknowledge"
                            >
                                <Check size={14} />
                            </Button>
                        </ListGroup.Item>
                    ))}
                </ListGroup>
            )}

            <style>{`
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                .pulse-animation {
                    animation: pulse 2s infinite;
                }
            `}</style>
        </Card>
    );
};

export default CriticalAlertWidget;
