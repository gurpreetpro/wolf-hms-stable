import React from 'react';
import { Row, Col, Badge } from 'react-bootstrap';
import { Heart, Brain, FileText, Users } from 'lucide-react';

const ClinicalActionGrid = ({ onActionClick }) => {
    return (
        <Row className="g-3 mb-4">
            {/* Specialty Tools Card */}
            <Col md={3}>
                <div 
                    className="p-3 bg-white rounded-3 h-100 position-relative border-0 shadow-sm"
                    style={{ cursor: 'pointer', transition: 'all 0.2s', borderBottom: '4px solid #008080' }}
                    onClick={() => onActionClick('specialty')}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 15px rgba(0,0,0,0.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 .125rem .25rem rgba(0,0,0,.075)'; }}
                >
                    <div className="d-flex justify-content-between mb-2">
                        <div className="bg-light p-2 rounded-circle" style={{ backgroundColor: '#e6fffa' }}>
                            <Heart size={20} color="#008080" />
                        </div>
                        <Badge bg="dark" className="align-self-start" style={{ fontSize: '0.7rem' }}>Auto-detected</Badge>
                    </div>
                    <h6 className="fw-bold text-dark mb-1">Specialty Tools</h6>
                    <p className="text-muted small mb-0" style={{ fontSize: '0.8rem' }}>Cardiology Module Ready.</p>
                </div>
            </Col>

            {/* AI Assistant Card */}
            <Col md={3}>
                <div 
                    className="p-3 bg-white rounded-3 h-100 position-relative border-0 shadow-sm"
                    style={{ cursor: 'pointer', transition: 'all 0.2s', borderBottom: '4px solid #6f42c1' }}
                    onClick={() => onActionClick('ai')}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 15px rgba(0,0,0,0.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 .125rem .25rem rgba(0,0,0,.075)'; }}
                >
                    <div className="d-flex justify-content-between mb-2">
                        <div className="bg-light p-2 rounded-circle" style={{ backgroundColor: '#f3e8ff' }}>
                            <Brain size={20} color="#6f42c1" />
                        </div>
                        <Badge bg="success" className="align-self-start" style={{ fontSize: '0.7rem' }}>Active</Badge>
                    </div>
                    <h6 className="fw-bold text-dark mb-1">AI Assistant</h6>
                    <p className="text-muted small mb-0" style={{ fontSize: '0.8rem' }}>DDx & Interactions</p>
                </div>
            </Col>

            {/* SOAP Notes Card */}
            <Col md={3}>
                <div 
                    className="p-3 bg-white rounded-3 h-100 position-relative border-0 shadow-sm"
                    style={{ cursor: 'pointer', transition: 'all 0.2s', borderBottom: '4px solid #198754' }}
                    onClick={() => onActionClick('soap')}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 15px rgba(0,0,0,0.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 .125rem .25rem rgba(0,0,0,.075)'; }}
                >
                    <div className="d-flex justify-content-between mb-2">
                        <div className="bg-light p-2 rounded-circle" style={{ backgroundColor: '#d1fae5' }}>
                            <FileText size={20} color="#198754" />
                        </div>
                        <Badge bg="warning" text="dark" className="align-self-start" style={{ fontSize: '0.7rem' }}>Draft</Badge>
                    </div>
                    <h6 className="fw-bold text-dark mb-1">SOAP Notes</h6>
                    <p className="text-muted small mb-0" style={{ fontSize: '0.8rem' }}>Click to document</p>
                </div>
            </Col>

            {/* Referral Network Card */}
            <Col md={3}>
                <div 
                    className="p-3 bg-white rounded-3 h-100 position-relative border-0 shadow-sm"
                    style={{ cursor: 'pointer', transition: 'all 0.2s', borderBottom: '4px solid #0dcaf0' }}
                    onClick={() => onActionClick('referral')}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 15px rgba(0,0,0,0.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 .125rem .25rem rgba(0,0,0,.075)'; }}
                >
                    <div className="d-flex justify-content-between mb-2">
                        <div className="bg-light p-2 rounded-circle" style={{ backgroundColor: '#cffafe' }}>
                            <Users size={20} color="#0891b2" />
                        </div>
                    </div>
                    <h6 className="fw-bold text-dark mb-1">Referrals</h6>
                    <p className="text-muted small mb-0" style={{ fontSize: '0.8rem' }}>Find Specialists</p>
                </div>
            </Col>
        </Row>
    );
};

export default ClinicalActionGrid;
