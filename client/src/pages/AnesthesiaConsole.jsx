import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Form, Badge, Table, InputGroup } from 'react-bootstrap';
import { Activity, Play, StopCircle, Syringe, Droplet, Clock } from 'lucide-react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

const AnesthesiaConsole = () => {
    // 1. We expect 'surgery' object passed via navigation state, or url params
    // For simplicity, we'll try to find an Active Surgery if not passed, or mock for demo
    const location = useLocation();
    const surgeryFromState = location.state?.surgery; 
    
    // State
    const [record, setRecord] = useState(null); // Header
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Vitals Input State
    const [vitals, setVitals] = useState({ hr: '', bp_sys: '', bp_dia: '', spo2: '', etco2: '' });
    
    // Startup
    useEffect(() => {
        if (surgeryFromState) {
            initCase(surgeryFromState);
        } else {
            // Find any surgery for testing/demo or redirect
            // For now, allow manual init via a small form if no surgery passed?
            // Let's assume passed. If not, we'll show a "Select Surgery" placeholder.
        }
    }, [surgeryFromState]);

    const initCase = async (surgery) => {
        setLoading(true);
        try {
            // Check for existing record first
            const res = await axios.post('/api/intraop/start', {
                surgery_id: surgery.id,
                patient_id: surgery.patient_id,
                anaesthetist_id: 'CurrentDoc',
                technique: 'General Anesthesia (Default)', 
                asa_grade: 'I' // Should fetch from PAC
            });
            setRecord(res.data);
            refreshChart(res.data.id);
        } catch (err) {
            console.error(err);
            alert('Failed to initialize case');
        } finally {
            setLoading(false);
        }
    };

    const refreshChart = async (recordId) => {
        if (!recordId) return;
        try {
            const res = await axios.get(`/api/intraop/chart/${recordId}`);
            setRecord(res.data.header);
            setTimeline(res.data.timeline);
        } catch (err) { console.error(err); }
    };

    const logVitals = async () => {
        if (!record) return;
        try {
            await axios.post('/api/intraop/log', {
                record_id: record.id,
                type: 'Vitals',
                data: vitals,
                logged_by: 'CurrentDoc'
            });
            setVitals({ hr: '', bp_sys: '', bp_dia: '', spo2: '', etco2: '' }); // Clear
            refreshChart(record.id);
        } catch(err) { alert('Error logging vitals'); }
    };

    const logDrug = async (drugName, defaultDose) => {
        if (!record) return;
        const dose = prompt(`Dose for ${drugName}:`, defaultDose);
        if (!dose) return;

        try {
            await axios.post('/api/intraop/log', {
                record_id: record.id,
                type: 'Drug',
                data: { name: drugName, dose: dose },
                logged_by: 'CurrentDoc'
            });
            refreshChart(record.id);
        } catch(err) { alert('Error logging drug'); }
    };

    const endCase = async () => {
        if (!window.confirm("Finalize this anesthesia record?")) return;
        try {
            await axios.put(`/api/intraop/end/${record.id}`);
            alert('Case Finalized & Saved.');
            refreshChart(record.id);
        } catch(err) { alert('Error ending case'); }
    };

    if (!surgeryFromState && !record) {
        return <Container className="p-5 text-center"><h3>Please select a surgery from the OT Dashboard to open the console.</h3></Container>;
    }

    return (
        <Container fluid className="vh-100 d-flex flex-column p-0" style={{ backgroundColor: '#0f172a', color: '#e2e8f0' }}> 
            {/* Header */}
            <div className="p-3 border-bottom d-flex justify-content-between align-items-center" style={{ borderColor: '#334155' }}>
                <div>
                    <h4 className="m-0 text-info"><Activity className="me-2" />Anesthesia Live Console</h4>
                    <small className="text-muted">Patient: {surgeryFromState?.patient_name || 'Unknown'} | {surgeryFromState?.procedure_name} | {record?.technique}</small>
                </div>
                <div>
                    {record?.status === 'Finalized' ? 
                        <Badge bg="danger" className="fs-6">CASE CLOSED</Badge> : 
                        <Button variant="danger" size="sm" onClick={endCase}><StopCircle size={16} className="me-1" /> End Case</Button>
                    }
                </div>
            </div>

            <Row className="flex-grow-1 m-0">
                {/* Left: Input Panel */}
                <Col md={4} className="border-end p-4 d-flex flex-column gap-4" style={{ borderColor: '#334155', backgroundColor: '#1e293b' }}>
                    
                    {/* Vitals Entry */}
                    <Card style={{ backgroundColor: 'transparent', border: '1px solid #475569' }}>
                        <Card.Header className="text-white">Start Vitals Log (5 min)</Card.Header>
                        <Card.Body>
                            <Row className="g-2">
                                <Col xs={6}><Form.Control placeholder="HR (bpm)" value={vitals.hr} onChange={e=>setVitals({...vitals, hr:e.target.value})} style={inputStyle} /></Col>
                                <Col xs={6}><Form.Control placeholder="SpO2 (%)" value={vitals.spo2} onChange={e=>setVitals({...vitals, spo2:e.target.value})} style={inputStyle} /></Col>
                                <Col xs={6}><InputGroup><Form.Control placeholder="Sys" value={vitals.bp_sys} onChange={e=>setVitals({...vitals, bp_sys:e.target.value})} style={inputStyle} /><InputGroup.Text>/</InputGroup.Text><Form.Control placeholder="Dia" value={vitals.bp_dia} onChange={e=>setVitals({...vitals, bp_dia:e.target.value})} style={inputStyle} /></InputGroup></Col>
                                <Col xs={6}><Form.Control placeholder="EtCO2" value={vitals.etco2} onChange={e=>setVitals({...vitals, etco2:e.target.value})} style={inputStyle} /></Col>
                                <Col xs={12}><Button variant="success" className="w-100 mt-2" onClick={logVitals}>Log Vitals</Button></Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Quick Drugs */}
                    <Card style={{ backgroundColor: 'transparent', border: '1px solid #475569' }}>
                        <Card.Header className="text-white">Common Drugs</Card.Header>
                        <Card.Body className="d-flex flex-wrap gap-2">
                            <Button variant="outline-info" onClick={()=>logDrug('Propofol', '100mg')}>Propofol</Button>
                            <Button variant="outline-info" onClick={()=>logDrug('Fentanyl', '50mcg')}>Fentanyl</Button>
                            <Button variant="outline-info" onClick={()=>logDrug('Midazolam', '2mg')}>Midazolam</Button>
                            <Button variant="outline-warning" onClick={()=>logDrug('Ephedrine', '5mg')}>Ephedrine</Button>
                            <Button variant="outline-warning" onClick={()=>logDrug('Atropine', '0.6mg')}>Atropine</Button>
                        </Card.Body>
                    </Card>

                    {/* Quick Events */}
                     <Card style={{ backgroundColor: 'transparent', border: '1px solid #475569' }}>
                        <Card.Header className="text-white">Events</Card.Header>
                        <Card.Body className="d-flex flex-wrap gap-2">
                             <Button variant="outline-light" size="sm" onClick={()=>alert('Event logging placeholder')}>Intubation</Button>
                             <Button variant="outline-light" size="sm" onClick={()=>alert('Event logging placeholder')}>Incision</Button>
                             <Button variant="outline-light" size="sm" onClick={()=>alert('Event logging placeholder')}>Extubation</Button>
                        </Card.Body>
                    </Card>

                </Col>

                {/* Right: Timeline Visualization */}
                <Col md={8} className="p-4" style={{ overflowY: 'auto' }}>
                    <h5 className="mb-3 text-white-50">Trendline & Logs</h5>
                    
                    {/* Simple List View for MVP (Can be Chart.js later) */}
                    <Table bordered variant="dark" hover>
                        <thead>
                            <tr>
                                <th style={{width: '120px'}}>Time</th>
                                <th style={{width: '100px'}}>Type</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {timeline.length === 0 ? <tr><td colSpan="3" className="text-center text-muted">No events logged yet.</td></tr> :
                            timeline.map(t => (
                                <tr key={t.id}>
                                    <td className="text-info">{new Date(t.timestamp).toLocaleTimeString()}</td>
                                    <td><Badge bg={getBadgeColor(t.type)}>{t.type}</Badge></td>
                                    <td>{renderData(t)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Col>
            </Row>
        </Container>
    );
};

// Helpers
const inputStyle = { backgroundColor: '#334155', color: 'white', border: '1px solid #475569' };

const getBadgeColor = (type) => {
    switch(type) {
        case 'Vitals': return 'success';
        case 'Drug': return 'info';
        case 'Event': return 'warning';
        default: return 'secondary';
    }
};

const renderData = (item) => {
    const d = item.data;
    if (item.type === 'Vitals') {
        return `HR: ${d.hr} | BP: ${d.bp_sys}/${d.bp_dia} | SpO2: ${d.spo2}%`;
    }
    if (item.type === 'Drug') {
        return <strong>{d.name} ({d.dose})</strong>;
    }
    return JSON.stringify(d);
};

export default AnesthesiaConsole;
