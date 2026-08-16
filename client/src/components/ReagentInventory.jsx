import React, { useState, useEffect } from 'react';
import { Card, Table, Badge, Button, Modal, Form, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { Package, AlertTriangle, Plus, Edit, Trash2, TrendingDown, Calendar, Bell } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../utils/axiosInstance';

/**
 * ReagentInventory - Lab reagent stock and expiry management
 */
const ReagentInventory = () => {
    const [reagents, setReagents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingReagent, setEditingReagent] = useState(null);
    const [formData, setFormData] = useState({
        name: '', catalog_number: '', manufacturer: '',
        current_stock: 0, min_stock_level: 10, unit: 'tests',
        expiry_date: '', storage_location: ''
    });

    // Forecast state variables
    const [showForecastModal, setShowForecastModal] = useState(false);
    const [forecastData, setForecastData] = useState(null);
    const [forecastLoading, setForecastLoading] = useState(false);

    useEffect(() => {
        fetchReagents();
    }, []);

    const fetchReagents = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await api.get('/api/lab/reagents', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setReagents(Array.isArray(res.data) ? res.data : (res.data?.data || [])); 
            setLoading(false);
        } catch (err) {
            console.error('Fetch reagents error:', err);
            setLoading(false);
        }
    };

    const handleViewForecast = async (reagentId) => {
        setForecastLoading(true);
        setShowForecastModal(true);
        try {
            const token = localStorage.getItem('token');
            const res = await api.get(`/api/lab/reagents/${reagentId}/forecast`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setForecastData(res.data?.data || res.data);
        } catch (err) {
            console.error('Fetch reagent forecast error:', err);
        }
        setForecastLoading(false);
    };

    const handleSubmit = async () => {
        try {
            const token = localStorage.getItem('token');
            if (editingReagent) {
                await api.put(`/api/lab/reagents/${editingReagent.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await api.post('/api/lab/reagents', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setShowModal(false);
            fetchReagents();
            resetForm();
        } catch (err) {
            console.error('Save reagent error:', err);
        }
    };

    const resetForm = () => {
        setFormData({
            name: '', catalog_number: '', manufacturer: '',
            current_stock: 0, min_stock_level: 10, unit: 'tests',
            expiry_date: '', storage_location: ''
        });
        setEditingReagent(null);
    };

    const openEditModal = (reagent) => {
        setEditingReagent(reagent);
        setFormData({
            name: reagent.name,
            catalog_number: reagent.catalog_number || '',
            manufacturer: reagent.manufacturer || '',
            current_stock: reagent.current_stock,
            min_stock_level: reagent.min_stock_level,
            unit: reagent.unit || 'tests',
            expiry_date: reagent.expiry_date ? reagent.expiry_date.split('T')[0] : '',
            storage_location: reagent.storage_location || ''
        });
        setShowModal(true);
    };

    const getStockBadge = (status) => {
        const badges = {
            critical: { bg: 'danger', text: '⚠️ Critical' },
            low: { bg: 'warning', text: '⬇️ Low' },
            ok: { bg: 'success', text: '✓ OK' }
        };
        return badges[status] || badges.ok;
    };

    const getExpiryBadge = (status) => {
        const badges = {
            expired: { bg: 'danger', text: '❌ Expired' },
            expiring_soon: { bg: 'warning', text: '⏰ 7 days' },
            expiring: { bg: 'info', text: '📅 30 days' },
            ok: { bg: 'success', text: '✓ OK' }
        };
        return badges[status] || badges.ok;
    };

    const lowStockCount = reagents.filter(r => r.stock_status === 'critical' || r.stock_status === 'low').length;
    const expiringCount = reagents.filter(r => r.expiry_status === 'expired' || r.expiry_status === 'expiring_soon').length;

    if (loading) {
        return (
            <Card className="shadow-sm border-0 p-4 text-center">
                <Spinner animation="border" variant="primary" />
                <div className="mt-2">Loading Inventory...</div>
            </Card>
        );
    }

    return (
        <div className="reagent-inventory">
            {/* Alert Summary */}
            {(lowStockCount > 0 || expiringCount > 0) && (
                <Alert variant="warning" className="d-flex align-items-center gap-3 mb-4">
                    <Bell size={24} />
                    <div>
                        {lowStockCount > 0 && <span className="me-3">🔴 {lowStockCount} reagents low stock</span>}
                        {expiringCount > 0 && <span>⏰ {expiringCount} reagents expiring soon</span>}
                    </div>
                </Alert>
            )}

            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                    <div className="fw-bold d-flex align-items-center gap-2">
                        <Package size={20} className="text-primary" />
                        Reagent Inventory
                    </div>
                    <Button size="sm" variant="primary" onClick={() => { resetForm(); setShowModal(true); }}>
                        <Plus size={16} className="me-1" /> Add Reagent
                    </Button>
                </Card.Header>
                <Table hover responsive className="mb-0">
                    <thead className="bg-light">
                        <tr>
                            <th>Reagent Name</th>
                            <th>Manufacturer</th>
                            <th>Stock</th>
                            <th>Avg Daily (30d)</th>
                            <th>Est. Depletion</th>
                            <th>Status</th>
                            <th>Expiry</th>
                            <th>Location</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reagents.map(r => {
                            const stockBadge = getStockBadge(r.stock_status);
                            const expiryBadge = getExpiryBadge(r.expiry_status);
                            return (
                                <tr key={r.id}>
                                    <td>
                                        <div className="fw-medium">{r.name}</div>
                                        <small className="text-muted">{r.catalog_number}</small>
                                    </td>
                                    <td>{r.manufacturer || '-'}</td>
                                    <td>{r.current_stock} / {r.min_stock_level} {r.unit}</td>
                                    <td>{r.daily_average ? `${parseFloat(r.daily_average).toFixed(2)} ${r.unit}/day` : `0 ${r.unit}/day`}</td>
                                    <td>
                                        {r.days_remaining === null || r.days_remaining === undefined ? (
                                            <span className="text-muted small">No usage history</span>
                                        ) : parseFloat(r.days_remaining) < 10 ? (
                                            <Badge bg="danger">🔴 {r.days_remaining} days left</Badge>
                                        ) : parseFloat(r.days_remaining) < 25 ? (
                                            <Badge bg="warning">⚠️ {r.days_remaining} days left</Badge>
                                        ) : (
                                            <Badge bg="success">✓ {r.days_remaining} days left</Badge>
                                        )}
                                    </td>
                                    <td>
                                        <Badge bg={stockBadge.bg}>{stockBadge.text}</Badge>
                                    </td>
                                    <td>
                                        <div className="small">{r.expiry_date ? new Date(r.expiry_date).toLocaleDateString('en-IN') : '-'}</div>
                                        <div><Badge bg={expiryBadge.bg} style={{ fontSize: '10px' }}>{expiryBadge.text}</Badge></div>
                                    </td>
                                    <td>{r.storage_location || '-'}</td>
                                    <td>
                                        <Button size="sm" variant="outline-info" className="me-1" title="View Forecast" onClick={() => handleViewForecast(r.id)}>
                                            <TrendingDown size={14} />
                                        </Button>
                                        <Button size="sm" variant="outline-primary" onClick={() => openEditModal(r)}>
                                            <Edit size={14} />
                                        </Button>
                                    </td>
                                </tr>
                            );
                        })}
                        {reagents.length === 0 && (
                            <tr>
                                <td colSpan="8" className="text-center text-muted py-4">
                                    No reagents added yet
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </Card>

            {/* Add/Edit Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>{editingReagent ? 'Edit Reagent' : 'Add New Reagent'}</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Reagent Name *</Form.Label>
                                <Form.Control
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g., Complete Blood Count Reagent"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Catalog Number</Form.Label>
                                <Form.Control
                                    value={formData.catalog_number}
                                    onChange={e => setFormData({ ...formData, catalog_number: e.target.value })}
                                    placeholder="e.g., CBC-001"
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Manufacturer</Form.Label>
                                <Form.Control
                                    value={formData.manufacturer}
                                    onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                                    placeholder="e.g., Sysmex"
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Storage Location</Form.Label>
                                <Form.Control
                                    value={formData.storage_location}
                                    onChange={e => setFormData({ ...formData, storage_location: e.target.value })}
                                    placeholder="e.g., Hematology Lab Fridge 2"
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row className="mb-3">
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Current Stock</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={formData.current_stock}
                                    onChange={e => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Minimum Stock Level</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={formData.min_stock_level}
                                    onChange={e => setFormData({ ...formData, min_stock_level: parseInt(e.target.value) || 10 })}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label>Unit</Form.Label>
                                <Form.Select
                                    value={formData.unit}
                                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                >
                                    <option value="tests">Tests</option>
                                    <option value="packs">Packs</option>
                                    <option value="vials">Vials</option>
                                    <option value="ml">mL</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                    </Row>
                    <Row>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Expiry Date</Form.Label>
                                <Form.Control
                                    type="date"
                                    value={formData.expiry_date}
                                    onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={!formData.name}>
                        {editingReagent ? 'Update' : 'Add'} Reagent
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Reagent Stock Forecast Modal */}
            <Modal show={showForecastModal} onHide={() => setShowForecastModal(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title className="d-flex align-items-center gap-2">
                        <TrendingDown className="text-info" />
                        Smart Stock Depletion Forecast: {forecastData?.name}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {forecastLoading ? (
                        <div className="text-center py-5">
                            <Spinner animation="border" variant="info" />
                            <div className="mt-2 text-muted">Calculating inventory consumption statistics...</div>
                        </div>
                    ) : forecastData ? (
                        <div>
                            {/* Summary Cards */}
                            <Row className="mb-4 text-center">
                                <Col md={3}>
                                    <div className="p-3 bg-light rounded shadow-sm">
                                        <div className="small text-muted mb-1">Current Stock</div>
                                        <h4 className="fw-bold mb-0">{forecastData.current_stock} {forecastData.unit}</h4>
                                        <small className="text-muted">Min: {forecastData.min_stock_level}</small>
                                    </div>
                                </Col>
                                <Col md={3}>
                                    <div className="p-3 bg-light rounded shadow-sm">
                                        <div className="small text-muted mb-1">Avg Consumption</div>
                                        <h4 className="fw-bold mb-0 text-info">
                                            {forecastData.daily_average ? `${forecastData.daily_average.toFixed(2)}` : '0'}
                                        </h4>
                                        <small className="text-muted">{forecastData.unit} / day</small>
                                    </div>
                                </Col>
                                <Col md={3}>
                                    <div className="p-3 bg-light rounded shadow-sm">
                                        <div className="small text-muted mb-1">Days Remaining</div>
                                        <h4 className={`fw-bold mb-0 ${
                                            forecastData.days_remaining === null ? 'text-muted' :
                                            forecastData.days_remaining < 10 ? 'text-danger' :
                                            forecastData.days_remaining < 25 ? 'text-warning' : 'text-success'
                                        }`}>
                                            {forecastData.days_remaining !== null ? `${forecastData.days_remaining} days` : 'N/A'}
                                        </h4>
                                        <small className="text-muted">Est. depletion</small>
                                    </div>
                                </Col>
                                <Col md={3}>
                                    <div className="p-3 bg-light rounded shadow-sm">
                                        <div className="small text-muted mb-1">Stockout Date</div>
                                        <h6 className="fw-bold mb-0 text-primary pt-1">
                                            {forecastData.estimated_depletion_date ? 
                                                new Date(forecastData.estimated_depletion_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : 
                                                'Undetermined'}
                                        </h6>
                                        <small className="text-muted">Projected empty</small>
                                    </div>
                                </Col>
                            </Row>

                            {/* Reorder Recommendation Box */}
                            {forecastData.days_remaining !== null && (
                                <Alert variant={forecastData.days_remaining < 10 ? 'danger' : forecastData.days_remaining < 25 ? 'warning' : 'success'} className="mb-4">
                                    <h6 className="fw-bold mb-1">📋 System Reorder Recommendation:</h6>
                                    <div>
                                        {forecastData.days_remaining < 10 ? (
                                            <span><strong>CRITICAL OUT-OF-STOCK RISK:</strong> Current reserves will deplete in less than 10 days. Create a purchase requisition immediately to avoid test service interruptions.</span>
                                        ) : forecastData.days_remaining < 25 ? (
                                            <span><strong>REORDER TRIGGER REACHED:</strong> Stock levels projected to fall below safety limits. Initiate standard procurement cycle.</span>
                                        ) : (
                                            <span><strong>STABLE STOCK LIMITS:</strong> No immediate action required. Inventory is within normal limits for current operational volume.</span>
                                        )}
                                    </div>
                                </Alert>
                            )}

                            {/* Trajectory Chart */}
                            {forecastData.daily_average > 0 ? (
                                <Card className="border-0 shadow-sm p-3 mb-3 bg-white">
                                    <div className="fw-bold mb-2">📉 Stock Depletion Trajectory Projection</div>
                                    <div style={{ height: 260 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart
                                                data={(() => {
                                                    const trajectoryData = [];
                                                    let tempStock = forecastData.current_stock;
                                                    const dailyAvg = forecastData.daily_average;
                                                    for (let i = 0; i <= 20; i++) {
                                                        trajectoryData.push({
                                                            day: `Day ${i}`,
                                                            stock: Math.max(0, Math.round(tempStock * 10) / 10),
                                                            safety_limit: forecastData.min_stock_level
                                                        });
                                                        tempStock -= dailyAvg;
                                                        if (tempStock <= -dailyAvg) break;
                                                    }
                                                    return trajectoryData;
                                                })()}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis dataKey="day" />
                                                <YAxis />
                                                <Tooltip formatter={(value) => [`${value} ${forecastData.unit}`, 'Value']} />
                                                <Line type="monotone" dataKey="stock" name="Projected Stock" stroke="#0dcaf0" strokeWidth={3} activeDot={{ r: 8 }} />
                                                <Line type="dashed" dataKey="safety_limit" name="Min Limit" stroke="#ffc107" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <Form.Text className="text-muted mt-2 text-center d-block">
                                        Trajectory tracks the theoretical linear depletion of stock assuming constant consumption at average rate.
                                    </Form.Text>
                                </Card>
                            ) : (
                                <div className="text-center py-4 border rounded bg-light text-muted">
                                    No consumption logs recorded in the last 30 days. Depletion trajectory cannot be calculated.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center text-danger py-4">Error loading forecasting statistics.</div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowForecastModal(false)}>Close Dashboard</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ReagentInventory;
