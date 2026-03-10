import React, { useState } from 'react';
import { Card, Form, Button, Row, Col, Alert, Tab, Tabs, InputGroup, ListGroup, Badge, Modal } from 'react-bootstrap';
import { AlertTriangle, UserPlus, Clock, Trash2, Search, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

const RecoveryConsole = () => {
    const [activeTab, setActiveTab] = useState('force-create');
    const [msg, setMsg] = useState(null);
    const [loading, setLoading] = useState(false);

    // --- FORCE CREATE STATE ---
    const [createForm, setCreateForm] = useState({
        name: '', phone: '', age: '', gender: 'Male', address: '',
        manual_uhid: '', manual_created_at: ''
    });

    // --- BACKDATE ADMISSION STATE ---
    const [backdateForm, setBackdateForm] = useState({
        patient_id: '', ward: 'General', bed_number: '', backdate_timestamp: ''
    });
    const [patientSearchQuery, setPatientSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);

    // --- VOID ADMISSION STATE ---
    const [voidAdmissionId, setVoidAdmissionId] = useState('');
    const [showVoidConfirm, setShowVoidConfirm] = useState(false);

    // --- HANDLERS ---
    const showMessage = (type, text) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 5000);
    };

    const handleCreateSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/admin/recovery/patients', createForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showMessage('success', `Patient Force-Created! UHID: ${res.data.data.uhid}`);
            setCreateForm({ name: '', phone: '', age: '', gender: 'Male', address: '', manual_uhid: '', manual_created_at: '' });
        } catch (err) {
            showMessage('danger', err.response?.data?.message || 'Failed to create patient');
        } finally {
            setLoading(false);
        }
    };

    const searchPatient = async (q) => {
        setPatientSearchQuery(q);
        if (q.length < 2) { setSearchResults([]); return; }
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/patients/search?q=${q}`, { headers: { Authorization: `Bearer ${token}` } });
            setSearchResults(res.data);
        } catch (err) { console.error(err); }
    };

    const handleBackdateSubmit = async (e) => {
        e.preventDefault();
        if (!selectedPatient) return showMessage('warning', 'Please search and select a patient first.');
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/admin/recovery/admissions', {
                ...backdateForm,
                patient_id: selectedPatient.id
            }, { headers: { Authorization: `Bearer ${token}` } });
            showMessage('success', 'Admission Backdated Successfully!');
            setBackdateForm({ patient_id: '', ward: 'General', bed_number: '', backdate_timestamp: '' });
            setSelectedPatient(null);
            setPatientSearchQuery('');
        } catch (err) {
            showMessage('danger', err.response?.data?.message || 'Failed to backdate admission');
        } finally {
            setLoading(false);
        }
    };

    const handleVoidSubmit = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/admin/recovery/admissions/${voidAdmissionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showMessage('success', `Admission ${voidAdmissionId} VOIDED successfully.`);
            setVoidAdmissionId('');
            setShowVoidConfirm(false);
        } catch (err) {
            showMessage('danger', err.response?.data?.message || 'Void operation failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-danger shadow-sm">
            <Card.Header className="bg-danger text-white d-flex align-items-center">
                <AlertTriangle className="me-2" size={20} />
                <strong>DANGER ZONE: Data Recovery Console</strong>
            </Card.Header>
            <Card.Body>
                {msg && <Alert variant={msg.type} onClose={() => setMsg(null)} dismissible>{msg.text}</Alert>}
                
                <Tabs activeKey={activeTab} onSelect={k => setActiveTab(k)} className="mb-4">
                    
                    {/* 1. FORCE CREATE PATIENT */}
                    <Tab eventKey="force-create" title={<span><UserPlus size={16} className="me-1"/> Force Create Patient</span>}>
                        <Form onSubmit={handleCreateSubmit}>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Patient Name</Form.Label>
                                        <Form.Control required value={createForm.name} onChange={e => setCreateForm({...createForm, name: e.target.value})} />
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Phone</Form.Label>
                                        <Form.Control required value={createForm.phone} onChange={e => setCreateForm({...createForm, phone: e.target.value})} />
                                    </Form.Group>
                                    <Row>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Age</Form.Label>
                                                <Form.Control type="number" required value={createForm.age} onChange={e => setCreateForm({...createForm, age: e.target.value})} />
                                            </Form.Group>
                                        </Col>
                                        <Col md={6}>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Gender</Form.Label>
                                                <Form.Select value={createForm.gender} onChange={e => setCreateForm({...createForm, gender: e.target.value})}>
                                                    <option>Male</option>
                                                    <option>Female</option>
                                                    <option>Other</option>
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                </Col>
                                <Col md={6} className="bg-light p-3 border rounded">
                                    <h6 className="text-danger fw-bold border-bottom pb-2 mb-3">Manual Overrides</h6>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Manual UHID (Optional)</Form.Label>
                                        <Form.Control 
                                            placeholder="Leave empty to auto-generate" 
                                            value={createForm.manual_uhid} 
                                            onChange={e => setCreateForm({...createForm, manual_uhid: e.target.value})} 
                                        />
                                        <Form.Text className="text-muted">Use with extreme caution. Duplicates will fail.</Form.Text>
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Original Creation Date (Backdate)</Form.Label>
                                        <Form.Control 
                                            type="datetime-local" 
                                            required 
                                            value={createForm.manual_created_at} 
                                            onChange={e => setCreateForm({...createForm, manual_created_at: e.target.value})} 
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <div className="d-flex justify-content-end mt-3">
                                <Button type="submit" variant="danger" disabled={loading}>
                                    {loading ? 'Processing...' : 'Force Insert Record'}
                                </Button>
                            </div>
                        </Form>
                    </Tab>

                    {/* 2. BACKDATE ADMISSION */}
                    <Tab eventKey="backdate-admission" title={<span><Clock size={16} className="me-1"/> Backdate Admission</span>}>
                        <Form onSubmit={handleBackdateSubmit}>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3 position-relative">
                                        <Form.Label>Select Patient</Form.Label>
                                        <Form.Control 
                                            placeholder="Search by Name, Phone or UHID..." 
                                            value={patientSearchQuery}
                                            onChange={e => searchPatient(e.target.value)}
                                        />
                                        {searchResults.length > 0 && !selectedPatient && (
                                            <ListGroup className="position-absolute w-100 shadow" style={{zIndex: 1000, maxHeight: '200px', overflowY: 'auto'}}>
                                                {searchResults.map(p => (
                                                    <ListGroup.Item key={p.id} action onClick={() => { setSelectedPatient(p); setPatientSearchQuery(p.name); setSearchResults([]); }}>
                                                        {p.name} ({p.phone}) <Badge bg="secondary">{p.uhid}</Badge>
                                                    </ListGroup.Item>
                                                ))}
                                            </ListGroup>
                                        )}
                                        {selectedPatient && <div className="mt-2 text-success"><CheckCircle size={14}/> Selected: {selectedPatient.name}</div>}
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Ward Name</Form.Label>
                                        <Form.Control 
                                            placeholder="e.g. General, Private" 
                                            required 
                                            value={backdateForm.ward} 
                                            onChange={e => setBackdateForm({...backdateForm, ward: e.target.value})}
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Bed Number</Form.Label>
                                        <Form.Control 
                                            required 
                                            placeholder="e.g. 101, 202-A"
                                            value={backdateForm.bed_number} 
                                            onChange={e => setBackdateForm({...backdateForm, bed_number: e.target.value})}
                                        />
                                        <Form.Text className="text-muted">Must be currently Vacant.</Form.Text>
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Admission Date (Historical)</Form.Label>
                                        <Form.Control 
                                            type="datetime-local" 
                                            required 
                                            value={backdateForm.backdate_timestamp} 
                                            onChange={e => setBackdateForm({...backdateForm, backdate_timestamp: e.target.value})}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <div className="d-flex justify-content-end mt-3">
                                <Button type="submit" variant="warning" className="text-dark fw-bold" disabled={loading}>
                                    {loading ? 'Processing...' : 'Admit in Past'}
                                </Button>
                            </div>
                        </Form>
                    </Tab>

                    {/* 3. VOID ADMISSION */}
                    <Tab eventKey="void-admission" title={<span><Trash2 size={16} className="me-1"/> Void Admission</span>}>
                        <div className="bg-light p-4 rounded text-center border border-danger border-2 border-opacity-25">
                            <h5 className="text-danger mb-3">Emergency Use Only</h5>
                            <p className="text-muted mb-4">
                                Currently, this only marks the admission as 'Voided' and frees the bed. <br/>
                                It does NOT revert billing or inventory changes. Use with caution.
                            </p>
                            <InputGroup className="mb-3 mx-auto" style={{maxWidth: '400px'}}>
                                <Form.Control 
                                    placeholder="Enter Admission ID (e.g. 123)" 
                                    value={voidAdmissionId}
                                    onChange={e => setVoidAdmissionId(e.target.value)}
                                />
                                <Button variant="outline-danger" onClick={() => setShowVoidConfirm(true)} disabled={!voidAdmissionId}>
                                    VOID ENTRY
                                </Button>
                            </InputGroup>
                        </div>
                    </Tab>
                </Tabs>
            </Card.Body>

            {/* VOID CONFIRMATION MODAL */}
            <Modal show={showVoidConfirm} onHide={() => setShowVoidConfirm(false)} centered>
                <Modal.Header closeButton className="bg-danger text-white">
                    <Modal.Title>Confirm Voiding Admission</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>Are you sure you want to void Admission ID: <strong>{voidAdmissionId}</strong>?</p>
                    <p className="text-danger">This action cannot be easily undone via UI.</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowVoidConfirm(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleVoidSubmit} disabled={loading}>
                        {loading ? 'Voiding...' : 'Yes, Void Admission'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Card>
    );
};

export default RecoveryConsole;
