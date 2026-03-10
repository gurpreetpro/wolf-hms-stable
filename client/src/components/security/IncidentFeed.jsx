
import React from 'react';
import { Badge, Button } from 'react-bootstrap';
import { AlertTriangle, Plus, CheckCircle2 } from 'lucide-react';

const IncidentFeed = ({ incidents, onReportClick }) => {
    return (
        <div className="glass-panel h-100 d-flex flex-column">
            <div className="p-3 d-flex justify-content-between align-items-center border-bottom border-light" style={{ borderColor: 'var(--sec-glass-border)' }}>
                <h5 className="sec-font-header mb-0 d-flex align-items-center text-neon-blue">
                    <AlertTriangle size={20} className="me-2 text-warning" />
                    Live Incidents
                </h5>
                <Button 
                    size="sm" 
                    variant="outline-warning" 
                    className="d-flex align-items-center"
                    onClick={onReportClick}
                >
                    <Plus size={14} className="me-1" />
                    Report
                </Button>
            </div>
            <div className="flex-grow-1 overflow-auto">
                <div className="d-flex flex-column">
                    {incidents && incidents.length > 0 ? (
                        incidents.map((incident) => (
                            <div key={incident.id} className="px-4 py-3 border-bottom border-secondary" style={{ borderColor: 'var(--sec-glass-border)' }}>
                                <div className="d-flex justify-content-between align-items-start mb-1">
                                    <h6 className="text-white mb-0 sec-font-header" style={{ fontSize: '0.9rem' }}>{incident.title}</h6>
                                    <Badge bg={incident.severity === 'Critical' ? 'danger' : 'warning'}>
                                        {incident.severity}
                                    </Badge>
                                </div>
                                <p className="text-muted small mb-2">{incident.description}</p>
                                <div className="d-flex justify-content-between align-items-center small text-muted">
                                    <span>
                                        <i className="bi bi-geo-alt me-1"></i>
                                        {incident.location || 'Unknown Location'}
                                    </span>
                                    <span>{new Date(incident.created_at).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-5 text-muted">
                            <CheckCircle2 size={32} className="text-success mb-2 opacity-50" />
                            <p className="mb-0">All clear. No active incidents.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IncidentFeed;
