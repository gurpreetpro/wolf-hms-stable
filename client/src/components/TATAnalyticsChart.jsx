import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Spinner, Table } from 'react-bootstrap';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Clock, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import api from '../utils/axiosInstance';

/**
 * TATAnalyticsChart - Turnaround Time Analytics Dashboard
 */
const TATAnalyticsChart = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchTATData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/api/lab/analytics/tat', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(res.data);
            setLoading(false);
        } catch (err) {
            console.error('TAT fetch error:', err);
            // Set empty data instead of error - show empty state
            setData({
                by_test: [],
                daily_trend: [],
                overall: { total_completed: 0, overall_avg_tat: 0 }
            });
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTATData();
         
    }, []);

    if (loading) {
        return (
            <Card className="shadow-sm border-0 p-4 text-center">
                <Spinner animation="border" variant="primary" />
                <div className="mt-2">Loading Analytics...</div>
            </Card>
        );
    }

    const formatHours = (hours) => {
        if (!hours) return '0h';
        if (hours < 1) return `${Math.round(hours * 60)}m`;
        return `${hours.toFixed(1)}h`;
    };

    return (
        <div className="tat-analytics">
            {/* Summary Cards */}
            <Row className="mb-4">
                <Col md={4}>
                    <Card className="shadow-sm border-0 bg-primary bg-opacity-10 p-3">
                        <div className="d-flex align-items-center">
                            <Clock size={32} className="text-primary me-3" />
                            <div>
                                <div className="text-muted small">Avg TAT (30 days)</div>
                                <div className="h4 mb-0 text-primary">
                                    {formatHours(data?.overall?.overall_avg_tat)}
                                </div>
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="shadow-sm border-0 bg-success bg-opacity-10 p-3">
                        <div className="d-flex align-items-center">
                            <Activity size={32} className="text-success me-3" />
                            <div>
                                <div className="text-muted small">Tests Completed</div>
                                <div className="h4 mb-0 text-success">
                                    {data?.overall?.total_completed || 0}
                                </div>
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="shadow-sm border-0 bg-info bg-opacity-10 p-3">
                        <div className="d-flex align-items-center">
                            <TrendingUp size={32} className="text-info me-3" />
                            <div>
                                <div className="text-muted small">Test Types</div>
                                <div className="h4 mb-0 text-info">
                                    {data?.by_test?.length || 0}
                                </div>
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Row>
                {/* Daily TAT Trend Chart */}
                <Col md={6}>
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Header className="bg-white fw-bold">
                            📈 Daily TAT Trend (7 Days)
                        </Card.Header>
                        <Card.Body style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data?.daily_trend || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(date) => new Date(date).toLocaleDateString('en-IN', { weekday: 'short' })}
                                    />
                                    <YAxis tickFormatter={(h) => `${h.toFixed(1)}h`} />
                                    <Tooltip
                                        labelFormatter={(date) => new Date(date).toLocaleDateString('en-IN')}
                                        formatter={(value) => [`${value.toFixed(2)} hours`, 'Avg TAT']}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="avg_tat_hours"
                                        stroke="#0d6efd"
                                        strokeWidth={2}
                                        dot={{ fill: '#0d6efd' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card.Body>
                    </Card>
                </Col>

                {/* TAT by Test Type Chart */}
                <Col md={6}>
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Header className="bg-white fw-bold">
                            📊 TAT by Test Type
                        </Card.Header>
                        <Card.Body style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.by_test || []} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" tickFormatter={(h) => `${h.toFixed(1)}h`} />
                                    <YAxis dataKey="test_name" type="category" width={100} tick={{ fontSize: 11 }} />
                                    <Tooltip formatter={(value) => [`${value.toFixed(2)} hours`, 'Avg TAT']} />
                                    <Bar dataKey="avg_tat_hours" fill="#198754" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Test Type Details Table */}
            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white fw-bold">
                    📋 Test Type Performance
                </Card.Header>
                <Table hover responsive className="mb-0">
                    <thead className="bg-light">
                        <tr>
                            <th>Test Type</th>
                            <th>Total</th>
                            <th>Avg TAT</th>
                            <th>Min TAT</th>
                            <th>Max TAT</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data?.by_test || []).map((test, i) => (
                            <tr key={i}>
                                <td className="fw-medium">{test.test_name}</td>
                                <td>{test.total_tests}</td>
                                <td>{formatHours(test.avg_tat_hours)}</td>
                                <td className="text-success">{formatHours(test.min_tat_hours)}</td>
                                <td className="text-danger">{formatHours(test.max_tat_hours)}</td>
                                <td>
                                    <Badge bg={test.avg_tat_hours < 4 ? 'success' : test.avg_tat_hours < 8 ? 'warning' : 'danger'}>
                                        {test.avg_tat_hours < 4 ? 'Fast' : test.avg_tat_hours < 8 ? 'Normal' : 'Slow'}
                                    </Badge>
                                </td>
                            </tr>
                        ))}
                        {(!data?.by_test || data.by_test.length === 0) && (
                            <tr>
                                <td colSpan="6" className="text-center text-muted py-4">
                                    No test data in last 30 days
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </Card>
        </div>
    );
};

export default TATAnalyticsChart;
