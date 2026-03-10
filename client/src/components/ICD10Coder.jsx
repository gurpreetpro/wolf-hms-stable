/**
 * ICD10Coder Component
 * WOLF HMS - Phase 4 AI Billing Engine
 * AI-powered ICD-10 code suggestion and validation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Form, Button, Badge, Spinner, ListGroup, Row, Col, Alert } from 'react-bootstrap';
import { Brain, Search, Check, X, Code, Lightbulb, Plus, Trash2 } from 'lucide-react';
import api from '../utils/axiosInstance';

const ICD10Coder = ({ onCodesSelected, initialCodes = [] }) => {
    const [diagnosisText, setDiagnosisText] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [selectedCodes, setSelectedCodes] = useState(initialCodes);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [manualCode, setManualCode] = useState('');
    const [validatingManual, setValidatingManual] = useState(false);

    // Debounce search
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    };

    const fetchSuggestions = useCallback(
        debounce(async (text) => {
            if (text.length < 3) {
                setSuggestions([]);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const res = await api.post('/api/ai-billing/icd10/suggest', { diagnosis_text: text });
                setSuggestions(res.data.suggestions || []);
            } catch (err) {
                setError('Failed to get suggestions');
                console.error('ICD-10 suggestion error:', err);
            }
            setLoading(false);
        }, 500),
        []
    );

    useEffect(() => {
        if (diagnosisText) {
            fetchSuggestions(diagnosisText);
        }
    }, [diagnosisText]);

    useEffect(() => {
        onCodesSelected && onCodesSelected(selectedCodes);
    }, [selectedCodes, onCodesSelected]);

    const addCode = (code) => {
        if (!selectedCodes.find(c => c.code === code.code)) {
            setSelectedCodes([...selectedCodes, code]);
        }
    };

    const removeCode = (codeToRemove) => {
        setSelectedCodes(selectedCodes.filter(c => c.code !== codeToRemove));
    };

    const validateAndAddManual = async () => {
        if (!manualCode) return;

        setValidatingManual(true);
        try {
            const res = await api.get(`/api/ai-billing/icd10/validate/${manualCode}`);
            if (res.data.valid) {
                addCode({ code: res.data.code, description: res.data.description, confidence: 1.0 });
                setManualCode('');
            } else {
                setError(`Invalid ICD-10 code: ${manualCode}`);
            }
        } catch (err) {
            setError('Failed to validate code');
        }
        setValidatingManual(false);
    };

    const getConfidenceColor = (confidence) => {
        if (confidence >= 0.8) return 'success';
        if (confidence >= 0.5) return 'warning';
        return 'secondary';
    };

    return (
        <Card className="icd10-coder border-0 shadow-sm">
            <Card.Header className="bg-primary text-white d-flex align-items-center">
                <Brain size={18} className="me-2" />
                AI ICD-10 Code Assistant
            </Card.Header>
            <Card.Body>
                {/* Diagnosis Input */}
                <Form.Group className="mb-3">
                    <Form.Label className="small text-muted">Enter Diagnosis Description</Form.Label>
                    <div className="input-group">
                        <span className="input-group-text">
                            <Search size={16} />
                        </span>
                        <Form.Control
                            type="text"
                            placeholder="e.g., Type 2 diabetes with hypertension"
                            value={diagnosisText}
                            onChange={(e) => setDiagnosisText(e.target.value)}
                        />
                        {loading && (
                            <span className="input-group-text">
                                <Spinner size="sm" />
                            </span>
                        )}
                    </div>
                </Form.Group>

                {error && (
                    <Alert variant="danger" className="py-2 small" dismissible onClose={() => setError(null)}>
                        {error}
                    </Alert>
                )}

                {/* Suggestions */}
                {suggestions.length > 0 && (
                    <div className="mb-3">
                        <small className="text-muted d-flex align-items-center mb-2">
                            <Lightbulb size={14} className="me-1 text-warning" />
                            AI Suggestions
                        </small>
                        <ListGroup variant="flush">
                            {suggestions.map((suggestion, idx) => (
                                <ListGroup.Item
                                    key={idx}
                                    className="d-flex justify-content-between align-items-center py-2 px-3"
                                    action
                                    onClick={() => addCode(suggestion)}
                                >
                                    <div>
                                        <code className="text-primary fw-bold me-2">{suggestion.code}</code>
                                        <span className="small">{suggestion.description}</span>
                                        <Badge bg="light" text="muted" className="ms-2 small">
                                            {suggestion.category}
                                        </Badge>
                                    </div>
                                    <div className="d-flex align-items-center">
                                        <Badge bg={getConfidenceColor(suggestion.confidence)} className="me-2">
                                            {(suggestion.confidence * 100).toFixed(0)}%
                                        </Badge>
                                        <Plus size={16} className="text-success" />
                                    </div>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </div>
                )}

                {/* Manual Code Entry */}
                <Form.Group className="mb-3">
                    <Form.Label className="small text-muted">Add Code Manually</Form.Label>
                    <Row className="g-2">
                        <Col>
                            <Form.Control
                                type="text"
                                placeholder="e.g., E11.9"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                            />
                        </Col>
                        <Col xs="auto">
                            <Button
                                variant="outline-primary"
                                onClick={validateAndAddManual}
                                disabled={!manualCode || validatingManual}
                            >
                                {validatingManual ? <Spinner size="sm" /> : <Plus size={16} />}
                            </Button>
                        </Col>
                    </Row>
                </Form.Group>

                {/* Selected Codes */}
                {selectedCodes.length > 0 && (
                    <div>
                        <small className="text-muted d-flex align-items-center mb-2">
                            <Code size={14} className="me-1" />
                            Selected Codes ({selectedCodes.length})
                        </small>
                        <div className="d-flex flex-wrap gap-2">
                            {selectedCodes.map((code, idx) => (
                                <Badge
                                    key={idx}
                                    bg="primary"
                                    className="d-flex align-items-center py-2 px-3"
                                    style={{ fontSize: '0.85rem' }}
                                >
                                    <Check size={14} className="me-1" />
                                    <span className="fw-bold me-1">{code.code}</span>
                                    <small className="opacity-75 me-2">
                                        {code.description?.substring(0, 30)}...
                                    </small>
                                    <X
                                        size={14}
                                        className="ms-1 cursor-pointer"
                                        style={{ cursor: 'pointer' }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeCode(code.code);
                                        }}
                                    />
                                </Badge>
                            ))}
                        </div>
                    </div>
                )}

                {selectedCodes.length === 0 && suggestions.length === 0 && !loading && (
                    <div className="text-center text-muted py-3">
                        <Code size={24} className="mb-2" />
                        <p className="small mb-0">
                            Enter a diagnosis to get AI-powered ICD-10 code suggestions
                        </p>
                    </div>
                )}
            </Card.Body>
        </Card>
    );
};

export default ICD10Coder;
