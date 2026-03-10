import React, { useState, useEffect } from 'react';
import { Card, ListGroup, Button, Form, Badge, Modal, InputGroup } from 'react-bootstrap';
import { Plus, Trash2, AlertCircle, CheckCircle, Clock, Search, Activity } from 'lucide-react';
import axios from 'axios';

// Common ICD-10 codes for quick selection
const COMMON_DIAGNOSES = [
    { code: 'J18.9', name: 'Pneumonia, unspecified' },
    { code: 'I10', name: 'Essential hypertension' },
    { code: 'E11.9', name: 'Type 2 diabetes mellitus' },
    { code: 'I50.9', name: 'Heart failure, unspecified' },
    { code: 'N39.0', name: 'Urinary tract infection' },
    { code: 'K92.2', name: 'GI hemorrhage, unspecified' },
    { code: 'A41.9', name: 'Sepsis, unspecified' },
    { code: 'J96.0', name: 'Acute respiratory failure' },
    { code: 'N17.9', name: 'Acute kidney failure' },
    { code: 'I21.9', name: 'Acute myocardial infarction' },
    { code: 'J44.1', name: 'COPD with acute exacerbation' },
    { code: 'K85.9', name: 'Acute pancreatitis' },
    { code: 'G40.9', name: 'Epilepsy, unspecified' },
    { code: 'I63.9', name: 'Cerebral infarction' },
    { code: 'K25.9', name: 'Gastric ulcer' }
];

