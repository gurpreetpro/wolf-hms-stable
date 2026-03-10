import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Form, Button, Table, Badge, Modal, Alert } from 'react-bootstrap';
import { Users, LogIn, LogOut, Clock, Shield, Search } from 'lucide-react';
import axios from '../utils/axiosInstance';
import securityService from '../services/securityService';

const VisitorManagement = () => {
    const [activeVisitors, setActiveVisitors] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        purpose: 'PATIENT_FAMILY', // Default
        department: '',
        patient_id: '',
        photo_url: '' // Placeholder for webcam integration later
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [patientResults, setPatientResults] = useState([]);

    useEffect(() => {
        fetchVisitors();
    }, []);

    const fetchVisitors = async () => {
        try {
            setLoading(true);
            const res = await securityService.getActiveVisitors();
            // Res format might be wrapped
            const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setActiveVisitors(list);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async (e) => {
        e.preventDefault();
        try {
            await securityService.logVisitor(formData);
            setShowModal(false);
            fetchVisitors();
            // Reset Form (keep purpose)
            setFormData(prev => ({ ...prev, full_name: '', phone: '', department: '', patient_id: '' }));
        } catch (error) {
            console.error(error);
            alert('Check-in failed: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleCheckOut = async (visitId) => {
        if (!window.confirm('Confirm Visitor Exit?')) return;
        try {
            await securityService.checkoutVisitor(visitId);
            fetchVisitors();
        } catch (error) {
            console.error(error);
            alert('Checkout failed');
        }
    };

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold mb-0">Visitor Management</h2>
                    <p className="text-muted">Reception & Gate Control</p>
                </div>
                <Button variant="primary" size="lg" onClick={() => setShowModal(true)}>
                    <LogIn size={20} className="me-2" /> Log New Visitor
                </Button>
            </div>

            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white py-3">
                    <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0 text-primary">
                            <Users size={18} className="me-2" />
                            Currently Inside ({activeVisitors.length})
                        </h5>
                        <Button variant="outline-secondary" size="sm" onClick={fetchVisitors}>
                            Refresh List
                        </Button>
                    </div>
                </Card.Header>
                <Card.Body className="p-0">
                    <Table hover responsive className="mb-0 align-middle">
                        <thead className="bg-light">
                            <tr>
                                <th className="ps-4">Visitor</th>
                                <th>Purpose</th>
                                <th>Check-In Time</th>
                                <th>Status</th>
                                <th className="text-end pe-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeVisitors.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-5 text-muted">
                                        <Shield size={32} className="mb-2 text-muted opacity-50" /><br/>
                                        No active visitors inside the premises.
                                    </td>
                                               </tr>
                            ) : (
                                activeVisitors.map(v => (
                                    <tr key={v.visit_id}>
                                        <td className="ps-4">
                                            <div className="fw-bold">{v.full_name}</div>
                                            <div className="small text-muted"><span className="fw-bold">Ph:</span> {v.phone}</div>
                                        </td>
                                        <td>
                                            <Badge bg="info" text="dark" className="me-2">{v.purpose}</Badge>
                                            {v.department && <span className="small text-muted">({v.department})</span>}
                                        </td>
                                        <td>
                                            <Clock size={14} className="me-1 text-muted" />
                                            {new Date(v.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td>
                                            <Badge bg="success" className="d-flex align-items-center w-auto" style={{width: 'fit-content'}}>
                                                On Premises
                                            </Badge>
                                        </td>
                                        <td className="text-end pe-4">
                                            <Button variant="outline-danger" size="sm" onClick={() => handleCheckOut(v.visit_id)}>
                                                <LogOut size={16} className="me-1"/> Check Out
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* Check In Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Visitor Check-In</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleCheckIn}>
                    <Modal.Body>
                        <Row className="g-3">
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label>Full Name</Form.Label>
                                    <Form.Control 
                                        required 
                                        value={formData.full_name}
                                        onChange={e => setFormData({...formData, full_name: e.target.value})}
                                        placeholder="e.g. Rahul Kumar"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label>Phone Number</Form.Label>
                                    <Form.Control 
                                        required 
                                        value={formData.phone}
                                        onChange={e => setFormData({...formData, phone: e.target.value})}
                                        placeholder="e.g. 9876543210"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={12}>
                                <Form.Group>
                                    <Form.Label>Purpose</Form.Label>
                                    <Form.Select 
                                        value={formData.purpose}
                                        onChange={e => setFormData({...formData, purpose: e.target.value})}
                                    >
                                        <option value="PATIENT_FAMILY">Visiting Patient (Family)</option>
                                        <option value="VENDOR">Vendor / Supply</option>
                                        <option value="OFFICIAL">Official Visit / Meeting</option>
                                        <option value="INTERVIEW">Job Interview</option>
                                        <option value="OTHER">Other</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            
                            {formData.purpose === 'PATIENT_FAMILY' && (
                                <Col md={12}>
                                    <Form.Label>Patient Search</Form.Label>
                                    <div className="position-relative">
                                        <div className="input-group">
                                            <span className="input-group-text"><Search size={16}/></span>
                                            <Form.Control 
                                                placeholder="Search by Name or Phone (min 3 chars)..."
                                                onChange={async (e) => {
                                                    const val = e.target.value;
                                                    setSearchQuery(val);
                                                    if(val.length >= 3) {
                                                        const results = await securityService.searchPatients(val);
                                                        setPatientResults(results);
                                                    } else {
                                                        setPatientResults([]);
                                                    }
                                                }}
                                                value={searchQuery}
                                            />
                                        </div>
                                        {/* Results Dropdown */}
                                        {patientResults.length > 0 && (
                                            <div className="position-absolute w-100 bg-white shadow-sm border rounded mt-1" style={{zIndex: 1000, maxHeight: '200px', overflowY: 'auto'}}>
                                                {patientResults.map(p => (
                                                    <div 
                                                        key={p.id} 
                                                        className="p-2 border-bottom cursor-pointer hover-bg-light"
                                                        style={{cursor: 'pointer'}}
                                                        onClick={() => {
                                                            setFormData({...formData, patient_id: p.id, patient_name: p.name});
                                                            setSearchQuery(`${p.name} (${p.phone})`);
                                                            setPatientResults([]);
                                                        }}
                                                    >
                                                        <strong>{p.name}</strong> <small className="text-muted">| {p.phone}</small>
                                                        <div className="small text-muted">{p.gender}, {new Date(p.dob).getFullYear()}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {formData.patient_id && <div className="text-success small mt-1">✓ Linked to {formData.patient_name || searchQuery}</div>}
                                    </div>
                                </Col>
                            )}

                            {(formData.purpose === 'OFFICIAL' || formData.purpose === 'VENDOR') && (
                                <Col md={12}>
                                    <Form.Group>
                                        <Form.Label>Department</Form.Label>
                                        <Form.Select
                                             value={formData.department}
                                             onChange={e => setFormData({...formData, department: e.target.value})}
                                        >
                                            <option value="">Select...</option>
                                            <option value="Admin">Administration</option>
                                            <option value="HR">HR</option>
                                            <option value="Pharmacy">Pharmacy</option>
                                            <option value="Lab">Laboratory</option>
                                            <option value="Store">Store / Inventory</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                            )}
                        </Row>
                        <Alert variant="secondary" className="mt-3 small py-2">
                             <Shield size={14} className="me-1"/> Blacklist check is automatic.
                        </Alert>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                        <Button variant="success" type="submit">Complete Check-In</Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default VisitorManagement;
