import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Tabs, Tab, Modal, InputGroup, Spinner, Badge, Alert } from 'react-bootstrap';
import { Package, ShoppingCart, AlertTriangle, FileText, Check, Search, IndianRupee, Info, Plus, Printer, History } from 'lucide-react';
import api from '../utils/axiosInstance';
import { io } from '../utils/socket-stub';
import { StatsCard, StatusBadge } from '../components/ui';
import { formatCurrency } from '../utils/currency';
import AddDrugModal from '../components/AddDrugModal';
import ProcurementDashboard from '../components/ProcurementDashboard';
import PharmacyReports from '../components/PharmacyReports';
import PharmacyReceiptPrint from '../components/PharmacyReceiptPrint';
import RefundModal from '../components/RefundModal';
// PaymentCollectionModal removed - OPD payments now handled at Billing Counter
import PharmacyIPDOrdersPanel from '../components/PharmacyIPDOrdersPanel';
const PharmacyDashboard = () => {
    const [inventory, setInventory] = useState([]);
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showDispenseModal, setShowDispenseModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);

    const [dispenseQuantity, setDispenseQuantity] = useState(1);
    const [showAddDrugModal, setShowAddDrugModal] = useState(false); // Phase 5

    // Price Management State
    const [showPriceModal, setShowPriceModal] = useState(false);
    const [newPrice, setNewPrice] = useState('');
    const [priceNote, setPriceNote] = useState('');

    const [requestingPrice, setRequestingPrice] = useState(false);

    // Safety Alert State
    const [showSafetyModal, setShowSafetyModal] = useState(false);
    const [safetyRisk, setSafetyRisk] = useState(null);
    const [safetyMessage, setSafetyMessage] = useState('');
    const [safetyAction, setSafetyAction] = useState('DISPENSE'); // 'DISPENSE' or 'PRESCRIPTION'
    const [pendingPrescription, setPendingPrescription] = useState(null);
    const [safetyAlertType, setSafetyAlertType] = useState('ALLERGY_WARNING'); // 'ALLERGY_WARNING' or 'DRUG_INTERACTION'
    const [interactionDetails, setInteractionDetails] = useState(null); // For drug interaction info
    const [heatmapData, setHeatmapData] = useState([]); // Heatmap State
    const [forecastData, setForecastData] = useState([]); // Forecast State

    // Refund State
    const [recentDispenses, setRecentDispenses] = useState([]);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [refundTransaction, setRefundTransaction] = useState(null);

    // Payment state removed - OPD payments now handled at Billing Counter
    // Charges flow to pending_charges table via backend

    // Receipt Print
    const [showReceiptPrint, setShowReceiptPrint] = useState(false);
    const [selectedTransactionForPrint, setSelectedTransactionForPrint] = useState(null);

    const fetchInventory = async () => {
        try {
            const res = await api.get('/api/pharmacy/inventory');
            setInventory(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (err) {
            console.error(err);
        }
    };

    const fetchPrescriptionQueue = async () => {
        try {
            const res = await api.get('/api/pharmacy/queue');
            setPrescriptions(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (err) {
            console.error(err);
        }
    };

    const fetchHeatmap = async () => {
        try {
            const res = await api.get('/api/pharmacy/heatmap');
            setHeatmapData(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (err) {
            console.error("Heatmap fetch error:", err);
        }
    };

    const fetchForecast = async () => {
        try {
            const res = await api.get('/api/pharmacy/forecast');
            setForecastData(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (err) {
            console.error("Forecast fetch error:", err);
        }
    };

    const fetchRecentDispenses = async () => {
        try {
            const res = await api.get('/api/pharmacy/dispenses/recent');
            setRecentDispenses(Array.isArray(res.data) ? res.data : (res.data?.data || []));
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                await Promise.all([fetchInventory(), fetchPrescriptionQueue(), fetchHeatmap(), fetchForecast(), fetchRecentDispenses()]);
            } catch (err) {
                // err is unused but we set error state
                setError('Failed to load pharmacy data. Please try again.');
            }
            setLoading(false);
        };
        loadData();

        const socket = io('/', { path: '/socket.io' });

        socket.on('pharmacy_update', () => {
            fetchPrescriptionQueue();
            fetchInventory();
            fetchRecentDispenses(); // Also update recent dispenses on socket event
        });

        // Poll for recent dispenses (Simulated socket for this specific data)
        const interval = setInterval(() => {
            fetchRecentDispenses();
        }, 10000);

        return () => {
            socket.disconnect();
            clearInterval(interval);
        };
    }, []);

    const openDispenseModal = (item) => {
        setSelectedItem(item);
        setDispenseQuantity(1);
        setShowDispenseModal(true);
        setSafetyAction('DISPENSE');
    };

    const handleDispense = async (force = false) => {
        try {
            await api.post('/api/pharmacy/dispense', {
                patient_id: null, // Basic dispense doesn't link to patient yet in UI, assume ad-hoc or future V2 links this
                item: selectedItem.name,
                quantity: parseInt(dispenseQuantity),
                force: force // Allow override
            });

            // Success
            alert(`✅ Dispensed ${dispenseQuantity} units of ${selectedItem.name}`);
            setShowDispenseModal(false);
            setShowSafetyModal(false); // Close safety modal if open
            fetchInventory();
            fetchRecentDispenses(); // Update recent dispenses after successful dispense
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 409) {
                // Allergy Warning
                setSafetyRisk(err.response.data.risk);
                setSafetyMessage(err.response.data.message);
                setShowSafetyModal(true);
            } else if (err.response && err.response.status === 400) {
                alert(`❌ Error: ${err.response.data.message}`);
            } else {
                alert('❌ Dispense Failed');
            }
        }
    };

    const handleProcessPrescription = async (item, force = false) => {
        try {
            await api.post('/api/pharmacy/process-prescription', {
                task_id: item.id,
                force: force
            });
            alert(`✅ Prescription processed and billed for ${item.patient_name}`);
            setPrescriptions(prescriptions.filter(p => p.id !== item.id));
            setShowSafetyModal(false); // Close if open
            setPendingPrescription(null);
            fetchPrescriptionQueue();
            fetchInventory(); // Update stock view
            fetchRecentDispenses(); // Update recent dispenses after successful prescription processing
        } catch (err) {
            console.error(err);
            if (err.response && err.response.status === 409) {
                // Allergy Warning
                setSafetyRisk(err.response.data.risk);
                setSafetyMessage(err.response.data.message);
                setPendingPrescription(item);
                setSafetyAction('PRESCRIPTION');
                setShowSafetyModal(true);
            } else {
                alert(`❌ Error processing prescription: ${err.response?.data?.message || err.message}`);
            }
        }
    };

    // Filter inventory based on search
    const filteredInventory = inventory.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const openPriceModal = (item) => {
        setSelectedItem(item);
        setNewPrice(item.price_per_unit);
        setPriceNote('');
        setShowPriceModal(true);
    };

    const handlePriceRequest = async () => {
        if (!newPrice || newPrice <= 0) {
            alert('Please enter a valid price');
            return;
        }
        setRequestingPrice(true);
        try {
            await api.post('/api/pharmacy/request-price-change', {
                item_id: selectedItem.id,
                new_price: parseFloat(newPrice),
                notes: priceNote
            });
            alert('✅ Price change request submitted for approval');
            setShowPriceModal(false);
        } catch (err) {
            console.error(err);
            alert(`❌ Failed to submit request: ${err.response?.data?.message || err.message}`);
        } finally {
            setRequestingPrice(false);
        }
    };

    // OPD Payment collection removed - now handled at centralized Billing Counter
    // Charges flow to pending_charges table automatically via backend

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-muted">Loading pharmacy data...</p>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="py-5 text-center">
                <AlertTriangle size={48} className="text-danger mb-3" />
                <h5 className="text-danger">{error}</h5>
                <Button variant="primary" className="mt-3" onClick={() => window.location.reload()}>
                    Retry
                </Button>
            </Container>
        );
    }

    // Calculate dates once per render
    const now = new Date();
    const ninetyDaysFuture = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    return (
        <Container className="py-4">
            <h3 className="fw-bold mb-4">Pharmacy Management</h3>

            <Row className="mb-4 g-3">
                <Col md={4}>
                    <StatsCard
                        title="Total Items"
                        value={inventory.length}
                        icon={<Package />}
                        variant="primary"
                    />
                </Col>
                <Col md={4}>
                    <StatsCard
                        title="Low Stock Alerts"
                        value={inventory.filter(i => i.stock_quantity < i.reorder_level).length}
                        icon={<AlertTriangle />}
                        variant="warning"
                    />
                </Col>
                <Col md={4}>
                    <StatsCard
                        title="Pending Prescriptions"
                        value={prescriptions.length}
                        icon={<FileText />}
                        variant="success"
                    />
                </Col>
            </Row>

            <Tabs 
                defaultActiveKey="queue" 
                className="mb-3"
                mountOnEnter={true}
                unmountOnExit={true}
            >
                <Tab eventKey="queue" title="Prescription Queue">
                    <Card className="shadow-sm border-0">
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th>ID</th>
                                    <th>Patient</th>
                                    <th>Type</th>
                                    <th>Medication</th>
                                    <th>Doctor</th>
                                    <th>Billing</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {prescriptions.map(item => {
                                    // Determine if OPD or IPD based on admission_id
                                    const isIPD = !!item.admission_id;
                                    return (
                                        <tr key={item.id}>
                                        <td>#{item.id}</td>
                                            <td>{item.patient_name}</td>
                                            <td>
                                                <Badge bg={isIPD ? 'info' : 'primary'}>
                                                    {isIPD ? 'IPD' : 'OPD'}
                                                </Badge>
                                            </td>
                                            <td>{item.description}</td>
                                            <td>Dr. {item.created_by}</td>
                                            <td>
                                                {isIPD ? (
                                                    <Badge bg="info" className="d-flex align-items-center gap-1" style={{width: 'fit-content'}}>
                                                        <IndianRupee size={12} /> Bill on Discharge
                                                    </Badge>
                                                ) : (
                                                    <Badge bg="warning" text="dark" className="d-flex align-items-center gap-1" style={{width: 'fit-content'}}>
                                                        <IndianRupee size={12} /> Pending Billing
                                                    </Badge>
                                                )}
                                            </td>
                                            <td><Badge bg="warning">{item.status}</Badge></td>
                                            <td>
                                                <Button
                                                    size="sm"
                                                    variant={isIPD ? 'outline-info' : 'success'}
                                                    onClick={() => handleProcessPrescription(item)}
                                                >
                                                    <Check size={16} className="me-1" />
                                                    {isIPD ? 'Add to Bill' : 'Dispense'}
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {prescriptions.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="text-center p-4 text-muted">No pending prescriptions</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>

                {/* IPD Medicine Orders Tab - From Doctor CPOE */}
                <Tab eventKey="ipd-orders" title={<><Package size={14} className="me-1" /> IPD Orders</>}>
                    <div className="mt-3">
                        <PharmacyIPDOrdersPanel onOrderComplete={fetchPrescriptionQueue} />
                    </div>
                </Tab>

                <Tab eventKey="inventory" title="Inventory">
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-white">
                            {/* SEARCH BAR */}
                            <InputGroup>
                                <InputGroup.Text>
                                    <Search size={18} />
                                </InputGroup.Text>
                                <Form.Control
                                    placeholder="Search or Scan Barcode..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    autoFocus // Ready for scanner input
                                />
                                    {searchQuery && (
                                        <Button variant="outline-secondary" onClick={() => setSearchQuery('')}>
                                            Clear
                                        </Button>
                                    )}
                                    <Button variant="primary" onClick={() => setShowAddDrugModal(true)}>
                                        <Plus size={18} className="me-1" /> Add New Item
                                    </Button>
                                </InputGroup>
                            {searchQuery && (
                                <small className="text-muted mt-2 d-block">
                                    Showing {filteredInventory.length} of {inventory.length} items
                                </small>
                            )}
                        </Card.Header>
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th>Item Details</th>
                                    <th>Rack</th>
                                    <th>Batch / Expiry</th>
                                    <th>Stock</th>
                                    <th>Price (MRP)</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInventory.map(item => {
                                    const isLow = item.stock_quantity < item.reorder_level;
                                    const isExpiringSoon = item.expiry_date && new Date(item.expiry_date) < ninetyDaysFuture;
                                    const isExpired = item.expiry_date && new Date(item.expiry_date) < now;
                                    return (
                                        <tr key={item.id}>
                                            <td>
                                                <div className="fw-bold">
                                                    {item.name}
                                                    {item.schedule_type === 'H1' && <Badge bg="danger" className="ms-2" title="Schedule H1 Drug">H1</Badge>}
                                                </div>
                                                <div className="small text-muted">{item.generic_name}</div>
                                                <div className="small text-secondary fst-italic">{item.manufacturer}</div>
                                                <Badge bg="light" text="dark" className="border mt-1">{item.category}</Badge>
                                            </td>
                                            <td>
                                                <div className="fw-bold">{item.rack_location || '-'}</div>
                                            </td>
                                            <td>
                                                <div><code>{item.batch_number || 'N/A'}</code></div>
                                                {item.expiry_date && (
                                                    <small className={isExpired ? 'text-danger fw-bold' : isExpiringSoon ? 'text-warning' : 'text-muted'}>
                                                        exp: {new Date(item.expiry_date).toLocaleDateString()}
                                                    </small>
                                                )}
                                            </td>
                                            <td>
                                                <h5 className="mb-0">
                                                    <Badge bg={isLow ? 'danger' : 'success'}>
                                                        {item.stock_quantity}
                                                    </Badge>
                                                </h5>
                                                {isLow && <small className="text-danger">Low Stock</small>}
                                            </td>
                                            <td>
                                                <div className="fw-bold">₹{item.price_per_unit}</div>
                                                {item.mrp && <small className="text-muted text-decoration-line-through">MRP: ₹{item.mrp}</small>}
                                                {item.gst_percent > 0 && <div className="small text-info">GST: {item.gst_percent}%</div>}
                                            </td>
                                            <td>
                                                <div className="d-flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="primary"
                                                        onClick={() => openDispenseModal(item)}
                                                        title="Dispense Item"
                                                    >
                                                        <ShoppingCart size={16} />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline-secondary"
                                                        onClick={() => openPriceModal(item)}
                                                        title="Request Price Change"
                                                    >
                                                        <IndianRupee size={16} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );

                                })}
                                {filteredInventory.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="text-center p-4 text-muted">
                                            {searchQuery ? 'No items match your search' : 'No inventory items'}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>

                <Tab eventKey="heatmap" title="Expiry Heatmap (FEFO)">
                    <div className="p-3">
                        <Alert variant="info">
                            <Info size={16} className="me-2" />
                            <strong>FEFO Strategy:</strong> Prioritize dispensing items from <b>Red</b> (Expiring Soon) and <b>Orange</b> blocks.
                        </Alert>
                        <div className="row g-3">
                            {heatmapData.map((group, idx) => {
                                const expiryDate = new Date(group.month + '-01');
                                const now = new Date();
                                const diffMonths = (expiryDate.getFullYear() - now.getFullYear()) * 12 + (expiryDate.getMonth() - now.getMonth());

                                let variant = 'success';
                                let text = 'white';
                                if (diffMonths <= 0) { variant = 'danger'; text = 'white'; } // Expired/Expiring This Month
                                else if (diffMonths <= 3) { variant = 'warning'; text = 'dark'; } // Next 3 Months
                                else { variant = 'success'; text = 'white'; } // Safe

                                return (
                                    <div className="col-md-4 col-lg-3" key={idx}>
                                        <Card bg={variant} text={text} className="h-100 shadow-sm">
                                            <Card.Header className="fw-bold d-flex justify-content-between">
                                                <span>{new Date(group.month).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</span>
                                                <Badge bg="light" text="dark">{group.count}</Badge>
                                            </Card.Header>
                                            <Card.Body>
                                                <ul className="list-unstyled mb-0 small">
                                                    {group.items.slice(0, 5).map(item => (
                                                        <li key={item.id} className="mb-1 border-bottom border-white-50 pb-1">
                                                            {item.name} ({item.stock})
                                                        </li>
                                                    ))}
                                                    {group.items.length > 5 && <li>...and {group.items.length - 5} more</li>}
                                                </ul>
                                            </Card.Body>
                                        </Card>
                                    </div>
                                );
                            })}
                            {heatmapData.length === 0 && <div className="text-muted text-center py-5">No expiry data available.</div>}
                        </div>
                    </div>
                </Tab>

                <Tab eventKey="procurement" title="Procurement">
                    <ProcurementDashboard inventory={inventory} />
                </Tab>

                <Tab eventKey="reports" title="Analytics & Reports">
                    <PharmacyReports />
                </Tab>

                <Tab eventKey="forecast" title="AI Forecast">
                    <div className="p-3">
                        <Alert variant="primary">
                            <div className="d-flex align-items-center">
                                <span className="fs-4 me-2">🤖</span>
                                <div>
                                    <strong>AI Demand Prediction (SMA Model):</strong>
                                    <div className="small">Based on last 30 days consumption. Items with high burn rates and low stock are flagged.</div>
                                </div>
                            </div>
                        </Alert>

                        <Table hover responsive className="mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th>Item Name</th>
                                    <th>Current Stock</th>
                                    <th>Avg Daily Consumption</th>
                                    <th>Days of Supply</th>
                                    <th>Status</th>
                                    <th>Suggested Reorder</th>
                                </tr>
                            </thead>
                            <tbody>
                                {forecastData.map(item => {
                                    const burnRate = parseFloat(item.burn_rate);
                                    return (
                                        <tr key={item.id}>
                                            <td className="fw-bold">{item.name}</td>
                                            <td>{item.current_stock}</td>
                                            <td>{burnRate > 0 ? burnRate.toFixed(1) + ' / day' : '-'}</td>
                                            <td>
                                                <span className={item.days_of_supply < 7 ? 'text-danger fw-bold' : item.days_of_supply < 14 ? 'text-warning fw-bold' : 'text-success'}>
                                                    {item.days_of_supply} days
                                                </span>
                                            </td>
                                            <td>
                                                <Badge bg={item.status === 'Critical' ? 'danger' : item.status === 'Low' ? 'warning' : 'success'}>
                                                    {item.status}
                                                </Badge>
                                            </td>
                                            <td>
                                                {item.suggested_reorder > 0 ? (
                                                    <div className="text-primary fw-bold">
                                                        +{item.suggested_reorder} units
                                                    </div>
                                                ) : (
                                                    <span className="text-muted small">Sufficient</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {forecastData.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="text-center py-4 text-muted">Thinking... (No Data)</td>
                                    </tr>
                                )}
                            </tbody>
                        </Table>
                    </div>
                </Tab>



                <Tab eventKey="recent-dispenses" title="Recent Dispenses & Returns">
                    <Row className="g-3">
                        <Col md={12}>
                            <Card className="shadow-sm border-0">
                                <Card.Header className="bg-white fw-bold">Recent Dispenses</Card.Header>
                                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    <Table hover size="sm" className="mb-0 text-small">
                                        <thead>
                                            <tr>
                                                <th>Item</th>
                                                <th>Qty</th>
                                                <th>Patient</th>
                                                <th>Date</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentDispenses.length > 0 ? (
                                                recentDispenses.map(tx => (
                                                    <tr key={tx.id}>
                                                        <td>
                                                            <div className="fw-bold text-truncate" style={{ maxWidth: '120px' }} title={tx.item_name}>{tx.item_name}</div>
                                                            <small className="text-muted">{tx.batch_number}</small>
                                                        </td>
                                                        <td>{tx.quantity}</td>
                                                        <td>{tx.patient_name || 'Walk-in'}</td>
                                                        <td>{new Date(tx.dispense_date).toLocaleString()}</td>
                                                        <td>
                                                            <Button variant="outline-danger" size="sm" className="py-0 px-2" onClick={() => {
                                                                setRefundTransaction(tx);
                                                                setShowRefundModal(true);
                                                            }}>Return</Button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="text-center text-muted p-3">No recent dispenses.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            </Card>
                        </Col>
                    </Row>
                </Tab>

                <Tab eventKey="history" title={<span><History size={16} className="me-1" />Order History</span>}>
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Past Dispenses (Last 30 Days)</h5>
                            <Badge bg="secondary">{recentDispenses.length} Records</Badge>
                        </Card.Header>
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th>Date & Time</th>
                                    <th>Patient</th>
                                    <th>Medication</th>
                                    <th>Amount</th>
                                    <th>Dispensed By</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentDispenses.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="text-center p-4 text-muted">
                                            No recent dispenses found
                                        </td>
                                    </tr>
                                ) : (
                                    recentDispenses.map((item, idx) => (
                                        <tr key={item.id || idx}>
                                            <td>
                                                <div className="fw-semibold">
                                                    {item.dispense_date
                                                        ? new Date(item.dispense_date).toLocaleDateString()
                                                        : 'N/A'
                                                    }
                                                </div>
                                                <small className="text-muted">
                                                    {item.dispense_date
                                                        ? new Date(item.dispense_date).toLocaleTimeString()
                                                        : ''
                                                    }
                                                </small>
                                            </td>
                                            <td>
                                                <div className="fw-bold">{item.patient_name || 'Unknown'}</div>
                                                {item.patient_phone && (
                                                    <small className="text-muted">{item.patient_phone}</small>
                                                )}
                                            </td>
                                            <td>
                                                <div>{item.medication || item.description}</div>
                                            </td>
                                            <td>
                                                <span className="fw-bold text-success">
                                                    ₹{parseFloat(item.price_per_unit || 0).toFixed(2)}
                                                </span>
                                            </td>
                                            <td>
                                                <small>{item.dispensed_by_name || 'System'}</small>
                                            </td>
                                            <td>
                                                <div className="d-flex gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="outline-primary"
                                                        onClick={() => {
                                                            setSelectedTransactionForPrint(item);
                                                            setShowReceiptPrint(true);
                                                        }}
                                                        title="Print Receipt"
                                                    >
                                                        <Printer size={14} />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline-secondary"
                                                        onClick={() => {
                                                            setRefundTransaction(item);
                                                            setShowRefundModal(true);
                                                        }}
                                                        title="Process Refund"
                                                    >
                                                        Refund
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </Table>
                    </Card>
                </Tab>
            </Tabs>

            {/* DISPENSE MODAL */}
            <Modal show={showDispenseModal} onHide={() => setShowDispenseModal(false)} centered>
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title>Dispense Medication</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Drug Name</Form.Label>
                        <Form.Control
                            value={selectedItem?.name || ''}
                            readOnly
                            disabled
                            className="bg-light"
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Available Stock</Form.Label>
                        <Form.Control
                            value={`${selectedItem?.stock_quantity || 0} units`}
                            readOnly
                            disabled
                            className="bg-light"
                        />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Quantity to Dispense</Form.Label>
                        <Form.Control
                            type="number"
                            min="1"
                            max={selectedItem?.stock_quantity || 1}
                            value={dispenseQuantity}
                            onChange={e => setDispenseQuantity(e.target.value)}
                            autoFocus
                        />
                        <Form.Text className="text-muted">
                            Max: {selectedItem?.stock_quantity || 0} units
                        </Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDispenseModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleDispense}>
                        <Check size={16} className="me-1" /> Confirm Dispense
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* PRICE REQUEST MODAL */}
            <Modal show={showPriceModal} onHide={() => setShowPriceModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Request Price Change</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Alert variant="info" className="d-flex gap-2">
                        <AlertTriangle size={20} />
                        <small>Price changes require Admin approval.</small>
                    </Alert>
                    <Form.Group className="mb-3">
                        <Form.Label>Item Name</Form.Label>
                        <Form.Control
                            value={selectedItem?.name || ''}
                            readOnly
                            disabled
                            className="bg-light"
                        />
                    </Form.Group>
                    <Row>
                        <Col>
                            <Form.Group className="mb-3">
                                <Form.Label>Current Price</Form.Label>
                                <Form.Control
                                    value={selectedItem?.price_per_unit || ''}
                                    readOnly
                                    disabled
                                    className="bg-light"
                                />
                            </Form.Group>
                        </Col>
                        <Col>
                            <Form.Group className="mb-3">
                                <Form.Label className="text-primary fw-bold">New Price</Form.Label>
                                <Form.Control
                                    type="number"
                                    step="0.01"
                                    value={newPrice}
                                    onChange={e => setNewPrice(e.target.value)}
                                    autoFocus
                                />
                            </Form.Group>
                        </Col>
                    </Row>
                    <Form.Group className="mb-3">
                        <Form.Label>Reason / Notes</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={2}
                            value={priceNote}
                            onChange={e => setPriceNote(e.target.value)}
                            placeholder="Why is the price changing?"
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPriceModal(false)}>Cancel</Button>
                    <Button
                        variant="primary"
                        onClick={handlePriceRequest}
                        disabled={requestingPrice}
                    >
                        {requestingPrice ? <Spinner size="sm" /> : <Check size={16} className="me-1" />}
                        Submit Request
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* SAFETY ALERT MODAL */}
            <Modal show={showSafetyModal} onHide={() => setShowSafetyModal(false)} centered backdrop="static" size="lg">
                <Modal.Header closeButton className={safetyAlertType === 'DRUG_INTERACTION' ? 'bg-warning text-dark' : 'bg-danger text-white'}>
                    <Modal.Title><AlertTriangle className="me-2" /> Clinical Safety Alert</Modal.Title>
                </Modal.Header>
                <Modal.Body className="text-center py-4">
                    <AlertTriangle size={48} className={safetyAlertType === 'DRUG_INTERACTION' ? 'text-warning mb-3' : 'text-danger mb-3'} />

                    {safetyAlertType === 'DRUG_INTERACTION' ? (
                        <>
                            <h4 className="text-warning fw-bold">⚠️ Drug-Drug Interaction Detected</h4>
                            <p className="lead">{safetyMessage}</p>

                            {interactionDetails && (
                                <div className="text-start mx-auto" style={{ maxWidth: '500px' }}>
                                    <div className={`alert ${interactionDetails.severity === 'MAJOR' ? 'alert-danger' : 'alert-warning'}`}>
                                        <strong>Severity:</strong>
                                        <Badge bg={interactionDetails.severity === 'MAJOR' ? 'danger' : 'warning'} className="ms-2">
                                            {interactionDetails.severity}
                                        </Badge>
                                    </div>
                                    <div className="alert alert-info">
                                        <strong>Effect:</strong>
                                        <p className="mb-0 mt-1">{interactionDetails.effect}</p>
                                    </div>
                                    <div className="alert alert-success">
                                        <strong>Recommendation:</strong>
                                        <p className="mb-0 mt-1">{interactionDetails.recommendation}</p>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <h4 className="text-danger fw-bold">Drug-Allergy Interaction Detected</h4>
                            <p className="lead">{safetyMessage}</p>
                            <div className="alert alert-warning text-start d-inline-block">
                                <strong>Risk Factor:</strong> Patient has a known allergy to <u>{safetyRisk}</u>.
                            </div>
                        </>
                    )}

                    <p className="mt-3 text-muted small">
                        Proceeding may cause severe adverse reactions. Clinical verification required.
                    </p>
                </Modal.Body>
                <Modal.Footer className="justify-content-center">
                    <Button variant="secondary" size="lg" onClick={() => setShowSafetyModal(false)}>
                        ABORT DISPENSE
                    </Button>
                    <Button variant="outline-danger" onClick={() => {
                        if (safetyAction === 'DISPENSE') handleDispense(true);
                        else handleProcessPrescription(pendingPrescription, true);
                    }}>
                        Override & Dispense (Clinical Override)
                    </Button>
                </Modal.Footer>
            </Modal>
            <PharmacyReceiptPrint
                show={showReceiptPrint}
                onHide={() => setShowReceiptPrint(false)}
                transaction={selectedTransactionForPrint}
            />

            <AddDrugModal
                show={showAddDrugModal}
                onHide={() => setShowAddDrugModal(false)}
                refreshData={fetchInventory}
            />

            <RefundModal
                show={showRefundModal}
                onHide={() => setShowRefundModal(false)}
                transaction={refundTransaction}
                refreshData={() => { fetchInventory(); fetchRecentDispenses(); }}
            />

            {/* PaymentCollectionModal removed - OPD payments now handled at Billing Counter */}
        </Container>
    );
};

export default PharmacyDashboard;

