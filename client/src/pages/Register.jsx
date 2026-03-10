import React, { useState } from 'react';
import { Container, Card, Form, Button, Alert, Row, Col, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, Mail, Lock, Shield, ArrowRight, Stethoscope, Check } from 'lucide-react';

const SECURITY_QUESTIONS = [
    "What is the name of your first pet?",
    "What is your mother's maiden name?",
    "What was the name of your first school?",
    "What city were you born in?",
    "What is your favorite food?",
    "What is the name of your favorite teacher?",
    "What is your childhood nickname?"
];

// Comprehensive Specialty List (20 Items)
const SPECIALTIES = [
    'General Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Gynecology',
    'Emergency', 'Neurology', 'Gastroenterology', 'Pulmonology', 'Dermatology',
    'ENT', 'Ophthalmology', 'Urology', 'Psychiatry', 'Endocrinology',
    'Nephrology', 'Oncology', 'Dentistry', 'General Surgery', 'Physiotherapy'
];

const WARDS = [
    'General Ward', 'ICU', 'Emergency', 'Private Ward', 'Maternity Ward', 
    'Pediatrics Ward', 'Orthopedic Ward', 'Isolation Ward', 'Surgical Ward', 'OPD'
];

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '',
        full_name: '', // New Field
        email: '',
        password: '',
        role: 'doctor',
        department: [], // Changed to Array for Multi-Select
        security_question: SECURITY_QUESTIONS[0],
        security_answer: '',
        security_question_2: SECURITY_QUESTIONS[1],
        security_answer_2: '',
        security_question_3: SECURITY_QUESTIONS[2],
        security_answer_3: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Toggle logic for multi-specialty pills
    const toggleSpecialty = (spec) => {
        let newDepts = [...formData.department];
        if (newDepts.includes(spec)) {
            newDepts = newDepts.filter(d => d !== spec);
        } else {
            newDepts.push(spec);
        }
        setFormData({ ...formData, department: newDepts });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Validation for Doctor
        if (formData.role === 'doctor' && formData.department.length === 0) {
            setError('Doctors must select at least one department/specialty.');
            return;
        }

        // Validation for Ward In-Charge and Nurse
        if ((formData.role === 'ward_incharge' || formData.role === 'nurse') && formData.department.length === 0) {
            setError('Please select an assigned Ward or Department.');
            return;
        }

        // Validation: Unique Questions
        const q1 = formData.security_question;
        const q2 = formData.security_question_2;
        const q3 = formData.security_question_3;

        if (q1 === q2 || q1 === q3 || q2 === q3) {
            setError('Please select 3 different security questions.');
            return;
        }

        setLoading(true);

        try {
            await axios.post('/api/auth/register-public', formData);
            setSuccess('Registration successful! Please wait for Admin approval before logging in.');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container fluid className="vh-100 p-0 overflow-auto bg-light">
            <Row className="min-vh-100 justify-content-center align-items-center py-5">
                <Col md={8} lg={6} xl={5}>
                    <Card className="border-0 shadow-lg">
                        <Card.Body className="p-5">
                            <div className="text-center mb-4">
                                <h2 className="fw-bold text-primary">Join WOLF HMS</h2>
                                <p className="text-muted">Create your professional profile</p>
                            </div>

                            {error && <Alert variant="danger">{error}</Alert>}
                            {success && <Alert variant="success">{success}</Alert>}

                            <Form onSubmit={handleSubmit}>
                                {/* Basic Info */}
                                <Row>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Username (Login ID)</Form.Label>
                                            <div className="input-group">
                                                <span className="input-group-text bg-light border-end-0"><User size={18} /></span>
                                                <Form.Control
                                                    type="text"
                                                    name="username"
                                                    required
                                                    className="border-start-0"
                                                    value={formData.username}
                                                    onChange={handleChange}
                                                    placeholder="e.g. jdoe123"
                                                />
                                            </div>
                                        </Form.Group>
                                    </Col>
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Full Name</Form.Label>
                                            <div className="input-group">
                                                <span className="input-group-text bg-light border-end-0"><Stethoscope size={18} /></span>
                                                <Form.Control
                                                    type="text"
                                                    name="full_name"
                                                    required
                                                    className="border-start-0"
                                                    value={formData.full_name}
                                                    onChange={handleChange}
                                                    placeholder="e.g. Dr. John Doe"
                                                />
                                            </div>
                                        </Form.Group>
                                    </Col>
                                </Row>

                                <Form.Group className="mb-3">
                                    <Form.Label>Email Address</Form.Label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-light border-end-0"><Mail size={18} /></span>
                                        <Form.Control
                                            type="email"
                                            name="email"
                                            required
                                            className="border-start-0"
                                            value={formData.email}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </Form.Group>

                                {/* Role & Specialty */}
                                <Form.Group className="mb-3">
                                    <Form.Label>Role</Form.Label>
                                    <Form.Select name="role" value={formData.role} onChange={handleChange}>
                                        <option value="doctor">Doctor</option>
                                        <option value="nurse">Nurse</option>
                                        <option value="ward_incharge">Ward In-Charge</option>
                                        <option value="receptionist">Receptionist</option>
                                        <option value="lab">Lab Technician</option>
                                        <option value="pharmacist">Pharmacist</option>
                                        <option value="blood_bank_tech">Blood Bank Technician</option>
                                        <option value="security_guard">Security / Overwatch</option>
                                    </Form.Select>
                                </Form.Group>

                                {formData.role === 'doctor' && (
                                    <Form.Group className="mb-4">
                                        <Form.Label>Departments & Specialties <small className="text-muted">(Select all that apply)</small></Form.Label>
                                        <div className="d-flex flex-wrap gap-2 p-3 bg-light rounded border">
                                            {SPECIALTIES.map(spec => {
                                                const isSelected = formData.department.includes(spec);
                                                return (
                                                    <Badge
                                                        key={spec}
                                                        bg={isSelected ? 'primary' : 'light'}
                                                        text={isSelected ? 'white' : 'dark'}
                                                        className={`p-2 border ${isSelected ? 'border-primary' : 'border-secondary'}`}
                                                        style={{ cursor: 'pointer', userSelect: 'none', fontSize: '0.85rem' }}
                                                        onClick={() => toggleSpecialty(spec)}
                                                    >
                                                        {isSelected && <Check size={12} className="me-1" />}
                                                        {spec}
                                                    </Badge>
                                                );
                                            })}
                                        </div>
                                        <Form.Text className="text-muted">
                                            Selected: {formData.department.length > 0 ? formData.department.join(', ') : 'None'}
                                        </Form.Text>
                                    </Form.Group>
                                )}

                                {(formData.role === 'ward_incharge' || formData.role === 'nurse') && (
                                    <Form.Group className="mb-3">
                                        <Form.Label>Assigned Ward / Department</Form.Label>
                                        <Form.Select 
                                            name="department_single" 
                                            value={formData.department[0] || ''} 
                                            onChange={(e) => setFormData({ ...formData, department: [e.target.value] })}
                                            required
                                        >
                                            <option value="">Select Ward / Department...</option>
                                            {WARDS.map(w => (
                                                <option key={w} value={w}>{w}</option>
                                            ))}
                                        </Form.Select>
                                    </Form.Group>
                                )}

                                <Form.Group className="mb-3">
                                    <Form.Label>Password</Form.Label>
                                    <div className="input-group">
                                        <span className="input-group-text bg-light border-end-0"><Lock size={18} /></span>
                                        <Form.Control
                                            type="password"
                                            name="password"
                                            required
                                            className="border-start-0"
                                            value={formData.password}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </Form.Group>

                                <hr className="my-4" />
                                <h6 className="mb-3 text-primary fw-bold"> <Shield size={18} className="me-2" /> Security Questions (Required)</h6>
                                
                                {[1, 2, 3].map(num => (
                                    <div key={num} className="p-3 bg-light rounded mb-3 border">
                                        <Form.Group className="mb-2">
                                            <Form.Label className="small fw-bold">Question {num}</Form.Label>
                                            <Form.Select
                                                name={num === 1 ? "security_question" : `security_question_${num}`}
                                                value={formData[num === 1 ? "security_question" : `security_question_${num}`]}
                                                onChange={handleChange}
                                            >
                                                {SECURITY_QUESTIONS.map((q, i) => (
                                                    <option key={i} value={q}>{q}</option>
                                                ))}
                                            </Form.Select>
                                        </Form.Group>
                                        <Form.Group>
                                            <Form.Control
                                                type="text"
                                                name={num === 1 ? "security_answer" : `security_answer_${num}`}
                                                placeholder={`Answer #${num}`}
                                                required
                                                value={formData[num === 1 ? "security_answer" : `security_answer_${num}`]}
                                                onChange={handleChange}
                                            />
                                        </Form.Group>
                                    </div>
                                ))}

                                <Button
                                    variant="primary"
                                    type="submit"
                                    className="w-100 py-3 fw-bold mt-2"
                                    disabled={loading}
                                >
                                    {loading ? 'Submitting...' : 'Submit Registration'}
                                </Button>
                            </Form>

                            <div className="text-center mt-4">
                                <Link to="/login" className="text-decoration-none">
                                    Back to Login <ArrowRight size={16} />
                                </Link>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

export default Register;
