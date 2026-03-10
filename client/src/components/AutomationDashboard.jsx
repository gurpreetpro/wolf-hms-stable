import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Button, Badge, Modal, Form, Spinner, Alert, ProgressBar, Tab, Tabs } from 'react-bootstrap';
import {
    Zap, CheckCircle, XCircle, AlertTriangle, Clock, Play,
    Phone, Mail, MessageSquare, FileText, DollarSign, RefreshCw,
    Settings, List, CreditCard, Calendar
} from 'lucide-react';
import api from '../utils/axiosInstance';
import { formatCurrency } from '../utils/currency';

/**
 * Billing Automation Dashboard
 * Phase 4: Claim Scrubbing, Payment Posting, Collection Workflow
 */
const AutomationDashboard = () => {
    const [activeTab, setActiveTab] = useState('scrubbing');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [worklist, setWorklist] = useState([]);
    const [rules, setRules] = useState([]);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [statsRes, worklistRes, rulesRes] = await Promise.all([
                api.get('/api/automation/stats'),
                api.get('/api/automation/collections/worklist'),
                api.get('/api/automation/scrub/rules')
            ]);
            setStats(statsRes.data);
            setWorklist(worklistRes.data.worklist || []);
            setRules(rulesRes.data.rules || []);
        } catch (error) {
            console.error('Error loading automation data:', error);
            // Mock data
            setStats({
                scrubbing: { claims_processed_today: 45, clean_rate: 92, common_errors: ['Missing ICD codes', 'Eligibility not verified'] },
                payment_posting: { auto_posted_today: 12, total_amount: 156000, pending_manual_review: 3 },
                collections: { scheduled_calls: 8, completed_today: 5, payment_plans_active: 15, collected_this_week: 85000 }
            });
            setWorklist([
                { id: 1, patient_name: 'Ramesh Kumar', balance_due: 15000, days_outstanding: 45, priority: 'Medium', patient_phone: '9876543210' },
                { id: 2, patient_name: 'Priya Singh', balance_due: 32000, days_outstanding: 75, priority: 'High', patient_phone: '9876543211' },
                { id: 3, patient_name: 'Arun Patel', balance_due: 8500, days_outstanding: 95, priority: 'Critical', patient_phone: '9876543212' }
            ]);
            setRules([
                { id: 'R001', name: 'Missing Patient Info', category: 'Documentation', severity: 'error' },
                { id: 'R002', name: 'Invalid Diagnosis Code', category: 'Coding', severity: 'error' },
                { id: 'R003', name: 'Missing Procedure Code', category: 'Coding', severity: 'warning' },
                { id: 'R004', name: 'Authorization Not Verified', category: 'Authorization', severity: 'error' },
                { id: 'R005', name: 'Insurance Inactive', category: 'Eligibility', severity: 'error' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const getPriorityBadge = (priority) => {
        const config = {
            'Critical': 'danger',
            'High': 'warning',
            'Medium': 'info',
            'Low': 'secondary'
        };
        return <Badge bg={config[priority] || 'secondary'}>{priority}</Badge>;
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center py-5">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    return (
        <div>
            {message.text && (
                <Alert variant={message.type} dismissible onClose={() => setMessage({ type: '', text: '' })}>
                    {message.text}
                </Alert>
            )}

            {/* Stats Row */}
            <Row className="g-3 mb-4">
                <Col md={4}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}>
                        <Card.Body className="text-white">
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <small className="opacity-75">Claim Scrubbing</small>
                                    <h3 className="fw-bold mb-1">{stats?.scrubbing?.clean_rate}%</h3>
                                    <small>Clean Rate Today</small>
                                </div>
                                <div className="bg-white bg-opacity-25 rounded p-2">
                                    <CheckCircle size={24} />
                                </div>
                            </div>
                            <div className="mt-2 small opacity-75">
                                {stats?.scrubbing?.claims_processed_today} claims processed
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
                        <Card.Body className="text-white">
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <small className="opacity-75">Auto Payment Posting</small>
                                    <h3 className="fw-bold mb-1">{formatCurrency(stats?.payment_posting?.total_amount)}</h3>
                                    <small>Posted Today</small>
                                </div>
                                <div className="bg-white bg-opacity-25 rounded p-2">
                                    <CreditCard size={24} />
                                </div>
                            </div>
                            <div className="mt-2 small opacity-75">
                                {stats?.payment_posting?.auto_posted_today} payments auto-posted
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                        <Card.Body className="text-white">
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <small className="opacity-75">Collections</small>
                                    <h3 className="fw-bold mb-1">{formatCurrency(stats?.collections?.collected_this_week)}</h3>
                                    <small>Collected This Week</small>
                                </div>
                                <div className="bg-white bg-opacity-25 rounded p-2">
                                    <Phone size={24} />
                                </div>
                            </div>
                            <div className="mt-2 small opacity-75">
                                {stats?.collections?.payment_plans_active} active payment plans
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Tabs activeKey={activeTab} onSelect={k => setActiveTab(k)} className="mb-4">
                {/* Claim Scrubbing Tab */}
                <Tab eventKey="scrubbing" title={<><CheckCircle size={14} className="me-1" />Claim Scrubbing</>}>
                    <Row className="g-3">
                        <Col md={8}>
                            <Card className="border-0 shadow-sm">
                                <Card.Header className="bg-white d-flex justify-content-between">
                                    <h6 className="fw-bold mb-0">Scrubbing Rules Engine</h6>
                                    <Badge bg="primary">{rules.length} Active Rules</Badge>
                                </Card.Header>
                                <Card.Body className="p-0">
                                    <Table hover responsive className="mb-0">
                                        <thead className="bg-light">
                                            <tr>
                                                <th>Rule ID</th>
                                                <th>Rule Name</th>
                                                <th>Category</th>
                                                <th>Severity</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rules.map((rule) => (
                                                <tr key={rule.id}>
                                                    <td><code>{rule.id}</code></td>
                                                    <td>{rule.name}</td>
                                                    <td><Badge bg="secondary">{rule.category}</Badge></td>
                                                    <td>
                                                        <Badge bg={rule.severity === 'error' ? 'danger' : 'warning'}>
                                                            {rule.severity === 'error' ? <XCircle size={12} /> : <AlertTriangle size={12} />}
                                                            {' '}{rule.severity}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={4}>
                            <Card className="border-0 shadow-sm mb-3">
                                <Card.Body>
                                    <h6 className="fw-bold mb-3">Quick Scrub</h6>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Invoice/Claim ID</Form.Label>
                                        <Form.Control placeholder="Enter claim ID" />
                                    </Form.Group>
                                    <Button variant="primary" className="w-100">
                                        <Play size={14} className="me-1" /> Run Scrubbing
                                    </Button>
                                </Card.Body>
                            </Card>
                            <Card className="border-0 shadow-sm">
                                <Card.Body>
                                    <h6 className="fw-bold mb-3">Common Errors</h6>
                                    {stats?.scrubbing?.common_errors?.map((err, idx) => (
                                        <div key={idx} className="d-flex align-items-center py-2 border-bottom">
                                            <XCircle size={14} className="text-danger me-2" />
                                            <span className="small">{err}</span>
                                        </div>
                                    ))}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Tab>

                {/* Payment Posting Tab */}
                <Tab eventKey="payment" title={<><CreditCard size={14} className="me-1" />Payment Posting</>}>
                    <Row className="g-3">
                        <Col md={6}>
                            <Card className="border-0 shadow-sm">
                                <Card.Header className="bg-white">
                                    <h6 className="fw-bold mb-0">ERA/EOB Processing</h6>
                                </Card.Header>
                                <Card.Body>
                                    <Alert variant="info" className="mb-3">
                                        <Zap size={16} className="me-2" />
                                        Upload ERA (Electronic Remittance Advice) files to auto-post payments
                                    </Alert>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Upload ERA File</Form.Label>
                                        <Form.Control type="file" accept=".835,.txt,.csv" />
                                    </Form.Group>
                                    <Button variant="success" className="w-100">
                                        <Play size={14} className="me-1" /> Process ERA File
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={6}>
                            <Card className="border-0 shadow-sm">
                                <Card.Header className="bg-white">
                                    <h6 className="fw-bold mb-0">Manual Payment Post</h6>
                                </Card.Header>
                                <Card.Body>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Invoice ID</Form.Label>
                                        <Form.Control placeholder="Enter invoice ID" />
                                    </Form.Group>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Payment Amount</Form.Label>
                                        <Form.Control type="number" placeholder="₹" />
                                    </Form.Group>
                                    <Row>
                                        <Col>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Payer</Form.Label>
                                                <Form.Select>
                                                    <option>Star Health</option>
                                                    <option>ICICI Lombard</option>
                                                    <option>Medi Assist</option>
                                                </Form.Select>
                                            </Form.Group>
                                        </Col>
                                        <Col>
                                            <Form.Group className="mb-3">
                                                <Form.Label>Check #</Form.Label>
                                                <Form.Control placeholder="Check number" />
                                            </Form.Group>
                                        </Col>
                                    </Row>
                                    <Button variant="primary" className="w-100">
                                        <DollarSign size={14} className="me-1" /> Post Payment
                                    </Button>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Tab>

                {/* Collection Workflow Tab */}
                <Tab eventKey="collections" title={<><Phone size={14} className="me-1" />Collections</>}>
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white d-flex justify-content-between">
                            <h6 className="fw-bold mb-0">Collection Worklist</h6>
                            <div className="d-flex gap-2">
                                <Badge bg="danger">{worklist.filter(w => w.priority === 'Critical').length} Critical</Badge>
                                <Badge bg="warning">{worklist.filter(w => w.priority === 'High').length} High</Badge>
                                <Button variant="outline-primary" size="sm" onClick={loadData}>
                                    <RefreshCw size={14} />
                                </Button>
                            </div>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Table hover responsive className="mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th>Patient</th>
                                        <th className="text-end">Balance Due</th>
                                        <th className="text-center">Days Old</th>
                                        <th>Priority</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {worklist.slice(0, 10).map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <strong>{item.patient_name}</strong>
                                                <br />
                                                <small className="text-muted">{item.patient_phone}</small>
                                            </td>
                                            <td className="text-end fw-bold text-danger">
                                                {formatCurrency(item.balance_due)}
                                            </td>
                                            <td className="text-center">
                                                <Badge bg={item.days_outstanding > 60 ? 'danger' : item.days_outstanding > 30 ? 'warning' : 'secondary'}>
                                                    {item.days_outstanding} days
                                                </Badge>
                                            </td>
                                            <td>{getPriorityBadge(item.priority)}</td>
                                            <td>
                                                <div className="d-flex gap-1">
                                                    <Button variant="outline-primary" size="sm" title="Call">
                                                        <Phone size={12} />
                                                    </Button>
                                                    <Button variant="outline-info" size="sm" title="Email">
                                                        <Mail size={12} />
                                                    </Button>
                                                    <Button variant="outline-success" size="sm" title="SMS">
                                                        <MessageSquare size={12} />
                                                    </Button>
                                                    <Button variant="outline-warning" size="sm" title="Payment Plan">
                                                        <Calendar size={12} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>
        </div>
    );
};

export default AutomationDashboard;
