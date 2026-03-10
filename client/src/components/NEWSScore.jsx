import React from 'react';
import { Badge, OverlayTrigger, Tooltip, Card } from 'react-bootstrap';
import { AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * National Early Warning Score (NEWS) Calculator
 * Based on Royal College of Physicians guidelines
 * 
 * Parameters scored:
 * - Respiratory Rate
 * - Oxygen Saturation (SpO2)
 * - Systolic Blood Pressure
 * - Heart Rate/Pulse
 * - Temperature
 * - Level of Consciousness (AVPU)
 * 
 * Score 0-4: Low risk - ward monitoring
 * Score 5-6: Medium risk - urgent review
 * Score 7+: High risk - emergency response
 */

// NEWS Scoring Tables
const scoreRespRate = (rr) => {
    if (!rr) return 0;
    if (rr <= 8) return 3;
    if (rr <= 11) return 1;
    if (rr <= 20) return 0;
    if (rr <= 24) return 2;
    return 3; // >= 25
};

const scoreSpO2 = (spo2, onO2 = false) => {
    if (!spo2) return 0;
    if (spo2 <= 91) return 3;
    if (spo2 <= 93) return 2;
    if (spo2 <= 95) return 1;
    return onO2 ? 2 : 0; // >= 96
};

const scoreSystolicBP = (sbp) => {
    if (!sbp) return 0;
    if (sbp <= 90) return 3;
    if (sbp <= 100) return 2;
    if (sbp <= 110) return 1;
    if (sbp <= 219) return 0;
    return 3; // >= 220
};

const scorePulse = (pulse) => {
    if (!pulse) return 0;
    if (pulse <= 40) return 3;
    if (pulse <= 50) return 1;
    if (pulse <= 90) return 0;
    if (pulse <= 110) return 1;
    if (pulse <= 130) return 2;
    return 3; // >= 131
};

const scoreTemp = (temp) => {
    if (!temp) return 0;
    // Convert Fahrenheit to Celsius if > 45 (assuming F if above 45)
    let tempC = temp;
    if (temp > 45) {
        tempC = (temp - 32) * 5 / 9;
    }
    if (tempC <= 35.0) return 3;
    if (tempC <= 36.0) return 1;
    if (tempC <= 38.0) return 0;
    if (tempC <= 39.0) return 1;
    return 2; // >= 39.1
};

const scoreConsciousness = (avpu = 'A') => {
    // A = Alert, V = Voice, P = Pain, U = Unresponsive
    return avpu === 'A' ? 0 : 3;
};

/**
 * Calculate NEWS Score from vitals
 */
export const calculateNEWS = (vitals, options = {}) => {
    const { onSupplementalO2 = false, avpu = 'A' } = options;

    // Parse BP
    let systolic = 0;
    if (vitals.bp && vitals.bp.includes('/')) {
        systolic = parseInt(vitals.bp.split('/')[0]) || 0;
    }

    const respRate = parseInt(vitals.resp_rate) || 16; // Default normal
    const spo2 = parseInt(vitals.spo2) || 98;
    const pulse = parseInt(vitals.heart_rate) || parseInt(vitals.pulse) || 72;
    const temp = parseFloat(vitals.temp) || 98.6;

    const scores = {
        respRate: scoreRespRate(respRate),
        spo2: scoreSpO2(spo2, onSupplementalO2),
        systolicBP: scoreSystolicBP(systolic),
        pulse: scorePulse(pulse),
        temp: scoreTemp(temp),
        consciousness: scoreConsciousness(avpu)
    };

    const total = Object.values(scores).reduce((a, b) => a + b, 0);

    return {
        total,
        scores,
        risk: total >= 7 ? 'high' : total >= 5 ? 'medium' : total >= 1 ? 'low' : 'none'
    };
};

/**
 * NEWS Badge Component - Displays score with appropriate color
 */
const NEWSBadge = ({ vitals, size = 'normal' }) => {
    if (!vitals) return null;

    const { total, risk } = calculateNEWS(vitals);

    const colors = {
        none: 'success',
        low: 'info',
        medium: 'warning',
        high: 'danger'
    };

    const icons = {
        none: <CheckCircle size={12} className="me-1" />,
        low: <AlertCircle size={12} className="me-1" />,
        medium: <AlertTriangle size={12} className="me-1" />,
        high: <AlertTriangle size={12} className="me-1" />
    };

    const descriptions = {
        none: 'Normal - routine monitoring',
        low: 'Low risk - increased monitoring',
        medium: 'Medium risk - urgent review needed',
        high: 'High risk - EMERGENCY response'
    };

    return (
        <OverlayTrigger
            placement="top"
            overlay={
                <Tooltip>
                    NEWS Score: {total}/21<br />
                    {descriptions[risk]}
                </Tooltip>
            }
        >
            <Badge 
                bg={colors[risk]} 
                className={`${size === 'large' ? 'fs-6 px-3 py-2' : ''}`}
                style={{ cursor: 'help' }}
            >
                {icons[risk]}
                NEWS: {total}
            </Badge>
        </OverlayTrigger>
    );
};

/**
 * NEWS Card Component - Full breakdown display
 */
export const NEWSCard = ({ vitals }) => {
    if (!vitals) return null;

    const { total, scores, risk } = calculateNEWS(vitals);

    const colors = {
        none: 'success',
        low: 'info',
        medium: 'warning',
        high: 'danger'
    };

    const riskText = {
        none: 'Normal',
        low: 'Low Risk',
        medium: 'Medium Risk',
        high: 'HIGH RISK'
    };

    return (
        <Card className={`border-${colors[risk]} mb-3`}>
            <Card.Header className={`bg-${colors[risk]} bg-opacity-10 d-flex justify-content-between align-items-center`}>
                <span className="fw-bold">Early Warning Score (NEWS)</span>
                <Badge bg={colors[risk]} className="fs-6">{total}/21 - {riskText[risk]}</Badge>
            </Card.Header>
            <Card.Body className="py-2">
                <div className="d-flex flex-wrap gap-2">
                    <small className="text-muted">RR: <Badge bg={scores.respRate > 0 ? 'warning' : 'light'} text="dark">{scores.respRate}</Badge></small>
                    <small className="text-muted">SpO2: <Badge bg={scores.spo2 > 0 ? 'warning' : 'light'} text="dark">{scores.spo2}</Badge></small>
                    <small className="text-muted">BP: <Badge bg={scores.systolicBP > 0 ? 'warning' : 'light'} text="dark">{scores.systolicBP}</Badge></small>
                    <small className="text-muted">HR: <Badge bg={scores.pulse > 0 ? 'warning' : 'light'} text="dark">{scores.pulse}</Badge></small>
                    <small className="text-muted">Temp: <Badge bg={scores.temp > 0 ? 'warning' : 'light'} text="dark">{scores.temp}</Badge></small>
                    <small className="text-muted">AVPU: <Badge bg={scores.consciousness > 0 ? 'danger' : 'light'} text="dark">{scores.consciousness}</Badge></small>
                </div>
            </Card.Body>
        </Card>
    );
};

export default NEWSBadge;
