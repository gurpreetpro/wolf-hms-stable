import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Table, Badge } from 'react-bootstrap';
import { Activity, Droplet, ClipboardCheck, Play } from 'lucide-react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const AnaesthesiaConsole = () => {
    const [searchParams] = useSearchParams();
    const surgeryId = searchParams.get('surgeryId');

    const [chartData, setChartData] = useState(null);
    const [vitalsForm, setVitalsForm] = useState({ hr: '', bp_sys: '', bp_dia: '', spo2: '', etco2: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (surgeryId) fetchChart();
    }, [surgeryId]);

    const fetchChart = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/anaesthesia/${surgeryId}`, { headers: { Authorization: `Bearer ${token}` } });
            setChartData(res.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
        }
    };

    const handleLogVitals = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/anaesthesia/vitals', {
                chart_id: chartData.chart.id,
                ...vitalsForm
            }, { headers: { Authorization: `Bearer ${token}` } });

            // Clear form and refresh
            setVitalsForm({ hr: '', bp_sys: '', bp_dia: '', spo2: '', etco2: '' });
            fetchChart();
        } catch (err) {
            alert('Failed to log vitals');
        }
    };

    const handleQuickDrug = async (drug, dose) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/anaesthesia/drugs', {
                chart_id: chartData.chart.id,
                drug_name: drug, dose, route: 'IV'
            }, { headers: { Authorization: `Bearer ${token}` } });
            fetchChart();
        } catch (err) {
            alert('Failed to log drug');
        }
    };

    const handleCountUpdate = async (countId, field, value) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/anaesthesia/count', {
                countId, field, value
            }, { headers: { Authorization: `Bearer ${token}` } });
            fetchChart();
        } catch (err) {
            console.error(err);
        }
    };

    if (loading || !chartData) return <div className="p-5 text-center">Select a Surgery from OT Dashboard to Start</div>;

    return (
        <Container fluid className="py-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="fw-bold text-white bg-dark p-2 rounded w-100">
                    <Activity className="me-2 text-danger" /> Intra-Operative Console (Surgery #{surgeryId})
                </h4>
            </div>

            <Row>
                {/* LEFT: Vitals Entry & Log */}
                <Col md={4}>
                    <Card className="mb-3 shadow-sm">
                        <Card.Header className="bg-primary text-white fw-bold">Live Vitals</Card.Header>
                        <Card.Body>
                            <Form onSubmit={handleLogVitals}>
                                <Row className="g-2 mb-2">
                                    <Col xs={6}><Form.Control placeholder="HR (bpm)" value={vitalsForm.hr} onChange={e => setVitalsForm({ ...vitalsForm, hr: e.target.value })} /></Col>
                                    <Col xs={6}><Form.Control placeholder="SpO2 (%)" value={vitalsForm.spo2} onChange={e => setVitalsForm({ ...vitalsForm, spo2: e.target.value })} /></Col>
                                    <Col xs={6}><Form.Control placeholder="Sys BP" value={vitalsForm.bp_sys} onChange={e => setVitalsForm({ ...vitalsForm, bp_sys: e.target.value })} /></Col>
                                    <Col xs={6}><Form.Control placeholder="Dia BP" value={vitalsForm.bp_dia} onChange={e => setVitalsForm({ ...vitalsForm, bp_dia: e.target.value })} /></Col>
                                    <Col xs={12}><Form.Control placeholder="EtCO2" value={vitalsForm.etco2} onChange={e => setVitalsForm({ ...vitalsForm, etco2: e.target.value })} /></Col>
                                </Row>
                                <Button type="submit" variant="danger" className="w-100">LOG VITALS</Button>
                            </Form>

                            <div className="mt-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                <Table size="sm" striped bordered className="text-center" style={{ fontSize: '0.9rem' }}>
                                    <thead><tr><th>Time</th><th>HR</th><th>BP</th><th>SpO2</th></tr></thead>
                                    <tbody>
                                        {chartData.vitals.map(v => (
                                            <tr key={v.id}>
                                                <td>{new Date(v.time_recorded).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                <td>{v.hr}</td>
                                                <td>{v.bp_sys}/{v.bp_dia}</td>
                                                <td>{v.spo2}%</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                {/* CENTER: Drug Bay */}
                <Col md={4}>
                    <Card className="mb-3 shadow-sm h-100">
                        <Card.Header className="bg-success text-white fw-bold">Drug Administration</Card.Header>
                        <Card.Body>
                            <div className="d-grid gap-2 mb-3">
                                <Button variant="outline-dark" onClick={() => handleQuickDrug('Propofol', '100mg')}>Propofol 100mg IV</Button>
                                <Button variant="outline-dark" onClick={() => handleQuickDrug('Fentanyl', '50mcg')}>Fentanyl 50mcg IV</Button>
                                <Button variant="outline-dark" onClick={() => handleQuickDrug('Rocuronium', '50mg')}>Rocuronium 50mg IV</Button>
                                <Button variant="outline-dark" onClick={() => handleQuickDrug('Ephedrine', '6mg')}>Ephedrine 6mg IV</Button>
                            </div>
                            <h6 className="border-bottom pb-2">Log</h6>
                            {chartData.drugs.map(d => (
                                <div key={d.id} className="d-flex justify-content-between border-bottom py-1">
                                    <span>{new Date(d.time_administered).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <strong>{d.drug_name} {d.dose}</strong>
                                </div>
                            ))}
                        </Card.Body>
                    </Card>
                </Col>

                {/* RIGHT: Safety Count */}
                <Col md={4}>
                    <Card className="mb-3 shadow-sm border-warning h-100">
                        <Card.Header className="bg-warning text-dark fw-bold">Surgical Safety Count</Card.Header>
                        <Card.Body>
                            <Table bordered>
                                <thead><tr><th>Item</th><th>Initial</th><th>Added</th><th>Closing</th></tr></thead>
                                <tbody>
                                    {chartData.counts.map(c => (
                                        <tr key={c.id}>
                                            <td className="fw-bold">{c.item_type}</td>
                                            <td className="p-0"><input type="number" className="form-control border-0 text-center" value={c.initial_count} onChange={e => handleCountUpdate(c.id, 'initial_count', e.target.value)} /></td>
                                            <td className="p-0"><input type="number" className="form-control border-0 text-center" value={c.added_count} onChange={e => handleCountUpdate(c.id, 'added_count', e.target.value)} /></td>
                                            <td className="p-0"><input type="number" className="form-control border-0 text-center" value={c.closing_count} onChange={e => handleCountUpdate(c.id, 'closing_count', e.target.value)} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                            <div className="alert alert-secondary text-center p-2 mb-0">
                                Total Count Match:
                                {chartData.counts.every(c => (c.initial_count + c.added_count) === c.closing_count)
                                    ? <Badge bg="success" className="ms-2">MATCHED</Badge>
                                    : <Badge bg="danger" className="ms-2">MISMATCH</Badge>
                                }
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default AnaesthesiaConsole;
