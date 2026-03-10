import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Badge } from 'react-bootstrap';
import { Calendar, ArrowRight, CheckCircle } from 'lucide-react';
import axios from 'axios';

const RescheduleModal = ({ show, onHide, visit, onConfirm }) => {
    const [doctors, setDoctors] = useState([]);
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchDoctors = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/auth/users', { headers: { Authorization: `Bearer ${token}` } });
            const list = res.data.data || res.data;
            if (Array.isArray(list)) {
                setDoctors(list.filter(u => u.role === 'doctor' && u.is_active));
            } else {
                setDoctors([]);
                console.error('Expected array of users but got:', list);
            }
        } catch (err) { console.error(err); }
    };

    useEffect(() => {
        if (show) {
            fetchDoctors();
            setReason('');
            setNewDate(new Date().toISOString().split('T')[0]);
            setSelectedDoctor('');
            setLoading(false);
        }
    }, [show]);

    const handleSubmit = async () => {
        console.log('Submit clicked');
        if (!selectedDoctor) return alert('Please select a doctor');

        try {
            setLoading(true);
            console.log('Calling onConfirm with:', { new_doctor_id: selectedDoctor, new_date: newDate, reason });
            await onConfirm({
                new_doctor_id: selectedDoctor,
                new_date: newDate,
                reason
            });
            // If success, modal closes, so no need to setLoading false usually.
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    if (!visit) return null;

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton className="border-0 bg-primary bg-opacity-10">
                <Modal.Title className="text-primary fw-bold d-flex align-items-center gap-2">
                    <Calendar /> Reschedule Appointment
                </Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Alert variant="info" className="d-flex align-items-center gap-2">
                    <CheckCircle size={18} />
                    <strong>Payment will be transferred automatically.</strong>
                </Alert>

                <p className="mb-4">
                    Rescheduling for: <strong className="fs-5">{visit.patient_name}</strong>
                    <br />
                    <span className="text-muted">Current: Token {visit.token_number}</span>
                </p>

                <Form>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold">Reschedule Date</Form.Label>
                        <Form.Control
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            value={newDate}
                            onChange={e => setNewDate(e.target.value)}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold">New Doctor / Department</Form.Label>
                        <Form.Select
                            value={selectedDoctor}
                            onChange={e => setSelectedDoctor(e.target.value)}
                            size="lg"
                        >
                            <option value="">Select Doctor...</option>
                            {doctors.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.username} ({d.department || 'General'})
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Reason</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="e.g. Patient requested later time"
                        />
                    </Form.Group>
                </Form>
            </Modal.Body>
            <Modal.Footer className="border-0">
                <Button variant="secondary" onClick={onHide} disabled={loading}>Close</Button>
                <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={!selectedDoctor || loading}
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', border: 'none' }}
                >
                    {loading ? 'Processing...' : (
                        <>Confirm Reschedule <ArrowRight size={16} className="ms-1" /></>
                    )}
                </Button>
            </Modal.Footer>
        </Modal>
    );
};

export default RescheduleModal;
