import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Badge, Spinner, Tabs, Tab } from 'react-bootstrap';
import { IndianRupee, Brain, Clock, CheckCircle, Users, Eye, FileText, Shield, BarChart3, Zap, CreditCard, Building2, Car } from 'lucide-react';
import api from '../utils/axiosInstance';
import InsuranceCommandCenter from './InsuranceCommandCenter';
import ClaimsDashboard from '../components/ClaimsDashboard'; 
import PreauthDashboard from '../components/PreauthDashboard';
import AdvancedReportsDashboard from '../components/AdvancedReportsDashboard';
import AutomationDashboard from '../components/AutomationDashboard';
import POSDashboard from '../components/POSDashboard';
import TPAManagement from '../components/billing/TPAManagement';
import ICD10Coder from '../components/ICD10Coder';
import BillingOptimizer from '../components/BillingOptimizer';
import PatientLedger from '../components/billing/PatientLedger';
import StatsCard from '../components/ui/StatsCard';
import { SimpleBarChart, DonutChart } from '../components/ui/Charts';
import BillingKPIs from '../components/BillingKPIs';

// STUB MISSING COMPONENTS
const ARAgingChart = () => <Card className="p-3 text-center text-muted">AR Aging Chart Placeholder</Card>;
const DenialStats = () => <Card className="p-3 text-center text-muted">Denial Stats Placeholder</Card>;

// Currency formatter helper
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
};

