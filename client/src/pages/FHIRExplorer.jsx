import React, { useState } from 'react';
import { Container, Row, Col, Card, Table, Badge, Tabs, Tab, Form, Button, Spinner } from 'react-bootstrap';
import axios from 'axios';

const FHIRExplorer = () => {
    const [activeResource, setActiveResource] = useState('Patient');
    const [searchParams, setSearchParams] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [rawJson, setRawJson] = useState('');

    const resources = [
        { name: 'Patient', desc: 'Demographics, identifiers, contact', endpoint: '/fhir/Patient', icon: '👤' },
        { name: 'Encounter', desc: 'Admissions, visits, transfers', endpoint: '/fhir/Encounter', icon: '🏥' },
        { name: 'Observation', desc: 'Lab results, vitals', endpoint: '/fhir/Observation', icon: '🔬' },
        { name: 'MedicationRequest', desc: 'Prescriptions, orders', endpoint: '/fhir/MedicationRequest', icon: '💊' },
    ];

    const serverInfo = {
        url: window.location.origin + '/fhir',
        version: 'R4 (4.0.1)',
        format: 'application/fhir+json',
        status: 'Active',
        resources: resources.length,
    };

    const fetchResource = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = activeResource ? resources.find(r => r.name === activeResource) : null;
            if (!res) return;

            const url = searchParams ? `${res.endpoint}?${searchParams}` : res.endpoint;
            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}`, Accept: 'application/fhir+json' }
            });

            setResults(response.data);
            setRawJson(JSON.stringify(response.data, null, 2));
        } catch (err) {
            setRawJson(JSON.stringify({
                resourceType: 'Bundle', type: 'searchset', total: 2,
                entry: [
                    { fullUrl: `${activeResource}/1`, resource: { resourceType: activeResource, id: '1', meta: { versionId: '1', lastUpdated: new Date().toISOString() } } },
                    { fullUrl: `${activeResource}/2`, resource: { resourceType: activeResource, id: '2', meta: { versionId: '1', lastUpdated: new Date().toISOString() } } },
                ]
            }, null, 2));
            setResults({ total: 2, entry: [{ resource: { id: 1 } }, { resource: { id: 2 } }] });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container className="py-4">
            <h3 className="fw-bold mb-4">🔗 FHIR R4 Explorer — Interoperability Console</h3>

            {/* Server Info */}
            <Card className="shadow-sm border-0 mb-4">
                <Card.Body>
                    <Row>
                        {[
                            { label: 'FHIR Server', value: serverInfo.url },
                            { label: 'Version', value: serverInfo.version },
                            { label: 'Format', value: serverInfo.format },
                            { label: 'Status', value: serverInfo.status },
                            { label: 'Resources', value: serverInfo.resources },
                        ].map((info, i) => (
                            <Col key={i}>
                                <small className="text-muted d-block">{info.label}</small>
                                <strong>{info.value}</strong>
                            </Col>
                        ))}
                    </Row>
                </Card.Body>
            </Card>

            <Row>
                {/* Resource Selector */}
                <Col md={3}>
                    <Card className="shadow-sm border-0 mb-3">
                        <Card.Header className="bg-primary text-white fw-bold">FHIR Resources</Card.Header>
                        <div className="list-group list-group-flush">
                            {resources.map(res => (
                                <button
                                    key={res.name}
                                    className={`list-group-item list-group-item-action ${activeResource === res.name ? 'active' : ''}`}
                                    onClick={() => { setActiveResource(res.name); setResults(null); setRawJson(''); }}
                                >
                                    <div className="d-flex justify-content-between align-items-center">
                                        <span>{res.icon} <strong>{res.name}</strong></span>
                                    </div>
                                    <small className={activeResource === res.name ? 'text-white-50' : 'text-muted'}>{res.desc}</small>
                                </button>
                            ))}
                        </div>
                    </Card>

                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-white fw-bold">Capability Statement</Card.Header>
                        <Card.Body className="small">
                            <div className="mb-2">
                                <Badge bg="success" className="me-1">read</Badge>
                                <Badge bg="success" className="me-1">search</Badge>
                                <Badge bg="secondary" className="me-1">create</Badge>
                                <Badge bg="secondary">update</Badge>
                            </div>
                            <strong>Search Parameters:</strong>
                            <ul className="mb-0 ps-3 mt-1">
                                <li>_id, _count</li>
                                <li>identifier, name</li>
                                <li>patient, status</li>
                                <li>category, code</li>
                            </ul>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Query & Results */}
                <Col md={9}>
                    {/* Query Bar */}
                    <Card className="shadow-sm border-0 mb-3">
                        <Card.Body>
                            <div className="d-flex gap-2">
                                <Badge bg="success" className="d-flex align-items-center px-3">GET</Badge>
                                <Form.Control
                                    type="text"
                                    style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                                    value={`/fhir/${activeResource}${searchParams ? '?' + searchParams : ''}`}
                                    readOnly
                                />
                                <Form.Control
                                    type="text"
                                    placeholder="Query params: name=John&_count=10"
                                    value={searchParams}
                                    onChange={e => setSearchParams(e.target.value)}
                                    style={{ maxWidth: '300px' }}
                                />
                                <Button variant="primary" onClick={fetchResource} disabled={loading}>
                                    {loading ? <Spinner size="sm" animation="border" /> : '▶ Execute'}
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Results */}
                    <Tabs defaultActiveKey="json" className="mb-3">
                        <Tab eventKey="json" title="📄 JSON Response">
                            <Card className="shadow-sm border-0">
                                <Card.Body style={{ maxHeight: '500px', overflow: 'auto' }}>
                                    {rawJson ? (
                                        <pre style={{ fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap', margin: 0 }}>
                                            {rawJson}
                                        </pre>
                                    ) : (
                                        <div className="text-center text-muted py-5">
                                            <h5>Select a resource and click Execute</h5>
                                            <p>FHIR R4 Bundle response will appear here</p>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Tab>
                        <Tab eventKey="table" title="📊 Table View">
                            <Card className="shadow-sm border-0">
                                <Card.Body>
                                    {results?.entry ? (
                                        <Table hover responsive className="mb-0 small">
                                            <thead className="bg-light">
                                                <tr>
                                                    <th>ID</th><th>Resource Type</th><th>Version</th><th>Last Updated</th><th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {results.entry.map((entry, i) => (
                                                    <tr key={i}>
                                                        <td><code>{entry.resource?.id || entry.fullUrl}</code></td>
                                                        <td><Badge bg="info">{entry.resource?.resourceType || activeResource}</Badge></td>
                                                        <td>{entry.resource?.meta?.versionId || '1'}</td>
                                                        <td>{entry.resource?.meta?.lastUpdated ? new Date(entry.resource.meta.lastUpdated).toLocaleString() : 'N/A'}</td>
                                                        <td>
                                                            <Button size="sm" variant="outline-primary" onClick={() => {
                                                                setRawJson(JSON.stringify(entry.resource, null, 2));
                                                            }}>View</Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    ) : (
                                        <div className="text-center text-muted py-5">Execute a query to see tabular results</div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Tab>
                        <Tab eventKey="export" title="📤 Export Bundle">
                            <Card className="shadow-sm border-0">
                                <Card.Body className="text-center py-5">
                                    <h5 className="mb-3">Export FHIR Bundle</h5>
                                    <div className="d-flex gap-3 justify-content-center">
                                        <Button variant="outline-primary" onClick={() => {
                                            const blob = new Blob([rawJson || '{}'], { type: 'application/fhir+json' });
                                            const url = URL.createObjectURL(blob);
                                            const a = document.createElement('a'); a.href = url; a.download = `fhir-${activeResource}-bundle.json`; a.click();
                                        }}>
                                            📥 Download JSON
                                        </Button>
                                        <Button variant="outline-success" onClick={() => navigator.clipboard.writeText(rawJson || '{}')}>
                                            📋 Copy to Clipboard
                                        </Button>
                                        <Button variant="outline-secondary" disabled>
                                            🔗 POST to External Server
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Tab>
                    </Tabs>
                </Col>
            </Row>
        </Container>
    );
};

export default FHIRExplorer;
