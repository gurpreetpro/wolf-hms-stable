import React from 'react';
import { Card, Badge, ProgressBar, Tooltip, OverlayTrigger } from 'react-bootstrap';
import { User, Activity, AlertTriangle, Clock, Droplet, Shield, Zap, Info } from 'lucide-react';

const BedCard = ({ admission, onClick }) => {
    // Use real NEWS2 data from backend (falls back to mock for demo)
    const acuityScore = admission.news2Score !== null && admission.news2Score !== undefined
        ? Math.min(5, Math.ceil(admission.news2Score / 4)) // Convert NEWS2 (0-20) to Acuity (1-5)
        : 1; // Fallback mock fixed value to avoid purity error
    const fallRisk = admission.fall_risk || false;
    const isolation = admission.isolation || false;
    const sepsisRisk = admission.sepsisRisk || false;
    const news2Score = admission.news2Score;
    const news2Risk = admission.news2Risk || 'Unknown';
    const news2Color = admission.news2Color || 'secondary';
    const nextMedTime = new Date();
    nextMedTime.setHours(nextMedTime.getHours() + 1);

    const getAcuityColor = (score) => {
        if (score >= 4) return 'danger';
        if (score === 3) return 'warning';
        return 'success';
    };

    return (
        <Card
            className="h-100 border-0 shadow-sm cursor-pointer position-relative overflow-hidden hover-scale"
            onClick={() => onClick(admission)}
            style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
        >
            {/* Status Strip on Left */}
            <div
                className={`position-absolute top-0 start-0 bottom-0 bg-${getAcuityColor(acuityScore)}`}
                style={{ width: '10px' }}
            />

            <Card.Body className="p-4 ps-5">
                <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h4 className="fw-bold mb-1 text-dark">{admission.bed_number}</h4>
                        <small className="text-muted text-uppercase fw-bold" style={{ fontSize: '0.8rem' }}>
                            {admission.ward}
                        </small>
                    </div>
                    {/* Acuity Badge */}
                    <OverlayTrigger overlay={<Tooltip>Acuity Score: {acuityScore}/5</Tooltip>}>
                        <Badge bg={getAcuityColor(acuityScore)} pill className="d-flex align-items-center gap-1 px-3 py-2" style={{ fontSize: '1rem' }}>
                            <Activity size={16} /> {acuityScore}
                        </Badge>
                    </OverlayTrigger>
                </div>

                <div className="mb-4">
                    <div className="d-flex align-items-center gap-2 mb-2">
                        <User size={24} className="text-primary" />
                        <div>
                            <div className="fw-bold fs-5 text-truncate" style={{ maxWidth: '200px' }}>
                                {admission.patient_name}
                            </div>
                            {admission.ipd_number && (
                                <div className="text-muted small fw-bold" style={{ fontSize: '0.7rem' }}>
                                    IPD: {admission.ipd_number}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="d-flex gap-2 mt-2 flex-wrap">
                        {sepsisRisk && (
                            <OverlayTrigger overlay={<Tooltip>⚠️ SEPSIS ALERT - Immediate attention required!</Tooltip>}>
                                <Badge bg="danger" className="animate-pulse"><AlertTriangle size={10} /> SEPSIS</Badge>
                            </OverlayTrigger>
                        )}
                        {fallRisk && (
                            <OverlayTrigger overlay={<Tooltip>Fall Risk</Tooltip>}>
                                <Badge bg="warning" text="dark"><AlertTriangle size={10} /> Fall</Badge>
                            </OverlayTrigger>
                        )}
                        {isolation && (
                            <OverlayTrigger overlay={<Tooltip>Isolation Protocol</Tooltip>}>
                                <Badge bg="danger"><Shield size={10} /> ISO</Badge>
                            </OverlayTrigger>
                        )}
                        <OverlayTrigger overlay={<Tooltip>NPO (Nothing by Mouth)</Tooltip>}>
                            <Badge bg="secondary"><Droplet size={10} /> NPO</Badge>
                        </OverlayTrigger>
                    </div>
                </div>

                {/* Mini Dashboard inside Card */}
                <div className="bg-light rounded p-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="text-muted"><Activity size={16} className="me-1" /> NEWS2</span>
                        <Badge bg={news2Color} className="fw-bold px-3 py-2" style={{ fontSize: '0.95rem' }}>
                            {news2Score !== null ? news2Score : '?'} - {news2Risk}
                        </Badge>
                    </div>
                    <div className="d-flex justify-content-between text-muted">
                        <span><Clock size={12} className="me-1" /> Next Med</span>
                        <span>{nextMedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                </div>
            </Card.Body>
        </Card>
    );
};

export default BedCard;
