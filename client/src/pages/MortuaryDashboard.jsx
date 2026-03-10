import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Table, Badge, Modal, Form, Alert } from 'react-bootstrap';
import { Archive, Thermometer, UserMinus, FileText, Shield, LogOut } from 'lucide-react';
import api from '../utils/axiosInstance';

const MortuaryDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ chambers: [], records: [] });
    const [showDeclareModal, setShowDeclareModal] = useState(false);
    const [showReleaseModal, setShowReleaseModal] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);

    // Forms
    const [declareForm, setDeclareForm] = useState({ full_name: '', time_of_death: '', cause: '', mccd: '', is_mlc: false });
    const [releaseForm, setReleaseForm] = useState({ receiver_name: '', receiver_relation: '', id_type: 'AADHAR', id_number: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await api.get('/api/mortuary/status');
            setData(res.data.data);
            
            // Auto-init if empty (first run dev helper)
            if (res.data.data.chambers.length === 0) {
                 await api.post('/api/mortuary/init');
                 const res2 = await api.get('/api/mortuary/status');
                 setData(res2.data.data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeclareDeath = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/mortuary/declare', {
                full_name: declareForm.full_name,
                time_of_death: declareForm.time_of_death || new Date().toISOString(),
                cause_of_death: declareForm.cause,
                mccd_number: declareForm.mccd,
                is_mlc: declareForm.is_mlc
            });
            setShowDeclareModal(false);
            fetchData();
        } catch (e) {
            alert('Error: ' + e.message);
        }
    };

    const handleReleaseBody = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/mortuary/release', {
                record_id: selectedRecord.id,
                receiver_name: releaseForm.receiver_name,
                receiver_relation: releaseForm.receiver_relation,
                receiver_id_proof_type: releaseForm.id_type,
                receiver_id_number: releaseForm.id_number
            });
            setShowReleaseModal(false);
            fetchData();
        } catch (e) {
            alert('Error: ' + e.message);
        }
    };

    const openReleaseModal = (record) => {
        setSelectedRecord(record);
        setShowReleaseModal(true);
    };

    return (
        <Container fluid className="p-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold text-dark d-flex align-items-center gap-2">
                        <Archive size={28} className="text-secondary" />
                        Mortuary Management
                    </h2>
                    <p className="text-muted">Digital Chain of Custody & Chamber Management</p>
                </div>
                <Button variant="danger" onClick={() => setShowDeclareModal(true)}>
                    <UserMinus size={18} className="me-2" /> Declare Death
                </Button>
            </div>

            <Row className="g-4">
                {/* Left: Cold Chambers Grid */}
                <Col md={8}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-white py-3 border-bottom">
                            <h5 className="mb-0 d-flex align-items-center gap-2">
                                <Thermometer size={18} className="text-info" />
                                Cold Storage Chambers
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            <Row className="g-3">
                                {data.chambers.map(chamber => (
                                    <Col xs={6} md={4} lg={3} key={chamber.id}>
                                        <div 
                                            className={`p-3 rounded border text-center position-relative ${chamber.status === 'OCCUPIED' ? 'bg-danger-subtle border-danger' : 'bg-success-subtle border-success'}`}
                                            style={{ transition: 'all 0.2s', cursor: 'pointer' }}
                                        >
                                            <div className="fw-bold fs-5">{chamber.code}</div>
                                            <div className={`badge ${chamber.status === 'OCCUPIED' ? 'bg-danger' : 'bg-success'} mt-2`}>
                                                {chamber.status}
                                            </div>
                                            <div className="small text-muted mt-2">
                                                <Thermometer size={12} /> {chamber.temperature_c}°C
                                            </div>
                                        </div>
                                    </Col>
                                ))}
                            </Row>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Right: Active List */}
                <Col md={4}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-white py-3 border-bottom">
                            <h5 className="mb-0">Deceased List</h5>
                        </Card.Header>
                        <Card.Body className="p-0 overflow-auto" style={{ maxHeight: '600px' }}>
                            {data.records.length === 0 ? (
                                <div className="p-4 text-center text-muted">No bodies in morgue.</div>
                            ) : (
                                data.records.map(r => (
                                    <div key={r.id} className="p-3 border-bottom position-relative">
                                        <div className="d-flex justify-content-between">
                                            <strong>{r.full_name}</strong>
                                            {r.is_mlc && <Badge bg="warning" text="dark">MLC / POLICE</Badge>}
                                        </div>
                                        <div className="small text-muted mb-2">
                                            Died: {new Date(r.time_of_death).toLocaleString()}
                                        </div>
                                        <div className="d-flex gap-1 justify-content-between align-items-center">
                                            <Badge bg="secondary">{r.release_status}</Badge>
                                            {r.release_status === 'CLEARED_BY_ADMIN' && (
                                                <Button size="sm" variant="outline-danger" onClick={() => openReleaseModal(r)}>
                                                    <LogOut size={14} className="me-1"/> Handover
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Declare Death Modal */}
            <Modal show={showDeclareModal} onHide={() => setShowDeclareModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Declare Death Record</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleDeclareDeath}>
                    <Modal.Body>
                        <Alert variant="warning">
                            <Shield size={14} className="me-1"/> 
                            Ensure <b>MCCD</b> is ready before submission.
                        </Alert>
                        <Form.Group className="mb-3">
                            <Form.Label>Full Name</Form.Label>
                            <Form.Control required onChange={e => setDeclareForm({...declareForm, full_name: e.target.value})} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Time of Death</Form.Label>
                            <Form.Control type="datetime-local" onChange={e => setDeclareForm({...declareForm, time_of_death: e.target.value})} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>MCCD Number (Legal)</Form.Label>
                            <Form.Control required placeholder="e.g. WB-2025-XXXX" onChange={e => setDeclareForm({...declareForm, mccd: e.target.value})} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Check 
                                type="checkbox" 
                                label="Medico-Legal Case (Accident/Suicide)?" 
                                onChange={e => setDeclareForm({...declareForm, is_mlc: e.target.checked})} 
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowDeclareModal(false)}>Cancel</Button>
                        <Button variant="danger" type="submit">Confirm Declaration</Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Release Modal */}
            <Modal show={showReleaseModal} onHide={() => setShowReleaseModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Release Body (Guard Handover)</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleReleaseBody}>
                    <Modal.Body>
                        <p>Releasing body of <b>{selectedRecord?.full_name}</b>.</p>
                        <Form.Group className="mb-3">
                            <Form.Label>Receiver Name</Form.Label>
                            <Form.Control required onChange={e => setReleaseForm({...releaseForm, receiver_name: e.target.value})} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Relationship</Form.Label>
                            <Form.Control required placeholder="e.g. Son, Spouse" onChange={e => setReleaseForm({...releaseForm, receiver_relation: e.target.value})} />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>ID Proof Type</Form.Label>
                            <Form.Select onChange={e => setReleaseForm({...releaseForm, id_type: e.target.value})}>
                                <option value="AADHAR">Aadhar Card</option>
                                <option value="VOTER_ID">Voter ID</option>
                                <option value="PASSPORT">Passport</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>ID Number</Form.Label>
                            <Form.Control required onChange={e => setReleaseForm({...releaseForm, id_number: e.target.value})} />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowReleaseModal(false)}>Cancel</Button>
                        <Button variant="success" type="submit">Confirm Handover</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default MortuaryDashboard;
