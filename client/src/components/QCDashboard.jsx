import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, Modal, Form, Spinner } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Activity, AlertTriangle, CheckCircle, Plus, FlaskConical } from 'lucide-react';
import api from '../utils/axiosInstance';

/**
 * QCDashboard - Quality Control with Levy-Jennings Charts
 */
const QCDashboard = () => {
    const [materials, setMaterials] = useState([]);
    const [selectedMaterial, setSelectedMaterial] = useState(null);
    const [qcResults, setQcResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newValue, setNewValue] = useState('');

    // Violations and acknowledgement states
    const [violations, setViolations] = useState([]);
    const [showAcknowledgeModal, setShowAcknowledgeModal] = useState(false);
    const [selectedViolation, setSelectedViolation] = useState(null);
    const [ackNotes, setAckNotes] = useState('');

    useEffect(() => {
        fetchMaterials();
        fetchViolations();
    }, []);

    const fetchMaterials = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/api/lab/qc/materials', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const materialsData = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setMaterials(materialsData);
            if (materialsData.length > 0) {
                setSelectedMaterial(materialsData[0]);
                fetchQCResults(materialsData[0].id);
            }
            setLoading(false);
        } catch (err) {
            console.error('Fetch QC materials error:', err);
            setLoading(false);
        }
    };

    const fetchQCResults = async (materialId) => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/api/lab/qc/results/${materialId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const results = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            setQcResults(results.reverse()); // Show oldest first for chart
        } catch (err) {
            console.error('Fetch QC results error:', err);
        }
    };

    const fetchViolations = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/api/lab/qc/violations', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setViolations(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (err) {
            console.error('Fetch QC violations error:', err);
        }
    };

    const handleAcknowledge = async () => {
        if (!selectedViolation) return;
        try {
            const token = localStorage.getItem('token');
            await api.post(`/api/lab/qc/violations/${selectedViolation.id}/acknowledge`, {
                notes: ackNotes
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowAcknowledgeModal(false);
            setAckNotes('');
            setSelectedViolation(null);
            fetchViolations();
            if (selectedMaterial) {
                fetchQCResults(selectedMaterial.id);
            }
        } catch (err) {
            console.error('Acknowledge violation error:', err);
        }
    };

    const handleMaterialChange = (material) => {
        setSelectedMaterial(material);
        fetchQCResults(material.id);
    };

    const handleAddResult = async () => {
        try {
            const token = localStorage.getItem('token');
            await api.post('/api/lab/qc/results', {
                qc_material_id: selectedMaterial.id,
                value: parseFloat(newValue)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowAddModal(false);
            setNewValue('');
            fetchQCResults(selectedMaterial.id);
            fetchViolations();
        } catch (err) {
            console.error('Add QC result error:', err);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pass: { bg: 'success', icon: <CheckCircle size={14} />, text: 'Pass' },
            warning: { bg: 'warning', icon: <AlertTriangle size={14} />, text: 'Warning (1:2s)' },
            fail: { bg: 'danger', icon: <AlertTriangle size={14} />, text: 'Fail (1:3s)' }
        };
        return badges[status] || badges.pass;
    };

    if (loading) {
        return (
            <Card className="shadow-sm border-0 p-4 text-center">
                <Spinner animation="border" variant="primary" />
                <div className="mt-2">Loading QC Dashboard...</div>
            </Card>
        );
    }

    if (materials.length === 0) {
        return (
            <Card className="shadow-sm border-0 p-4 text-center text-muted">
                <FlaskConical size={48} className="mb-3 opacity-50" />
                <h5>No QC Materials Configured</h5>
                <p>Contact admin to add QC control materials</p>
            </Card>
        );
    }

    const target = parseFloat(selectedMaterial?.target_value) || 0;
    const sd = parseFloat(selectedMaterial?.sd_value) || 1;

    // Prepare chart data
    const chartData = qcResults.map((r, i) => ({
        index: i + 1,
        value: parseFloat(r.value),
        date: new Date(r.created_at).toLocaleDateString('en-IN'),
        status: r.status,
        westgard_rule: r.westgard_rule,
        deviation_sd: parseFloat(r.deviation_sd)
    }));

    return (
        <div className="qc-dashboard">
            {/* Material Selection */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex flex-wrap gap-2">
                        {materials.map(m => (
                            <Button
                                key={m.id}
                                variant={selectedMaterial?.id === m.id ? 'primary' : 'outline-primary'}
                                size="sm"
                                onClick={() => handleMaterialChange(m)}
                            >
                                {m.name}
                            </Button>
                        ))}
                    </div>
                </Col>
            </Row>

            <Row>
                {/* Levy-Jennings Chart */}
                <Col md={8}>
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                            <div className="fw-bold">
                                📊 Levy-Jennings Chart: {selectedMaterial?.name}
                            </div>
                            <Badge bg="info">Target: {target} ± {sd} SD</Badge>
                        </Card.Header>
                        <Card.Body style={{ height: 350 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="index" />
                                    <YAxis domain={[target - 4 * sd, target + 4 * sd]} />
                                    <Tooltip
                                        formatter={(value, name, props) => {
                                            const item = props.payload;
                                            const ruleText = item.westgard_rule ? ` (Breached: ${item.westgard_rule})` : '';
                                            return [`${value.toFixed(2)}${ruleText} [${item.deviation_sd ? item.deviation_sd.toFixed(2) : '0'} SD]`, 'Value'];
                                        }}
                                        labelFormatter={(i) => `Run #${i}`}
                                    />
                                    {/* Target Line */}
                                    <ReferenceLine y={target} stroke="#198754" strokeWidth={2} label="Mean" />
                                    {/* +/- 2SD Lines */}
                                    <ReferenceLine y={target + 2 * sd} stroke="#ffc107" strokeDasharray="5 5" label="+2SD" />
                                    <ReferenceLine y={target - 2 * sd} stroke="#ffc107" strokeDasharray="5 5" label="-2SD" />
                                    {/* +/- 3SD Lines */}
                                    <ReferenceLine y={target + 3 * sd} stroke="#dc3545" strokeDasharray="3 3" label="+3SD" />
                                    <ReferenceLine y={target - 3 * sd} stroke="#dc3545" strokeDasharray="3 3" label="-3SD" />
                                    {/* Data Line */}
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#0d6efd"
                                        strokeWidth={2}
                                        dot={(props) => {
                                            const { cx, cy, payload } = props;
                                            const color = payload.status === 'fail' ? '#dc3545' : payload.status === 'warning' ? '#ffc107' : '#198754';
                                            return <circle cx={cx} cy={cy} r={5} fill={color} />;
                                        }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card.Body>
                    </Card>
                </Col>

                {/* QC Results Table & Add Button */}
                <Col md={4}>
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                            <div className="fw-bold">Recent Results</div>
                            <Button size="sm" variant="primary" onClick={() => setShowAddModal(true)}>
                                <Plus size={14} /> Add
                            </Button>
                        </Card.Header>
                        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                            <Table hover className="mb-0" size="sm">
                                <thead className="bg-light sticky-top">
                                    <tr>
                                        <th>Value</th>
                                        <th>SD</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {qcResults.slice().reverse().map(r => {
                                        const badge = getStatusBadge(r.status);
                                        return (
                                            <tr key={r.id}>
                                                <td>{parseFloat(r.value).toFixed(2)}</td>
                                                <td className={parseFloat(r.deviation_sd) > 2 ? 'text-danger' : ''}>
                                                    {parseFloat(r.deviation_sd).toFixed(2)} SD
                                                </td>
                                                <td>
                                                    <Badge bg={badge.bg} className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
                                                        {badge.icon} {badge.text}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {qcResults.length === 0 && (
                                        <tr>
                                            <td colSpan="3" className="text-center text-muted py-3">
                                                No QC results yet
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </Card>

                    {/* Material Info */}
                    <Card className="shadow-sm border-0">
                        <Card.Body>
                            <h6 className="fw-bold mb-3">📋 Control Material Info</h6>
                            <div className="small">
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">Lot #:</span>
                                    <span>{selectedMaterial?.lot_number || 'N/A'}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">Target:</span>
                                    <span>{target}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-2">
                                    <span className="text-muted">SD:</span>
                                    <span>{sd}</span>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <span className="text-muted">Expiry:</span>
                                    <span>{selectedMaterial?.expiry_date ? new Date(selectedMaterial.expiry_date).toLocaleDateString('en-IN') : 'N/A'}</span>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* QC Violations Feed */}
            <Row className="mt-4">
                <Col md={12}>
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-white py-3 d-flex justify-content-between align-items-center">
                            <h5 className="fw-bold mb-0 text-danger d-flex align-items-center gap-2">
                                <AlertTriangle size={20} />
                                Active QC Violations Alerts ({violations.length})
                            </h5>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Table hover striped responsive className="mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>Material</th>
                                        <th>Breached Rule</th>
                                        <th>Type</th>
                                        <th>Value</th>
                                        <th>Deviation</th>
                                        <th>Details</th>
                                        <th>Date</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {violations.map(v => (
                                        <tr key={v.id}>
                                            <td className="fw-medium">{v.material_name}</td>
                                            <td>
                                                <Badge bg="danger">{v.rule_violated}</Badge>
                                            </td>
                                            <td>
                                                <Badge bg={v.type === 'rejection' ? 'danger' : 'warning'}>
                                                    {v.type}
                                                </Badge>
                                            </td>
                                            <td>{parseFloat(v.value).toFixed(2)}</td>
                                            <td>{parseFloat(v.deviation_sd).toFixed(2)} SD</td>
                                            <td>{v.description}</td>
                                            <td className="small text-muted">
                                                {new Date(v.created_at).toLocaleString('en-IN')}
                                            </td>
                                            <td>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline-success"
                                                    onClick={() => {
                                                        setSelectedViolation(v);
                                                        setShowAcknowledgeModal(true);
                                                    }}
                                                >
                                                    Acknowledge
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {violations.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="text-center text-muted py-4">
                                                No active QC violations alerts. System running in control limits.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Add QC Result Modal */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Add QC Result: {selectedMaterial?.name}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Measured Value</Form.Label>
                        <Form.Control
                            type="number"
                            step="0.01"
                            value={newValue}
                            onChange={e => setNewValue(e.target.value)}
                            placeholder={`Target: ${target}`}
                        />
                        <Form.Text className="text-muted">
                            Acceptable range: {(target - 2 * sd).toFixed(2)} - {(target + 2 * sd).toFixed(2)} (±2 SD)
                        </Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleAddResult} disabled={!newValue}>
                        Submit QC Result
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Acknowledge Violation Modal */}
            <Modal show={showAcknowledgeModal} onHide={() => setShowAcknowledgeModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title className="text-danger d-flex align-items-center gap-2">
                        <AlertTriangle />
                        Acknowledge QC Failure: {selectedViolation?.material_name}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="alert alert-danger py-2 small">
                        <strong>Rule Breached: {selectedViolation?.rule_violated} ({selectedViolation?.type})</strong><br />
                        {selectedViolation?.description}
                    </div>
                    <Form.Group className="mb-3">
                        <Form.Label>Corrective Action / Root Cause Notes *</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={ackNotes}
                            onChange={e => setAckNotes(e.target.value)}
                            placeholder="e.g. Recalibrated analyzer module, ran new control bottle"
                        />
                        <Form.Text className="text-muted">
                            Provide details of validation action taken to restore quality standards.
                        </Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAcknowledgeModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleAcknowledge} disabled={!ackNotes}>
                        Confirm Correction
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default QCDashboard;
