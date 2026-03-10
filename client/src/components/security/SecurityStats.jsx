
import React from 'react';
import { Card, Row, Col } from 'react-bootstrap';
import { Shield, AlertTriangle, Eye, Lock } from 'lucide-react';


const SecurityStats = ({ stats }) => {
    // Default stats if data is loading/missing
    const {
        activePatrols = 0,
        openIncidents = 0,
        activeMissions = 0,
        lockedGates = 0
    } = stats || {};

    return (
        <Row className="g-3 mb-4">
            <Col md={3}>
                <div className="glass-panel stat-card-premium">
                    <div className="stat-icon-wrapper" style={{ borderColor: 'var(--sec-primary)' }}>
                        <Shield className="text-neon-blue" size={28} />
                    </div>
                    <div>
                        <div className="stat-value text-neon-blue">{activePatrols}</div>
                        <div className="stat-label">Active Patrols</div>
                    </div>
                </div>
            </Col>
            <Col md={3}>
                <div className="glass-panel stat-card-premium danger-panel">
                    <div className="stat-icon-wrapper" style={{ borderColor: 'var(--sec-danger)' }}>
                        <AlertTriangle className="text-neon-red" size={28} />
                    </div>
                    <div>
                        <div className="stat-value text-neon-red">{openIncidents}</div>
                        <div className="stat-label">Open Incidents</div>
                    </div>
                </div>
            </Col>
            <Col md={3}>
                <div className="glass-panel stat-card-premium">
                    <div className="stat-icon-wrapper" style={{ borderColor: 'var(--sec-warning)' }}>
                        <Eye className="text-warning" size={28} />
                    </div>
                    <div>
                        <div className="stat-value text-warning">{activeMissions}</div>
                        <div className="stat-label">Active Missions</div>
                    </div>
                </div>
            </Col>
            <Col md={3}>
                <div className="glass-panel stat-card-premium">
                    <div className="stat-icon-wrapper" style={{ borderColor: 'var(--sec-success)' }}>
                        <Lock className="text-neon-green" size={28} />
                    </div>
                    <div>
                        <div className="stat-value text-neon-green">{lockedGates}</div>
                        <div className="stat-label">Secure Gates</div>
                    </div>
                </div>
            </Col>
        </Row>
    );
};

export default SecurityStats;
