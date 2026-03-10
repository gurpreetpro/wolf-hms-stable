import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Table, Badge, Spinner, Alert, Button } from 'react-bootstrap';
import { FileText, Clock, User, Download, AlertTriangle, CheckCircle, Shield } from 'lucide-react';
import { useParams } from 'react-router-dom';
import api from '../utils/axiosInstance';

/**
 * PublicReportView - Public lab report access (no login required)
 */
const PublicReportView = () => {
    const { token } = useParams();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchReport();
    }, [token]);

    const fetchReport = async () => {
        try {
            const res = await api.get(`/api/lab/public/report/${token}`);
            setReport(res.data);
            setLoading(false);
        } catch (err) {
            console.error('Report fetch error:', err);
            setError(err.response?.data?.message || 'Report not found or expired');
            setLoading(false);
        }
    };

    const getExpiryStatus = () => {
        if (!report?.expires_at) return null;
        const expires = new Date(report.expires_at);
        const now = new Date();
        const daysLeft = Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
        return daysLeft;
    };

    const getResultFlag = (value, parameter) => {
        // Simple flag logic - can be enhanced with reference ranges
        if (!value) return <Badge bg="secondary">N/A</Badge>;
        return <Badge bg="success">Normal</Badge>;
    };

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" size="lg" />
                <div className="mt-3">Loading Report...</div>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="py-5">
                <Card className="shadow border-0 text-center p-5">
                    <AlertTriangle size={64} className="text-warning mx-auto mb-3" />
                    <h4>Report Not Available</h4>
                    <p className="text-muted">{error}</p>
                    <small>If you believe this is an error, please contact the hospital.</small>
                </Card>
            </Container>
        );
    }

    const daysLeft = getExpiryStatus();
    // Safely parse results
    const results = React.useMemo(() => {
        if (!report?.result_json) return null;
        if (typeof report.result_json === 'object') return report.result_json;
        
        try {
            return JSON.parse(report.result_json);
        } catch (e) {
            console.error('Error parsing report result JSON:', e);
            return null;
        }
    }, [report]);

    return (
        <div className="public-report-view bg-light min-vh-100 py-4">
            <Container>
                {/* Hospital Header */}
                <Card className="shadow-sm border-0 mb-4">
                    <Card.Body className="text-center py-4">
                        {report.hospital_profile?.logo_url && (
                            <img src={report.hospital_profile.logo_url} alt="Hospital Logo" style={{ maxHeight: '60px', marginBottom: '10px' }} />
                        )}
                        <h2 className="text-primary mb-1">🏥 {report.hospital_profile?.name || 'Hospital'}</h2>
                        {report.hospital_profile?.tagline && (
                            <div className="text-muted fst-italic">{report.hospital_profile.tagline}</div>
                        )}
                        {!report.hospital_profile?.tagline && (
                            <div className="text-muted">Healthcare Management System</div>
                        )}
                        <hr />
                        <h4 className="mb-0">Laboratory Report</h4>
                    </Card.Body>
                </Card>

                {/* Verification Status */}
                <Alert variant="success" className="d-flex align-items-center gap-2 mb-4">
                    <Shield className="text-success" size={20} />
                    <div>
                        <strong>Verified Report</strong>
                        <div className="small">Report accessed {report.accessed_count || 1} time(s) •
                            {daysLeft > 0 ? ` Expires in ${daysLeft} days` : ' Expired'}
                        </div>
                    </div>
                </Alert>

                {/* Patient Info */}
                <Card className="shadow-sm border-0 mb-4">
                    <Card.Header className="bg-white fw-bold d-flex align-items-center gap-2">
                        <User size={18} /> Patient Information
                    </Card.Header>
                    <Card.Body>
                        <Row>
                            <Col md={4}>
                                <div className="text-muted small">Name</div>
                                <div className="fw-bold">{report.patient_name}</div>
                            </Col>
                            <Col md={2}>
                                <div className="text-muted small">Age</div>
                                <div className="fw-bold">{report.age} Years</div>
                            </Col>
                            <Col md={2}>
                                <div className="text-muted small">Gender</div>
                                <div className="fw-bold">{report.gender}</div>
                            </Col>
                            <Col md={4}>
                                <div className="text-muted small">Report Date</div>
                                <div className="fw-bold">{new Date(report.result_date).toLocaleDateString('en-IN')}</div>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                {/* Test Info */}
                <Card className="shadow-sm border-0 mb-4">
                    <Card.Header className="bg-white fw-bold d-flex align-items-center gap-2">
                        <FileText size={18} /> Test Details
                    </Card.Header>
                    <Card.Body>
                        <Row>
                            <Col md={6}>
                                <div className="text-muted small">Test Name</div>
                                <div className="fw-bold h5 text-primary">{report.test_name}</div>
                            </Col>
                            <Col md={3}>
                                <div className="text-muted small">Request ID</div>
                                <div className="fw-bold">#{report.lab_request_id}</div>
                            </Col>
                            <Col md={3}>
                                <div className="text-muted small">Status</div>
                                <Badge bg="success" className="fs-6">Completed</Badge>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>

                {/* Results Table */}
                <Card className="shadow-sm border-0 mb-4">
                    <Card.Header className="bg-primary text-white fw-bold">
                        📊 Test Results
                    </Card.Header>
                    <Table hover responsive className="mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th>Parameter</th>
                                <th>Result</th>
                                <th>Unit</th>
                                <th>Flag</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results && Object.entries(results).map(([key, value]) => (
                                <tr key={key}>
                                    <td className="fw-medium text-capitalize">{key.replace(/_/g, ' ')}</td>
                                    <td className="fw-bold">{value}</td>
                                    <td className="text-muted">-</td>
                                    <td>{getResultFlag(value, key)}</td>
                                </tr>
                            ))}
                            {(!results || Object.keys(results).length === 0) && (
                                <tr>
                                    <td colSpan="4" className="text-center text-muted py-4">
                                        No results available
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </Table>
                </Card>

                {/* Footer */}
                <Card className="shadow-sm border-0">
                    <Card.Body className="text-center py-4">
                        <div className="text-muted small mb-3">
                            <Clock size={14} className="me-1" />
                            Report generated on {new Date(report.result_date).toLocaleString('en-IN')}
                        </div>
                        <Button variant="outline-primary" onClick={() => window.print()}>
                            <Download size={16} className="me-1" /> Download PDF
                        </Button>
                        <hr />
                        <div className="small text-muted">
                            This is an electronically generated report. For queries, contact hospital reception.
                            <br />
                            © 2025 WOLF Hospital Management System
                        </div>
                    </Card.Body>
                </Card>
            </Container>

            {/* Print Styles */}
            <style>{`
                @media print {
                    .public-report-view { background: white !important; }
                    .btn { display: none !important; }
                }
            `}</style>
        </div>
    );
};

export default PublicReportView;
