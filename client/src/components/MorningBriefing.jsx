import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { Sun, AlertCircle, TrendingUp, Users } from 'lucide-react';
import { formatCurrency } from '../utils/currency';

const MorningBriefing = ({ todayRevenue, activePatients }) => {
    return (
        <div style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }} className="py-2 mb-4">
            <Container>
                <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center text-muted small gap-4">
                        <span className="fw-bold text-dark d-flex align-items-center gap-2">
                            <Sun size={16} className="text-warning" />
                            Morning Briefing
                        </span>

                        <span className="d-flex align-items-center gap-1">
                            <Users size={14} />
                            Census: <strong>{activePatients}</strong>
                        </span>

                        <span className="d-flex align-items-center gap-1">
                            <TrendingUp size={14} />
                            Revenue: <strong>{formatCurrency(todayRevenue)}</strong>
                        </span>
                    </div>

                    <div className="d-flex align-items-center text-muted small gap-3">
                        <span className="d-flex align-items-center gap-1 text-success fw-bold">
                            <AlertCircle size={14} />
                            Safety: 0 Incidents
                        </span>
                        <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    </div>
                </div>
            </Container>
        </div>
    );
};

export default MorningBriefing;
