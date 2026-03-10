import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Modal, Form, ProgressBar } from 'react-bootstrap';
import { Bed, ArrowRightCircle, ClipboardCheck, LogOut } from 'lucide-react';
import axios from 'axios';

const PACUDashboard = () => {
    const [data, setData] = useState({ beds: [], queue: [] });
    const [loading, setLoading] = useState(true);
    
    // Admission Modal
    const [showAdmit, setShowAdmit] = useState(false);
    const [selectedPt, setSelectedPt] = useState(null);

    // Scoring Modal
    const [showScore, setShowScore] = useState(false);
    const [activeRecord, setActiveRecord] = useState(null);
    const [scoreData, setScoreData] = useState({ activity: 2, respiration: 2, circulation: 2, consciousness: 2, o2: 2 });

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/pacu/dashboard');
            setData(res.data.data || res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleAdmit = async (bedId) => {
        if (!selectedPt) return;
        try {
            await axios.post('/api/pacu/admit', {
                surgery_id: selectedPt.surgery_id,
                patient_id: selectedPt.patient_id,
                bed_id: bedId
            });
            setShowAdmit(false);
            setSelectedPt(null);
            fetchData();
        } catch (err) { alert('Failed to admit'); }
    };

    const handleScoreSubmit = async () => {
        try {
            await axios.post('/api/pacu/score', {
                record_id: activeRecord,
                ...scoreData,
                assessed_by: 'NurseUser'
            });
            setShowScore(false);
            fetchData();
            alert('Score Saved!');
        } catch (err) { alert('Failed to save score'); }
    };

    const handleDischarge = async (recordId) => {
        if (!window.confirm("Discharge patient from PACU?")) return;
        try {
            await axios.post('/api/pacu/discharge', {
                record_id: recordId,
                destination: 'Ward A' // Hardcoded for MVP
            });
            fetchData();
        } catch (err) { alert('Discharge failed'); }
    };

    const getTotalScore = () => Object.values(scoreData).reduce((a, b) => a + parseInt(b), 0);

    return (
        <Container fluid className="p-4">
            <h2 className="mb-4"><Bed className="me-2 text-primary" />Post-Anesthesia Care Unit (PACU)</h2>

            <Row>
                {/* Left: Beds Grid */}
                <Col md={9}>
                    <Row className="g-3">
                        {data.beds.map(bed => (
                            <Col md={4} key={bed.id}>
                                <Card className={`h-100 shadow-sm ${bed.status === 'Available' ? 'border-success' : 'border-warning'}`}>
                                    <Card.Header className="d-flex justify-content-between align-items-center">
                                        <strong>{bed.name}</strong>
                                        <Badge bg={bed.status === 'Available' ? 'success' : 'warning'}>{bed.status}</Badge>
                                    </Card.Header>
                                    <Card.Body className="d-flex flex-column justify-content-center text-center">
                                        {bed.status === 'Available' ? (
                                            <div className="text-muted">Empty</div>
                                        ) : (
                                            <>
                                                <h5>{bed.patient_name}</h5>
                                                <div className="mb-2 text-muted">Started: {new Date(bed.admission_time).toLocaleTimeString()}</div>
                                                
                                                <div className="p-2 bg-light rounded mb-3">
                                                    <strong>Last Aldrete: {bed.last_aldrete_score !== null ? bed.last_aldrete_score : '-'} / 10</strong>
                                                    <ProgressBar 
                                                        now={(bed.last_aldrete_score / 10) * 100} 
                                                        variant={bed.last_aldrete_score >= 9 ? 'success' : 'danger'} 
                                                        style={{height: '5px', marginTop: '5px'}} 
                                                    />
                                                </div>

                                                <div className="d-flex gap-2 justify-content-center">
                                                    <Button size="sm" variant="outline-primary" onClick={()=>{setActiveRecord(bed.current_record_id); setShowScore(true);}}>
                                                        <ClipboardCheck size={14} /> Assess
                                                    </Button>
                                                    <Button size="sm" variant="outline-danger" onClick={()=>handleDischarge(bed.current_record_id)} disabled={bed.last_aldrete_score < 9}>
                                                        <LogOut size={14} /> Discharge
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </Card.Body>
                                    {bed.status === 'Available' && selectedPt && (
                                        <Card.Footer>
                                            <Button size="sm" variant="success" className="w-100" onClick={()=>handleAdmit(bed.id)}>Admit Selected</Button>
                                        </Card.Footer>
                                    )}
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Col>

                {/* Right: Incoming Queue */}
                <Col md={3}>
                    <Card className="h-100">
                        <Card.Header>Incoming from OT</Card.Header>
                        <Card.Body style={{overflowY: 'auto', maxHeight: '70vh'}}>
                            {data.queue.length === 0 ? <p className="text-muted text-center">No patients waiting.</p> : 
                            data.queue.map(p => (
                                <Card key={p.surgery_id} 
                                    className={`mb-2 p-2 cursor-pointer ${selectedPt?.surgery_id === p.surgery_id ? 'border-primary bg-light' : ''}`}
                                    onClick={()=>setSelectedPt(p)}
                                    style={{cursor: 'pointer'}}
                                >
                                    <div className="fw-bold">{p.patient_name}</div>
                                    <small className="text-muted">{p.procedure_name}</small>
                                </Card>
                            ))}
                        </Card.Body>
                        {selectedPt && <Card.Footer className="text-center text-primary"><small>Select a green bed to admit</small></Card.Footer>}
                    </Card>
                </Col>
            </Row>

            {/* Aldrete Score Modal */}
            <Modal show={showScore} onHide={()=>setShowScore(false)}>
                <Modal.Header closeButton><Modal.Title>Aldrete Scoring</Modal.Title></Modal.Header>
                <Modal.Body>
                    {['Activity', 'Respiration', 'Circulation', 'Consciousness', 'O2 Saturation'].map(cat => (
                         <Form.Group key={cat} className="mb-2">
                            <Form.Label>{cat}</Form.Label>
                            <Form.Select 
                                value={scoreData[cat.split(' ')[0].toLowerCase()]} 
                                onChange={e => setScoreData({...scoreData, [cat.split(' ')[0].toLowerCase()]: parseInt(e.target.value)})}
                            >
                                <option value="2">2 - Normal / Full</option>
                                <option value="1">1 - Mild Impairment</option>
                                <option value="0">0 - Severe Impairment</option>
                            </Form.Select>
                         </Form.Group>
                    ))}
                    <div className="text-end h4 mt-3">Total: {getTotalScore()} / 10</div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="primary" onClick={handleScoreSubmit}>Save Score</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default PACUDashboard;
