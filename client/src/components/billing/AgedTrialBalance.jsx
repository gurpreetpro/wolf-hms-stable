import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Badge, Button, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { RefreshCw, Download, AlertCircle, Phone, ArrowRight } from 'lucide-react';
import api from '../../utils/axiosInstance';
import { formatCurrency } from '../../utils/currency';

const AgedTrialBalance = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [activeBucket, setActiveBucket] = useState('90+');

    const fetchATB = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/finance/reports/atb');
            setData(res.data);
            // Default to the most critical bucket if it has items
            if (res.data['90+'].count > 0) setActiveBucket('90+');
            else if (res.data['61-90'].count > 0) setActiveBucket('61-90');
            else if (res.data['31-60'].count > 0) setActiveBucket('31-60');
            else setActiveBucket('0-30');
        } catch (error) {
            console.error('Error fetching ATB:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchATB();
    }, []);

    const getBucketColor = (bucket) => {
        switch (bucket) {
            case '0-30': return 'success';
            case '31-60': return 'warning';
            case '61-90': return 'danger';
            case '90+': return 'dark';
            default: return 'secondary';
        }
    };

    if (loading && !data) {
        return <div className="text-center py-5"><Spinner animation="border" variant="primary" /></div>;
    }

    const activeInvoices = data ? data[activeBucket]?.invoices || [] : [];

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="fw-bold mb-0">Aged Trial Balance (ATB)</h6>
                <Button variant="outline-primary" size="sm" onClick={fetchATB}>
                    <RefreshCw size={14} className="me-1" /> Refresh
                </Button>
            </div>

            {/* Summary Cards */}
            <Row className="g-3 mb-4">
                {['0-30', '31-60', '61-90', '90+'].map((bucket) => (
                    <Col key={bucket} xs={6} md={3}>
                        <Card 
                            className={`h-100 cursor-pointer border-${activeBucket === bucket ? 'primary' : 'light'} shadow-sm`} 
                            onClick={() => setActiveBucket(bucket)}
                            style={{ transition: 'all 0.2s', transform: activeBucket === bucket ? 'scale(1.02)' : 'none' }}
                        >
                            <Card.Body className="p-3 text-center">
                                <h6 className="text-muted mb-1">{bucket} Days</h6>
                                <h4 className={`fw-bold text-${getBucketColor(bucket)} mb-0`}>
                                    {formatCurrency(data?.[bucket]?.amount || 0)}
                                </h4>
                                <small className="text-muted fw-bold">
                                    {data?.[bucket]?.count || 0} Invoices
                                </small>
                            </Card.Body>
                            {activeBucket === bucket && (
                                <div className="card-footer bg-primary py-1" style={{ height: 4 }}></div>
                            )}
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Detailed List */}
            <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white py-3">
                    <div className="d-flex justify-content-between align-items-center">
                        <h6 className="mb-0 fw-bold">
                            <span className={`text-${getBucketColor(activeBucket)} me-2`}>●</span>
                             Outstanding Invoices ({activeBucket} Days)
                        </h6>
                        <Badge bg={getBucketColor(activeBucket)} pill>
                            {activeInvoices.length} Items
                        </Badge>
                    </div>
                </Card.Header>
                <Card.Body className="p-0">
                    <Table hover responsive className="mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th>Inv #</th>
                                <th>Patient</th>
                                <th>Reference Date</th>
                                <th className="text-center">Days Overdue</th>
                                <th className="text-end">Amount</th>
                                <th className="text-end">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {activeInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-4 text-muted">
                                        No invoices in this bucket
                                    </td>
                                </tr>
                            ) : (
                                activeInvoices.map((inv) => (
                                    <tr key={inv.id}>
                                        <td><strong>#{inv.id}</strong></td>
                                        <td>
                                            <div>{inv.patient}</div>
                                            {/* We could add patient contact info here if needed */}
                                        </td>
                                        <td className="text-muted small">{new Date(inv.date).toLocaleDateString()}</td>
                                        <td className="text-center">
                                            <Badge bg={getBucketColor(activeBucket)} className="fw-normal">
                                                {inv.daysOverdue} days
                                            </Badge>
                                        </td>
                                        <td className="text-end fw-bold">{formatCurrency(inv.amount)}</td>
                                        <td className="text-end">
                                            <OverlayTrigger overlay={<Tooltip>Follow-up Call</Tooltip>}>
                                                <Button variant="light" size="sm" className="me-1 text-primary">
                                                    <Phone size={14} />
                                                </Button>
                                            </OverlayTrigger>
                                            <OverlayTrigger overlay={<Tooltip>View Invoice</Tooltip>}>
                                                <Button variant="light" size="sm" className="text-dark">
                                                    <ArrowRight size={14} />
                                                </Button>
                                            </OverlayTrigger>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </div>
    );
};

export default AgedTrialBalance;
