/**
 * AI Clinical Summary Component
 * [TITAN] Phase 3 Frontend - Clinical Co-Pilot
 * 
 * Displays AI-generated patient summary with insights from
 * labs, vitals, and medications using Gemini 2.0 Flash
 */

import React, { useState, useEffect } from 'react';
import { Card, Badge, Alert, Spinner, Button, ListGroup, Row, Col } from 'react-bootstrap';
import { 
  Sparkles, 
  Brain, 
  AlertTriangle, 
  Activity, 
  Pill, 
  FlaskConical,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Copy,
  CheckCircle,
  XCircle
} from 'lucide-react';
import aiService from '../../services/aiService';

const AIClinicalSummary = ({ patientId, admissionId, show = true }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (patientId && show) {
      fetchSummary();
    }
  }, [patientId, show]);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiService.getPatientSummary(patientId);
      if (response.success && response.data) {
        setSummary(response.data);
      } else if (response.error) {
        setError(response.error);
      } else {
        setSummary(response);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch AI summary');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (!summary?.aiSummary) return;
    const text = `
AI Clinical Summary
${summary.aiSummary.summary || ''}

Key Findings:
${(summary.aiSummary.findings || []).map(f => `• ${f}`).join('\n')}

Risks:
${(summary.aiSummary.risks || []).map(r => `• [${r.priority}] ${r.description || r}`).join('\n')}

Follow-ups:
${(summary.aiSummary.followups || []).map(f => `• ${f}`).join('\n')}
    `.trim();
    
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getRiskBadge = (priority) => {
    const colors = {
      High: 'danger',
      Medium: 'warning',
      Low: 'success'
    };
    return colors[priority] || 'secondary';
  };

  if (!show) return null;

  return (
    <Card className="mb-3 ai-summary-card" style={{ 
      borderLeft: '4px solid #8b5cf6',
      boxShadow: '0 2px 8px rgba(139, 92, 246, 0.1)'
    }}>
      <Card.Header 
        className="d-flex justify-content-between align-items-center"
        style={{ 
          background: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
          cursor: 'pointer'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="d-flex align-items-center gap-2">
          <Sparkles size={20} color="#8b5cf6" />
          <span className="fw-semibold" style={{ color: '#6d28d9' }}>
            AI Clinical Insights
          </span>
          <Badge bg="light" text="dark" className="ms-2" style={{ fontSize: '0.7rem' }}>
            Powered by Gemini
          </Badge>
        </div>
        <div className="d-flex align-items-center gap-2">
          {summary && (
            <Badge bg="info" pill>
              {summary.dataPoints?.labsCount || 0} labs, {summary.dataPoints?.vitalsCount || 0} vitals
            </Badge>
          )}
          <Button 
            variant="link" 
            size="sm" 
            onClick={(e) => { e.stopPropagation(); fetchSummary(); }}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : ''} />
          </Button>
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </Card.Header>

      {expanded && (
        <Card.Body>
          {/* Loading State */}
          {loading && (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" size="sm" />
              <p className="mt-2 text-muted mb-0">Analyzing patient data...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <Alert variant="warning" className="d-flex align-items-center gap-2 mb-0">
              <AlertTriangle size={18} />
              <div>
                <strong>AI Unavailable:</strong> {error}
                <Button variant="link" size="sm" onClick={fetchSummary}>Retry</Button>
              </div>
            </Alert>
          )}

          {/* Summary Content */}
          {summary && !loading && !error && (
            <>
              {/* One-Paragraph Summary */}
              {summary.aiSummary?.summary && (
                <div className="mb-3 p-3" style={{ 
                  background: '#fafafa', 
                  borderRadius: '8px',
                  borderLeft: '3px solid #8b5cf6'
                }}>
                  <div className="d-flex justify-content-between align-items-start">
                    <Brain size={18} color="#6d28d9" className="mt-1" />
                    <p className="mb-0 flex-grow-1 mx-2" style={{ lineHeight: '1.6' }}>
                      {summary.aiSummary.summary}
                    </p>
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={copyToClipboard}
                      title="Copy to clipboard"
                    >
                      {copied ? <CheckCircle size={14} color="green" /> : <Copy size={14} />}
                    </Button>
                  </div>
                </div>
              )}

              <Row>
                {/* Key Findings */}
                <Col md={6}>
                  <h6 className="d-flex align-items-center gap-2 mb-2">
                    <FlaskConical size={16} color="#0ea5e9" />
                    Key Findings
                  </h6>
                  {summary.aiSummary?.findings?.length > 0 ? (
                    <ListGroup variant="flush" className="small">
                      {summary.aiSummary.findings.map((finding, idx) => (
                        <ListGroup.Item key={idx} className="py-2 px-0 border-0">
                          <span className="text-primary">•</span> {finding}
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  ) : (
                    <p className="text-muted small mb-0">No significant findings</p>
                  )}
                </Col>

                {/* Risks */}
                <Col md={6}>
                  <h6 className="d-flex align-items-center gap-2 mb-2">
                    <AlertTriangle size={16} color="#f59e0b" />
                    Risk Assessment
                  </h6>
                  {summary.aiSummary?.risks?.length > 0 ? (
                    <ListGroup variant="flush" className="small">
                      {summary.aiSummary.risks.map((risk, idx) => (
                        <ListGroup.Item key={idx} className="py-2 px-0 border-0 d-flex align-items-start gap-2">
                          <Badge bg={getRiskBadge(risk.priority)} className="mt-1">
                            {risk.priority || 'Medium'}
                          </Badge>
                          <span>{risk.description || risk}</span>
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  ) : (
                    <p className="text-muted small mb-0">No identified risks</p>
                  )}
                </Col>
              </Row>

              {/* Follow-ups */}
              {summary.aiSummary?.followups?.length > 0 && (
                <div className="mt-3 pt-3" style={{ borderTop: '1px solid #e5e7eb' }}>
                  <h6 className="d-flex align-items-center gap-2 mb-2">
                    <Activity size={16} color="#22c55e" />
                    Suggested Follow-ups
                  </h6>
                  <div className="d-flex flex-wrap gap-2">
                    {summary.aiSummary.followups.map((followup, idx) => (
                      <Badge 
                        key={idx} 
                        bg="light" 
                        text="dark" 
                        className="px-2 py-1"
                        style={{ fontWeight: 'normal' }}
                      >
                        {followup}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="mt-3 text-end">
                <small className="text-muted">
                  Generated: {summary.generatedAt ? new Date(summary.generatedAt).toLocaleString() : 'Just now'}
                </small>
              </div>
            </>
          )}

          {/* No Data State */}
          {!summary && !loading && !error && (
            <div className="text-center py-4 text-muted">
              <Brain size={32} className="mb-2" />
              <p className="mb-0">Click refresh to generate AI insights</p>
            </div>
          )}
        </Card.Body>
      )}

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Card>
  );
};

export default AIClinicalSummary;
