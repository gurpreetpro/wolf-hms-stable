import React, { useState } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import { User, FileText, Calendar } from 'lucide-react';
import api from '../utils/axiosInstance';

const VisitorPassModal = ({ show, onHide }) => {
    const [formData, setFormData] = useState({
        full_name: '',
        contact_number: '',
        visitor_type: 'Family',
        purpose: 'Visit Patient',
        patient_id: '', // Optional linkage
        host_id: ''     // Optional staff linkage
    });
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Receptionist "Checks In" / "Issues Pass"
            await api.post('/api/security/visitors/check-in', formData);
            setSuccessMsg('Visitor Pass Issued & Synced to Security!');
            setTimeout(() => {
                setSuccessMsg('');
                onHide();
                setFormData({ full_name: '', contact_number: '', visitor_type: 'Family', purpose: 'Visit Patient', patient_id: '', host_id: '' });
            }, 2000);
        } catch (err) {
            console.error(err);
            alert('Failed to issue pass');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="d-flex align-items-center gap-2">
                    <User size={20} className="text-primary" />
                    Issue Visitor Pass
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {successMsg && <Alert variant="success">{successMsg}</Alert>}
                <Form>
                    <Row className="g-3">
                        <Col md={12}>
                            <Form.Label>Visitor Name</Form.Label>
                            <Form.Control 
                                type="text" 
                                placeholder="Full Name (as per ID)" 
                                value={formData.full_name}
                                onChange={e => setFormData({...formData, full_name: e.target.value})}
                            />
                        </Col>
                        <Col md={6}>
                            <Form.Label>Contact Number</Form.Label>
                            <Form.Control 
                                type="text" 
                                placeholder="Mobile"
                                value={formData.contact_number}
                                onChange={e => setFormData({...formData, contact_number: e.target.value})}
                            />
                        </Col>
                        <Col md={6}>
                            <Form.Label>Type</Form.Label>
                            <Form.Select
                                value={formData.visitor_type}
                                onChange={e => setFormData({...formData, visitor_type: e.target.value})}
                            >
                                <option>Family</option>
                                <option>Guest</option>
                                <option>Vendor</option>
                                <option>Official</option>
                            </Form.Select>
                        </Col>
                        <Col md={12}>
                            <Form.Label>Purpose / Ward</Form.Label>
                             <Form.Control 
                                type="text" 
                                placeholder="e.g. Visiting Patient in Bed 302"
                                value={formData.purpose}
                                onChange={e => setFormData({...formData, purpose: e.target.value})}
                            />
                        </Col>
                        {/* Future: Add Patient Search/Linkage here */}
                    </Row>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Cancel</Button>
                <Button variant="primary" onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Issuing...' : 'Issue Digital Pass'}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default VisitorPassModal;