const FinanceDashboard = () => {
    const [outstandingPatients, setOutstandingPatients] = useState([]); // [NEW] Replaced 'invoices' for main view
    const [recentInvoices, setRecentInvoices] = useState([]); // Keep recent for AI tab
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    
    // Ledger State
    const [showLedger, setShowLedger] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState(null);

    // AI & Payment State
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentInvoice, setPaymentInvoice] = useState(null);
    const [paymentForm, setPaymentForm] = useState({ amount: '', mode: 'Cash', reference: '' });
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [parkingStats, setParkingStats] = useState(null);
    const [stats, setStats] = useState({ total_revenue: 0, pending_count: 0, paid_count: 0 });

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([
                fetchOutstandingPatients(), 
                fetchParkingStats(), 
                fetchInvoices() // Keep for AI tab & stats
            ]);
            setLoading(false);
        };
        loadData();
    }, []);

    const fetchParkingStats = async () => {
        try {
            const res = await api.get('/api/parking/stats');
            setParkingStats(res.data?.data || null);
        } catch (err) { console.error("Failed to fetch parking stats", err); }
    };

    const fetchOutstandingPatients = async () => {
        try {
            const res = await api.get('/api/finance/outstanding-patients');
            setOutstandingPatients(res.data?.data || []);
        } catch (err) {
            console.error("Failed to fetch outstanding patients", err);
            setOutstandingPatients([]);
        }
    };

    const fetchInvoices = async () => {
        try {
            const res = await api.get('/api/finance/invoices');
            const invs = res.data?.data || [];
            if (Array.isArray(invs)) {
                setRecentInvoices(invs); // Used for AI tab
                // Calculate Stats
                setStats({
                    total_revenue: invs.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0),
                    pending_count: invs.filter(inv => inv.status === 'Pending').length,
                    paid_count: invs.filter(inv => inv.status === 'Paid').length
                });
            }
        } catch (err) { console.error(err); }
    };


    // Handle Pay button click - fetch invoice items for charge breakdown
    const handlePayClick = async (invoice) => {
        setPaymentInvoice({
            ...invoice,
            total_amount: invoice.amount || invoice.total_amount, // Handle both ledger item and invoice object
            id: invoice.reference_id || invoice.id 
        });
        setPaymentForm({ amount: invoice.balance || invoice.total_amount || '', mode: 'Cash', reference: '' });
        setShowPaymentModal(true);
        
        // Fetch invoice items for charge breakdown
        try {
            const res = await api.get(`/api/finance/invoices/${invoice.reference_id || invoice.id}/items`);
            const items = res.data?.data || res.data || [];
            setPaymentInvoice(prev => ({ ...prev, items }));
        } catch (err) {
            console.error('Error fetching invoice items:', err);
        }
    };

    // Open Ledger
    const handleViewLedger = (patient) => {
        setSelectedPatient(patient);
        setShowLedger(true);
    };

    // Handle AI button click - switch to AI Billing tab
    const handleAIClick = (invoice) => {
        setSelectedInvoice(invoice);
        setActiveTab('ai-billing');
    };

    // Process payment
    const handlePaymentSubmit = async () => {
        if (!paymentInvoice || !paymentForm.amount) return;
        setPaymentLoading(true);
        try {
            await api.post(`/api/finance/invoices/${paymentInvoice.id}/pay`, {
                amount: parseFloat(paymentForm.amount),
                mode: paymentForm.mode,
                reference_number: paymentForm.reference
            });
            alert('Payment recorded successfully!');
            setShowPaymentModal(false);
            
            // Refresh ALL data
            fetchOutstandingPatients();
            fetchInvoices();
            // If ledger is open, we might need to trigger a refresh there too? 
            // We can close ledger or just let user re-open. 
            // Ideally pass a refresh trigger to Ledger, but closing/reopening is fine for now.
            if (showLedger) {
                // Force re-render of ledger? 
                // We'll simplisticly just keep it open, but it won't auto-update until re-opened or we pass a key.
                // Better: close it to force refresh when opened again.
                setShowLedger(false); 
                setTimeout(() => {
                    alert("Payment Success. Please re-open ledger to see updated balance.");
                }, 500); 
            }

        } catch (error) {
            console.error('Payment error:', error);
            alert('Failed to record payment');
        } finally {
            setPaymentLoading(false);
        }
    };

    // Calculate Dynamic Charts
    const getWeeklyRevenue = () => {
        const last7Days = [...Array(7)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        return last7Days.map(dateStr => {
            const dayName = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
            const dayTotal = recentInvoices
                .filter(inv => inv.generated_at && inv.generated_at.startsWith(dateStr))
                .reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
            return { label: dayName, value: dayTotal };
        });
    };

    const weeklyRevenue = getWeeklyRevenue();

    const paymentStatus = [
        { label: 'Paid', value: stats.paid_count, color: '#198754' },
        { label: 'Pending', value: stats.pending_count, color: '#ffc107' },
        { label: 'Overdue', value: recentInvoices.filter(i => i.status === 'Overdue').length, color: '#dc3545' }
    ];

    if (loading) {
        return (
            <Container className="py-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-muted">Loading finance data...</p>
            </Container>
        );
    }

    return (
        <Container fluid className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold mb-0">Finance & Billing</h3>
                <div className="d-flex gap-2">
                    <Badge bg="success" className="py-2 px-3">
                        <IndianRupee size={14} className="me-1" />
                        Revenue: {formatCurrency(stats.total_revenue)}
                    </Badge>
                    <Badge bg="primary" className="py-2 px-3">
                        <Brain size={14} className="me-1" />
                        AI Billing Active
                    </Badge>
                </div>
            </div>

            <Tabs 
                activeKey={activeTab} 
                onSelect={k => setActiveTab(k)} 
                className="mb-4"
                mountOnEnter={true}
                unmountOnExit={true}
            >
                <Tab eventKey="overview" title={<><IndianRupee size={14} className="me-1" />Overview</>}>
                    {/* Stats Row */}
                    <Row className="mb-4 g-3">
                        <Col md={3}>
                            <StatsCard
                                title="Total Revenue"
                                value={formatCurrency(stats.total_revenue)}
                                icon={<IndianRupee />}
                                variant="success"
                            />
                        </Col>
                        <Col md={3}>
                            <StatsCard
                                title="Parking Revenue"
                                value={parkingStats ? formatCurrency(parkingStats.revenue_today) : '...'}
                                icon={<Car />}
                                variant="info"
                            />
                        </Col>
                        <Col md={3}>
                            <StatsCard
                                title="Pending Invoices"
                                value={stats.pending_count} // Keep count of invoices for stats, but show patients in table
                                icon={<Clock />}
                                variant="warning"
                            />
                        </Col>
                        <Col md={3}>
                            <StatsCard
                                title="Paid This Month"
                                value={stats.paid_count}
                                icon={<CheckCircle />}
                                variant="primary"
                            />
                        </Col>
                    </Row>

                    <Row>
                        {/* Outstanding Patients Table (Replaces Invoice List) */}
                        <Col lg={8}>
                            <Card className="shadow-sm border-0 mb-4">
                                <Card.Header className="bg-white fw-bold d-flex justify-content-between align-items-center">
                                    <span><Users size={16} className="me-2 text-primary" />Outstanding Accounts (Patient-Centric)</span>
                                    <Badge bg="warning" text="dark">{outstandingPatients.length} Patients</Badge>
                                </Card.Header>
                                <Table hover responsive className="mb-0 align-middle">
                                    <thead className="bg-light">
                                        <tr>
                                            <th>Patient Name</th>
                                            <th>Contact</th>
                                            <th className="text-center">Pending Bills</th>
                                            <th className="text-end">Total Due</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {outstandingPatients.map(p => (
                                            <tr key={p.patient_id}>
                                                <td>
                                                    <div className="fw-bold">{p.patient_name}</div>
                                                    <div className="small text-muted">UHID: {p.patient_uhid}</div>
                                                </td>
                                                <td className="small">{p.patient_phone || 'N/A'}</td>
                                                <td className="text-center">
                                                    <Badge bg="secondary" pill>{p.invoice_count}</Badge>
                                                </td>
                                                <td className="text-end fw-bold text-danger">
                                                    {formatCurrency(p.current_balance)}
                                                </td>
                                                <td>
                                                    <Button
                                                        size="sm"
                                                        variant="outline-primary"
                                                        onClick={() => handleViewLedger(p)}
                                                    >
                                                        <Eye size={14} className="me-1" /> View Ledger
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {outstandingPatients.length === 0 && (
                                            <tr>
                                                <td colSpan="5" className="text-center text-muted py-5">
                                                    <CheckCircle size={32} className="mb-2 text-success opacity-50" />
                                                    <p className="mb-0">No outstanding patient accounts.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </Table>
                            </Card>
                        </Col>

                        {/* Charts Sidebar */}
                        <Col lg={4}>
                            <Card className="shadow-sm border-0 mb-4">
                                <Card.Header className="bg-white fw-bold">Weekly Revenue</Card.Header>
                                <Card.Body>
                                    <SimpleBarChart data={weeklyRevenue} height={150} />
                                </Card.Body>
                            </Card>

                            <Card className="shadow-sm border-0">
                                <Card.Header className="bg-white fw-bold">Payment Status</Card.Header>
                                <Card.Body>
                                    <DonutChart
                                        data={paymentStatus}
                                        size={120}
                                        centerText={`${recentInvoices.length}`}
                                    />
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Phase 1 KPIs Row */}
                    <Row className="g-3 mt-2">
                        <Col lg={4}>
                            <ARAgingChart />
                        </Col>
                        <Col lg={4}>
                            <BillingKPIs />
                        </Col>
                        <Col lg={4}>
                            <DenialStats />
                        </Col>
                    </Row>
                </Tab>

                <Tab eventKey="claims" title={<><Shield size={14} className="me-1" />Insurance Claims</>}>
                    <ClaimsDashboard />
                </Tab>

                <Tab eventKey="preauth" title={<><Shield size={14} className="me-1" />Pre-Authorization</>}>
                    <PreauthDashboard />
                </Tab>

                <Tab eventKey="reports" title={<><BarChart3 size={14} className="me-1" />Reports</>}>
                    <AdvancedReportsDashboard />
                </Tab>

                <Tab eventKey="automation" title={<><Zap size={14} className="me-1" />Automation</>}>
                    <AutomationDashboard />
                </Tab>

                <Tab eventKey="pos" title={<><CreditCard size={14} className="me-1" />POS Terminals</>}>
                    <POSDashboard />
                </Tab>

                <Tab eventKey="tpa-settings" title={<><Building2 size={14} className="me-1" />TPA Management</>}>
                    <TPAManagement />
                </Tab>

                <Tab eventKey="ai-billing" title={<><Brain size={14} className="me-1" />AI Billing</>}>
                    <Row>
                        <Col lg={selectedInvoice ? 6 : 12}>
                            <Card className="border-0 shadow-sm mb-4">
                                <Card.Header className="bg-white">
                                    <h6 className="mb-0">
                                        <FileText size={16} className="me-2" />
                                        Select Invoice for AI Analysis
                                    </h6>
                                </Card.Header>
                                <Card.Body>
                                    <Table size="sm" hover>
                                        <thead>
                                            <tr>
                                                <th>Invoice</th>
                                                <th>Patient</th>
                                                <th>Amount</th>
                                                <th>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recentInvoices.map(inv => (
                                                <tr
                                                    key={inv.id}
                                                    className={selectedInvoice?.id === inv.id ? 'table-primary' : ''}
                                                >
                                                    <td>#{inv.id}</td>
                                                    <td>{inv.patient_name}</td>
                                                    <td>{formatCurrency(inv.total_amount)}</td>
                                                    <td>
                                                        <Button
                                                            size="sm"
                                                            variant={selectedInvoice?.id === inv.id ? 'primary' : 'outline-primary'}
                                                            onClick={() => setSelectedInvoice(inv)}
                                                        >
                                                            {selectedInvoice?.id === inv.id ? 'Selected' : 'Analyze'}
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </Card.Body>
                            </Card>

                            {/* ICD-10 Coder */}
                            <ICD10Coder onCodesSelected={(codes) => console.log('Selected:', codes)} />
                        </Col>

                        {selectedInvoice && (
                            <Col lg={6}>
                                <BillingOptimizer
                                    invoiceData={{
                                        ...selectedInvoice,
                                        items: selectedInvoice.items || []
                                    }}
                                    claimData={{
                                        claim_amount: parseFloat(selectedInvoice.total_amount || 0),
                                        preauth_approved: false,
                                        documentation_score: 75,
                                        length_of_stay: 3,
                                        room_type: 'semi'
                                    }}
                                    onOptimized={(results) => console.log('Optimization:', results)}
                                />
                            </Col>
                        )}
                    </Row>
                </Tab>
            </Tabs>

            {/* Patient Ledger Modal [NEW] */}
            <PatientLedger
                show={showLedger}
                onHide={() => setShowLedger(false)}
                patient={selectedPatient}
                onPayInvoice={handlePayClick} 
            />

            {/* Payment Modal - ENHANCED with charge breakdown */}
            <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} centered size="lg">
                <Modal.Header closeButton className="bg-success text-white">
                    <Modal.Title><IndianRupee size={20} className="me-2" />Record Payment</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {paymentInvoice && (
                        <div>
                            {/* Patient & Invoice Summary */}
                            <div className="bg-light p-3 rounded mb-3">
                                <Row className="mb-2">
                                    <Col md={3}>
                                        <small className="text-muted">Invoice</small>
                                        <div className="fw-bold">#{paymentInvoice.id}</div>
                                    </Col>
                                    <Col md={5}>
                                        <small className="text-muted">Patient</small>
                                        <div className="fw-bold">{paymentInvoice.patient_name}</div>
                                        <div className="small text-muted">
                                            {paymentInvoice.patient_number && <span>📞 {paymentInvoice.patient_number}</span>}
                                        </div>
                                    </Col>
                                    <Col md={4}>
                                        <small className="text-muted">Total Amount</small>
                                        <div className="fw-bold text-success fs-5">{formatCurrency(paymentInvoice.total_amount)}</div>
                                    </Col>
                                </Row>
                            </div>

                            {/* Charge Breakdown - What are the charges for? */}
                            <Card className="mb-3 border-info">
                                <Card.Header className="bg-info bg-opacity-10 py-2">
                                    <span className="fw-bold">📋 What are the charges for?</span>
                                </Card.Header>
                                <Card.Body className="py-2">
                                    {paymentInvoice.items && paymentInvoice.items.length > 0 ? (
                                        <Table size="sm" className="mb-0">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Description</th>
                                                    <th className="text-center">Qty</th>
                                                    <th className="text-end">Rate</th>
                                                    <th className="text-end">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {paymentInvoice.items.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td>{item.description || item.name}</td>
                                                        <td className="text-center">{item.quantity || 1}</td>
                                                        <td className="text-end">{formatCurrency(item.unit_price || 0)}</td>
                                                        <td className="text-end fw-bold">{formatCurrency(item.total_price || 0)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    ) : (
                                        <div className="text-muted small text-center py-2">
                                             'No itemized charges available (click View on invoice for details)'
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>

                            <Form.Group className="mb-3">
                                <Form.Label>Payment Amount *</Form.Label>
                                <Form.Control
                                    type="number"
                                    value={paymentForm.amount}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                    placeholder="Enter amount"
                                />
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Payment Mode</Form.Label>
                                <Form.Select
                                    value={paymentForm.mode}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })}
                                >
                                    <option>Cash</option>
                                    <option>Card</option>
                                    <option>UPI</option>
                                    <option>Net Banking</option>
                                    <option>Cheque</option>
                                    <option>Insurance</option>
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Reference Number</Form.Label>
                                <Form.Control
                                    value={paymentForm.reference}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                                    placeholder="Transaction ID / Cheque No"
                                />
                            </Form.Group>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
                    <Button variant="success" onClick={handlePaymentSubmit} disabled={paymentLoading}>
                        {paymentLoading ? <Spinner size="sm" /> : <><IndianRupee size={16} className="me-1" /> Record Payment</>}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default FinanceDashboard;
