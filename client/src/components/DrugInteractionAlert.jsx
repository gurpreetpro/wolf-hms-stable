import React, { useState, useEffect } from 'react';
import { Alert, Badge, Spinner, Collapse } from 'react-bootstrap';
import { AlertTriangle, ChevronDown, ChevronUp, Pill, CheckCircle } from 'lucide-react';
import axios from 'axios';

/**
 * DrugInteractionAlert - Contextual drug interaction checker
 * Automatically checks for interactions when medications change
 */
const DrugInteractionAlert = ({ medications = [], onInteractionFound }) => {
    const [loading, setLoading] = useState(false);
    const [interactions, setInteractions] = useState([]);
    const [expanded, setExpanded] = useState(true);
    const [lastChecked, setLastChecked] = useState([]);

    // Check interactions when medications change
    useEffect(() => {
        const drugNames = medications
            .filter(m => m.name && m.name.trim())
            .map(m => m.name.trim());

        // Only check if we have 2+ drugs and list changed
        if (drugNames.length >= 2 && JSON.stringify(drugNames) !== JSON.stringify(lastChecked)) {
            checkInteractions(drugNames);
            setLastChecked(drugNames);
        } else if (drugNames.length < 2) {
            setInteractions([]);
        }
    }, [medications]);

    const checkInteractions = async (drugs) => {
        if (drugs.length < 2) return;

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post('/api/ai/check-interactions', {
                medications: drugs
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const found = res.data.interactions || [];
            setInteractions(found);

            if (onInteractionFound && found.length > 0) {
                onInteractionFound(found);
            }
        } catch (err) {
            console.error('Drug interaction check failed:', err);
        } finally {
            setLoading(false);
        }
    };

    const getSeverityVariant = (severity) => {
        switch (severity?.toLowerCase()) {
            case 'severe': case 'critical': return 'danger';
            case 'moderate': return 'warning';
            case 'mild': case 'minor': return 'info';
            default: return 'secondary';
        }
    };

    // Don't render if less than 2 medications
    if (medications.filter(m => m.name?.trim()).length < 2) {
        return null;
    }

    return (
        <div className="mt-2 mb-3">
            {loading ? (
                <Alert variant="light" className="d-flex align-items-center gap-2 py-2">
                    <Spinner size="sm" animation="border" />
                    <small>Checking for drug interactions...</small>
                </Alert>
            ) : interactions.length > 0 ? (
                <Alert
                    variant="danger"
                    className="mb-0"
                    style={{ borderLeft: '4px solid #dc3545' }}
                >
                    <div
                        className="d-flex justify-content-between align-items-center"
                        style={{ cursor: 'pointer' }}
                        onClick={() => setExpanded(!expanded)}
                    >
                        <div className="d-flex align-items-center gap-2">
                            <AlertTriangle size={18} />
                            <strong>⚠️ {interactions.length} Drug Interaction{interactions.length > 1 ? 's' : ''} Found!</strong>
                        </div>
                        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>

                    <Collapse in={expanded}>
                        <div className="mt-2">
                            {interactions.map((int, idx) => (
                                <div
                                    key={idx}
                                    className="bg-white rounded p-2 mb-2"
                                    style={{ borderLeft: `3px solid ${int.severity === 'severe' ? '#dc3545' : '#ffc107'}` }}
                                >
                                    <div className="d-flex justify-content-between align-items-start">
                                        <div>
                                            <div className="d-flex align-items-center gap-2">
                                                <Pill size={14} />
                                                <strong>{int.drug1}</strong>
                                                <span className="text-muted">↔</span>
                                                <strong>{int.drug2}</strong>
                                            </div>
                                            <small className="text-muted d-block mt-1">{int.description}</small>
                                            {int.recommendation && (
                                                <small className="text-primary d-block mt-1">
                                                    💡 {int.recommendation}
                                                </small>
                                            )}
                                        </div>
                                        <Badge bg={getSeverityVariant(int.severity)}>
                                            {int.severity}
                                        </Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Collapse>
                </Alert>
            ) : (
                <Alert variant="success" className="py-2 mb-0 d-flex align-items-center gap-2">
                    <CheckCircle size={16} />
                    <small>No drug interactions detected</small>
                </Alert>
            )}
        </div>
    );
};

export default DrugInteractionAlert;
