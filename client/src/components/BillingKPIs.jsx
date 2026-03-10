import React, { useState, useEffect } from 'react';
import { Card, Row, Col, ProgressBar, Spinner, Badge } from 'react-bootstrap';
import { Clock, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import api from '../utils/axiosInstance';
import { formatCurrency } from '../utils/currency';

/**
 * AR Aging Chart Component
 * Displays Accounts Receivable aging in 30/60/90+ day buckets
 */
export const ARAgingChart = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await api.get('/api/finance/ar-aging');
            if (res.data?.success) {
                setData(res.data);
            } else {
                setData(null);
            }
        } catch (error) {
            console.error('Error loading AR aging:', error);
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className="border-0 shadow-sm">
                <Card.Body className="d-flex justify-content-center py-4">
                    <Spinner animation="border" size="sm" />
                </Card.Body>
            </Card>
        );
    }

    const totalAmount = data?.totals?.amount || 1;

    return (
        <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 d-flex justify-content-between align-items-center">
                <h6 className="fw-bold mb-0">
                    <Clock size={16} className="me-2 text-primary" />
                    AR Aging Report
                </h6>
                <Badge bg="primary">{data?.totals?.count || 0} Invoices</Badge>
            </Card.Header>
            <Card.Body>
                {data?.buckets?.map((bucket, idx) => {
                    const percentage = Math.round((bucket.amount / totalAmount) * 100);
                    return (
                        <div key={idx} className="mb-3">
                            <div className="d-flex justify-content-between mb-1">
                                <span className="small fw-medium">{bucket.label}</span>
                                <span className="small">
                                    <strong>{formatCurrency(bucket.amount)}</strong>
                                    <span className="text-muted ms-2">({bucket.count})</span>
                                </span>
                            </div>
                            <ProgressBar
                                now={percentage}
                                style={{ height: '12px' }}
                                variant={
                                    idx === 0 ? 'success' :
                                        idx === 1 ? 'warning' :
                                            idx === 2 ? 'orange' : 'danger'
                                }
                                className="rounded-pill"
                            />
                        </div>
                    );
                })}
                <hr />
                <div className="d-flex justify-content-between">
                    <span className="fw-bold">Total Outstanding</span>
                    <span className="fw-bold text-danger fs-5">
                        {formatCurrency(data?.totals?.amount)}
                    </span>
                </div>
            </Card.Body>
        </Card>
    );
};

/**
 * Billing KPIs Component
 * Displays Clean Claims Ratio, Collection Rate, etc.
 */
export const BillingKPIs = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await api.get('/api/finance/kpis');
            if (res.data?.success) {
                setData(res.data);
            } else {
                setData(null);
            }
        } catch (error) {
            console.error('Error loading KPIs:', error);
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className="border-0 shadow-sm">
                <Card.Body className="d-flex justify-content-center py-4">
                    <Spinner animation="border" size="sm" />
                </Card.Body>
            </Card>
        );
    }

    const getStatusIcon = (status) => {
        switch (status) {
            case 'good': return <CheckCircle size={16} className="text-success" />;
            case 'warning': return <AlertTriangle size={16} className="text-warning" />;
            case 'critical': return <XCircle size={16} className="text-danger" />;
            default: return null;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'good': return 'success';
            case 'warning': return 'warning';
            case 'critical': return 'danger';
            default: return 'secondary';
        }
    };

    const getTrendIcon = (trend) => {
        if (trend?.startsWith('+')) {
            return <TrendingUp size={14} className="text-success me-1" />;
        } else if (trend?.startsWith('-')) {
            // For "days in AR", negative is good
            return <TrendingDown size={14} className="text-success me-1" />;
        }
        return null;
    };

    return (
        <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0">
                <h6 className="fw-bold mb-0">
                    <TrendingUp size={16} className="me-2 text-success" />
                    Key Performance Indicators
                </h6>
            </Card.Header>
            <Card.Body className="pt-0">
                <Row className="g-3">
                    {data?.kpis?.map((kpi) => (
                        <Col xs={6} key={kpi.id}>
                            <div className={`p-3 rounded bg-${getStatusColor(kpi.status)}-subtle`}>
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <small className="text-muted">{kpi.label}</small>
                                    {getStatusIcon(kpi.status)}
                                </div>
                                <div className="d-flex align-items-baseline gap-1">
                                    <span className={`fs-4 fw-bold text-${getStatusColor(kpi.status)}`}>
                                        {kpi.value}
                                    </span>
                                    <span className="text-muted small">{kpi.unit}</span>
                                </div>
                                <div className="d-flex align-items-center mt-1">
                                    {getTrendIcon(kpi.trend)}
                                    <small className="text-muted">{kpi.trend}</small>
                                </div>
                            </div>
                        </Col>
                    ))}
                </Row>
            </Card.Body>
        </Card>
    );
};

/**
 * Denial Stats Component
 * Shows claim denial statistics and categories
 */
export const DenialStats = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const res = await api.get('/api/finance/denials');
            if (res.data?.success) {
                setData(res.data);
            } else {
                setData(null);
            }
        } catch (error) {
            console.error('Error loading denial stats:', error);
            setData(null);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className="border-0 shadow-sm">
                <Card.Body className="d-flex justify-content-center py-4">
                    <Spinner animation="border" size="sm" />
                </Card.Body>
            </Card>
        );
    }

    return (
        <Card className="border-0 shadow-sm h-100">
            <Card.Header className="bg-white border-0 d-flex justify-content-between align-items-center">
                <h6 className="fw-bold mb-0">
                    <XCircle size={16} className="me-2 text-danger" />
                    Claim Denials
                </h6>
                <Badge bg="danger">{data?.summary?.denial_rate}% Rate</Badge>
            </Card.Header>
            <Card.Body>
                <Row className="mb-3 text-center">
                    <Col>
                        <div className="fs-4 fw-bold text-danger">{data?.summary?.total_denials}</div>
                        <small className="text-muted">Total</small>
                    </Col>
                    <Col>
                        <div className="fs-4 fw-bold text-warning">{data?.summary?.pending_appeals}</div>
                        <small className="text-muted">Appealing</small>
                    </Col>
                    <Col>
                        <div className="fs-4 fw-bold text-success">{data?.summary?.resolved}</div>
                        <small className="text-muted">Resolved</small>
                    </Col>
                </Row>
                <hr />
                <h6 className="small fw-bold text-muted mb-2">By Category</h6>
                {data?.by_category?.map((cat, idx) => (
                    <div key={idx} className="d-flex justify-content-between align-items-center mb-2">
                        <span className="small">{cat.category}</span>
                        <div className="d-flex align-items-center gap-2">
                            <ProgressBar
                                now={cat.percentage}
                                style={{ width: '80px', height: '8px' }}
                                variant="danger"
                                className="rounded-pill"
                            />
                            <span className="small text-muted" style={{ width: '35px' }}>
                                {cat.percentage}%
                            </span>
                        </div>
                    </div>
                ))}
            </Card.Body>
        </Card>
    );
};

export default { ARAgingChart, BillingKPIs, DenialStats };
