import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Spinner, ProgressBar } from 'react-bootstrap';
import {
    Users, TrendingUp, FlaskConical, Pill, Clock,
    Activity, BarChart2, Calendar, AlertCircle
} from 'lucide-react';
import axios from 'axios';

/**
 * DoctorAnalytics - Phase 3 Analytics Dashboard Component
 * Shows performance metrics, trends, and disease patterns
 */
const DoctorAnalytics = () => {
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/doctor/my-analytics', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAnalytics(res.data);
        } catch (err) {
            console.error('Analytics fetch error:', err);
            setError('Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className="border-0 shadow-sm">
                <Card.Body className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <div className="mt-3 text-muted">Loading analytics...</div>
                </Card.Body>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="border-0 shadow-sm">
                <Card.Body className="text-center py-4 text-danger">
                    <AlertCircle size={32} className="mb-2" />
                    <div>{error}</div>
                </Card.Body>
            </Card>
        );
    }

    const { overview, topDiagnoses, dailyTrend } = analytics || {};

    // Calculate max for progress bars
    const maxDiagnosis = Math.max(...(topDiagnoses?.map(d => d.count) || [1]));

    return (
        <div className="doctor-analytics">
            {/* Overview Cards */}
            <Row className="g-3 mb-4">
                <Col md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                        <Card.Body className="text-white">
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <div className="small opacity-75">Today</div>
                                    <div className="fs-2 fw-bold">{overview?.patientsToday || 0}</div>
                                    <div className="small">patients seen</div>
                                </div>
                                <Users size={32} className="opacity-50" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                        <Card.Body className="text-white">
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <div className="small opacity-75">This Week</div>
                                    <div className="fs-2 fw-bold">{overview?.patientsThisWeek || 0}</div>
                                    <div className="small">patients</div>
                                </div>
                                <Calendar size={32} className="opacity-50" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                        <Card.Body className="text-white">
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <div className="small opacity-75">This Month</div>
                                    <div className="fs-2 fw-bold">{overview?.patientsThisMonth || 0}</div>
                                    <div className="small">patients</div>
                                </div>
                                <TrendingUp size={32} className="opacity-50" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
                        <Card.Body className="text-white">
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <div className="small opacity-75">Waiting Now</div>
                                    <div className="fs-2 fw-bold">{overview?.waitingInQueue || 0}</div>
                                    <div className="small">in queue</div>
                                </div>
                                <Clock size={32} className="opacity-50" />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Stats Row 2 */}
            <Row className="g-3 mb-4">
                <Col md={4}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Body>
                            <div className="d-flex align-items-center gap-3">
                                <div className="p-3 bg-info bg-opacity-10 rounded-3">
                                    <FlaskConical className="text-info" size={24} />
                                </div>
                                <div>
                                    <div className="text-muted small">Lab Orders (Month)</div>
                                    <div className="fs-4 fw-bold">{overview?.labOrdersThisMonth || 0}</div>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={4}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Body>
                            <div className="d-flex align-items-center gap-3">
                                <div className="p-3 bg-success bg-opacity-10 rounded-3">
                                    <Pill className="text-success" size={24} />
                                </div>
                                <div>
                                    <div className="text-muted small">Prescriptions (Month)</div>
                                    <div className="fs-4 fw-bold">{overview?.prescriptionsThisMonth || 0}</div>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col md={4}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Body>
                            <div className="d-flex align-items-center gap-3">
                                <div className="p-3 bg-warning bg-opacity-10 rounded-3">
                                    <Activity className="text-warning" size={24} />
                                </div>
                                <div>
                                    <div className="text-muted small">Avg. Consult Time</div>
                                    <div className="fs-4 fw-bold">{overview?.avgConsultTime || 'N/A'}</div>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Charts Row */}
            <Row className="g-3">
                {/* Top Diagnoses */}
                <Col md={6}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Header className="bg-white border-0 d-flex align-items-center gap-2">
                            <BarChart2 size={18} className="text-primary" />
                            <span className="fw-bold">Top Diagnoses (This Month)</span>
                        </Card.Header>
                        <Card.Body>
                            {topDiagnoses && topDiagnoses.length > 0 ? (
                                topDiagnoses.map((diagnosis, index) => (
                                    <div key={index} className="mb-3">
                                        <div className="d-flex justify-content-between mb-1">
                                            <span className="small">{diagnosis.name}</span>
                                            <Badge bg="secondary">{diagnosis.count}</Badge>
                                        </div>
                                        <ProgressBar
                                            variant={index === 0 ? 'primary' : index === 1 ? 'info' : 'secondary'}
                                            now={(diagnosis.count / maxDiagnosis) * 100}
                                            style={{ height: '8px' }}
                                        />
                                    </div>
                                ))
                            ) : (
                                <div className="text-center text-muted py-4">
                                    No diagnosis data yet
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                {/* Daily Trend */}
                <Col md={6}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Header className="bg-white border-0 d-flex align-items-center gap-2">
                            <TrendingUp size={18} className="text-success" />
                            <span className="fw-bold">Daily Patient Trend (Last 7 Days)</span>
                        </Card.Header>
                        <Card.Body>
                            {dailyTrend && dailyTrend.length > 0 ? (
                                <div className="d-flex align-items-end justify-content-between" style={{ height: '150px' }}>
                                    {dailyTrend.map((day, index) => {
                                        const maxCount = Math.max(...dailyTrend.map(d => d.count)) || 1;
                                        const height = (day.count / maxCount) * 100;
                                        const date = new Date(day.date);
                                        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

                                        return (
                                            <div key={index} className="text-center flex-fill mx-1">
                                                <div
                                                    className="bg-primary rounded-top"
                                                    style={{
                                                        height: `${height}%`,
                                                        minHeight: day.count > 0 ? '20px' : '4px',
                                                        transition: 'height 0.3s ease'
                                                    }}
                                                />
                                                <div className="small text-muted mt-1">{dayName}</div>
                                                <div className="small fw-bold">{day.count}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center text-muted py-4">
                                    No trend data yet
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default DoctorAnalytics;
