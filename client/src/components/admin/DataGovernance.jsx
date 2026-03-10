import React, { useState } from 'react';
import { Card, Button, Row, Col, Table, Badge, Spinner, Alert, Form } from 'react-bootstrap';
import { ShieldCheck, Search, Users, RefreshCw, Check, X } from 'lucide-react';
import axios from 'axios';

const DataGovernance = () => {
    const [scanResults, setScanResults] = useState(null);
    const [dedupeResults, setDedupeResults] = useState(null);
    const [loading, setLoading] = useState(false);
    // const [activeAction, setActiveAction] = useState(null); // 'SCAN' or 'DEDUPE'

    // SCAN HANDLER
    const runScan = async (type = 'PHONE') => {
        setLoading(true);
        // setActiveAction('SCAN');
        setScanResults(null);
        setDedupeResults(null);
        try {
            const token = localStorage.getItem('token');
            const table = 'patients';
            const column = type === 'PHONE' ? 'phone' : 'address';
            
            const res = await axios.get(`/api/admin/data-steward/scan?table=${table}&column=${column}&type=${type}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setScanResults(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // DEDUPE HANDLER
    const runDedupe = async () => {
        setLoading(true);
        // setActiveAction('DEDUPE');
        setScanResults(null);
        setDedupeResults(null);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/admin/data-steward/dedupe', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDedupeResults(res.data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="border-info shadow-sm">
            <Card.Header className="bg-info text-dark d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                    <ShieldCheck className="me-2" size={20} />
                    <strong>AI Data Steward (Beta)</strong>
                </div>
                <div>
                    <Badge bg="white" text="dark" className="me-2">Early Access</Badge>
                </div>
            </Card.Header>
            <Card.Body>
                <div className="d-flex gap-3 mb-4 flex-wrap">
                    <Button variant="outline-primary" onClick={() => runScan('PHONE')} disabled={loading}>
                        <Search size={16} className="me-1"/> Scan Phone #
                    </Button>
                    <Button variant="outline-primary" onClick={() => runScan('CITY')} disabled={loading}>
                        <Search size={16} className="me-1"/> Scan Addresses
                    </Button>
                    <Button variant="outline-warning" className="text-dark" onClick={runDedupe} disabled={loading}>
                        <Users size={16} className="me-1"/> Find Duplicates
                    </Button>
                    {loading && <Spinner animation="border" size="sm" className="ms-2 mt-2" />}
                </div>

                {/* RESULTS AREA */}
                
                {/* 1. DRIFT RESULTS */}
                {scanResults && (
                    <div>
                        <h6 className="text-muted mb-3">
                            Drift Analysis Results ({scanResults.total_issues} issues found)
                        </h6>
                        {scanResults.total_issues === 0 ? (
                            <Alert variant="success"><Check size={16}/> No data drift detected! Your data is clean.</Alert>
                        ) : (
                            <Table size="sm" striped hover bordered responsive>
                                <thead>
                                    <tr>
                                        <th>Row ID</th>
                                        <th>Current Value</th>
                                        <th>Issue Detected</th>
                                        <th>AI Suggestion</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {scanResults.results.map((r, idx) => (
                                        <tr key={idx}>
                                            <td>{r.id}</td>
                                            <td className="text-danger font-monospace">{r.current_value}</td>
                                            <td><Badge bg="warning" text="dark">{r.issue_type}</Badge></td>
                                            <td className="text-success fw-bold">{r.proposed_fix}</td>
                                            <td>
                                                <Button size="sm" variant="outline-success" className="me-1"><Check size={12}/></Button>
                                                <Button size="sm" variant="outline-secondary"><X size={12}/></Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        )}
                    </div>
                )}

                {/* 2. DEDUPE RESULTS */}
                {dedupeResults && (
                    <div>
                         <h6 className="text-muted mb-3">
                            Duplicate Detection ({dedupeResults.total_clusters} potential clusters)
                        </h6>
                        {dedupeResults.total_clusters === 0 ? (
                            <Alert variant="success"><Check size={16}/> No duplicates found.</Alert>
                        ) : (
                            dedupeResults.results.map((cluster, idx) => (
                                <Card key={idx} className="mb-3 border-warning">
                                    <Card.Header className="bg-warning bg-opacity-10 py-2">
                                        <small className="fw-bold text-dark">Cluster #{idx+1} (Confidence: {cluster.confidence})</small>
                                    </Card.Header>
                                    <Card.Body className="p-0">
                                        <Table size="sm" className="mb-0">
                                            <thead>
                                                <tr>
                                                    <th>ID</th>
                                                    <th>Name</th>
                                                    <th>Phone</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {cluster.patients.map(p => (
                                                    <tr key={p.id}>
                                                        <td>{p.id}</td>
                                                        <td>{p.name}</td>
                                                        <td>{p.phone}</td>
                                                        <td>
                                                            <Button size="sm" variant="link" className="p-0">Merge Here</Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    </Card.Body>
                                </Card>
                            ))
                        )}
                    </div>
                )}

                {!scanResults && !dedupeResults && !loading && (
                    <div className="text-center py-5 text-muted">
                        <RefreshCw size={48} className="mb-3 opacity-25"/>
                        <p>Select a scan to begin analyzing your data quality.</p>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default DataGovernance;
