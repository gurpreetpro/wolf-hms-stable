import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, Spinner, Form } from 'react-bootstrap';
import { RefreshCw, Calendar, TrendingUp, TrendingDown, DollarSign, Filter } from 'lucide-react';
import api from '../../utils/axiosInstance';
import { formatCurrency } from '../../utils/currency';

const DailyRevenueReport = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [dateRange, setDateRange] = useState({
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/finance/reports/daily-revenue', {
                params: dateRange
            });
            setData(res.data);
        } catch (error) {
            console.error('Error fetching DRR:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []); // Initial load

    const handleDateChange = (e) => {
        setDateRange({ ...dateRange, [e.target.name]: e.target.value });
    };

    if (loading && !data) {
        return <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>;
    }

    return (
        <div>
            {/* Filter Header */}
            <Card className="border-0 shadow-sm mb-4 bg-light">
                <Card.Body className="py-3">
                    <div className="d-flex flex-wrap gap-3 align-items-end">
                        <div style={{ minWidth: 200 }}>
                            <Form.Label className="small fw-bold text-muted mb-1">Start Date</Form.Label>
                            <Form.Control 
                                type="date" 
                                name="startDate" 
                                value={dateRange.startDate} 
                                onChange={handleDateChange} 
                                size="sm"
                            />
                        </div>
                        <div style={{ minWidth: 200 }}>
                            <Form.Label className="small fw-bold text-muted mb-1">End Date</Form.Label>
                            <Form.Control 
                                type="date" 
                                name="endDate" 
                                value={dateRange.endDate} 
                                onChange={handleDateChange} 
                                size="sm"
                            />
                        </div>
                        <Button variant="primary" size="sm" onClick={fetchReport} disabled={loading} className="mb-1">
                            {loading ? <Spinner size="sm" animation="border" /> : <><Filter size={14} className="me-1"/> Apply</>}
                        </Button>
                    </div>
                </Card.Body>
            </Card>

            {data && (
                <Row className="g-4 mb-4">
                    {/* Key Metrics */}
                    <Col md={3}>
                        <Card className="h-100 border-0 shadow-sm border-start border-4 border-primary">
                            <Card.Body>
                                <div className="text-muted small fw-bold mb-2">GROSS CHARGES</div>
                                <h3 className="fw-bold mb-0 text-primary">{formatCurrency(data.charges.amount)}</h3>
                                <small className="text-muted">{data.charges.count} Invoices</small>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="h-100 border-0 shadow-sm border-start border-4 border-success">
                            <Card.Body>
                                <div className="text-muted small fw-bold mb-2">NET COLLECTIONS</div>
                                <h3 className="fw-bold mb-0 text-success">{formatCurrency(data.collections.amount)}</h3>
                                <small className="text-muted">{data.collections.count} Payments</small>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="h-100 border-0 shadow-sm border-start border-4 border-warning">
                            <Card.Body>
                                <div className="text-muted small fw-bold mb-2">ADJUSTMENTS</div>
                                <h3 className="fw-bold mb-0 text-warning">{formatCurrency(data.adjustments.amount)}</h3>
                                <small className="text-muted">{data.adjustments.count} Records</small>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="h-100 border-0 shadow-sm border-start border-4 border-info">
                            <Card.Body>
                                <div className="text-muted small fw-bold mb-2">NET REVENUE</div>
                                <h3 className="fw-bold mb-0 text-info">{formatCurrency(data.netRevenue)}</h3>
                                <small className="text-muted">Charges - Adjustments</small>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Reconciliation Table Preview (Mock for now, could be detailed list) */}
            <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white">
                    <h6 className="fw-bold mb-0">Reconciliation Summary</h6>
                </Card.Header>
                <Card.Body className="p-0">
                    <Table hover responsive className="mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th>Category</th>
                                <th>Count</th>
                                <th className="text-end">Amount</th>
                                <th className="text-end">% of Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><Badge bg="primary" className="me-2">CHARGES</Badge> Total Billed</td>
                                <td>{data?.charges.count}</td>
                                <td className="text-end fw-bold">{formatCurrency(data?.charges.amount)}</td>
                                <td className="text-end">100%</td>
                            </tr>
                            <tr>
                                <td><Badge bg="warning" className="me-2">ADJ</Badge> Write-offs & Discounts</td>
                                <td>{data?.adjustments.count}</td>
                                <td className="text-end text-danger">({formatCurrency(data?.adjustments.amount)})</td>
                                <td className="text-end">
                                    {data?.charges.amount ? ((data.adjustments.amount / data.charges.amount) * 100).toFixed(1) : 0}%
                                </td>
                            </tr>
                            <tr className="bg-light fw-bold">
                                <td>NET REVENUE (Billed - Adj)</td>
                                <td>-</td>
                                <td className="text-end">{formatCurrency(data?.netRevenue)}</td>
                                <td className="text-end">
                                    {data?.charges.amount ? ((data.netRevenue / data.charges.amount) * 100).toFixed(1) : 0}%
                                </td>
                            </tr>
                            <tr>
                                <td colSpan="4" className="border-bottom-0"></td>
                            </tr>
                            <tr>
                                <td><Badge bg="success" className="me-2">CASH</Badge> Collections (Cash/Card/UPI)</td>
                                <td>{data?.collections.count}</td>
                                <td className="text-end fw-bold text-success">{formatCurrency(data?.collections.amount)}</td>
                                <td className="text-end">-</td>
                            </tr>
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </div>
    );
};

export default DailyRevenueReport;
