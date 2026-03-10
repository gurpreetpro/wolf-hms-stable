import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Alert, Row, Col, Badge } from 'react-bootstrap';
import { ClipboardCheck, Save } from 'lucide-react';
import axios from 'axios';

const DischargeChecklist = ({ admissionId, patientId, onDischargeComplete }) => {
    const [plan, setPlan] = useState({
        meds_reconciled: false,
        patient_education_complete: false,
        follow_up_booked: false,
        discharge_summary_ready: false,
        follow_up_date: '',
        education_notes: ''
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchPlan();
    }, [admissionId]);

    const fetchPlan = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/transitions/discharge/${admissionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // If plan exists, populate state. API creates one if missing.
            if (res.data) {
                setPlan({
                    meds_reconciled: res.data.meds_reconciled || false,
                    patient_education_complete: res.data.patient_education_complete || false,
                    follow_up_booked: res.data.follow_up_booked || false,
                    discharge_summary_ready: res.data.discharge_summary_ready || false,
                    follow_up_date: res.data.follow_up_date ? new Date(res.data.follow_up_date).toISOString().split('T')[0] : '',
                    education_notes: res.data.education_notes || ''
                });
            }
            setLoading(false);
        } catch (err) {
            console.error('Error fetching discharge plan:', err);
            setError('Could not load discharge plan.');
            setLoading(false);
        }
    };

    const handleCheck = (field) => {
        const newPlan = { ...plan, [field]: !plan[field] };
        setPlan(newPlan);
    };

    const handleChange = (e) => {
        setPlan({ ...plan, [e.target.name]: e.target.value });
    };

    const handleSave = async (completeDischarge = false) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/transitions/discharge/${admissionId}`, plan, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (completeDischarge) {
                if (onDischargeComplete) onDischargeComplete();
            } else {
                alert('Progress saved.');
            }
        } catch (err) {
            console.error('Error saving discharge plan:', err);
            alert('Failed to save.');
        }
    };

    if (loading) return <div className="text-center p-3">Loading Checklist...</div>;
    if (error) return <Alert variant="danger">{error}</Alert>;

    const allChecked = plan.meds_reconciled && plan.patient_education_complete && plan.discharge_summary_ready;

    return (
        <Card className="border-0 shadow-sm">
            <Card.Header className="bg-light fw-bold d-flex align-items-center">
                <ClipboardCheck size={18} className="me-2 text-primary" />
                Discharge Planning Checklist
            </Card.Header>
            <Card.Body>
                <Form>
                    <div className="mb-3">
                        <Form.Check
                            type="checkbox"
                            className="mb-2"
                            label={<span className="fw-medium">Medication Reconciliation Complete</span>}
                            checked={plan.meds_reconciled}
                            onChange={() => handleCheck('meds_reconciled')}
                        />
                        <Form.Check
                            type="checkbox"
                            className="mb-2"
                            label={<span className="fw-medium">Discharge Summary Written</span>}
                            checked={plan.discharge_summary_ready}
                            onChange={() => handleCheck('discharge_summary_ready')}
                        />
                        <Form.Check
                            type="checkbox"
                            className="mb-2"
                            label={<span className="fw-medium">Patient Education Given</span>}
                            checked={plan.patient_education_complete}
                            onChange={() => handleCheck('patient_education_complete')}
                        />
                        <Form.Check
                            type="checkbox"
                            className="mb-2"
                            label={<span className="fw-medium">Follow-up Appointment Booked</span>}
                            checked={plan.follow_up_booked}
                            onChange={() => handleCheck('follow_up_booked')}
                        />
                    </div>

                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label className="small">Follow-up Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    name="follow_up_date"
                                    value={plan.follow_up_date}
                                    onChange={handleChange}
                                />
                            </Form.Group>
                        </Col>
                    </Row>

                    <Form.Group className="mb-4">
                        <Form.Label className="small">Education / Instructions Notes</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            placeholder="Specific instructions given to patient..."
                            name="education_notes"
                            value={plan.education_notes}
                            onChange={handleChange}
                        />
                    </Form.Group>

                    <div className="d-flex justify-content-between">
                        <Button variant="outline-primary" onClick={() => handleSave(false)}>
                            <Save size={16} className="me-1" /> Save Progress
                        </Button>
                        <Button
                            variant="success"
                            disabled={!allChecked}
                            onClick={() => handleSave(true)}
                        >
                            Finalize Discharge
                        </Button>
                    </div>
                </Form>
            </Card.Body>
        </Card>
    );
};

export default DischargeChecklist;
