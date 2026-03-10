/**
 * LabTestParamsAdmin - Admin UI for configuring lab test parameters
 * Allows adding/editing test parameters and instrument mappings
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Table, Button, Modal, Form, Tab, Tabs, Alert, Badge, Spinner } from 'react-bootstrap';
import { Settings, Plus, Edit2, Trash2, Save, Download, RefreshCw, Beaker, Link } from 'lucide-react';
import api from '../utils/axiosInstance';

const LabTestParamsAdmin = () => {
    const [parameters, setParameters] = useState({ grouped: {}, flat: [] });
    const [mappings, setMappings] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal states
    const [showParamModal, setShowParamModal] = useState(false);
    const [showMappingModal, setShowMappingModal] = useState(false);
    const [editingParam, setEditingParam] = useState(null);

    // Form state
    const [paramForm, setParamForm] = useState({
        test_name: '', param_key: '', param_label: '', param_type: 'number',
        unit: '', reference_min: '', reference_max: '', category: '', display_order: 0
    });

    const [mappingForm, setMappingForm] = useState({
        manufacturer: '', model: '', instrument_code: '', wolf_param_key: '', wolf_test_name: ''
    });

    // Filters
    const [filterCategory, setFilterCategory] = useState('');
    const [filterTest, setFilterTest] = useState('');

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [paramsRes, mappingsRes, catsRes] = await Promise.all([
                api.get('/api/lab-params/parameters', { headers }),
                api.get('/api/lab-params/mappings', { headers }),
                api.get('/api/lab-params/categories', { headers })
            ]);

            const paramsData = paramsRes.data.flat ? paramsRes.data : (paramsRes.data?.data || { grouped: {}, flat: [] });
            setParameters(paramsData);
            setMappings(Array.isArray(mappingsRes.data) ? mappingsRes.data : (mappingsRes.data?.data || []));
            setCategories(Array.isArray(catsRes.data) ? catsRes.data : (catsRes.data?.data || []));
            setError(null);
        } catch (err) {
            setError('Failed to load data');
            console.error(err);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const openAddParam = () => {
        setEditingParam(null);
        setParamForm({
            test_name: '', param_key: '', param_label: '', param_type: 'number',
            unit: '', reference_min: '', reference_max: '', category: '', display_order: 0
        });
        setShowParamModal(true);
    };

    const openEditParam = (param) => {
        setEditingParam(param);
        setParamForm({
            test_name: param.test_name || '',
            param_key: param.param_key || '',
            param_label: param.param_label || '',
            param_type: param.param_type || 'number',
            unit: param.unit || '',
            reference_min: param.reference_min || '',
            reference_max: param.reference_max || '',
            category: param.category || '',
            display_order: param.display_order || 0
        });
        setShowParamModal(true);
    };

    const saveParam = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            if (editingParam) {
                await api.put(`/api/lab-params/parameters/${editingParam.id}`, paramForm, { headers });
            } else {
                await api.post('/api/lab-params/parameters', paramForm, { headers });
            }
            setShowParamModal(false);
            loadData();
        } catch (err) {
            console.error('Save error:', err);
            alert('Failed to save parameter');
        }
    };

    const deleteParam = async (id) => {
        if (!window.confirm('Delete this parameter?')) return;
        try {
            const token = localStorage.getItem('token');
            await api.delete(`/api/lab-params/parameters/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            loadData();
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    const saveMapping = async () => {
        try {
            const token = localStorage.getItem('token');
            await api.post('/api/lab-params/mappings', mappingForm, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowMappingModal(false);
            setMappingForm({ manufacturer: '', model: '', instrument_code: '', wolf_param_key: '', wolf_test_name: '' });
            loadData();
        } catch (err) {
            console.error('Save mapping error:', err);
        }
    };

    const deleteMapping = async (id) => {
        if (!window.confirm('Delete this mapping?')) return;
        try {
            const token = localStorage.getItem('token');
            await api.delete(`/api/lab-params/mappings/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            loadData();
        } catch (err) {
            console.error('Delete mapping error:', err);
        }
    };

    const exportParams = () => {
        const data = JSON.stringify(parameters.flat, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lab_test_parameters.json';
        a.click();
    };

    // Filter parameters
    const filteredParams = parameters.flat.filter(p => {
        if (filterCategory && p.category !== filterCategory) return false;
        if (filterTest && !p.test_name.toLowerCase().includes(filterTest.toLowerCase())) return false;
        return true;
    });

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-muted">Loading test parameters...</p>
            </Container>
        );
    }

    return (
        <Container fluid className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h4 className="fw-bold mb-0">
                    <Settings size={24} className="me-2" />
                    Lab Test Parameters Configuration
                </h4>
                <div>
                    <Button variant="outline-secondary" size="sm" onClick={loadData} className="me-2">
                        <RefreshCw size={14} className="me-1" /> Refresh
                    </Button>
                    <Button variant="outline-success" size="sm" onClick={exportParams} className="me-2">
                        <Download size={14} className="me-1" /> Export
                    </Button>
                </div>
            </div>

            {error && <Alert variant="danger">{error}</Alert>}

            <Row className="mb-4">
                <Col md={3}>
                    <Card className="text-center bg-primary text-white">
                        <Card.Body>
                            <h2>{parameters.flat?.length || 0}</h2>
                            <small>Test Parameters</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center bg-success text-white">
                        <Card.Body>
                            <h2>{Object.keys(parameters.grouped || {}).length}</h2>
                            <small>Unique Tests</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center bg-info text-white">
                        <Card.Body>
                            <h2>{mappings?.length || 0}</h2>
                            <small>Instrument Mappings</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center bg-warning">
                        <Card.Body>
                            <h2>{categories?.length || 0}</h2>
                            <small>Categories</small>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Tabs defaultActiveKey="parameters" className="mb-4">
                {/* Test Parameters Tab */}
                <Tab eventKey="parameters" title={<><Beaker size={16} className="me-1" /> Test Parameters</>}>
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                            <div className="d-flex gap-2 align-items-center">
                                <Form.Select size="sm" style={{ width: 150 }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                                    <option value="">All Categories</option>
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </Form.Select>
                                <Form.Control
                                    size="sm"
                                    placeholder="Search test..."
                                    style={{ width: 180 }}
                                    value={filterTest}
                                    onChange={e => setFilterTest(e.target.value)}
                                />
                            </div>
                            <Button variant="primary" size="sm" onClick={openAddParam}>
                                <Plus size={14} className="me-1" /> Add Parameter
                            </Button>
                        </Card.Header>
                        <Card.Body className="p-0" style={{ maxHeight: 500, overflowY: 'auto' }}>
                            <Table hover striped size="sm" className="mb-0">
                                <thead className="table-light sticky-top">
                                    <tr>
                                        <th>Test Name</th>
                                        <th>Parameter</th>
                                        <th>Label</th>
                                        <th>Type</th>
                                        <th>Unit</th>
                                        <th>Reference</th>
                                        <th>Category</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredParams.map(p => (
                                        <tr key={p.id}>
                                            <td className="fw-medium">{p.test_name}</td>
                                            <td><code>{p.param_key}</code></td>
                                            <td>{p.param_label}</td>
                                            <td><Badge bg="secondary">{p.param_type}</Badge></td>
                                            <td>{p.unit || '-'}</td>
                                            <td>{p.reference_min !== null ? `${p.reference_min} - ${p.reference_max}` : '-'}</td>
                                            <td><Badge bg="info">{p.category || '-'}</Badge></td>
                                            <td>
                                                <Button size="sm" variant="link" onClick={() => openEditParam(p)}>
                                                    <Edit2 size={14} />
                                                </Button>
                                                <Button size="sm" variant="link" className="text-danger" onClick={() => deleteParam(p.id)}>
                                                    <Trash2 size={14} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredParams.length === 0 && (
                                        <tr><td colSpan={8} className="text-center text-muted py-4">No parameters found</td></tr>
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>

                {/* Instrument Mappings Tab */}
                <Tab eventKey="mappings" title={<><Link size={16} className="me-1" /> Instrument Mappings</>}>
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                            <span className="fw-bold">Map Instrument Codes to WOLF Parameters</span>
                            <Button variant="primary" size="sm" onClick={() => setShowMappingModal(true)}>
                                <Plus size={14} className="me-1" /> Add Mapping
                            </Button>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Table hover striped size="sm" className="mb-0">
                                <thead className="table-light">
                                    <tr>
                                        <th>Manufacturer</th>
                                        <th>Model</th>
                                        <th>Instrument Code</th>
                                        <th>→</th>
                                        <th>WOLF Key</th>
                                        <th>Test</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mappings.map(m => (
                                        <tr key={m.id}>
                                            <td>{m.manufacturer}</td>
                                            <td>{m.model}</td>
                                            <td><code className="bg-dark text-white px-2 py-1 rounded">{m.instrument_code}</code></td>
                                            <td>→</td>
                                            <td><code className="bg-success text-white px-2 py-1 rounded">{m.wolf_param_key}</code></td>
                                            <td>{m.wolf_test_name}</td>
                                            <td>
                                                <Button size="sm" variant="link" className="text-danger" onClick={() => deleteMapping(m.id)}>
                                                    <Trash2 size={14} />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Tab>
            </Tabs>

            {/* Parameter Modal */}
            <Modal show={showParamModal} onHide={() => setShowParamModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{editingParam ? 'Edit' : 'Add'} Test Parameter</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Row>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Test Name *</Form.Label>
                                <Form.Control value={paramForm.test_name} onChange={e => setParamForm({ ...paramForm, test_name: e.target.value })} placeholder="e.g., CBC, Lipid Profile" />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Parameter Key *</Form.Label>
                                <Form.Control value={paramForm.param_key} onChange={e => setParamForm({ ...paramForm, param_key: e.target.value })} placeholder="e.g., hemoglobin, wbc" />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-3">
                                <Form.Label>Label *</Form.Label>
                                <Form.Control value={paramForm.param_label} onChange={e => setParamForm({ ...paramForm, param_label: e.target.value })} placeholder="e.g., Hemoglobin (g/dL)" />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label>Type</Form.Label>
                                <Form.Select value={paramForm.param_type} onChange={e => setParamForm({ ...paramForm, param_type: e.target.value })}>
                                    <option value="number">Number</option>
                                    <option value="text">Text</option>
                                    <option value="select">Select</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group className="mb-3">
                                <Form.Label>Unit</Form.Label>
                                <Form.Control value={paramForm.unit} onChange={e => setParamForm({ ...paramForm, unit: e.target.value })} placeholder="e.g., g/dL" />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <Form.Label>Reference Min</Form.Label>
                                <Form.Control type="number" value={paramForm.reference_min} onChange={e => setParamForm({ ...paramForm, reference_min: e.target.value })} />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <Form.Label>Reference Max</Form.Label>
                                <Form.Control type="number" value={paramForm.reference_max} onChange={e => setParamForm({ ...paramForm, reference_max: e.target.value })} />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group className="mb-3">
                                <Form.Label>Category</Form.Label>
                                <Form.Control value={paramForm.category} onChange={e => setParamForm({ ...paramForm, category: e.target.value })} placeholder="e.g., hematology" />
                            </Form.Group>
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowParamModal(false)}>Cancel</Button>
                    <Button variant="success" onClick={saveParam}><Save size={14} className="me-1" /> Save</Button>
                </Modal.Footer>
            </Modal>

            {/* Mapping Modal */}
            <Modal show={showMappingModal} onHide={() => setShowMappingModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Add Instrument Mapping</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Manufacturer</Form.Label>
                        <Form.Select value={mappingForm.manufacturer} onChange={e => setMappingForm({ ...mappingForm, manufacturer: e.target.value })}>
                            <option value="">Select...</option>
                            <option value="Sysmex">Sysmex</option>
                            <option value="Mindray">Mindray</option>
                            <option value="Transasia/Erba">Transasia/Erba</option>
                            <option value="Beckman Coulter">Beckman Coulter</option>
                            <option value="Roche">Roche</option>
                            <option value="Siemens">Siemens</option>
                        </Form.Select>
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Model</Form.Label>
                        <Form.Control value={mappingForm.model} onChange={e => setMappingForm({ ...mappingForm, model: e.target.value })} placeholder="e.g., XN-550, BS-480" />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Instrument Code (ASTM)</Form.Label>
                        <Form.Control value={mappingForm.instrument_code} onChange={e => setMappingForm({ ...mappingForm, instrument_code: e.target.value })} placeholder="e.g., WBC, HGB, GLU" />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>WOLF Parameter Key</Form.Label>
                        <Form.Control value={mappingForm.wolf_param_key} onChange={e => setMappingForm({ ...mappingForm, wolf_param_key: e.target.value })} placeholder="e.g., wbc, hemoglobin" />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Test Name</Form.Label>
                        <Form.Control value={mappingForm.wolf_test_name} onChange={e => setMappingForm({ ...mappingForm, wolf_test_name: e.target.value })} placeholder="e.g., CBC, Blood Sugar" />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowMappingModal(false)}>Cancel</Button>
                    <Button variant="success" onClick={saveMapping}><Save size={14} className="me-1" /> Save</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default LabTestParamsAdmin;
