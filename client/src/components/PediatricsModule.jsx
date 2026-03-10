import React, { useState, useMemo } from 'react';
import { Card, Row, Col, Form, Badge, Button, Table, Alert } from 'react-bootstrap';
import { Baby, TrendingUp, Syringe, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * PediatricsModule - Phase 6 Specialty Module
 * WHO growth charts, vaccination schedules, age-appropriate dosing
 */

// WHO Growth Standards (simplified percentile data)
const WHO_WEIGHT_BOYS = {
    // Age in months: [3rd, 15th, 50th, 85th, 97th percentile in kg]
    0: [2.5, 2.9, 3.3, 3.9, 4.4],
    3: [5.0, 5.6, 6.4, 7.2, 7.9],
    6: [6.4, 7.1, 7.9, 8.8, 9.7],
    9: [7.2, 8.0, 8.9, 9.9, 10.9],
    12: [7.8, 8.6, 9.6, 10.8, 11.8],
    18: [8.8, 9.7, 10.9, 12.2, 13.5],
    24: [9.7, 10.8, 12.2, 13.6, 15.0],
    36: [11.3, 12.7, 14.3, 16.2, 18.0],
    48: [12.7, 14.4, 16.3, 18.6, 20.9],
    60: [14.1, 16.0, 18.3, 21.0, 24.2]
};

const WHO_WEIGHT_GIRLS = {
    0: [2.4, 2.8, 3.2, 3.7, 4.2],
    3: [4.6, 5.2, 5.8, 6.6, 7.3],
    6: [5.8, 6.5, 7.3, 8.2, 9.0],
    9: [6.6, 7.3, 8.2, 9.2, 10.2],
    12: [7.1, 7.9, 8.9, 10.1, 11.2],
    18: [8.1, 9.0, 10.2, 11.6, 12.9],
    24: [9.0, 10.1, 11.5, 13.1, 14.6],
    36: [10.6, 12.0, 13.9, 15.8, 17.8],
    48: [12.1, 13.8, 16.1, 18.5, 21.0],
    60: [13.5, 15.5, 18.2, 21.2, 24.6]
};

// Indian National Immunization Schedule
const VACCINATION_SCHEDULE = [
    { age: 'Birth', vaccines: ['BCG', 'OPV-0', 'Hep B - Birth dose'], dueAt: 0 },
    { age: '6 weeks', vaccines: ['OPV-1', 'Pentavalent-1', 'Rotavirus-1', 'PCV-1'], dueAt: 1.5 },
    { age: '10 weeks', vaccines: ['OPV-2', 'Pentavalent-2', 'Rotavirus-2'], dueAt: 2.5 },
    { age: '14 weeks', vaccines: ['OPV-3', 'Pentavalent-3', 'Rotavirus-3', 'PCV-2'], dueAt: 3.5 },
    { age: '6 months', vaccines: ['OPV Booster', 'Hep B - 3rd dose'], dueAt: 6 },
    { age: '9 months', vaccines: ['MR-1 (Measles, Rubella)', 'JE-1', 'PCV Booster'], dueAt: 9 },
    { age: '12 months', vaccines: ['Hep A'], dueAt: 12 },
    { age: '15 months', vaccines: ['MMR'], dueAt: 15 },
    { age: '16-18 months', vaccines: ['DPT Booster-1', 'OPV Booster', 'Hib Booster'], dueAt: 17 },
    { age: '18 months', vaccines: ['Hep A - 2nd dose'], dueAt: 18 },
    { age: '2 years', vaccines: ['Typhoid'], dueAt: 24 },
    { age: '4-6 years', vaccines: ['DPT Booster-2', 'OPV Booster', 'MMR-2'], dueAt: 60 },
    { age: '10-12 years', vaccines: ['Tdap', 'HPV (Girls)'], dueAt: 132 }
];

// Age-appropriate drug dosing (mg/kg)
const PEDIATRIC_DOSING = {
    'Paracetamol': { dose: 15, unit: 'mg/kg', freq: 'Q6H', max: 60, maxDaily: 'mg/kg/day' },
    'Ibuprofen': { dose: 10, unit: 'mg/kg', freq: 'Q8H', max: 40, maxDaily: 'mg/kg/day' },
    'Amoxicillin': { dose: 25, unit: 'mg/kg', freq: 'Q8H', max: 100, maxDaily: 'mg/kg/day' },
    'Azithromycin': { dose: 10, unit: 'mg/kg', freq: 'OD', max: 30, maxDaily: 'mg/kg for 3 days' },
    'Cetirizine': { dose: 0.25, unit: 'mg/kg', freq: 'OD', max: 10, maxDaily: 'mg max' },
    'Ondansetron': { dose: 0.15, unit: 'mg/kg', freq: 'Q8H', max: 8, maxDaily: 'mg/dose' },
    'Salbutamol Syrup': { dose: 0.1, unit: 'mg/kg', freq: 'Q8H', max: 4, maxDaily: 'mg/dose' }
};

const PediatricsModule = ({ patient }) => {
    const [activeTab, setActiveTab] = useState('growth');
    const [weightInput, setWeightInput] = useState('');
    const [heightInput, setHeightInput] = useState('');

    // Calculate age in months from DOB
    const ageInMonths = useMemo(() => {
        if (!patient?.dob) return null;
        const dob = new Date(patient.dob);
        const now = new Date();
        return Math.floor((now - dob) / (1000 * 60 * 60 * 24 * 30.44));
    }, [patient?.dob]);

    const gender = patient?.gender?.toLowerCase() || 'male';

    // Get growth percentile
    const getPercentile = (weight, ageMonths, isMale) => {
        const data = isMale ? WHO_WEIGHT_BOYS : WHO_WEIGHT_GIRLS;
        const ages = Object.keys(data).map(Number).sort((a, b) => a - b);

        // Find closest age
        let closestAge = ages[0];
        for (const age of ages) {
            if (age <= ageMonths) closestAge = age;
            else break;
        }

        const percentiles = data[closestAge];
        if (weight < percentiles[0]) return '<3rd';
        if (weight < percentiles[1]) return '3rd-15th';
        if (weight < percentiles[2]) return '15th-50th';
        if (weight < percentiles[3]) return '50th-85th';
        if (weight < percentiles[4]) return '85th-97th';
        return '>97th';
    };

    // Get due/overdue vaccines
    const getVaccineStatus = (ageMonths) => {
        return VACCINATION_SCHEDULE.map(schedule => {
            const monthsOverdue = ageMonths - schedule.dueAt;
            let status = 'future';
            if (monthsOverdue >= 0 && monthsOverdue < 2) status = 'due';
            else if (monthsOverdue >= 2) status = 'overdue';
            return { ...schedule, status, monthsOverdue };
        });
    };

    const vaccineStatus = ageInMonths !== null ? getVaccineStatus(ageInMonths) : [];
    const dueVaccines = vaccineStatus.filter(v => v.status === 'due');
    const overdueVaccines = vaccineStatus.filter(v => v.status === 'overdue');

    // Calculate drug dose
    const calculateDose = (drugName, weightKg) => {
        const drug = PEDIATRIC_DOSING[drugName];
        if (!drug || !weightKg) return null;
        const calculatedDose = drug.dose * weightKg;
        const maxDose = drug.max;
        return {
            calculated: calculatedDose.toFixed(1),
            final: Math.min(calculatedDose, maxDose).toFixed(1),
            freq: drug.freq,
            maxNote: drug.maxDaily
        };
    };

    return (
        <Card className="shadow-sm mb-3">
            <Card.Header className="bg-info text-white d-flex justify-content-between align-items-center py-2">
                <div className="d-flex align-items-center gap-2">
                    <Baby size={20} />
                    <strong>Pediatrics Module</strong>
                    {ageInMonths !== null && (
                        <Badge bg="light" text="dark">
                            {ageInMonths < 12 ? `${ageInMonths} months` : `${Math.floor(ageInMonths / 12)} yrs ${ageInMonths % 12} mo`}
                        </Badge>
                    )}
                </div>
                <div className="btn-group btn-group-sm">
                    <Button
                        variant={activeTab === 'growth' ? 'light' : 'outline-light'}
                        size="sm"
                        onClick={() => setActiveTab('growth')}
                    >
                        <TrendingUp size={14} className="me-1" />
                        Growth
                    </Button>
                    <Button
                        variant={activeTab === 'vaccines' ? 'light' : 'outline-light'}
                        size="sm"
                        onClick={() => setActiveTab('vaccines')}
                    >
                        <Syringe size={14} className="me-1" />
                        Vaccines
                        {overdueVaccines.length > 0 && (
                            <Badge bg="danger" className="ms-1">{overdueVaccines.length}</Badge>
                        )}
                    </Button>
                    <Button
                        variant={activeTab === 'dosing' ? 'light' : 'outline-light'}
                        size="sm"
                        onClick={() => setActiveTab('dosing')}
                    >
                        💊 Dosing
                    </Button>
                </div>
            </Card.Header>
            <Card.Body className="p-2">
                {/* Growth Charts Tab */}
                {activeTab === 'growth' && (
                    <div>
                        <Row className="mb-2">
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small mb-1">Weight (kg)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        size="sm"
                                        placeholder="Enter weight"
                                        value={weightInput}
                                        onChange={(e) => setWeightInput(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small mb-1">Height (cm)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        size="sm"
                                        placeholder="Enter height"
                                        value={heightInput}
                                        onChange={(e) => setHeightInput(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={4} className="d-flex align-items-end">
                                {weightInput && ageInMonths !== null && (
                                    <Badge
                                        bg={
                                            getPercentile(parseFloat(weightInput), ageInMonths, gender === 'male').includes('<3') ||
                                                getPercentile(parseFloat(weightInput), ageInMonths, gender === 'male').includes('>97')
                                                ? 'danger' : 'success'
                                        }
                                        className="px-3 py-2"
                                    >
                                        Weight: {getPercentile(parseFloat(weightInput), ageInMonths, gender === 'male')} percentile
                                    </Badge>
                                )}
                            </Col>
                        </Row>
                        <Alert variant="info" className="py-1 px-2 mb-0 small">
                            <TrendingUp size={14} className="me-1" />
                            WHO Growth Standards - Weight-for-age chart
                        </Alert>
                    </div>
                )}

                {/* Vaccination Tab */}
                {activeTab === 'vaccines' && (
                    <div style={{ maxHeight: 250, overflowY: 'auto' }}>
                        {overdueVaccines.length > 0 && (
                            <Alert variant="danger" className="py-1 px-2 mb-2 small">
                                <AlertTriangle size={14} className="me-1" />
                                {overdueVaccines.length} overdue vaccines!
                            </Alert>
                        )}
                        <Table size="sm" className="small mb-0">
                            <thead>
                                <tr>
                                    <th>Age</th>
                                    <th>Vaccines</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vaccineStatus.map((v, i) => (
                                    <tr key={i} className={v.status === 'overdue' ? 'table-danger' : v.status === 'due' ? 'table-warning' : ''}>
                                        <td>{v.age}</td>
                                        <td>{v.vaccines.join(', ')}</td>
                                        <td>
                                            {v.status === 'overdue' && <Badge bg="danger">Overdue</Badge>}
                                            {v.status === 'due' && <Badge bg="warning" text="dark">Due Now</Badge>}
                                            {v.status === 'future' && <Badge bg="secondary">Upcoming</Badge>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}

                {/* Drug Dosing Tab */}
                {activeTab === 'dosing' && (
                    <div>
                        <Row className="mb-2">
                            <Col md={4}>
                                <Form.Group>
                                    <Form.Label className="small mb-1">Child's Weight (kg)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        size="sm"
                                        placeholder="Enter weight"
                                        value={weightInput}
                                        onChange={(e) => setWeightInput(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                        </Row>
                        {weightInput && (
                            <Table size="sm" className="small mb-0">
                                <thead>
                                    <tr>
                                        <th>Drug</th>
                                        <th>Dose</th>
                                        <th>Frequency</th>
                                        <th>Note</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(PEDIATRIC_DOSING).map(([drug, info]) => {
                                        const dose = calculateDose(drug, parseFloat(weightInput));
                                        return (
                                            <tr key={drug}>
                                                <td><strong>{drug}</strong></td>
                                                <td>{dose?.final} mg</td>
                                                <td>{dose?.freq}</td>
                                                <td className="text-muted">Max: {info.max} {info.maxDaily}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        )}
                        {!weightInput && (
                            <Alert variant="secondary" className="py-1 px-2 small">
                                Enter child's weight to calculate age-appropriate doses
                            </Alert>
                        )}
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default PediatricsModule;
