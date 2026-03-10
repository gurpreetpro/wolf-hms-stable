import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Spinner } from 'react-bootstrap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { DollarSign, TrendingUp, Users, TestTube } from 'lucide-react';
import api from '../utils/axiosInstance';

const COLORS = ['#0d6efd', '#198754', '#ffc107', '#dc3545', '#6f42c1', '#0dcaf0', '#fd7e14', '#20c997'];

/**
 * LabRevenueChart - Lab Revenue and Workload Analytics
 */
const LabRevenueChart = () => {
    const [data, setData] = useState(null);
    const [workload, setWorkload] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const [revenueRes, workloadRes] = await Promise.all([
                api.get('/api/lab/analytics/revenue', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/api/lab/analytics/workload', { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setData(revenueRes.data);
            setWorkload(workloadRes.data);
            setLoading(false);
        } catch (err) {
            console.error('Revenue fetch error:', err);
            setData({ daily: [], by_test_type: [], total: { total_tests: 0, total_revenue: 0 } });
            setWorkload([]);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return (
            <Card className="shadow-sm border-0 p-4 text-center">
                <Spinner animation="border" variant="primary" />
                <div className="mt-2">Loading Revenue Analytics...</div>
            </Card>
        );
    }

    const formatCurrency = (val) => `₹${(val || 0).toLocaleString('en-IN')}`;

    return (
        <div className="lab-revenue-analytics">
            {/* Summary Cards */}
            <Row className="mb-4">
                <Col md={4}>
                    <Card className="shadow-sm border-0 bg-success bg-opacity-10 p-3">
                        <div className="d-flex align-items-center">
                            <DollarSign size={32} className="text-success me-3" />
                            <div>
                                <div className="text-muted small">Total Revenue (30d)</div>
                                <div className="h4 mb-0 text-success">
                                    {formatCurrency(data?.total?.total_revenue)}
                                </div>
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="shadow-sm border-0 bg-primary bg-opacity-10 p-3">
                        <div className="d-flex align-items-center">
                            <TestTube size={32} className="text-primary me-3" />
                            <div>
                                <div className="text-muted small">Tests Completed</div>
                                <div className="h4 mb-0 text-primary">
                                    {data?.total?.total_tests || 0}
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
                                <div className="text-muted small">Avg Per Test</div>
                                <div className="h4 mb-0 text-info">
                                    {formatCurrency(data?.total?.total_tests > 0 ? data.total.total_revenue / data.total.total_tests : 0)}
                                </div>
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            <Row>
                {/* Daily Revenue Trend */}
                <Col md={8}>
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Header className="bg-white fw-bold">📈 Daily Revenue (30 Days)</Card.Header>
                        <Card.Body style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data?.daily || []}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                    />
                                    <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                                    <Tooltip
                                        formatter={(v) => [formatCurrency(v), 'Revenue']}
                                        labelFormatter={(d) => new Date(d).toLocaleDateString('en-IN')}
                                    />
                                    <Line type="monotone" dataKey="revenue" stroke="#198754" strokeWidth={2} dot={{ fill: '#198754' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Revenue by Test Type Pie */}
                <Col md={4}>
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Header className="bg-white fw-bold">🥧 Revenue by Test Type</Card.Header>
                        <Card.Body style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data?.by_test_type || []}
                                        dataKey="revenue"
                                        nameKey="test_name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ name, percent }) => `${name.substring(0, 10)}.. ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {(data?.by_test_type || []).map((_, i) => (
                                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v) => formatCurrency(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row>
                {/* Workload Bar Chart */}
                <Col md={6}>
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Header className="bg-white fw-bold d-flex align-items-center gap-2">
                            <Users size={18} /> Technician Workload (7 Days)
                        </Card.Header>
                        <Card.Body style={{ height: 250 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={workload} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="technician" type="category" width={100} tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="tests_completed" fill="#0d6efd" radius={[0, 4, 4, 0]} name="Tests" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Test Type Revenue Table */}
                <Col md={6}>
                    <Card className="shadow-sm border-0 mb-4">
                        <Card.Header className="bg-white fw-bold">📋 Top Tests by Revenue</Card.Header>
                        <Table hover responsive className="mb-0" size="sm">
                            <thead className="bg-light">
                                <tr>
                                    <th>Test</th>
                                    <th>Count</th>
                                    <th>Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(data?.by_test_type || []).slice(0, 8).map((t, i) => (
                                    <tr key={i}>
                                        <td className="fw-medium">{t.test_name}</td>
                                        <td>{t.count}</td>
                                        <td className="text-success">{formatCurrency(t.revenue)}</td>
                                    </tr>
                                ))}
                                {(!data?.by_test_type || data.by_test_type.length === 0) && (
                                    <tr>
                                        <td colSpan="3" className="text-center text-muted py-3">
                                            No revenue data
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default LabRevenueChart;
