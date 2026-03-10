import React, { useState, useEffect } from 'react';
import { Badge, OverlayTrigger, Popover, Button } from 'react-bootstrap';
import { AlertTriangle, Bell } from 'lucide-react';
import axios from 'axios';

const ClinicalAlertBadge = ({ patientId, refreshTrigger }) => {
    const [alerts, setAlerts] = useState([]);

    const fetchAlerts = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/alerts/patient/${patientId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAlerts(res.data);
        } catch (err) {
            console.error('Error fetching alerts:', err);
        }
    };

    useEffect(() => {
        if (patientId) {
            fetchAlerts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [patientId, refreshTrigger]);

    const handleAcknowledge = async (alertId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/alerts/${alertId}/acknowledge`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchAlerts(); // Refresh
        } catch (err) {
            console.error('Error acknowledging alert:', err);
        }
    };

    if (alerts.length === 0) return null;

    const criticalCount = alerts.filter(a => a.severity === 'Critical' || a.severity === 'High').length;
    const variant = criticalCount > 0 ? 'danger' : 'warning';

    const popover = (
        <Popover id="alerts-popover">
            <Popover.Header as="h3" className="bg-light d-flex justify-content-between align-items-center">
                Active Alerts
                <div className="small text-muted">{alerts.length} unacknowledged</div>
            </Popover.Header>
            <Popover.Body className="p-0">
                <div className="list-group list-group-flush" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {alerts.map(alert => (
                        <div key={alert.id} className="list-group-item">
                            <div className="d-flex justify-content-between align-items-start mb-1">
                                <Badge bg={alert.severity === 'Critical' ? 'danger' : alert.severity === 'High' ? 'danger' : 'warning'}>
                                    {alert.severity}
                                </Badge>
                                <small className="text-muted">{new Date(alert.created_at).toLocaleTimeString()}</small>
                            </div>
                            <div className="fw-bold small mb-1">{alert.message}</div>
                            <div className="d-flex justify-content-end">
                                <Button size="sm" variant="outline-secondary" style={{ fontSize: '0.7rem' }} onClick={() => handleAcknowledge(alert.id)}>
                                    Acknowledge
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </Popover.Body>
        </Popover>
    );

    return (
        <OverlayTrigger trigger="click" placement="bottom" overlay={popover} rootClose>
            <Button variant={variant} size="sm" className="position-relative d-flex align-items-center gap-1 py-0 px-2" style={{ height: '24px' }}>
                <AlertTriangle size={14} />
                <span className="small fw-bold">{alerts.length} Alert{alerts.length !== 1 && 's'}</span>
            </Button>
        </OverlayTrigger>
    );
};

export default ClinicalAlertBadge;
