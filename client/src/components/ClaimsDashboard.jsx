/**
 * ClaimsDashboard Component
 * WOLF HMS - Phase 2 Insurance/TPA Integration
 * Track and manage insurance claims
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, Spinner, Form, Modal, Alert, ProgressBar } from 'react-bootstrap';
import {
    FileText, Clock, CheckCircle, XCircle, AlertTriangle,
    RefreshCw, Filter, TrendingUp, DollarSign, Calendar,
    Eye, Edit, Search
} from 'lucide-react';
import api from '../utils/axiosInstance';

const ClaimsDashboard = () => {
    const [claims, setClaims] = useState([]);
    const [stats, setStats] = useState(null);
    const [denialCodes, setDenialCodes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [claimsRes, statsRes, codesRes] = await Promise.all([
                api.get('/api/insurance/claims/pending'),
                api.get('/api/insurance/claims/stats'),
                api.get('/api/insurance/denial-codes')
            ]);
            setClaims(claimsRes.data.claims || []);
            setStats(statsRes.data);
            setDenialCodes(codesRes.data.codes || []);
        } catch (error) {
            console.error('Fetch claims error:', error);
        }
        setLoading(false);
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            'submitted': { bg: 'primary', icon: Clock },
            'under_review': { bg: 'info', icon: Eye },
            'approved': { bg: 'success', icon: CheckCircle },
            'rejected': { bg: 'danger', icon: XCircle },
            'query': { bg: 'warning', icon: AlertTriangle },
            'settled': { bg: 'success', icon: DollarSign },
            'draft': { bg: 'secondary', icon: Edit }
        };
        const config = statusMap[status] || statusMap.draft;
        const Icon = config.icon;
        return (
            <Badge bg={config.bg}>
                <Icon size={12} className="me-1" />
                {status?.replace('_', ' ').toUpperCase()}
            </Badge>
        );
    };

    const filteredClaims = claims.filter(claim => {
        if (filter !== 'all' && claim.status !== filter) return false;
        if (searchTerm) {
            const search = searchTerm.toLowerCase();
            return claim.claim_number?.toLowerCase().includes(search) ||
                claim.patient_name?.toLowerCase().includes(search) ||
                claim.provider_name?.toLowerCase().includes(search);
        }
        return true;
    });

    const handleViewClaim = async (claimNumber) => {
        try {
            const res = await api.get(`/api/insurance/claims/${claimNumber}`);
            setSelectedClaim(res.data);
            setShowClaimModal(true);
        } catch (error) {
            console.error('View claim error:', error);
        }
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2">Loading claims...</p>
            </div>
        );
    }

    return (
        <div className="claims-dashboard">
            {/* Stats Cards */}
            {stats && (
                <Row className="mb-4">
                    <Col md={3}>
                        <Card className="border-0 shadow-sm">
                            <Card.Body className="text-center">
                                <FileText size={32} className="text-primary mb-2" />
                                <h3 className="mb-0">{stats.total_claims || 0}</h3>
                                <small className="text-muted">Total Claims (90d)</small>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="border-0 shadow-sm">
                            <Card.Body className="text-center">
                                <DollarSign size={32} className="text-success mb-2" />
                                <h3 className="mb-0">₹{parseFloat(stats.total_settled || 0).toLocaleString()}</h3>
                                <small className="text-muted">Total Settled</small>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="border-0 shadow-sm">
                            <Card.Body className="text-center">
                                <Clock size={32} className="text-warning mb-2" />
                                <h3 className="mb-0">{stats.pending_claims || 0}</h3>
                                <small className="text-muted">Pending Claims</small>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="border-0 shadow-sm">
                            <Card.Body className="text-center">
                                <Calendar size={32} className="text-info mb-2" />
                                <h3 className="mb-0">{Math.round(stats.avg_settlement_days || 0)} days</h3>
                                <small className="text-muted">Avg Settlement Time</small>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Claims Performance */}
            {stats && (
                <Card className="mb-4 border-0 shadow-sm">
                    <Card.Body>
                        <h6 className="mb-3">Claims Performance</h6>
                        <Row className="align-items-center">
                            <Col md={8}>
                                <div className="d-flex mb-2">
                                    <span style={{ width: 100 }}>Settled</span>
                                    <ProgressBar
                                        now={(stats.settled_claims / (stats.total_claims || 1)) * 100}
                                        variant="success"
                                        className="flex-grow-1"
                                        label={`${stats.settled_claims || 0}`}
                                    />
                                </div>
                                <div className="d-flex mb-2">
                                    <span style={{ width: 100 }}>Pending</span>
                                    <ProgressBar
                                        now={(stats.pending_claims / (stats.total_claims || 1)) * 100}
                                        variant="warning"
                                        className="flex-grow-1"
                                        label={`${stats.pending_claims || 0}`}
                                    />
                                </div>
                                <div className="d-flex">
                                    <span style={{ width: 100 }}>Rejected</span>
                                    <ProgressBar
                                        now={(stats.rejected_claims / (stats.total_claims || 1)) * 100}
                                        variant="danger"
                                        className="flex-grow-1"
                                        label={`${stats.rejected_claims || 0}`}
                                    />
                                </div>
                            </Col>
                            <Col md={4} className="text-center">
                                <h4 className="text-success mb-0">
                                    {stats.total_claims > 0
                                        ? Math.round((stats.settled_claims / stats.total_claims) * 100)
                                        : 0}%
                                </h4>
                                <small className="text-muted">Settlement Rate</small>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
            )}

            {/* Claims Table */}
            <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white border-0 d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">
                        <FileText size={20} className="me-2" />
                        Insurance Claims
                    </h5>
                    <div className="d-flex gap-2">
                        <div className="input-group" style={{ width: 250 }}>
                            <span className="input-group-text">
                                <Search size={16} />
                            </span>
                            <Form.Control
                                placeholder="Search claims..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Form.Select
                            style={{ width: 150 }}
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="submitted">Submitted</option>
                            <option value="under_review">Under Review</option>
                            <option value="query">Query</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="settled">Settled</option>
                        </Form.Select>
                        <Button variant="outline-primary" size="sm" onClick={fetchData}>
                            <RefreshCw size={16} />
                        </Button>
                    </div>
                </Card.Header>
                <Card.Body className="p-0">
                    <Table hover responsive className="mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th>Claim #</th>
                                <th>Patient</th>
                                <th>TPA</th>
                                <th>Claimed</th>
                                <th>Approved</th>
                                <th>Status</th>
                                <th>Submitted</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClaims.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="text-center text-muted py-4">
                                        No claims found
                                    </td>
                                </tr>
                            ) : (
                                filteredClaims.map(claim => (
                                    <tr key={claim.id}>
                                        <td>
                                            <code className="text-primary">{claim.claim_number}</code>
                                        </td>
                                        <td>{claim.patient_name || 'N/A'}</td>
                                        <td>{claim.provider_name || 'N/A'}</td>
                                        <td>₹{parseFloat(claim.claimed_amount || 0).toLocaleString()}</td>
                                        <td className="text-success">
                                            {claim.approved_amount
                                                ? `₹${parseFloat(claim.approved_amount).toLocaleString()}`
                                                : '-'}
                                        </td>
                                        <td>{getStatusBadge(claim.status)}</td>
                                        <td>
                                            <small>
                                                {claim.submitted_at
                                                    ? new Date(claim.submitted_at).toLocaleDateString()
                                                    : '-'}
                                            </small>
                                        </td>
                                        <td>
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                onClick={() => handleViewClaim(claim.claim_number)}
                                            >
                                                <Eye size={14} />
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* Denial Codes Reference */}
            <Card className="mt-4 border-0 shadow-sm">
                <Card.Header className="bg-white border-0">
                    <h6 className="mb-0">
                        <AlertTriangle size={18} className="me-2 text-warning" />
                        Common Denial Codes
                    </h6>
                </Card.Header>
                <Card.Body>
                    <Row>
                        {denialCodes.slice(0, 6).map(code => (
                            <Col md={4} key={code.id} className="mb-2">
                                <div className="d-flex align-items-start">
                                    <Badge bg={code.severity === 'high' ? 'danger' : 'warning'} className="me-2">
                                        {code.code}
                                    </Badge>
                                    <div>
                                        <small className="d-block">{code.description}</small>
                                        <small className="text-muted">{code.prevention_tip}</small>
                                    </div>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </Card.Body>
            </Card>

            {/* Claim Detail Modal */}
            <Modal show={showClaimModal} onHide={() => setShowClaimModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        Claim Details - {selectedClaim?.claim_number}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedClaim && (
                        <Row>
                            <Col md={6}>
                                <p><strong>Status:</strong> {getStatusBadge(selectedClaim.status)}</p>
                                <p><strong>Type:</strong> {selectedClaim.claim_type}</p>
                                <p><strong>Policy:</strong> {selectedClaim.policy_number}</p>
                                <p><strong>Provider:</strong> {selectedClaim.provider_name}</p>
                            </Col>
                            <Col md={6}>
                                <p><strong>Claimed Amount:</strong> ₹{parseFloat(selectedClaim.claimed_amount || 0).toLocaleString()}</p>
                                <p><strong>Approved Amount:</strong> ₹{parseFloat(selectedClaim.approved_amount || 0).toLocaleString()}</p>
                                <p><strong>Patient Liability:</strong> ₹{parseFloat(selectedClaim.patient_liability || 0).toLocaleString()}</p>
                                {selectedClaim.settlement_amount && (
                                    <p><strong>Settlement:</strong> ₹{parseFloat(selectedClaim.settlement_amount).toLocaleString()}</p>
                                )}
                            </Col>
                            {selectedClaim.rejection_reason && (
                                <Col md={12}>
                                    <Alert variant="danger">
                                        <strong>Rejection:</strong> {selectedClaim.rejection_code} - {selectedClaim.rejection_reason}
                                    </Alert>
                                </Col>
                            )}
                        </Row>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowClaimModal(false)}>
                        Close
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ClaimsDashboard;
