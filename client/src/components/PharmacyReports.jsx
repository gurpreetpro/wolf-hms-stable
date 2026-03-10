import React, { useState, useEffect } from 'react';
import { Card, Table, Row, Col, Badge, ProgressBar } from 'react-bootstrap';
import { PieChart, TrendingUp, AlertOctagon } from 'lucide-react';
import api from '../utils/axiosInstance';
import { formatCurrency } from '../utils/currency';

const PharmacyReports = () => {
    const [abcStats, setAbcStats] = useState(null);
    const [totalValue, setTotalValue] = useState(0);
    const [expiryList, setExpiryList] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const abcRes = await api.get('/api/pharmacy/reports/abc');
                setAbcStats(abcRes.data.stats);
                setTotalValue(abcRes.data.totalValue);

                const expiryRes = await api.get('/api/pharmacy/reports/expiry');
                setExpiryList(expiryRes.data);
            } catch (error) {
                console.error("Report fetch failed", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading || !abcStats) return <div className="p-5 text-center">Loading Analytics...</div>;

    return (
        <div className="p-3">
            {/* ABC Analysis Section */}
            <Card className="shadow-sm border-0 mb-4">
                <Card.Header className="bg-white fw-bold d-flex align-items-center">
                    <PieChart size={18} className="me-2 text-primary" />
                    ABC Inventory Analysis (Value-Based Classification)
                </Card.Header>
                <Card.Body>
                    <Row className="mb-4 text-center">
                        <Col md={4}>
                            <h3 className="text-success fw-bold">{abcStats.A.count} Items</h3>
                            <div className="text-muted small">Class A (High Value)</div>
                            <h5 className="text-dark">{formatCurrency(abcStats.A.value)}</h5>
                        </Col>
                        <Col md={4}>
                            <h3 className="text-warning fw-bold">{abcStats.B.count} Items</h3>
                            <div className="text-muted small">Class B (Moderate)</div>
                            <h5 className="text-dark">{formatCurrency(abcStats.B.value)}</h5>
                        </Col>
                        <Col md={4}>
                            <h3 className="text-danger fw-bold">{abcStats.C.count} Items</h3>
                            <div className="text-muted small">Class C (Low Value)</div>
                            <h5 className="text-dark">{formatCurrency(abcStats.C.value)}</h5>
                        </Col>
                    </Row>

                    <div>
                        <div className="d-flex justify-content-between small mb-1">
                            <span>Portfolio Composition (by Value)</span>
                            <span className="fw-bold">{formatCurrency(totalValue)} Total</span>
                        </div>
                        <ProgressBar className="mb-2" style={{ height: '25px' }}>
                            <ProgressBar variant="success" now={(abcStats.A.value / totalValue) * 100} label={`${Math.round((abcStats.A.value / totalValue) * 100)}%`} key={1} />
                            <ProgressBar variant="warning" now={(abcStats.B.value / totalValue) * 100} label={`${Math.round((abcStats.B.value / totalValue) * 100)}%`} key={2} />
                            <ProgressBar variant="danger" now={(abcStats.C.value / totalValue) * 100} label={`${Math.round((abcStats.C.value / totalValue) * 100)}%`} key={3} />
                        </ProgressBar>
                        <div className="d-flex small text-muted gap-3">
                            <span className="d-flex align-items-center"><div className="bg-success rounded-circle me-1" style={{ width: 8, height: 8 }}></div> Class A (Top 70%)</span>
                            <span className="d-flex align-items-center"><div className="bg-warning rounded-circle me-1" style={{ width: 8, height: 8 }}></div> Class B (Next 20%)</span>
                            <span className="d-flex align-items-center"><div className="bg-danger rounded-circle me-1" style={{ width: 8, height: 8 }}></div> Class C (Bottom 10%)</span>
                        </div>
                    </div>
                </Card.Body>
            </Card>

            {/* Expiry Risk Report */}
            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white fw-bold d-flex align-items-center text-danger">
                    <AlertOctagon size={18} className="me-2" />
                    Six-Month Expiry Forecast
                </Card.Header>
                <div className="table-responsive">
                    <Table hover className="mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th>Drug Name</th>
                                <th>Expiry Date</th>
                                <th>Days Remaining</th>
                                <th>Stock</th>
                                <th>Value at Risk</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expiryList.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-4 text-muted">No items expiring in upcoming 6 months.</td></tr>
                            ) : (
                                expiryList.map(item => {
                                    const days = item.days_remaining;
                                    let badge = 'danger';
                                    if (days > 60) badge = 'warning';
                                    if (days > 90) badge = 'info';

                                    return (
                                        <tr key={item.id}>
                                            <td className="fw-bold">{item.name}</td>
                                            <td>{new Date(item.expiry_date).toLocaleDateString()}</td>
                                            <td>{days} Days</td>
                                            <td>{item.stock_quantity}</td>
                                            <td>{formatCurrency(item.stock_quantity * item.price_per_unit)}</td>
                                            <td><Badge bg={badge}>{days < 30 ? 'CRITICAL' : days < 90 ? 'High Risk' : 'Medium Risk'}</Badge></td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </Table>
                </div>
            </Card>
        </div>
    );
};

export default PharmacyReports;
