import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert } from 'react-bootstrap';
import axios from 'axios';

const PACAssessmentForm = ({ show, onHide, surgery }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        mallampati_score: 'I',
        asa_grade: 'I',
        airway_assessment: { mouth_opening: 'Normal', neck_movement: 'Normal' },
        comorbidities: [], 
        medications: [], 
        fitness_status: 'Fit',
        remarks: ''
    });

    // Load existing if avail
    useEffect(() => {
        if (surgery && surgery.current_status) { // If status exists, try fetching details
             axios.get(`/api/pac/assessment/${surgery.surgery_id}`)
                .then(res => {
                    const data = res.data;
                    setFormData({
                        mallampati_score: data.mallampati_score || 'I',
                        asa_grade: data.asa_grade || 'I',
                        airway_assessment: data.airway_assessment || { mouth_opening: 'Normal', neck_movement: 'Normal' },
                        comorbidities: data.comorbidities || [],
                        medications: data.medications || [],
                        fitness_status: data.fitness_status || 'Fit',
                        remarks: data.remarks || ''
                    });
                })
                .catch(err => console.log('No prev assessment or copy failed', err));
        }
    }, [surgery]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post('/api/pac/save', {
                ...formData,
                patient_id: surgery.patient_id,
                surgery_id: surgery.surgery_id,
                anaesthetist_id: 'CurrentDoc' // Should fetch from context
            });
            onHide();
            alert('Assessment Saved!');
        } catch (err) {
            console.error(err);
            alert('Failed to save assessment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onHide} size="lg" backdrop="static">
            <Modal.Header closeButton>
                <Modal.Title>PAC Assessment: {surgery.patient_name}</Modal.Title>
            </Modal.Header>
            <Form onSubmit={handleSubmit}>
                <Modal.Body>
                    <Row className="g-3">
                        <Col md={12}>
                            <Alert variant="info">
                                <strong>Procedure:</strong> {surgery.procedure_name} <br/>
                                <strong>Scheduled:</strong> {new Date(surgery.start_time).toLocaleString()}
                            </Alert>
                        </Col>

                        {/* Airway Assessment */}
                        <Col md={6}>
                            <Form.Label>Mallampati Score</Form.Label>
                            <Form.Select 
                                value={formData.mallampati_score}
                                onChange={e => setFormData({...formData, mallampati_score: e.target.value})}>
                                <option value="I">Class I (Soft palate, fauces, uvula, pillars visible)</option>
                                <option value="II">Class II (Soft palate, fauces, uvula visible)</option>
                                <option value="III">Class III (Soft palate, base of uvula visible)</option>
                                <option value="IV">Class IV (Hard palate only visible)</option>
                            </Form.Select>
                        </Col>
                        
                        <Col md={6}>
                            <Form.Label>ASA Physical Status</Form.Label>
                            <Form.Select 
                                value={formData.asa_grade}
                                onChange={e => setFormData({...formData, asa_grade: e.target.value})}>
                                <option value="I">ASA I - Normal healthy patient</option>
                                <option value="II">ASA II - Mild systemic disease</option>
                                <option value="III">ASA III - Severe systemic disease</option>
                                <option value="IV">ASA IV - Severe systemic disease constant threat to life</option>
                                <option value="V">ASA V - Moribund</option>
                                <option value="E">Emergency</option>
                            </Form.Select>
                        </Col>

                        <Col md={6}>
                            <Form.Label>Mouth Opening</Form.Label>
                            <Form.Control type="text" 
                                value={formData.airway_assessment.mouth_opening}
                                onChange={e => setFormData({...formData, airway_assessment: {...formData.airway_assessment, mouth_opening: e.target.value}})}
                            />
                        </Col>

                        <Col md={6}>
                            <Form.Label>Neck Movement</Form.Label>
                            <Form.Control type="text"
                                value={formData.airway_assessment.neck_movement}
                                onChange={e => setFormData({...formData, airway_assessment: {...formData.airway_assessment, neck_movement: e.target.value}})}
                            />
                        </Col>

                        <Col md={12}>
                            <Form.Label>Fitness Status</Form.Label>
                            <Form.Select 
                                value={formData.fitness_status}
                                onChange={e => setFormData({...formData, fitness_status: e.target.value})}
                                style={{ fontWeight: 'bold', color: formData.fitness_status === 'Fit' ? 'green' : (formData.fitness_status === 'Unfit' ? 'red' : 'orange') }}
                            >
                                <option value="Fit">Fit for Surgery</option>
                                <option value="Unfit">Unfit / Postpone</option>
                                <option value="Pending">Pending Investigation</option>
                            </Form.Select>
                        </Col>

                        <Col md={12}>
                            <Form.Label>Remarks / Findings</Form.Label>
                            <Form.Control as="textarea" rows={3}
                                value={formData.remarks}
                                onChange={e => setFormData({...formData, remarks: e.target.value})}
                            />
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={onHide}>Close</Button>
                    <Button variant="primary" type="submit" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Assessment'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default PACAssessmentForm;
