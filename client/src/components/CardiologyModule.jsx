import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Form, Badge, Button, Alert, Table } from 'react-bootstrap';
import { Heart, Activity, AlertTriangle, CheckCircle, Calculator } from 'lucide-react';

/**
 * CardiologyModule - Phase 6 Specialty Module
 * ASCVD Risk Calculator, Cardiac medication protocols, Heart failure checklist
 */

// Cardiac Medication Protocols
const CARDIAC_PROTOCOLS = {
    'Hypertension': {
        firstLine: ['Amlodipine 5mg OD', 'Telmisartan 40mg OD'],
        secondLine: ['Hydrochlorothiazide 12.5mg OD', 'Metoprolol 25mg BD'],
        notes: 'Target BP <130/80 mmHg for most patients'
    },
    'Acute Coronary Syndrome': {
        firstLine: ['Aspirin 325mg STAT', 'Clopidogrel 300mg loading', 'Atorvastatin 80mg'],
        secondLine: ['Enoxaparin 1mg/kg SC', 'Metoprolol 25mg if no contraindications'],
        notes: 'Refer for urgent cardiology consultation/PCI'
    },
    'Heart Failure (HFrEF)': {
        firstLine: ['Enalapril 2.5mg BD (titrate)', 'Carvedilol 3.125mg BD (titrate)'],
        secondLine: ['Spironolactone 25mg OD', 'Furosemide 40mg OD (adjust per fluid status)'],
        notes: 'GDMT titration, monitor K+ and creatinine'
    },
    'Atrial Fibrillation': {
        rateControl: ['Metoprolol 25-100mg BD', 'Diltiazem 30-60mg TID'],
        anticoagulation: ['Dabigatran 150mg BD', 'Rivaroxaban 20mg OD', 'Warfarin (INR 2-3)'],
        notes: 'CHA2DS2-VASc for stroke risk, HAS-BLED for bleeding risk'
    }
};

// Heart Failure Management Checklist
const HF_CHECKLIST = [
    { category: 'GDMT', items: ['ACE-I/ARB/ARNI initiated', 'Beta-blocker initiated', 'MRA if EF ≤35%', 'SGLT2i considered'] },
    { category: 'Monitoring', items: ['Daily weights', 'Fluid restriction if needed', 'Low sodium diet counseled', 'Electrolytes checked'] },
    { category: 'Devices', items: ['ICD evaluation if EF ≤35%', 'CRT if LBBB + EF ≤35%'] },
    { category: 'Follow-up', items: ['Cardiology referral', 'Cardiac rehab referral', 'Follow-up in 1-2 weeks'] }
];

