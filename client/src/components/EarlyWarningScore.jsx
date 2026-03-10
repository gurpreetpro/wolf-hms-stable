import React from 'react';
import { Card, Badge, ProgressBar } from 'react-bootstrap';

const EarlyWarningScore = ({ vitals }) => {
    // Basic MEWS Calculation Logic
    const calculateMEWS = (v) => {
        if (!v) return null;

        let score = 0;

        // RR (Respiratory rate) - Mocking RR if missing as it's not in standard vitals often
        const rr = v.respiratory_rate || 18;
        if (rr <= 8 || rr >= 30) score += 3;
        else if (rr >= 21) score += 2;
        else if (rr < 12) score += 1;

        // HR
        const hr = parseInt(v.heart_rate) || 80;
        if (hr <= 40 || hr >= 130) score += 3;
        else if (hr >= 111) score += 2;
        else if (hr <= 50 || hr >= 101) score += 1;

        // BP (Systolic)
        const sys = parseInt(v.bp?.split('/')[0]) || 120;
        if (sys <= 70) score += 3;
        else if (sys <= 80) score += 2;
        else if (sys <= 100) score += 1;
        // High BP usually doesn't add to MEWS directly but critical for other reasons

        // Temp
        const temp = parseFloat(v.temp) || 98.6;
        if (temp <= 95 || temp >= 105) score += 2; // Rough conversion logic needed

        // AVPU (Consciousness) - Default to Alert
        // score += 0; 

        return score;
    };

    const score = calculateMEWS(vitals);

    if (score === null) return null;

    let variant = 'success';
    let risk = 'Low Risk';
    if (score >= 5) {
        variant = 'danger';
        risk = 'Critical Risk - Call ITU';
    } else if (score >= 3) {
        variant = 'warning';
        risk = 'Medium Risk - Monitor';
    }

    return (
        <Card className="border-0 shadow-sm mb-3">
            <Card.Body className="p-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold mb-0">Early Warning Score (MEWS)</h6>
                    <Badge bg={variant} pill className="px-3 py-2">{score}</Badge>
                </div>
                <div className="text-center my-2">
                    <h5 className={`text-${variant} mb-0`}>{risk}</h5>
                </div>
                <ProgressBar now={(score / 10) * 100} variant={variant} style={{ height: '6px' }} />
                <small className="text-muted d-block mt-2 text-center">
                    Based on latest vitals
                </small>
            </Card.Body>
        </Card>
    );
};

export default EarlyWarningScore;