const ProblemListPanel = ({ patientId, patientName, onUpdate }) => {
    const [problems, setProblems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [newProblem, setNewProblem] = useState({
        diagnosis: '',
        icd10_code: '',
        status: 'Active',
        priority: 'Primary',
        notes: ''
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (patientId) fetchProblems();
    }, [patientId]);

    const fetchProblems = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/clinical/problems/${patientId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProblems(res.data || []);
        } catch (err) {
            console.error('Error fetching problems:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddProblem = async () => {
        if (!newProblem.diagnosis.trim()) return;

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/clinical/problems', {
                patient_id: patientId,
                ...newProblem
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setShowAddModal(false);
            setNewProblem({ diagnosis: '', icd10_code: '', status: 'Active', priority: 'Primary', notes: '' });
            fetchProblems();
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error('Error adding problem:', err);
            alert('Failed to add problem');
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveProblem = async (problemId) => {
        if (!window.confirm('Mark this problem as resolved?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/clinical/problems/${problemId}`, {
                status: 'Resolved',
                resolved_date: new Date().toISOString()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            fetchProblems();
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error('Error updating problem:', err);
        }
    };

    const handleDeleteProblem = async (problemId) => {
        if (!window.confirm('Delete this problem from the list?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/clinical/problems/${problemId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            fetchProblems();
            if (onUpdate) onUpdate();
        } catch (err) {
            console.error('Error deleting problem:', err);
        }
    };

    const selectCommonDiagnosis = (dx) => {
        setNewProblem({ ...newProblem, diagnosis: dx.name, icd10_code: dx.code });
        setSearchQuery('');
    };

    const filteredDiagnoses = COMMON_DIAGNOSES.filter(dx =>
        dx.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dx.code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeProblems = problems.filter(p => p.status === 'Active');
    const resolvedProblems = problems.filter(p => p.status === 'Resolved');

    const getStatusBadge = (status, priority) => {
        if (status === 'Resolved') return <Badge bg="secondary">Resolved</Badge>;
        if (priority === 'Primary') return <Badge bg="danger">Primary</Badge>;
        return <Badge bg="warning" text="dark">Secondary</Badge>;
    };

    return (
        <>
            <Card className="border-0 shadow-sm">
                <Card.Header className="bg-light d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-2">
                        <Activity size={18} className="text-primary" />
                        <span className="fw-bold">Problem List</span>
                        {patientName && <Badge bg="secondary" className="ms-2">{patientName}</Badge>}
                    </div>
                    <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
                        <Plus size={16} className="me-1" /> Add Problem
                    </Button>
                </Card.Header>
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center py-4 text-muted">Loading...</div>
                    ) : activeProblems.length === 0 ? (
                        <div className="text-center py-4 text-muted">
                            <AlertCircle size={32} className="mb-2 opacity-50" />
                            <div>No active problems</div>
                            <small>Click "Add Problem" to add diagnoses</small>
                        </div>
                    ) : (
                        <ListGroup variant="flush">
                            {activeProblems.map((problem, idx) => (
                                <ListGroup.Item
                                    key={problem.id}
                                    className="d-flex justify-content-between align-items-start py-3"
                                >
                                    <div>
                                        <div className="d-flex align-items-center gap-2">
                                            <span className="fw-bold">{idx + 1}.</span>
                                            <span>{problem.diagnosis}</span>
                                            {getStatusBadge(problem.status, problem.priority)}
                                        </div>
                                        <div className="small text-muted mt-1">
                                            {problem.icd10_code && (
                                                <Badge bg="light" text="dark" className="me-2">
                                                    ICD-10: {problem.icd10_code}
                                                </Badge>
                                            )}
                                            {problem.onset_date && (
                                                <span><Clock size={12} className="me-1" />
                                                    Onset: {new Date(problem.onset_date).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                        {problem.notes && (
                                            <small className="text-muted d-block mt-1">{problem.notes}</small>
                                        )}
                                    </div>
                                    <div className="d-flex gap-1">
                                        <Button
                                            variant="outline-success"
                                            size="sm"
                                            onClick={() => handleRemoveProblem(problem.id)}
                                            title="Mark as Resolved"
                                        >
                                            <CheckCircle size={14} />
                                        </Button>
                                        <Button
                                            variant="outline-danger"
                                            size="sm"
                                            onClick={() => handleDeleteProblem(problem.id)}
                                            title="Delete"
                                        >
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    )}

                    {resolvedProblems.length > 0 && (
                        <>
                            <div className="bg-light px-3 py-2 small text-muted fw-bold border-top">
                                Resolved Problems ({resolvedProblems.length})
                            </div>
                            <ListGroup variant="flush">
                                {resolvedProblems.slice(0, 3).map((problem) => (
                                    <ListGroup.Item
                                        key={problem.id}
                                        className="py-2 text-muted small"
                                    >
                                        <span className="text-decoration-line-through">{problem.diagnosis}</span>
                                        <Badge bg="secondary" className="ms-2">Resolved</Badge>
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                        </>
                    )}
                </Card.Body>
            </Card>

            {/* Add Problem Modal */}
            <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title><Plus size={20} className="me-2" /> Add Problem</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold">Search ICD-10 / Diagnosis</Form.Label>
                        <InputGroup>
                            <InputGroup.Text><Search size={16} /></InputGroup.Text>
                            <Form.Control
                                placeholder="Type to search common diagnoses..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </InputGroup>
                        {searchQuery && (
                            <div className="border rounded mt-2" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                {filteredDiagnoses.map(dx => (
                                    <div
                                        key={dx.code}
                                        className="px-3 py-2 border-bottom cursor-pointer hover-bg-light"
                                        style={{ cursor: 'pointer' }}
                                        onClick={() => selectCommonDiagnosis(dx)}
                                    >
                                        <Badge bg="info" className="me-2">{dx.code}</Badge>
                                        {dx.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label className="fw-bold">Diagnosis *</Form.Label>
                        <Form.Control
                            placeholder="Enter diagnosis"
                            value={newProblem.diagnosis}
                            onChange={(e) => setNewProblem({ ...newProblem, diagnosis: e.target.value })}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>ICD-10 Code</Form.Label>
                        <Form.Control
                            placeholder="e.g., J18.9"
                            value={newProblem.icd10_code}
                            onChange={(e) => setNewProblem({ ...newProblem, icd10_code: e.target.value })}
                        />
                    </Form.Group>

                    <div className="d-flex gap-3 mb-3">
                        <Form.Group className="flex-fill">
                            <Form.Label>Priority</Form.Label>
                            <Form.Select
                                value={newProblem.priority}
                                onChange={(e) => setNewProblem({ ...newProblem, priority: e.target.value })}
                            >
                                <option value="Primary">Primary</option>
                                <option value="Secondary">Secondary</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="flex-fill">
                            <Form.Label>Status</Form.Label>
                            <Form.Select
                                value={newProblem.status}
                                onChange={(e) => setNewProblem({ ...newProblem, status: e.target.value })}
                            >
                                <option value="Active">Active</option>
                                <option value="Chronic">Chronic</option>
                            </Form.Select>
                        </Form.Group>
                    </div>

                    <Form.Group className="mb-3">
                        <Form.Label>Notes</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            placeholder="Additional notes..."
                            value={newProblem.notes}
                            onChange={(e) => setNewProblem({ ...newProblem, notes: e.target.value })}
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAddModal(false)}>Cancel</Button>
                    <Button
                        variant="primary"
                        onClick={handleAddProblem}
                        disabled={!newProblem.diagnosis.trim() || saving}
                    >
                        {saving ? 'Adding...' : 'Add Problem'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </>
    );
};

export default ProblemListPanel;
