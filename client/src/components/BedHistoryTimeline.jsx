import React, { useState, useEffect } from 'react';
import { Card, Badge, Spinner, Alert } from 'react-bootstrap';
import {
    LogIn, ArrowRightLeft, LogOut, Clock, Building, Bed as BedIcon,
    MapPin, ChevronRight, Activity
} from 'lucide-react';
import axios from 'axios';

// Action icons and colors
const ACTION_CONFIG = {
    'Admitted': { icon: LogIn, color: '#28a745', bgColor: '#d4edda', label: 'Admitted' },
    'Transferred': { icon: ArrowRightLeft, color: '#17a2b8', bgColor: '#d1ecf1', label: 'Transferred' },
    'Discharged': { icon: LogOut, color: '#6c757d', bgColor: '#e2e3e5', label: 'Discharged' }
};

const BedHistoryTimeline = ({ admissionId, onClose }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (admissionId) {
            fetchHistory();
        }
    }, [admissionId]);

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/admissions/bed-history/${admissionId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const rawData = res.data;
            const historyData = Array.isArray(rawData) ? rawData : (rawData.data || []);
            setHistory(historyData);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch bed history:', err);
            // If API doesn't exist, show empty state
            if (err.response?.status === 404) {
                setError('Bed history tracking not available');
            } else {
                setError('Failed to load bed history');
            }
        } finally {
            setLoading(false);
        }
    };

    // Format date/time
    const formatDateTime = (dateStr) => {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Calculate duration between events
    const calculateDuration = (startDate, endDate) => {
        if (!startDate || !endDate) return null;
        const diffMs = new Date(endDate) - new Date(startDate);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        return `${hours}h`;
    };

    if (loading) {
        return (
            <div className="text-center py-4">
                <Spinner animation="border" size="sm" className="me-2" />
                Loading bed history...
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="warning" className="mb-0">
                <Activity size={16} className="me-2" />
                {error}
            </Alert>
        );
    }

    if (history.length === 0) {
        return (
            <Card className="border-0 bg-light">
                <Card.Body className="text-center text-muted py-4">
                    <MapPin size={32} className="mb-2 opacity-50" />
                    <p className="mb-0">No bed history recorded yet</p>
                </Card.Body>
            </Card>
        );
    }

    return (
        <div className="bed-history-timeline">
            <div className="d-flex align-items-center justify-content-between mb-3">
                <h6 className="fw-bold mb-0">
                    <MapPin size={16} className="me-2 text-primary" />
                    Patient Journey
                </h6>
                <Badge bg="secondary" pill>{history.length} events</Badge>
            </div>

            {/* Timeline */}
            <div className="timeline position-relative ps-4">
                {/* Vertical line */}
                <div
                    className="position-absolute"
                    style={{
                        left: '10px',
                        top: '10px',
                        bottom: '10px',
                        width: '2px',
                        backgroundColor: '#dee2e6'
                    }}
                />

                {history.map((event, index) => {
                    const config = ACTION_CONFIG[event.action] || ACTION_CONFIG['Admitted'];
                    const IconComponent = config.icon;
                    const isLast = index === history.length - 1;
                    const nextEvent = history[index + 1];
                    const duration = nextEvent ? calculateDuration(event.timestamp, nextEvent.timestamp) : null;

                    return (
                        <div key={event.id || index} className="timeline-item position-relative mb-3 pb-3">
                            {/* Icon Circle */}
                            <div
                                className="position-absolute d-flex align-items-center justify-content-center rounded-circle"
                                style={{
                                    left: '-30px',
                                    top: '0',
                                    width: '24px',
                                    height: '24px',
                                    backgroundColor: config.bgColor,
                                    border: `2px solid ${config.color}`,
                                    zIndex: 1
                                }}
                            >
                                <IconComponent size={12} style={{ color: config.color }} />
                            </div>

                            {/* Content Card */}
                            <Card
                                className="border-0 shadow-sm ms-2"
                                style={{ borderLeft: `3px solid ${config.color}` }}
                            >
                                <Card.Body className="py-2 px-3">
                                    <div className="d-flex justify-content-between align-items-start">
                                        <div>
                                            <Badge
                                                style={{ backgroundColor: config.color }}
                                                className="mb-1"
                                            >
                                                {config.label}
                                            </Badge>
                                            <div className="d-flex align-items-center gap-3 mt-1">
                                                <span className="small">
                                                    <Building size={12} className="me-1 text-muted" />
                                                    <strong>{event.ward || 'N/A'}</strong>
                                                </span>
                                                <span className="small">
                                                    <BedIcon size={12} className="me-1 text-muted" />
                                                    Bed {event.bed_number || 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-end">
                                            <small className="text-muted d-flex align-items-center">
                                                <Clock size={12} className="me-1" />
                                                {formatDateTime(event.timestamp)}
                                            </small>
                                        </div>
                                    </div>

                                    {/* Duration to next event */}
                                    {duration && !isLast && (
                                        <div className="mt-2 pt-2 border-top">
                                            <small className="text-muted d-flex align-items-center">
                                                <ChevronRight size={12} className="me-1" />
                                                {duration} in this location
                                            </small>
                                        </div>
                                    )}

                                    {/* Current location indicator */}
                                    {isLast && event.action !== 'Discharged' && (
                                        <div className="mt-2 pt-2 border-top">
                                            <Badge bg="success" className="small">
                                                <Activity size={10} className="me-1" />
                                                Current Location
                                            </Badge>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <Card className="bg-light border-0 mt-3">
                <Card.Body className="py-2 px-3">
                    <div className="d-flex justify-content-around text-center small">
                        <div>
                            <div className="text-muted">Total Moves</div>
                            <div className="fw-bold">{history.length}</div>
                        </div>
                        <div>
                            <div className="text-muted">First Event</div>
                            <div className="fw-bold">{formatDateTime(history[0]?.timestamp)}</div>
                        </div>
                        <div>
                            <div className="text-muted">Last Event</div>
                            <div className="fw-bold">{formatDateTime(history[history.length - 1]?.timestamp)}</div>
                        </div>
                    </div>
                </Card.Body>
            </Card>
        </div>
    );
};

export default BedHistoryTimeline;
