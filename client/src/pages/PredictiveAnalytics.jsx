import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Tabs, Tab, ProgressBar } from 'react-bootstrap';

const PredictiveAnalytics = () => {
    const [activeTab, setActiveTab] = useState('readmission');

    const readmissionRisk = [
        { id: 'P-10045', name: 'Ramesh Kumar', age: 72, diagnosis: 'CHF Exacerbation', los: 8, risk: 82, factors: ['Age >65', 'Readmitted 2x in 6mo', 'Multiple comorbidities', 'Low EF'], discharge: '2026-03-01' },
        { id: 'P-10032', name: 'Sunita Devi', age: 65, diagnosis: 'COPD Acute', los: 6, risk: 71, factors: ['Prior readmission', 'Low FEV1', 'Steroid dependent'], discharge: '2026-03-02' },
        { id: 'P-10078', name: 'Arvind Shah', age: 58, diagnosis: 'Diabetic Ketoacidosis', los: 4, risk: 55, factors: ['Non-compliance history', 'HbA1c >10', 'No caregiver'], discharge: '2026-03-02' },
        { id: 'P-10091', name: 'Meera Patel', age: 45, diagnosis: 'Pneumonia', los: 5, risk: 30, factors: ['First admission', 'Good social support'], discharge: '2026-03-03' },
        { id: 'P-10105', name: 'Vikram Singh', age: 38, diagnosis: 'Appendectomy', los: 2, risk: 8, factors: ['Young', 'Surgical - routine'], discharge: '2026-03-02' },
    ];

    const losPredictions = [
        { ward: 'General Medicine', current: 32, avgLOS: 4.2, predicted: 4.5, trend: 'up' },
        { ward: 'Cardiology', current: 18, avgLOS: 5.8, predicted: 6.1, trend: 'up' },
        { ward: 'Surgery', current: 24, avgLOS: 3.1, predicted: 2.9, trend: 'down' },
        { ward: 'Orthopedics', current: 15, avgLOS: 4.5, predicted: 4.3, trend: 'down' },
        { ward: 'Pediatrics', current: 12, avgLOS: 3.0, predicted: 3.2, trend: 'up' },
        { ward: 'OB/GYN', current: 20, avgLOS: 2.8, predicted: 2.7, trend: 'down' },
    ];

    const bedDemand = [
        { day: 'Today', total: 200, occupied: 168, predicted: 172, surge: false },
        { day: 'Tomorrow', total: 200, occupied: null, predicted: 178, surge: false },
        { day: 'Day +2', total: 200, occupied: null, predicted: 185, surge: true },
        { day: 'Day +3', total: 200, occupied: null, predicted: 190, surge: true },
        { day: 'Day +4', total: 200, occupied: null, predicted: 182, surge: true },
        { day: 'Day +5', total: 200, occupied: null, predicted: 175, surge: false },
        { day: 'Day +6', total: 200, occupied: null, predicted: 170, surge: false },
    ];

    const getRiskColor = (risk) => {
        if (risk >= 70) return 'danger';
        if (risk >= 40) return 'warning';
        return 'success';
    };

    return (
        <Container className="py-4">
            <h3 className="fw-bold mb-4">📊 Predictive Analytics Dashboard</h3>

            <Row className="mb-4 g-3">
                {[
                    { t: 'High-Risk Patients', v: readmissionRisk.filter(p => p.risk >= 70).length, c: 'danger', icon: '⚠️' },
                    { t: 'Avg Readmission Risk', v: '49%', c: 'warning', icon: '📈' },
                    { t: 'Avg LOS (Hospital)', v: '3.9 days', c: 'info', icon: '🏥' },
                    { t: 'Bed Occupancy', v: '84%', c: 'primary', icon: '🛏️' },
                ].map((k, i) => (
                    <Col md={3} key={i}><Card className="border-0 shadow-sm text-center"><Card.Body className="py-3"><small className="text-muted">{k.icon} {k.t}</small><h4 className={`fw-bold text-${k.c} mb-0`}>{k.v}</h4></Card.Body></Card></Col>
                ))}
            </Row>

            <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
                <Tab eventKey="readmission" title="🔄 Readmission Risk">
                    <Card className="shadow-sm border-0">
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light"><tr><th>Patient</th><th>Age</th><th>Diagnosis</th><th>LOS</th><th>Risk Score</th><th>Risk Factors</th><th>Discharge</th></tr></thead>
                            <tbody>
                                {readmissionRisk.map(p => (
                                    <tr key={p.id} className={p.risk >= 70 ? 'table-danger' : ''}>
                                        <td><strong>{p.name}</strong><br/><small className="text-muted">{p.id}</small></td>
                                        <td>{p.age}</td>
                                        <td>{p.diagnosis}</td>
                                        <td>{p.los}d</td>
                                        <td>
                                            <div className="d-flex align-items-center gap-2">
                                                <ProgressBar now={p.risk} variant={getRiskColor(p.risk)} style={{ width: 80, height: 8 }} />
                                                <Badge bg={getRiskColor(p.risk)}>{p.risk}%</Badge>
                                            </div>
                                        </td>
                                        <td>{p.factors.map((f, i) => <Badge key={i} bg="light" text="dark" className="me-1 mb-1">{f}</Badge>)}</td>
                                        <td>{p.discharge}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>

                <Tab eventKey="los" title="📅 LOS Prediction">
                    <Card className="shadow-sm border-0">
                        <Table hover responsive className="mb-0 align-middle text-center">
                            <thead className="bg-light"><tr><th>Ward</th><th>Current Patients</th><th>Avg LOS</th><th>Predicted LOS</th><th>Trend</th><th>Impact</th></tr></thead>
                            <tbody>
                                {losPredictions.map(w => (
                                    <tr key={w.ward}>
                                        <td className="text-start"><strong>{w.ward}</strong></td>
                                        <td>{w.current}</td>
                                        <td>{w.avgLOS} days</td>
                                        <td className={w.predicted > w.avgLOS ? 'text-danger fw-bold' : 'text-success fw-bold'}>{w.predicted} days</td>
                                        <td>{w.trend === 'up' ? '📈 Increasing' : '📉 Decreasing'}</td>
                                        <td><Badge bg={w.trend === 'up' ? 'warning' : 'success'}>{w.trend === 'up' ? 'More beds needed' : 'Beds freed sooner'}</Badge></td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>

                <Tab eventKey="beds" title="🛏️ Bed Demand Forecast">
                    <Card className="shadow-sm border-0">
                        <Table hover responsive className="mb-0 align-middle text-center">
                            <thead className="bg-light"><tr><th>Day</th><th>Total Beds</th><th>Current</th><th>Predicted</th><th>Occupancy %</th><th>Status</th></tr></thead>
                            <tbody>
                                {bedDemand.map(d => {
                                    const occ = Math.round((d.predicted / d.total) * 100);
                                    return (
                                        <tr key={d.day} className={d.surge ? 'table-warning' : ''}>
                                            <td><strong>{d.day}</strong></td>
                                            <td>{d.total}</td>
                                            <td>{d.occupied || '—'}</td>
                                            <td className="fw-bold">{d.predicted}</td>
                                            <td><ProgressBar now={occ} variant={occ > 90 ? 'danger' : occ > 80 ? 'warning' : 'success'} label={`${occ}%`} style={{ height: 20 }} /></td>
                                            <td>{d.surge ? <Badge bg="warning">⚠️ Surge Expected</Badge> : <Badge bg="success">✅ Normal</Badge>}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>
            </Tabs>
        </Container>
    );
};

export default PredictiveAnalytics;
