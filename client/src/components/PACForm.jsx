import React, { useState, useEffect } from 'react';
import { Form, Row, Col, Card, Button, InputGroup, Badge } from 'react-bootstrap';
import { Activity, Thermometer, UserCheck, AlertTriangle } from 'lucide-react';

const PACForm = ({ initialData, onSave, loading }) => {
    const [formData, setFormData] = useState({
        bp_systolic: '', bp_diastolic: '', pulse: '', spo2: '', temp_c: '', weight_kg: '',
        airway_class: 'Class I', // I, II, III, IV
        mouth_opening: 'Adequate',
        neck_movement: 'Normal',
        comorbidities: '',
        medications: '',
        allergies: '',
        asa_grade: 'I',
        status: 'Pending',
        notes: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({ ...prev, ...initialData }));
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const calculateASA = () => {
        // Simple helper logic (Demo)
        let grade = 'I';
        if (formData.comorbidities.length > 20) grade = 'II';
        if (formData.comorbidities.toLowerCase().includes('diabetes') || formData.comorbidities.toLowerCase().includes('htn')) grade = 'II';
        if (formData.comorbidities.toLowerCase().includes('heart') || formData.comorbidities.toLowerCase().includes('copd')) grade = 'III';
        return grade;
    };

    const handleAutoGrade = () => {
        const grade = calculateASA();
        setFormData(prev => ({ ...prev, asa_grade: grade }));
        alert(`Auto-Suggested Grade: ASA ${grade} based on comorbidities.`);
    };

    return (
        <Form>
            <h5 className="text-primary mb-3"><Activity size={18} className="me-2" />Vitals & Measurements</h5>
            <Row className="mb-3">
                <Col md={3}>
                    <Form.Group>
                        <Form.Label>BP (mmHg)</Form.Label>
                        <InputGroup>
                            <Form.Control type="number" placeholder="Sys" name="bp_systolic" value={formData.bp_systolic} onChange={handleChange} />
                            <InputGroup.Text>/</InputGroup.Text>
                            <Form.Control type="number" placeholder="Dia" name="bp_diastolic" value={formData.bp_diastolic} onChange={handleChange} />
                        </InputGroup>
                    </Form.Group>
                </Col>
                <Col md={2}>
                    <Form.Group>
                        <Form.Label>Pulse (bpm)</Form.Label>
                        <Form.Control type="number" name="pulse" value={formData.pulse} onChange={handleChange} />
                    </Form.Group>
                </Col>
                <Col md={2}>
                    <Form.Group>
                        <Form.Label>SpO2 (%)</Form.Label>
                        <Form.Control type="number" name="spo2" value={formData.spo2} onChange={handleChange} />
                    </Form.Group>
                </Col>
                <Col md={2}>
                    <Form.Group>
                        <Form.Label>Temp (°C)</Form.Label>
                        <Form.Control type="number" step="0.1" name="temp_c" value={formData.temp_c} onChange={handleChange} />
                    </Form.Group>
                </Col>
                <Col md={3}>
                    <Form.Group>
                        <Form.Label>Weight (kg)</Form.Label>
                        <Form.Control type="number" step="0.1" name="weight_kg" value={formData.weight_kg} onChange={handleChange} />
                    </Form.Group>
                </Col>
            </Row>

            <h5 className="text-primary mb-3 mt-4"><UserCheck size={18} className="me-2" />Airway Assessment</h5>
            <Row className="mb-3">
                <Col md={4}>
                    <Form.Group>
                        <Form.Label>Mallampati Class</Form.Label>
                        <Form.Select name="airway_class" value={formData.airway_class} onChange={handleChange}>
                            <option value="Class I">Class I (Soft palate, fauces, uvula, pillars visible)</option>
                            <option value="Class II">Class II (Soft palate, fauces, uvula visible)</option>
                            <option value="Class III">Class III (Soft palate, base of uvula visible)</option>
                            <option value="Class IV">Class IV (Hard palate only visible)</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={4}>
                    <Form.Group>
                        <Form.Label>Mouth Opening</Form.Label>
                        <Form.Select name="mouth_opening" value={formData.mouth_opening} onChange={handleChange}>
                            <option value="Adequate">Adequate (&gt;3 fingers)</option>
                            <option value="Restricted">Restricted</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={4}>
                    <Form.Group>
                        <Form.Label>Neck Movement</Form.Label>
                        <Form.Select name="neck_movement" value={formData.neck_movement} onChange={handleChange}>
                            <option value="Normal">Normal</option>
                            <option value="Restricted">Restricted</option>
                            <option value="Painful">Painful</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
            </Row>

            <h5 className="text-primary mb-3 mt-4"><AlertTriangle size={18} className="me-2" />Risk Profile</h5>
            <Row className="mb-3">
                <Col md={12}>
                    <Form.Group className="mb-2">
                        <Form.Label>Comorbidities (PMH)</Form.Label>
                        <Form.Control as="textarea" rows={2} placeholder="e.g. Diabetes Type 2, Hypertension, Asthma..." name="comorbidities" value={formData.comorbidities} onChange={handleChange} />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-2">
                        <Form.Label>Current Medications</Form.Label>
                        <Form.Control as="textarea" rows={2} name="medications" value={formData.medications} onChange={handleChange} />
                    </Form.Group>
                </Col>
                <Col md={6}>
                    <Form.Group className="mb-2">
                        <Form.Label>Allergies</Form.Label>
                        <Form.Control as="textarea" rows={2} name="allergies" value={formData.allergies} onChange={handleChange} />
                    </Form.Group>
                </Col>
            </Row>

            <Row className="mb-4 align-items-end p-3 bg-light rounded mx-1">
                <Col md={4}>
                    <Form.Group>
                        <Form.Label className="fw-bold">ASA Physical Status</Form.Label>
                        <div className="d-flex">
                            <Form.Select name="asa_grade" value={formData.asa_grade} onChange={handleChange} className="me-2">
                                <option value="I">ASA I - Healthy patient</option>
                                <option value="II">ASA II - Mild systemic disease</option>
                                <option value="III">ASA III - Severe systemic disease</option>
                                <option value="IV">ASA IV - Threat to life</option>
                                <option value="V">ASA V - Moribund</option>
                                <option value="VI">ASA VI - Brain dead</option>
                            </Form.Select>
                            <Button variant="outline-info" size="sm" onClick={handleAutoGrade}>Auto</Button>
                        </div>
                    </Form.Group>
                </Col>
                <Col md={4}>
                    <Form.Group>
                        <Form.Label className="fw-bold">Clearance Status</Form.Label>
                        <Form.Select name="status" value={formData.status} onChange={handleChange}
                            className={formData.status === 'Fit' ? 'border-success text-success fw-bold' : formData.status === 'Unfit' ? 'border-danger text-danger' : ''}
                        >
                            <option value="Pending">Pending Decision</option>
                            <option value="Fit">✅ Fit for Surgery</option>
                            <option value="Fit with High Risk">⚠️ Fit with High Risk (Consent Required)</option>
                            <option value="Unfit">❌ Unfit (Postpone)</option>
                        </Form.Select>
                    </Form.Group>
                </Col>
                <Col md={4} className="text-end">
                    <Button variant="success" size="lg" onClick={() => onSave(formData)} disabled={loading}>
                        {loading ? 'Saving...' : 'Finalize Assessment'}
                    </Button>
                </Col>
            </Row>
        </Form>
    );
};

export default PACForm;
