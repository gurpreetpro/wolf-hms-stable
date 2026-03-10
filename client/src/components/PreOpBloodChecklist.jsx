import { useState, useEffect } from 'react';
import { Card, Form, Row, Col, Badge, Alert, Button, Table, Spinner } from 'react-bootstrap';
import { Droplet, CheckCircle, Clock, AlertTriangle, Scissors, FileCheck } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';

export default function PreOpBloodChecklist({ surgeryId, patientId, patientName }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [requirement, setRequirement] = useState(null);
    const [preparedUnits, setPreparedUnits] = useState([]);
    const [standards, setStandards] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (surgeryId) fetchData();
    }, [surgeryId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Get existing requirement
            const reqRes = await axiosInstance.get(`/blood-bank/surgery/${surgeryId}/blood`);
            setRequirement(reqRes.data.requirement);
            setPreparedUnits(reqRes.data.preparedUnits || []);

            // Get surgery standards
            const stdRes = await axiosInstance.get('/blood-bank/surgery/standards');
            setStandards(stdRes.data.standards || []);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleChecklistChange = async (field, value) => {
        if (!requirement) return;
        setSaving(true);
        try {
            await axiosInstance.put(`/blood-bank/surgery/requirements/${requirement.id}/checklist`, {
                [field]: value
            });
            setRequirement(prev => ({ ...prev, [field]: value }));
        } catch (err) {
            setError('Failed to update checklist');
        } finally {
            setSaving(false);
        }
    };

    const isReady = requirement?.blood_typed_and_screened && 
                    requirement?.cross_match_completed && 
                    requirement?.blood_reserved && 
                    requirement?.consent_signed;

    if (loading) {
        return (
            <Card className="border-0 shadow-sm">
                <Card.Body className="text-center py-4">
                    <Spinner animation="border" variant="danger" />
                </Card.Body>
            </Card>
        );
    }

    if (!requirement) {
        return (
            <Card className="border-0 shadow-sm">
                <Card.Header className="bg-danger text-white">
                    <Droplet size={18} className="me-2" />
                    Pre-Op Blood Preparation
                </Card.Header>
                <Card.Body className="text-center py-4 text-muted">
                    <AlertTriangle size={40} className="mb-2 opacity-50" />
                    <p>No blood requirement set for this surgery</p>
                    <Button variant="outline-danger" size="sm">
                        Create Blood Requirement
                    </Button>
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-sm">
            <Card.Header className={`${isReady ? 'bg-success' : 'bg-danger'} text-white d-flex align-items-center justify-content-between`}>
                <div>
                    <Scissors size={18} className="me-2" />
                    Pre-Op Blood Checklist
                </div>
                <Badge bg={isReady ? 'light' : 'warning'} text={isReady ? 'success' : 'dark'}>
                    {isReady ? '✓ Ready' : 'Pending'}
                </Badge>
            </Card.Header>
            <Card.Body>
                {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

                {/* Blood Requirements */}
                <div className="mb-3 p-3 bg-light rounded">
                    <h6 className="mb-2"><Droplet size={14} className="me-1" />Blood Requirements</h6>
                    <Row>
                        <Col md={3}>
                            <div className="text-center">
                                <Badge bg="danger" className="fs-5">{requirement.blood_group_required || '?'}</Badge>
                                <div className="small text-muted mt-1">Blood Group</div>
                            </div>
                        </Col>
                        <Col md={3}>
                            <div className="text-center">
                                <span className="fs-5">{requirement.prbc_units_required || 0}</span>
                                <div className="small text-muted">PRBC Units</div>
                            </div>
                        </Col>
                        <Col md={3}>
                            <div className="text-center">
                                <span className="fs-5">{requirement.ffp_units_required || 0}</span>
                                <div className="small text-muted">FFP Units</div>
                            </div>
                        </Col>
                        <Col md={3}>
                            <div className="text-center">
                                <span className="fs-5">{requirement.estimated_blood_loss_ml || 0}</span>
                                <div className="small text-muted">Est. Loss (ml)</div>
                            </div>
                        </Col>
                    </Row>
                </div>

                {/* Checklist */}
                <h6 className="mb-2"><FileCheck size={14} className="me-1" />Checklist</h6>
                <div className="border rounded p-3">
                    <Form>
                        <Form.Check
                            type="checkbox"
                            id="blood_typed"
                            label={<>Blood Typed & Screened {requirement.blood_typed_and_screened && <Badge bg="success" className="ms-2">✓</Badge>}</>}
                            checked={requirement.blood_typed_and_screened || false}
                            onChange={(e) => handleChecklistChange('blood_typed_and_screened', e.target.checked)}
                            disabled={saving}
                            className="mb-2"
                        />
                        <Form.Check
                            type="checkbox"
                            id="cross_match"
                            label={<>Cross-Match Completed {requirement.cross_match_completed && <Badge bg="success" className="ms-2">✓</Badge>}</>}
                            checked={requirement.cross_match_completed || false}
                            onChange={(e) => handleChecklistChange('cross_match_completed', e.target.checked)}
                            disabled={saving}
                            className="mb-2"
                        />
                        <Form.Check
                            type="checkbox"
                            id="blood_reserved"
                            label={<>Blood Reserved in OT {requirement.blood_reserved && <Badge bg="success" className="ms-2">✓</Badge>}</>}
                            checked={requirement.blood_reserved || false}
                            onChange={(e) => handleChecklistChange('blood_reserved', e.target.checked)}
                            disabled={saving}
                            className="mb-2"
                        />
                        <Form.Check
                            type="checkbox"
                            id="consent_signed"
                            label={<>Transfusion Consent Signed {requirement.consent_signed && <Badge bg="success" className="ms-2">✓</Badge>}</>}
                            checked={requirement.consent_signed || false}
                            onChange={(e) => handleChecklistChange('consent_signed', e.target.checked)}
                            disabled={saving}
                        />
                    </Form>
                </div>

                {/* Prepared Units */}
                {preparedUnits.length > 0 && (
                    <div className="mt-3">
                        <h6><CheckCircle size={14} className="me-1" />Prepared Units</h6>
                        <Table size="sm" hover>
                            <thead className="table-light">
                                <tr>
                                    <th>Unit</th>
                                    <th>Blood Group</th>
                                    <th>Component</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preparedUnits.map(u => (
                                    <tr key={u.id}>
                                        <td>{u.unit_code}</td>
                                        <td><Badge bg="danger">{u.blood_group}</Badge></td>
                                        <td>{u.component_name}</td>
                                        <td><Badge bg="success">{u.status}</Badge></td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}

                {/* Status */}
                <div className={`mt-3 p-3 rounded text-center ${isReady ? 'bg-success bg-opacity-10' : 'bg-warning bg-opacity-10'}`}>
                    {isReady ? (
                        <div className="text-success">
                            <CheckCircle size={24} className="me-2" />
                            <strong>Blood Preparation Complete</strong>
                        </div>
                    ) : (
                        <div className="text-warning">
                            <Clock size={24} className="me-2" />
                            <strong>Pending Items Remain</strong>
                        </div>
                    )}
                </div>
            </Card.Body>
        </Card>
    );
}