const CardiologyModule = ({ patient, vitals }) => {
    const [activeTab, setActiveTab] = useState('risk');
    const [riskInputs, setRiskInputs] = useState({
        age: patient?.dob ? Math.floor((new Date() - new Date(patient.dob)) / (365.25 * 24 * 60 * 60 * 1000)) : 50,
        gender: patient?.gender?.toLowerCase() === 'female' ? 'female' : 'male',
        totalChol: 200,
        hdl: 50,
        systolicBP: vitals?.bp?.split('/')[0] || 120,
        onBPMeds: false,
        diabetic: false,
        smoker: false
    });
    const [checklist, setChecklist] = useState({});

    // Simplified ASCVD Risk Calculator (Pooled Cohort Equations approximation)
    const calculateASCVD = useMemo(() => {
        const { age, gender, totalChol, hdl, systolicBP, onBPMeds, diabetic, smoker } = riskInputs;

        // Simplified risk scoring (not actual PCE, just educational approximation)
        let baseRisk = 0;

        // Age factor
        if (age >= 40 && age < 50) baseRisk += 1;
        else if (age >= 50 && age < 60) baseRisk += 4;
        else if (age >= 60 && age < 70) baseRisk += 8;
        else if (age >= 70) baseRisk += 12;

        // Cholesterol factor
        const cholRatio = totalChol / hdl;
        if (cholRatio > 5) baseRisk += 3;
        else if (cholRatio > 4) baseRisk += 1;

        // BP factor
        if (systolicBP >= 160) baseRisk += 4;
        else if (systolicBP >= 140) baseRisk += 2;
        else if (systolicBP >= 130) baseRisk += 1;

        if (onBPMeds) baseRisk += 1;

        // Other factors
        if (diabetic) baseRisk += 4;
        if (smoker) baseRisk += 3;
        if (gender === 'male') baseRisk += 2;

        // Calculate approximate 10-year risk
        const risk = Math.min(baseRisk * 2, 50);

        return {
            risk,
            category: risk < 5 ? 'Low' : risk < 7.5 ? 'Borderline' : risk < 20 ? 'Intermediate' : 'High',
            color: risk < 5 ? 'success' : risk < 7.5 ? 'info' : risk < 20 ? 'warning' : 'danger',
            recommendation: risk < 7.5
                ? 'Lifestyle modifications, reassess in 5 years'
                : risk < 20
                    ? 'Consider statin therapy, lifestyle modifications'
                    : 'High-intensity statin recommended, aggressive risk factor control'
        };
    }, [riskInputs]);

    const toggleCheckItem = (category, item) => {
        const key = `${category}-${item}`;
        setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <Card className="shadow-sm mb-3">
            <Card.Header className="bg-danger text-white d-flex justify-content-between align-items-center py-2">
                <div className="d-flex align-items-center gap-2">
                    <Heart size={20} />
                    <strong>Cardiology Module</strong>
                </div>
                <div className="btn-group btn-group-sm">
                    <Button
                        variant={activeTab === 'risk' ? 'light' : 'outline-light'}
                        size="sm"
                        onClick={() => setActiveTab('risk')}
                    >
                        <Calculator size={14} className="me-1" />
                        ASCVD Risk
                    </Button>
                    <Button
                        variant={activeTab === 'protocols' ? 'light' : 'outline-light'}
                        size="sm"
                        onClick={() => setActiveTab('protocols')}
                    >
                        💊 Protocols
                    </Button>
                    <Button
                        variant={activeTab === 'hf' ? 'light' : 'outline-light'}
                        size="sm"
                        onClick={() => setActiveTab('hf')}
                    >
                        📋 HF Checklist
                    </Button>
                </div>
            </Card.Header>
            <Card.Body className="p-2">
                {/* ASCVD Risk Calculator */}
                {activeTab === 'risk' && (
                    <div>
                        <Row className="mb-2 g-2">
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small mb-1">Age</Form.Label>
                                    <Form.Control
                                        type="number"
                                        size="sm"
                                        value={riskInputs.age}
                                        onChange={(e) => setRiskInputs({ ...riskInputs, age: parseInt(e.target.value) })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small mb-1">Total Cholesterol</Form.Label>
                                    <Form.Control
                                        type="number"
                                        size="sm"
                                        value={riskInputs.totalChol}
                                        onChange={(e) => setRiskInputs({ ...riskInputs, totalChol: parseInt(e.target.value) })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small mb-1">HDL</Form.Label>
                                    <Form.Control
                                        type="number"
                                        size="sm"
                                        value={riskInputs.hdl}
                                        onChange={(e) => setRiskInputs({ ...riskInputs, hdl: parseInt(e.target.value) })}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={3}>
                                <Form.Group>
                                    <Form.Label className="small mb-1">Systolic BP</Form.Label>
                                    <Form.Control
                                        type="number"
                                        size="sm"
                                        value={riskInputs.systolicBP}
                                        onChange={(e) => setRiskInputs({ ...riskInputs, systolicBP: parseInt(e.target.value) })}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row className="mb-2">
                            <Col>
                                <Form.Check
                                    inline
                                    type="checkbox"
                                    label="On BP Meds"
                                    checked={riskInputs.onBPMeds}
                                    onChange={(e) => setRiskInputs({ ...riskInputs, onBPMeds: e.target.checked })}
                                />
                                <Form.Check
                                    inline
                                    type="checkbox"
                                    label="Diabetic"
                                    checked={riskInputs.diabetic}
                                    onChange={(e) => setRiskInputs({ ...riskInputs, diabetic: e.target.checked })}
                                />
                                <Form.Check
                                    inline
                                    type="checkbox"
                                    label="Smoker"
                                    checked={riskInputs.smoker}
                                    onChange={(e) => setRiskInputs({ ...riskInputs, smoker: e.target.checked })}
                                />
                            </Col>
                        </Row>
                        <Alert variant={calculateASCVD.color} className="py-2 mb-0">
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <strong>10-Year ASCVD Risk: </strong>
                                    <Badge bg={calculateASCVD.color} className="fs-6">
                                        {calculateASCVD.risk}% ({calculateASCVD.category})
                                    </Badge>
                                </div>
                            </div>
                            <div className="small mt-1">{calculateASCVD.recommendation}</div>
                        </Alert>
                    </div>
                )}

                {/* Medication Protocols */}
                {activeTab === 'protocols' && (
                    <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                        {Object.entries(CARDIAC_PROTOCOLS).map(([condition, protocol]) => (
                            <Card key={condition} className="mb-2">
                                <Card.Header className="py-1 px-2 bg-light">
                                    <strong className="small">{condition}</strong>
                                </Card.Header>
                                <Card.Body className="p-2 small">
                                    <div><strong>First Line:</strong> {protocol.firstLine?.join(', ') || protocol.rateControl?.join(', ')}</div>
                                    {protocol.secondLine && <div><strong>Second Line:</strong> {protocol.secondLine.join(', ')}</div>}
                                    {protocol.anticoagulation && <div><strong>Anticoagulation:</strong> {protocol.anticoagulation.join(', ')}</div>}
                                    <div className="text-muted fst-italic mt-1">{protocol.notes}</div>
                                </Card.Body>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Heart Failure Checklist */}
                {activeTab === 'hf' && (
                    <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                        {HF_CHECKLIST.map((section) => (
                            <div key={section.category} className="mb-2">
                                <strong className="small text-primary">{section.category}</strong>
                                {section.items.map((item) => {
                                    const key = `${section.category}-${item}`;
                                    return (
                                        <Form.Check
                                            key={key}
                                            type="checkbox"
                                            label={item}
                                            checked={checklist[key] || false}
                                            onChange={() => toggleCheckItem(section.category, item)}
                                            className="small"
                                        />
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default CardiologyModule;
