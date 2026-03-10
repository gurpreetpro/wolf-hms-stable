import { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Alert, Spinner, Table, Button } from 'react-bootstrap';
import { Droplet, Package, AlertTriangle, Clock, TrendingUp, Truck } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';

export default function WardBloodSummary({ wardId }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        inventory: [],
        pendingRequests: [],
        activeTransfusions: []
    });
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchData();
    }, [wardId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch inventory summary
            const invRes = await axiosInstance.get('/blood-bank/inventory');
            
            // Fetch pending requests
            const reqRes = await axiosInstance.get('/blood-bank/requests?status=Pending,Approved');
            
            // Fetch active transfusions
            const transRes = await axiosInstance.get('/blood-bank/transfusions/active');

            setData({
                inventory: invRes.data.summary || [],
                pendingRequests: reqRes.data.requests || [],
                activeTransfusions: transRes.data.transfusions || []
            });
            setError(null);
        } catch (err) {
            console.error('Failed to fetch blood data:', err);
            setError('Failed to load blood bank data');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card className="border-0 shadow-sm">
                <Card.Body className="text-center py-4">
                    <Spinner animation="border" variant="danger" />
                </Card.Body>
            </Card>
        );
    }

    const totalUnits = data.inventory.reduce((sum, i) => sum + parseInt(i.available || 0), 0);
    const criticalGroups = data.inventory.filter(i => parseInt(i.available || 0) < 3);
    const urgentRequests = data.pendingRequests.filter(r => r.priority === 'Emergency' || r.priority === 'Urgent');

    return (
        <Card className="border-0 shadow-sm">
            <Card.Header className="bg-danger text-white d-flex align-items-center justify-content-between">
                <div>
                    <Droplet size={18} className="me-2" />
                    <span className="fw-bold">Blood Bank Summary</span>
                </div>
                <Button size="sm" variant="light" onClick={fetchData}>
                    Refresh
                </Button>
            </Card.Header>
            <Card.Body>
                {error && <Alert variant="danger">{error}</Alert>}

                {/* Stats Row */}
                <Row className="g-3 mb-4">
                    <Col md={3}>
                        <div className="bg-light rounded p-3 text-center">
                            <Package size={24} className="text-danger mb-2" />
                            <h4 className="mb-0">{totalUnits}</h4>
                            <small className="text-muted">Units Available</small>
                        </div>
                    </Col>
                    <Col md={3}>
                        <div className="bg-light rounded p-3 text-center">
                            <Clock size={24} className="text-warning mb-2" />
                            <h4 className="mb-0">{data.pendingRequests.length}</h4>
                            <small className="text-muted">Pending Requests</small>
                        </div>
                    </Col>
                    <Col md={3}>
                        <div className="bg-light rounded p-3 text-center">
                            <TrendingUp size={24} className="text-success mb-2" />
                            <h4 className="mb-0">{data.activeTransfusions.length}</h4>
                            <small className="text-muted">Active Transfusions</small>
                        </div>
                    </Col>
                    <Col md={3}>
                        <div className={`${urgentRequests.length > 0 ? 'bg-danger' : 'bg-light'} rounded p-3 text-center`}>
                            <AlertTriangle size={24} className={urgentRequests.length > 0 ? 'text-white mb-2' : 'text-danger mb-2'} />
                            <h4 className={`mb-0 ${urgentRequests.length > 0 ? 'text-white' : ''}`}>{urgentRequests.length}</h4>
                            <small className={urgentRequests.length > 0 ? 'text-white' : 'text-muted'}>Urgent Requests</small>
                        </div>
                    </Col>
                </Row>

                {/* Critical Alerts */}
                {criticalGroups.length > 0 && (
                    <Alert variant="warning" className="d-flex align-items-center">
                        <AlertTriangle size={18} className="me-2" />
                        <div>
                            <strong>Low Stock Alert:</strong>{' '}
                            {criticalGroups.map(g => (
                                <Badge key={g.blood_group} bg="danger" className="me-1">
                                    {g.blood_group}: {g.available}
                                </Badge>
                            ))}
                        </div>
                    </Alert>
                )}

                {/* Inventory Table */}
                <h6 className="mb-2">
                    <Package size={14} className="me-1" />
                    Stock by Blood Group
                </h6>
                <div className="d-flex flex-wrap gap-2 mb-4">
                    {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(group => {
                        const inv = data.inventory.find(i => i.blood_group === group);
                        const count = parseInt(inv?.available || 0);
                        const bgColor = count === 0 ? 'danger' : count < 3 ? 'warning' : 'success';
                        return (
                            <div 
                                key={group} 
                                className={`bg-${bgColor} bg-opacity-10 border border-${bgColor} rounded p-2 text-center`}
                                style={{ minWidth: '70px' }}
                            >
                                <div className={`fw-bold text-${bgColor}`}>{group}</div>
                                <div className="fs-5">{count}</div>
                            </div>
                        );
                    })}
                </div>

                {/* Pending Requests */}
                {data.pendingRequests.length > 0 && (
                    <>
                        <h6 className="mb-2">
                            <Clock size={14} className="me-1" />
                            Pending Blood Requests
                        </h6>
                        <Table size="sm" hover>
                            <thead className="table-light">
                                <tr>
                                    <th>Patient</th>
                                    <th>Blood</th>
                                    <th>Units</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.pendingRequests.slice(0, 5).map(r => (
                                    <tr key={r.id}>
                                        <td>{r.patient_name || 'Unknown'}</td>
                                        <td><Badge bg="danger">{r.blood_group_required}</Badge></td>
                                        <td>{r.units_required}</td>
                                        <td>
                                            <Badge bg={
                                                r.priority === 'Emergency' ? 'danger' :
                                                r.priority === 'Urgent' ? 'warning' : 'secondary'
                                            }>
                                                {r.priority}
                                            </Badge>
                                        </td>
                                        <td><Badge bg="info">{r.status}</Badge></td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </>
                )}
            </Card.Body>
        </Card>
    );
}
