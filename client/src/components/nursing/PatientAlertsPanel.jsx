import React, { useState } from 'react';
import { Card, Badge, Button, Row, Col, Alert, Spinner, Form } from 'react-bootstrap';
import { 
    AlertTriangle, Heart, Thermometer, Droplets, Shield, 
    Bell, BellOff, Clock, Zap, User, CheckCircle, XCircle
} from 'lucide-react';
// api import removed - alerts generated from passed admissions data

/**
 * PatientAlertsPanel - Gold Standard Enhancement
 * Real-time patient alerts for nursing staff
 * 
 * Alert Types:
 * - Critical Vitals (NEWS2 score > 5)
 * - Fall Risk (High risk patients)
 * - Isolation Precautions
 * - NPO Status
 * - Pending Critical Tasks
 */
const PatientAlertsPanel = ({ admissions = [], wardFilter = 'All' }) => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('all'); // all, critical, fall, isolation, pending
    const [acknowledgedIds, setAcknowledgedIds] = useState(new Set());

    // Generate alerts from admissions data
    const generateAlerts = React.useCallback(() => {
        setLoading(true);
        const generatedAlerts = [];
        
        admissions.forEach(admission => {
            // Critical Vitals Alert (NEWS2 > 5)
            if (admission.news2Score && admission.news2Score >= 5) {
                generatedAlerts.push({
                    id: `vitals-${admission.admission_id}`,
                    type: 'critical',
                    icon: <Heart className="text-danger" size={20} />,
                    title: 'Critical Vitals',
                    patient: admission.patient_name,
                    bedNumber: admission.bed_number,
                    ward: admission.ward,
                    message: `NEWS2 Score: ${admission.news2Score} (${admission.news2Risk})`,
                    action: 'Escalate to Doctor',
                    priority: 1,
                    color: 'danger',
                    timestamp: new Date()
                });
            }

            // High Fall Risk
            if (admission.fallRisk === 'High' || admission.fall_risk_level === 'High') {
                generatedAlerts.push({
                    id: `fall-${admission.admission_id}`,
                    type: 'fall',
                    icon: <AlertTriangle className="text-warning" size={20} />,
                    title: 'High Fall Risk',
                    patient: admission.patient_name,
                    bedNumber: admission.bed_number,
                    ward: admission.ward,
                    message: 'Patient requires fall precautions',
                    action: 'Ensure bed rails up',
                    priority: 2,
                    color: 'warning',
                    timestamp: new Date()
                });
            }

            // Isolation Precautions
            if (admission.isolation || admission.isolation_type) {
                generatedAlerts.push({
                    id: `isolation-${admission.admission_id}`,
                    type: 'isolation',
                    icon: <Shield className="text-info" size={20} />,
                    title: 'Isolation Precautions',
                    patient: admission.patient_name,
                    bedNumber: admission.bed_number,
                    ward: admission.ward,
                    message: admission.isolation_type || 'Contact Precautions',
                    action: 'Use PPE',
                    priority: 3,
                    color: 'info',
                    timestamp: new Date()
                });
            }

            // NPO Status
            if (admission.npo || admission.diet === 'NPO') {
                generatedAlerts.push({
                    id: `npo-${admission.admission_id}`,
                    type: 'npo',
                    icon: <XCircle className="text-secondary" size={20} />,
                    title: 'NPO Status',
                    patient: admission.patient_name,
                    bedNumber: admission.bed_number,
                    ward: admission.ward,
                    message: 'Nothing by mouth',
                    action: 'Monitor',
                    priority: 4,
                    color: 'secondary',
                    timestamp: new Date()
                });
            }

            // Sepsis Risk
            if (admission.sepsisRisk) {
                generatedAlerts.push({
                    id: `sepsis-${admission.admission_id}`,
                    type: 'critical',
                    icon: <Zap className="text-danger" size={20} />,
                    title: 'Sepsis Risk',
                    patient: admission.patient_name,
                    bedNumber: admission.bed_number,
                    ward: admission.ward,
                    message: 'Sepsis screening criteria met',
                    action: 'Alert Doctor Immediately',
                    priority: 0,
                    color: 'danger',
                    timestamp: new Date()
                });
            }
        });

        // Sort by priority
        generatedAlerts.sort((a, b) => a.priority - b.priority);
        setAlerts(generatedAlerts);
        setLoading(false);
    }, [admissions]);

    // Run generateAlerts when admissions change
    React.useEffect(() => {
        generateAlerts();
    }, [generateAlerts]);

    const handleAcknowledge = (alertId) => {
        setAcknowledgedIds(prev => new Set([...prev, alertId]));
    };

    const filteredAlerts = alerts.filter(alert => {
        if (filter === 'all') return true;
        return alert.type === filter;
    }).filter(alert => !acknowledgedIds.has(alert.id));

    const getAlertCounts = () => ({
        all: alerts.filter(a => !acknowledgedIds.has(a.id)).length,
        critical: alerts.filter(a => a.type === 'critical' && !acknowledgedIds.has(a.id)).length,
        fall: alerts.filter(a => a.type === 'fall' && !acknowledgedIds.has(a.id)).length,
        isolation: alerts.filter(a => a.type === 'isolation' && !acknowledgedIds.has(a.id)).length
    });

    const counts = getAlertCounts();

    if (loading) {
        return (
            <Card className="border-0 shadow-sm">
                <Card.Body className="text-center py-4">
                    <Spinner animation="border" variant="primary" size="sm" />
                    <p className="text-muted mt-2 mb-0">Scanning for alerts...</p>
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-sm mb-4" style={{borderLeft: '4px solid var(--danger, #ef4444)'}}>
            <Card.Header className="bg-light d-flex align-items-center justify-content-between py-2">
                <div className="d-flex align-items-center gap-2">
                    <Bell size={18} className="text-danger" />
                    <span className="fw-bold">Patient Alerts</span>
                    {counts.all > 0 && (
                        <Badge bg="danger" className="ms-2">{counts.all}</Badge>
                    )}
                </div>
                <Form.Select 
                    size="sm" 
                    className="w-auto"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                >
                    <option value="all">All Alerts ({counts.all})</option>
                    <option value="critical">Critical ({counts.critical})</option>
                    <option value="fall">Fall Risk ({counts.fall})</option>
                    <option value="isolation">Isolation ({counts.isolation})</option>
                </Form.Select>
            </Card.Header>
            <Card.Body className="py-2" style={{maxHeight: '300px', overflowY: 'auto'}}>
                {filteredAlerts.length === 0 ? (
                    <Alert variant="success" className="mb-0 d-flex align-items-center gap-2">
                        <CheckCircle size={18} />
                        <span>No active alerts - All patients stable</span>
                    </Alert>
                ) : (
                    <Row className="g-2">
                        {filteredAlerts.map(alert => (
                            <Col xs={12} key={alert.id}>
                                <Card 
                                    className={`border-start border-4 border-${alert.color} bg-${alert.color} bg-opacity-10`}
                                    style={{cursor: 'pointer'}}
                                >
                                    <Card.Body className="py-2 px-3">
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div className="d-flex align-items-start gap-2">
                                                {alert.icon}
                                                <div>
                                                    <div className="fw-bold d-flex align-items-center gap-2">
                                                        {alert.title}
                                                        <Badge bg="dark" className="fw-normal">{alert.bedNumber}</Badge>
                                                    </div>
                                                    <div className="small">
                                                        <User size={12} className="me-1" />
                                                        {alert.patient}
                                                    </div>
                                                    <div className="text-muted small">{alert.message}</div>
                                                </div>
                                            </div>
                                            <div className="text-end">
                                                <Button 
                                                    size="sm" 
                                                    variant={`outline-${alert.color}`}
                                                    onClick={() => handleAcknowledge(alert.id)}
                                                    className="mb-1"
                                                >
                                                    <BellOff size={14} />
                                                </Button>
                                                <div className="small text-muted">
                                                    <Clock size={10} className="me-1" />
                                                    Now
                                                </div>
                                            </div>
                                        </div>
                                        {alert.action && (
                                            <div className="mt-1">
                                                <Badge bg={alert.color} className="small">
                                                    Action: {alert.action}
                                                </Badge>
                                            </div>
                                        )}
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                )}
            </Card.Body>
        </Card>
    );
};

export default PatientAlertsPanel;
