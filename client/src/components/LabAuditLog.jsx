import React from 'react';
import { Card, Badge, ListGroup } from 'react-bootstrap';
import { Clock, User, FileText, CheckCircle, QrCode, AlertTriangle, Printer } from 'lucide-react';

/**
 * LabAuditLog - Timeline view of sample lifecycle events
 * 
 * @param {array} auditLog - Array of audit events
 * @param {boolean} loading - Loading state
 */
const LabAuditLog = ({ auditLog = [], loading = false }) => {
    const getActionConfig = (action) => {
        const configs = {
            'CREATED': { icon: FileText, color: 'primary', label: 'Order Created' },
            'BARCODE_GENERATED': { icon: QrCode, color: 'info', label: 'Barcode Generated' },
            'SAMPLE_COLLECTED': { icon: CheckCircle, color: 'success', label: 'Sample Collected' },
            'RESULT_UPLOADED': { icon: FileText, color: 'success', label: 'Result Uploaded' },
            'RESULT_AMENDED': { icon: AlertTriangle, color: 'warning', label: 'Result Amended' },
            'PRINTED': { icon: Printer, color: 'secondary', label: 'Report Printed' },
            'CRITICAL_ALERT': { icon: AlertTriangle, color: 'danger', label: 'Critical Alert Sent' }
        };
        return configs[action] || { icon: Clock, color: 'secondary', label: action };
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <Card className="border-0 shadow-sm">
                <Card.Body className="text-center text-muted py-4">
                    <Clock size={24} className="mb-2" />
                    <div>Loading audit trail...</div>
                </Card.Body>
            </Card>
        );
    }

    if (auditLog.length === 0) {
        return (
            <Card className="border-0 shadow-sm">
                <Card.Body className="text-center text-muted py-4">
                    <Clock size={24} className="mb-2" />
                    <div>No audit history available</div>
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white fw-bold d-flex align-items-center gap-2">
                <Clock size={18} />
                Sample Audit Trail
            </Card.Header>
            <ListGroup variant="flush">
                {auditLog.map((event, index) => {
                    const config = getActionConfig(event.action);
                    const Icon = config.icon;

                    return (
                        <ListGroup.Item
                            key={event.id || index}
                            className="d-flex align-items-start gap-3 py-3"
                        >
                            <div
                                className={`rounded-circle bg-${config.color} bg-opacity-10 p-2`}
                                style={{ flexShrink: 0 }}
                            >
                                <Icon size={16} className={`text-${config.color}`} />
                            </div>
                            <div className="flex-grow-1">
                                <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                        <strong>{config.label}</strong>
                                        {event.performed_by_name && (
                                            <span className="text-muted ms-2">
                                                <User size={12} className="me-1" />
                                                {event.performed_by_name}
                                            </span>
                                        )}
                                    </div>
                                    <Badge bg="light" text="dark" className="small">
                                        {formatTime(event.created_at)}
                                    </Badge>
                                </div>
                                {event.details && Object.keys(event.details).length > 0 && (
                                    <div className="text-muted small mt-1">
                                        {Object.entries(event.details).map(([key, value]) => (
                                            <span key={key} className="me-3">
                                                <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : value}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </ListGroup.Item>
                    );
                })}
            </ListGroup>
        </Card>
    );
};

export default LabAuditLog;
