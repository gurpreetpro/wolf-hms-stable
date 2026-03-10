/**
 * BillingOptimizer Component
 * WOLF HMS - Phase 4 AI Billing Engine
 * AI-powered billing optimization with denial prediction
 */

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Spinner, Badge, ProgressBar, Table, Alert, ListGroup, Accordion } from 'react-bootstrap';
import {
    TrendingUp, AlertTriangle, Check, DollarSign, Shield,
    Brain, Lightbulb, ChevronRight, RefreshCw, Target
} from 'lucide-react';
import api from '../utils/axiosInstance';

const BillingOptimizer = ({ invoiceData, claimData, onOptimized }) => {
    const [loading, setLoading] = useState(false);
    const [denialPrediction, setDenialPrediction] = useState(null);
    const [approvalEstimate, setApprovalEstimate] = useState(null);
    const [pricingOptimization, setPricingOptimization] = useState(null);
    const [anomalies, setAnomalies] = useState(null);

    const runFullAnalysis = async () => {
        setLoading(true);

        try {
            // Run all AI analyses in parallel
            const [denialRes, approvalRes, pricingRes, anomalyRes] = await Promise.all([
                claimData ? api.post('/ai-billing/predict-denial', claimData) : Promise.resolve({ data: null }),
                claimData ? api.post('/ai-billing/estimate-approval', claimData) : Promise.resolve({ data: null }),
                invoiceData?.items ? api.post('/ai-billing/optimize-pricing', {
                    lineItems: invoiceData.items,
                    tpaInfo: claimData?.tpaInfo
                }) : Promise.resolve({ data: null }),
                invoiceData ? api.post('/ai-billing/detect-anomalies', invoiceData) : Promise.resolve({ data: null })
            ]);

            setDenialPrediction(denialRes.data);
            setApprovalEstimate(approvalRes.data);
            setPricingOptimization(pricingRes.data);
            setAnomalies(anomalyRes.data);

            onOptimized && onOptimized({
                denial: denialRes.data,
                approval: approvalRes.data,
                pricing: pricingRes.data,
                anomalies: anomalyRes.data
            });

        } catch (error) {
            console.error('Billing optimization error:', error);
        }
        setLoading(false);
    };

    const getRiskColor = (level) => {
        switch (level) {
            case 'critical': return 'danger';
            case 'high': return 'danger';
            case 'medium': return 'warning';
            case 'low': return 'success';
            default: return 'secondary';
        }
    };

    const getRiskIcon = (level) => {
        switch (level) {
            case 'critical': return '🚨';
            case 'high': return '⚠️';
            case 'medium': return '⚡';
            case 'low': return '✅';
            default: return '❓';
        }
    };

    return (
        <Card className="billing-optimizer border-0 shadow-sm">
            <Card.Header className="bg-dark text-white d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center">
                    <Brain size={20} className="me-2" />
                    <span>AI Billing Optimizer</span>
                </div>
                <Button
                    variant="light"
                    size="sm"
                    onClick={runFullAnalysis}
                    disabled={loading}
                >
                    {loading ? (
                        <><Spinner size="sm" className="me-1" /> Analyzing...</>
                    ) : (
                        <><RefreshCw size={14} className="me-1" /> Analyze</>
                    )}
                </Button>
            </Card.Header>

            <Card.Body>
                {!denialPrediction && !loading && (
                    <div className="text-center py-4 text-muted">
                        <Brain size={40} className="mb-3 opacity-50" />
                        <p>Click "Analyze" to run AI-powered billing optimization</p>
                        <small>Includes denial prediction, approval estimation, and pricing optimization</small>
                    </div>
                )}

                {loading && (
                    <div className="text-center py-4">
                        <Spinner animation="border" variant="primary" />
                        <p className="mt-2 text-muted">Running AI analysis...</p>
                        <ProgressBar animated now={100} className="mt-3" />
                    </div>
                )}

                {denialPrediction && !loading && (
                    <Accordion defaultActiveKey="0" flush>
                        {/* Denial Risk */}
                        <Accordion.Item eventKey="0">
                            <Accordion.Header>
                                <div className="d-flex align-items-center w-100">
                                    <span className="me-2">{getRiskIcon(denialPrediction.riskLevel)}</span>
                                    <span className="fw-bold">Denial Risk Assessment</span>
                                    <Badge
                                        bg={getRiskColor(denialPrediction.riskLevel)}
                                        className="ms-auto me-3"
                                    >
                                        {denialPrediction.riskScore}% Risk
                                    </Badge>
                                </div>
                            </Accordion.Header>
                            <Accordion.Body>
                                <Row className="mb-3">
                                    <Col md={4} className="text-center">
                                        <div
                                            className={`display-4 fw-bold text-${getRiskColor(denialPrediction.riskLevel)}`}
                                        >
                                            {denialPrediction.riskScore}%
                                        </div>
                                        <Badge bg={getRiskColor(denialPrediction.riskLevel)}>
                                            {denialPrediction.riskLevel?.toUpperCase()} RISK
                                        </Badge>
                                        <div className="mt-2 small text-muted">
                                            Confidence: {(denialPrediction.confidence * 100).toFixed(0)}%
                                        </div>
                                    </Col>
                                    <Col md={8}>
                                        <ProgressBar
                                            now={denialPrediction.riskScore}
                                            variant={getRiskColor(denialPrediction.riskLevel)}
                                            style={{ height: '12px' }}
                                            className="mb-3"
                                        />

                                        {/* Risk Factors */}
                                        {denialPrediction.riskFactors?.length > 0 && (
                                            <>
                                                <small className="text-muted">Risk Factors:</small>
                                                <ListGroup variant="flush" className="mt-1">
                                                    {denialPrediction.riskFactors.map((factor, i) => (
                                                        <ListGroup.Item key={i} className="py-1 px-0 border-0">
                                                            <Badge
                                                                bg={factor.impact === 'high' ? 'danger' : 'warning'}
                                                                className="me-2"
                                                            >
                                                                {factor.code}
                                                            </Badge>
                                                            <span className="small">{factor.factor}</span>
                                                            {factor.details && (
                                                                <span className="text-muted small ms-1">({factor.details})</span>
                                                            )}
                                                        </ListGroup.Item>
                                                    ))}
                                                </ListGroup>
                                            </>
                                        )}
                                    </Col>
                                </Row>

                                {/* Recommendations */}
                                {denialPrediction.recommendations?.length > 0 && (
                                    <Alert variant="info" className="mt-3 mb-0">
                                        <div className="d-flex align-items-center mb-2">
                                            <Lightbulb size={16} className="me-2" />
                                            <strong>Recommendations</strong>
                                        </div>
                                        <ul className="mb-0 small">
                                            {denialPrediction.recommendations.map((rec, i) => (
                                                <li key={i}>{rec}</li>
                                            ))}
                                        </ul>
                                    </Alert>
                                )}
                            </Accordion.Body>
                        </Accordion.Item>

                        {/* Approval Estimate */}
                        {approvalEstimate && (
                            <Accordion.Item eventKey="1">
                                <Accordion.Header>
                                    <div className="d-flex align-items-center w-100">
                                        <DollarSign size={18} className="me-2 text-success" />
                                        <span className="fw-bold">Approval Estimate</span>
                                        <span className="ms-auto me-3 text-success fw-bold">
                                            ₹{approvalEstimate.estimatedApproval?.toLocaleString()}
                                        </span>
                                    </div>
                                </Accordion.Header>
                                <Accordion.Body>
                                    <Row>
                                        <Col md={6}>
                                            <ListGroup variant="flush">
                                                <ListGroup.Item className="d-flex justify-content-between border-0 py-1">
                                                    <span className="text-muted">Claimed Amount</span>
                                                    <strong>₹{approvalEstimate.claimedAmount?.toLocaleString()}</strong>
                                                </ListGroup.Item>
                                                <ListGroup.Item className="d-flex justify-content-between border-0 py-1">
                                                    <span className="text-muted">Estimated Approval</span>
                                                    <strong className="text-success">
                                                        ₹{approvalEstimate.estimatedApproval?.toLocaleString()}
                                                    </strong>
                                                </ListGroup.Item>
                                                <ListGroup.Item className="d-flex justify-content-between border-0 py-1">
                                                    <span className="text-muted">Patient Liability</span>
                                                    <strong className="text-danger">
                                                        ₹{approvalEstimate.patientLiability?.toLocaleString()}
                                                    </strong>
                                                </ListGroup.Item>
                                            </ListGroup>
                                        </Col>
                                        <Col md={6}>
                                            <div className="bg-light rounded p-3 text-center">
                                                <Target size={24} className="text-primary mb-2" />
                                                <div className="h4 mb-0 text-primary">
                                                    {((approvalEstimate.estimatedApproval / approvalEstimate.claimedAmount) * 100).toFixed(0)}%
                                                </div>
                                                <small className="text-muted">Expected Approval Rate</small>
                                            </div>
                                        </Col>
                                    </Row>

                                    {approvalEstimate.deductions?.length > 0 && (
                                        <div className="mt-3">
                                            <small className="text-muted">Expected Deductions:</small>
                                            <ul className="small mb-0 mt-1">
                                                {approvalEstimate.deductions.map((d, i) => (
                                                    <li key={i}>
                                                        {d.type.replace(/_/g, ' ')}: ₹{d.amount?.toLocaleString()}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </Accordion.Body>
                            </Accordion.Item>
                        )}

                        {/* Pricing Optimization */}
                        {pricingOptimization && (
                            <Accordion.Item eventKey="2">
                                <Accordion.Header>
                                    <div className="d-flex align-items-center w-100">
                                        <TrendingUp size={18} className="me-2 text-info" />
                                        <span className="fw-bold">Pricing Optimization</span>
                                        {pricingOptimization.summary?.totalSavings > 0 && (
                                            <Badge bg="success" className="ms-auto me-3">
                                                Save ₹{pricingOptimization.summary.totalSavings.toLocaleString()}
                                            </Badge>
                                        )}
                                    </div>
                                </Accordion.Header>
                                <Accordion.Body>
                                    <Row className="mb-3">
                                        <Col md={3} className="text-center">
                                            <div className="h5 mb-0">
                                                {pricingOptimization.summary?.totalItems}
                                            </div>
                                            <small className="text-muted">Total Items</small>
                                        </Col>
                                        <Col md={3} className="text-center">
                                            <div className="h5 mb-0 text-info">
                                                {pricingOptimization.summary?.itemsOptimized}
                                            </div>
                                            <small className="text-muted">Optimized</small>
                                        </Col>
                                        <Col md={3} className="text-center">
                                            <div className="h5 mb-0">
                                                ₹{pricingOptimization.summary?.totalOriginal?.toLocaleString()}
                                            </div>
                                            <small className="text-muted">Original</small>
                                        </Col>
                                        <Col md={3} className="text-center">
                                            <div className="h5 mb-0 text-success">
                                                ₹{pricingOptimization.summary?.totalOptimized?.toLocaleString()}
                                            </div>
                                            <small className="text-muted">Optimized</small>
                                        </Col>
                                    </Row>

                                    {pricingOptimization.summary?.totalSavings > 0 && (
                                        <Alert variant="success" className="mb-0">
                                            <DollarSign size={16} className="me-2" />
                                            Potential savings: <strong>₹{pricingOptimization.summary.totalSavings.toLocaleString()}</strong>
                                            {' '}({pricingOptimization.summary.optimizationRate} of items)
                                        </Alert>
                                    )}
                                </Accordion.Body>
                            </Accordion.Item>
                        )}

                        {/* Anomalies */}
                        {anomalies?.hasAnomalies && (
                            <Accordion.Item eventKey="3">
                                <Accordion.Header>
                                    <div className="d-flex align-items-center w-100">
                                        <AlertTriangle size={18} className="me-2 text-warning" />
                                        <span className="fw-bold">Anomalies Detected</span>
                                        <Badge bg="warning" className="ms-auto me-3">
                                            {anomalies.anomalies?.length} issues
                                        </Badge>
                                    </div>
                                </Accordion.Header>
                                <Accordion.Body>
                                    <ListGroup variant="flush">
                                        {anomalies.anomalies?.map((anomaly, i) => (
                                            <ListGroup.Item key={i} className="py-2 border-0">
                                                <Badge
                                                    bg={anomaly.severity === 'high' ? 'danger' : 'warning'}
                                                    className="me-2"
                                                >
                                                    {anomaly.severity?.toUpperCase()}
                                                </Badge>
                                                {anomaly.message}
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                </Accordion.Body>
                            </Accordion.Item>
                        )}
                    </Accordion>
                )}
            </Card.Body>
        </Card>
    );
};

export default BillingOptimizer;
