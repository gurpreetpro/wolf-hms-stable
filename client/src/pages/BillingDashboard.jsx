import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Button, Form, Modal, Badge, Spinner, InputGroup, Alert } from 'react-bootstrap';
import {
    IndianRupee, Search, Plus, FileText, Receipt, CreditCard,
    TrendingUp, Clock, AlertCircle, Check, X, Download,
    Calendar, User, Eye, Printer, BarChart3, Shield
} from 'lucide-react';
import api from '../utils/axiosInstance';
import { formatCurrency } from '../utils/currency';
import InvoicePrint from '../components/InvoicePrint';
import '../styles/print.css';
import FloatingSettingsButton from '../components/settings/FloatingSettingsButton';
import BillingSettingsTab from '../components/billing/BillingSettingsTab';
import AdvancePaymentModal from '../components/billing/AdvancePaymentModal';
import RefundModal from '../components/billing/RefundModal';
import NewInvoiceModal from '../components/billing/NewInvoiceModal';
import PaymentSettingsTab from '../components/billing/PaymentSettingsTab';
import PaymentConfirmationModal from '../components/billing/PaymentConfirmationModal';
import LabPaymentsTab from '../components/billing/LabPaymentsTab';
import BillingLeakageTracker from '../components/billing/BillingLeakageTracker';
import BillingQueueTab from '../components/billing/BillingQueueTab'; // Gold Standard
import AdvancedReportsDashboard from '../components/AdvancedReportsDashboard';

const BillingDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState([]);
    const [stats, setStats] = useState({
        todayRevenue: 0,
        pendingInvoices: 0,
        overdueCount: 0,
        monthlyTarget: 78
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showPatientModal, setShowPatientModal] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [showSummaryModal, setShowSummaryModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [invoiceItems, setInvoiceItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [paymentForm, setPaymentForm] = useState({ mode: 'Cash', amount: '', reference: '' });
    const [successMessage, setSuccessMessage] = useState('');
    const [showInvoicePrint, setShowInvoicePrint] = useState(false);
    const [showSettingsTab, setShowSettingsTab] = useState(false);
    const [showAdvanceModal, setShowAdvanceModal] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [agingFilter, setAgingFilter] = useState('all'); // all, fresh, attention, followup, overdue, critical
    const [settingsActiveTab, setSettingsActiveTab] = useState('billing'); // billing, payment
    const [showPaymentConfirmation, setShowPaymentConfirmation] = useState(false);
    const [showLabPaymentsModal, setShowLabPaymentsModal] = useState(false);
    const [showLeakageTracker, setShowLeakageTracker] = useState(false);
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
    const [showBillingQueue, setShowBillingQueue] = useState(false); // Gold Standard Billing Queue

    const fetchBillingData = useCallback(async () => {
        try {
            const invoicesRes = await api.get('/api/finance/invoices');
            // [FIX] Unwrap the 'data' property from the standardized response
            const allInvoices = invoicesRes.data?.data || [];
            setInvoices(allInvoices);

            // Calculate stats
            const today = new Date().toDateString();
            const todayPaid = allInvoices.filter(
                i => new Date(i.generated_at).toDateString() === today && i.status === 'Paid'
            );
            const todayRevenue = todayPaid.reduce((sum, i) => sum + parseFloat(i.total_amount || 0), 0);
            const pending = allInvoices.filter(i => i.status === 'Pending').length;

            // Calculate overdue (more than 7 days old pending invoices)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const overdue = allInvoices.filter(i => {
                if (i.status !== 'Pending') return false;
                const invoiceDate = new Date(i.generated_at);
                return invoiceDate < sevenDaysAgo;
            }).length;

            setStats({ todayRevenue, pendingInvoices: pending, overdueCount: overdue, monthlyTarget: 78 });

            // Build real transactions from paid invoices
            const paidToday = allInvoices
                .filter(i => i.status === 'Paid')
                .slice(0, 5)
                .map(i => ({
                    time: new Date(i.generated_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                    text: `Payment received - ${formatCurrency(i.total_amount)} (${i.patient_name})`,
                    type: 'success'
                }));

            setRecentTransactions(paidToday.length > 0 ? paidToday : [
                { time: 'Now', text: 'No payments recorded today', type: 'info' }
            ]);

            setLoading(false);
        } catch (err) {
            console.error('Error fetching billing data:', err);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBillingData();
    }, [fetchBillingData]);

    // Handle Record Payment click from invoice row
    const handleRecordPayment = (invoice) => {
        setSelectedInvoice(invoice);
        // Default to balance due (total - already paid)
        const balanceDue = parseFloat(invoice.total_amount) - parseFloat(invoice.amount_paid || 0);
        setPaymentForm({ mode: 'Cash', amount: balanceDue, reference: '' });
        // Use new PaymentConfirmationModal instead of old modal
        setShowPaymentConfirmation(true);
    };

    // Handle View Patient Details - fetch invoice items
    const handleViewPatient = async (invoice) => {
        setSelectedInvoice(invoice);
        setInvoiceItems([]);
        setLoadingItems(true);
        setShowPatientModal(true);

        try {
            const res = await api.get(`/api/finance/invoices/${invoice.id}/items`);
            setInvoiceItems(res.data?.data || []);
        } catch (err) {
            console.error('Error fetching invoice items:', err);
        } finally {
            setLoadingItems(false);
        }
    };

    // Submit Payment (supports partial payments)
    const handlePaymentSubmit = async () => {
        try {
            const response = await api.post(`/api/finance/invoices/${selectedInvoice.id}/pay`, {
                amount: parseFloat(paymentForm.amount),
                payment_mode: paymentForm.mode,
                reference_number: paymentForm.reference
            });
            setShowPaymentModal(false);
            const result = response.data?.data || response.data; // Handle unwrapped or wrapped
            if (result.invoice?.status === 'Paid') {
                setSuccessMessage(`Full payment of ${formatCurrency(paymentForm.amount)} recorded! Invoice is now PAID.`);
            } else {
                setSuccessMessage(`Partial payment of ${formatCurrency(paymentForm.amount)} recorded. Balance due: ${formatCurrency(result.invoice?.balance_due)}`);
            }
            setTimeout(() => setSuccessMessage(''), 4000);
            fetchBillingData();
        } catch (err) {
            console.error('Payment error:', err);
            setShowPaymentModal(false);
            const errorMsg = err.response?.data?.message || 'Payment failed';
            setSuccessMessage(`Error: ${errorMsg}`);
            setTimeout(() => setSuccessMessage(''), 4000);
        }
    };

    // Quick Action: Generate Report
    const handleGenerateReport = () => {
        setShowReportModal(true);
    };

    // Quick Action: Print Receipt (select an invoice first)
    const handlePrintReceipt = async () => {
        if (invoices.length === 0) {
            alert('No invoices available to print');
            return;
        }
        // Find a paid invoice to print
        const paidInvoice = invoices.find(i => i.status === 'Paid') || invoices[0];
        handlePrintInvoice(paidInvoice);
    };

    // Open Invoice Print Preview
    const handlePrintInvoice = async (invoice) => {
        setSelectedInvoice(invoice);
        setInvoiceItems([]);
        setLoadingItems(true);
        setShowInvoicePrint(true); // Show modal immediately with loading state

        try {
            const res = await api.get(`/api/finance/invoices/${invoice.id}/items`);
            setInvoiceItems(res.data?.data || []);
        } catch (err) {
            console.error('Error fetching invoice items:', err);
        } finally {
            setLoadingItems(false);
        }
    };

    // Quick Action: Record Payment (opens payment modal with first pending)
    const handleQuickPayment = () => {
        const pendingInvoice = invoices.find(i => i.status === 'Pending');
        if (!pendingInvoice) {
            alert('No pending invoices to process');
            return;
        }
        handleRecordPayment(pendingInvoice);
    };

    // Quick Action: Daily Summary
    const handleDailySummary = () => {
        setShowSummaryModal(true);
    };

    // Get aging information based on Indian hospital standards
    const getAgingInfo = (invoice) => {
        if (invoice.status === 'Paid') {
            return { category: 'paid', days: 0, label: 'Paid', color: 'success', emoji: '✅' };
        }
        
        const createdDate = new Date(invoice.generated_at);
        const now = new Date();
        const diffHours = Math.floor((now - createdDate) / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);
        
        // Indian Hospital Escalation Timeline
        if (diffHours < 24) {
            return { category: 'fresh', days: 0, hours: diffHours, label: 'Fresh', color: 'success', emoji: '🟢' };
        } else if (diffDays <= 3) {
            return { category: 'attention', days: diffDays, label: `${diffDays}d`, color: 'warning', emoji: '🟡', action: 'Send Reminder' };
        } else if (diffDays <= 7) {
            return { category: 'followup', days: diffDays, label: `${diffDays}d`, color: 'orange', emoji: '🟠', action: 'Follow-up Call' };
        } else if (diffDays <= 30) {
            return { category: 'overdue', days: diffDays, label: `${diffDays}d`, color: 'danger', emoji: '🔴', action: 'Payment Plan' };
        } else if (diffDays <= 90) {
            return { category: 'critical', days: diffDays, label: `${diffDays}d`, color: 'dark', emoji: '⚫', action: 'Escalate to Manager' };
        } else {
            return { category: 'collections', days: diffDays, label: `${diffDays}d`, color: 'dark', emoji: '⛔', action: 'Collections' };
        }
    };

    const filteredInvoices = invoices.filter(inv => {
        // Text search
        const matchesSearch = inv.patient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            inv.id?.toString().includes(searchTerm);
        if (!matchesSearch) return false;
        
        // Aging filter
        if (agingFilter === 'all') return true;
        const aging = getAgingInfo(inv);
        return aging.category === agingFilter;
    });

    const getStatusBadge = (status, generatedAt, invoice) => {
        const aging = getAgingInfo(invoice);
        
        if (status === 'Paid') {
            return <Badge bg="success"><Check size={12} /> Paid</Badge>;
        }
        
        if (status === 'Partial') {
            const paid = formatCurrency(invoice?.amount_paid || 0);
            const total = formatCurrency(invoice?.total_amount || 0);
            return <Badge bg="info"><IndianRupee size={12} /> Partial ({paid}/{total})</Badge>;
        }
        
        // Enhanced aging-based status
        const bgColor = aging.color === 'orange' ? 'warning' : aging.color;
        return (
            <Badge 
                bg={bgColor} 
                text={aging.color === 'warning' ? 'dark' : 'white'}
                className="d-flex align-items-center gap-1"
            >
                <span>{aging.emoji}</span>
                {aging.category === 'fresh' ? 'Fresh' : `${aging.days}d overdue`}
            </Badge>
        );
    };

    // Calculate daily summary data
    const getDailySummary = () => {
        const today = new Date().toDateString();
        const todayInvoices = invoices.filter(i => new Date(i.generated_at).toDateString() === today);
        const todayPaid = todayInvoices.filter(i => i.status === 'Paid');
        const todayPending = todayInvoices.filter(i => i.status === 'Pending');

        return {
            totalInvoices: todayInvoices.length,
            paidCount: todayPaid.length,
            paidAmount: todayPaid.reduce((sum, i) => sum + parseFloat(i.total_amount || 0), 0),
            pendingCount: todayPending.length,
            pendingAmount: todayPending.reduce((sum, i) => sum + parseFloat(i.total_amount || 0), 0),
        };
    };

    if (loading) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                <Spinner animation="border" variant="primary" />
            </Container>
        );
    }

    return (
        <Container fluid className="py-4">
            {/* Success Message */}
            {successMessage && (
                <Alert variant="success" className="mb-3" onClose={() => setSuccessMessage('')} dismissible>
                    <Check size={18} className="me-2" /> {successMessage}
                </Alert>
            )}

            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="fw-bold mb-1">
                        <IndianRupee size={28} className="me-2 text-success" />
                        Billing & Finance
                    </h2>
                    <small className="text-muted">Manage invoices, payments, and billing reports</small>
                </div>
                <div className="d-flex gap-2">
                    <Button variant="outline-primary" onClick={() => setShowInvoiceModal(true)}>
                        <Plus size={18} className="me-1" /> New Invoice
                    </Button>
                    <Button variant="primary" style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none' }} onClick={() => setShowAnalyticsModal(true)}>
                         <BarChart3 size={18} className="me-1" /> Analytics
                    </Button>
                    <Button variant="success" onClick={handleGenerateReport}>
                        <Download size={18} className="me-1" /> Export
                    </Button>
                </div>
            </div>

            {/* Stats Cards - Minimal Glass Panel Design */}
            <Row className="g-3 mb-4">
                <Col xs={6} md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ borderLeft: '4px solid var(--accent-primary, #20c997)' }}>
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <small className="text-muted text-uppercase" style={{fontSize: '0.7rem', letterSpacing: '0.5px'}}>Today's Collection</small>
                                    <h3 className="fw-bold mb-0" style={{color: 'var(--accent-primary, #20c997)'}}>{formatCurrency(stats.todayRevenue)}</h3>
                                </div>
                                <div className="p-2 rounded" style={{background: 'rgba(32, 201, 151, 0.1)'}}>
                                    <IndianRupee size={24} style={{color: 'var(--accent-primary, #20c997)'}} />
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xs={6} md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ borderLeft: '4px solid var(--warning, #f59e0b)' }}>
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <small className="text-muted text-uppercase" style={{fontSize: '0.7rem', letterSpacing: '0.5px'}}>Pending Invoices</small>
                                    <h3 className="fw-bold mb-0" style={{color: 'var(--warning, #f59e0b)'}}>{stats.pendingInvoices}</h3>
                                </div>
                                <div className="p-2 rounded" style={{background: 'rgba(245, 158, 11, 0.1)'}}>
                                    <Clock size={24} style={{color: 'var(--warning, #f59e0b)'}} />
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xs={6} md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ borderLeft: '4px solid var(--danger, #ef4444)' }}>
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <small className="text-muted text-uppercase" style={{fontSize: '0.7rem', letterSpacing: '0.5px'}}>Overdue Bills</small>
                                    <h3 className="fw-bold mb-0" style={{color: 'var(--danger, #ef4444)'}}>{stats.overdueCount}</h3>
                                </div>
                                <div className="p-2 rounded" style={{background: 'rgba(239, 68, 68, 0.1)'}}>
                                    <AlertCircle size={24} style={{color: 'var(--danger, #ef4444)'}} />
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col xs={6} md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ borderLeft: '4px solid var(--info, #3b82f6)' }}>
                        <Card.Body>
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <small className="text-muted text-uppercase" style={{fontSize: '0.7rem', letterSpacing: '0.5px'}}>Monthly Target</small>
                                    <h3 className="fw-bold mb-0" style={{color: 'var(--info, #3b82f6)'}}>{stats.monthlyTarget}%</h3>
                                </div>
                                <div className="p-2 rounded" style={{background: 'rgba(59, 130, 246, 0.1)'}}>
                                    <TrendingUp size={24} style={{color: 'var(--info, #3b82f6)'}} />
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Quick Actions - Clean Minimal Design */}
            <Card className="border-0 shadow-sm mb-4">
                <Card.Body className="py-3">
                    <div className="d-flex align-items-center justify-content-between mb-3">
                        <h6 className="fw-bold mb-0 text-muted text-uppercase" style={{fontSize: '0.75rem', letterSpacing: '0.5px'}}>Quick Actions</h6>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                        {/* Primary Actions - Solid Primary Color */}
                        <Button 
                            variant="primary"
                            className="d-flex align-items-center gap-2 px-3 py-2"
                            onClick={() => setShowBillingQueue(true)}
                        >
                            <FileText size={16} /> Billing Queue
                        </Button>
                        <Button 
                            variant="primary"
                            className="d-flex align-items-center gap-2 px-3 py-2"
                            onClick={handleQuickPayment}
                        >
                            <CreditCard size={16} /> Record Payment
                        </Button>
                        <Button 
                            variant="primary"
                            className="d-flex align-items-center gap-2 px-3 py-2"
                            onClick={() => setShowInvoiceModal(true)}
                        >
                            <Plus size={16} /> New Invoice
                        </Button>
                        
                        {/* Divider */}
                        <div className="border-start mx-2" style={{height: '32px'}}></div>
                        
                        {/* Secondary Actions - Outline */}
                        <Button 
                            variant="outline-secondary"
                            className="d-flex align-items-center gap-2 px-3 py-2"
                            onClick={handleGenerateReport}
                        >
                            <BarChart3 size={16} /> Reports
                        </Button>
                        <Button 
                            variant="outline-secondary"
                            className="d-flex align-items-center gap-2 px-3 py-2"
                            onClick={handleDailySummary}
                        >
                            <Calendar size={16} /> Daily Summary
                        </Button>
                        <Button 
                            variant="outline-secondary"
                            className="d-flex align-items-center gap-2 px-3 py-2"
                            onClick={handlePrintReceipt}
                        >
                            <Printer size={16} /> Print Receipt
                        </Button>
                        <Button 
                            variant="outline-secondary"
                            className="d-flex align-items-center gap-2 px-3 py-2"
                            onClick={() => navigate('/insurance')}
                        >
                            <Shield size={16} /> Insurance Claims
                        </Button>
                        
                        {/* Divider */}
                        <div className="border-start mx-2" style={{height: '32px'}}></div>
                        
                        {/* Financial Actions */}
                        <Button 
                            variant="outline-secondary"
                            className="d-flex align-items-center gap-2 px-3 py-2"
                            onClick={() => setShowAdvanceModal(true)}
                        >
                            <Plus size={16} /> Advance
                        </Button>
                        <Button 
                            variant="outline-danger"
                            className="d-flex align-items-center gap-2 px-3 py-2"
                            onClick={() => setShowRefundModal(true)}
                        >
                            <AlertCircle size={16} /> Refund
                        </Button>
                        
                        {/* Divider */}
                        <div className="border-start mx-2" style={{height: '32px'}}></div>
                        
                        {/* Utilities */}
                        <Button 
                            variant="light"
                            className="d-flex align-items-center gap-2 px-3 py-2"
                            onClick={() => setShowLabPaymentsModal(true)}
                        >
                            Lab Payments
                        </Button>
                        <Button 
                            variant="light"
                            className="d-flex align-items-center gap-2 px-3 py-2"
                            onClick={() => setShowLeakageTracker(!showLeakageTracker)}
                        >
                            Leakage Tracker
                        </Button>
                        <Button 
                            variant="light"
                            className="d-flex align-items-center gap-2 px-3 py-2"
                            onClick={() => setShowSettingsTab(true)}
                        >
                            Settings
                        </Button>
                    </div>
                </Card.Body>
            </Card>

            {/* Aging Filter - Indian Hospital Escalation Timeline */}
            <Card className="border-0 shadow-sm mb-4">
                <Card.Body className="py-3">
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2">
                            <span className="fw-bold text-muted me-2">📊 Filter by Age:</span>
                            <Button 
                                variant={agingFilter === 'all' ? 'dark' : 'outline-secondary'}
                                size="sm" 
                                onClick={() => setAgingFilter('all')}
                                className="fw-semibold"
                            >
                                📋 All ({invoices.length})
                            </Button>
                            <Button 
                                variant={agingFilter === 'fresh' ? 'success' : 'outline-success'}
                                size="sm" 
                                onClick={() => setAgingFilter('fresh')}
                                className="fw-semibold"
                            >
                                🟢 Fresh (&lt;24h)
                            </Button>
                            <Button 
                                variant={agingFilter === 'attention' ? 'warning' : 'outline-warning'}
                                size="sm" 
                                onClick={() => setAgingFilter('attention')}
                                className="fw-semibold"
                            >
                                🟡 1-3 Days
                            </Button>
                            <Button 
                                variant={agingFilter === 'followup' ? 'warning' : 'outline-warning'}
                                size="sm" 
                                onClick={() => setAgingFilter('followup')}
                                className="fw-semibold"
                            >
                                🟠 4-7 Days
                            </Button>
                            <Button 
                                variant={agingFilter === 'overdue' ? 'danger' : 'outline-danger'}
                                size="sm" 
                                onClick={() => setAgingFilter('overdue')}
                                className="fw-semibold"
                            >
                                🔴 8-30 Days
                            </Button>
                            <Button 
                                variant={agingFilter === 'critical' ? 'dark' : 'outline-dark'}
                                size="sm" 
                                onClick={() => setAgingFilter('critical')}
                                className="fw-semibold"
                            >
                                ⚫ 30+ Days
                            </Button>
                        </div>
                        <div className="text-muted small">
                            <strong>Indian Standard:</strong> 60-day grace → 90-day collections
                        </div>
                    </div>
                </Card.Body>
            </Card>

            {/* Zero Leakage Tracker Section */}
            {showLeakageTracker && (
                <Card className="border-0 shadow-sm mb-4">
                    <Card.Body>
                        <BillingLeakageTracker />
                    </Card.Body>
                </Card>
            )}

            <Row className="g-4">
                {/* Invoice List */}
                <Col lg={8}>
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white border-0 py-3">
                            <div className="d-flex justify-content-between align-items-center">
                                <h5 className="fw-bold mb-0">
                                    <FileText size={18} className="me-2 text-primary" />
                                    Recent Invoices
                                </h5>
                                <InputGroup style={{ width: '250px' }}>
                                    <InputGroup.Text className="bg-light border-end-0">
                                        <Search size={16} />
                                    </InputGroup.Text>
                                    <Form.Control
                                        placeholder="Search patient or invoice..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="border-start-0"
                                    />
                                </InputGroup>
                            </div>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <Table hover responsive className="mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th>Invoice #</th>
                                        <th>Patient</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Date</th>
                                        <th>Actions</th>
                                        <th style={{ width: '100px' }}>Pay</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInvoices.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="text-center py-4 text-muted">
                                                No invoices found
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredInvoices.slice(0, 15).map((invoice) => (
                                            <tr key={invoice.id}>
                                                <td><strong>{invoice.invoice_number || `#${invoice.id}`}</strong></td>
                                                <td>{invoice.patient_name || 'Unknown'}</td>
                                                <td className="fw-bold">{formatCurrency(invoice.total_amount)}</td>
                                                <td>{getStatusBadge(invoice.status, invoice.generated_at, invoice)}</td>
                                                <td>{new Date(invoice.generated_at).toLocaleDateString()}</td>
                                                <td>
                                                    <div className="d-flex gap-1">
                                                        <Button
                                                            size="sm"
                                                            className="fw-bold px-2"
                                                            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none' }}
                                                            onClick={() => handleViewPatient(invoice)}
                                                            title="View Details"
                                                        >
                                                            👁️ View
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="fw-bold px-2"
                                                            style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none' }}
                                                            onClick={() => handlePrintInvoice(invoice)}
                                                            title="Print Invoice"
                                                        >
                                                            🖨️ Print
                                                        </Button>
                                                        {/* Reminder button for overdue invoices */}
                                                        {invoice.status !== 'Paid' && (() => {
                                                            const aging = getAgingInfo(invoice);
                                                            if (aging.category !== 'fresh' && aging.action) {
                                                                return (
                                                                    <Button
                                                                        size="sm"
                                                                        className="fw-bold px-2"
                                                                        style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', border: 'none' }}
                                                                        onClick={() => {
                                                                            const msg = `📢 Reminder for Invoice #${invoice.id}\n\nPatient: ${invoice.patient_name}\nAmount: ${formatCurrency(invoice.total_amount)}\nOverdue: ${aging.days} days\n\nRecommended Action: ${aging.action}`;
                                                                            alert(msg);
                                                                            // Log reminder
                                                                            let reminders = [];
                                                                            try {
                                                                                const stored = localStorage.getItem('billing_reminders');
                                                                                if (stored && stored !== 'undefined') {
                                                                                    reminders = JSON.parse(stored);
                                                                                }
                                                                            } catch (e) {
                                                                                console.error('Error parsing billing_reminders', e);
                                                                                localStorage.removeItem('billing_reminders');
                                                                            }
                                                                            reminders.push({
                                                                                invoice_id: invoice.id,
                                                                                patient_name: invoice.patient_name,
                                                                                amount: invoice.total_amount,
                                                                                aging_days: aging.days,
                                                                                action: aging.action,
                                                                                sent_at: new Date().toISOString()
                                                                            });
                                                                            localStorage.setItem('billing_reminders', JSON.stringify(reminders));
                                                                            setSuccessMessage(`📲 Reminder logged for ${invoice.patient_name}`);
                                                                            setTimeout(() => setSuccessMessage(''), 3000);
                                                                        }}
                                                                        title={aging.action}
                                                                    >
                                                                        📲 {aging.days <= 7 ? 'Remind' : 'Escalate'}
                                                                    </Button>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </div>
                                                </td>
                                                <td>
                                                    <Button
                                                        size="sm"
                                                        className="w-100 fw-bold"
                                                        style={{ 
                                                            background: invoice.status === 'Paid' 
                                                                ? 'linear-gradient(135deg, #10b981, #059669)' 
                                                                : 'linear-gradient(135deg, #f59e0b, #d97706)', 
                                                            border: 'none' 
                                                        }}
                                                        onClick={() => handleRecordPayment(invoice)}
                                                        disabled={invoice.status === 'Paid'}
                                                        title={invoice.status === 'Paid' ? 'Paid' : 'Click to Pay'}
                                                    >
                                                        {invoice.status === 'Paid' ? '✅ Paid' : '💳 Pay'}
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Recent Activity */}
                <Col lg={4}>
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Header className="bg-white border-0 py-3">
                            <h5 className="fw-bold mb-0">
                                <Receipt size={18} className="me-2 text-success" />
                                Recent Payments
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            {recentTransactions.map((tx, idx) => (
                                <div key={idx} className="d-flex align-items-start gap-3 mb-3 pb-3 border-bottom">
                                    <div className={`rounded-circle p-2 bg-${tx.type === 'success' ? 'success' : tx.type === 'warning' ? 'warning' : 'info'}-subtle`}>
                                        {tx.type === 'success' ? (
                                            <Check size={14} className="text-success" />
                                        ) : tx.type === 'warning' ? (
                                            <AlertCircle size={14} className="text-warning" />
                                        ) : (
                                            <FileText size={14} className="text-info" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="small">{tx.text}</div>
                                        <small className="text-muted">{tx.time}</small>
                                    </div>
                                </div>
                            ))}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Analytics Modal */}
            <Modal show={showAnalyticsModal} onHide={() => setShowAnalyticsModal(false)} size="xl" centered dialogClassName="modal-90w">
                <Modal.Header closeButton className="bg-white">
                    <Modal.Title><BarChart3 size={20} className="me-2 text-primary" /> Financial Analytics</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-light">
                    <AdvancedReportsDashboard />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAnalyticsModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>

            {/* Payment Modal */}
            <Modal show={showPaymentModal} onHide={() => setShowPaymentModal(false)} centered>
                <Modal.Header closeButton className="bg-success text-white">
                    <Modal.Title><CreditCard size={20} className="me-2" /> Record Payment</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedInvoice && (
                        <Form>
                            <div className="bg-light p-3 rounded mb-3">
                                <div className="d-flex justify-content-between">
                                    <span>Invoice</span>
                                    <strong>#{selectedInvoice.id}</strong>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <span>Patient</span>
                                    <strong>{selectedInvoice.patient_name}</strong>
                                </div>
                                <hr className="my-2" />
                                <div className="d-flex justify-content-between">
                                    <span>Total Amount</span>
                                    <span>{formatCurrency(selectedInvoice.total_amount)}</span>
                                </div>
                                {parseFloat(selectedInvoice.amount_paid || 0) > 0 && (
                                    <div className="d-flex justify-content-between text-success">
                                        <span>Already Paid</span>
                                        <span>{formatCurrency(selectedInvoice.amount_paid)}</span>
                                    </div>
                                )}
                                <div className="d-flex justify-content-between mt-1">
                                    <span className="fw-bold">Balance Due</span>
                                    <span className="fw-bold text-danger fs-5">
                                        {formatCurrency(parseFloat(selectedInvoice.total_amount) - parseFloat(selectedInvoice.amount_paid || 0))}
                                    </span>
                                </div>
                            </div>
                            <Form.Group className="mb-3">
                                <Form.Label>Payment Mode</Form.Label>
                                <Form.Select
                                    value={paymentForm.mode}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })}
                                >
                                    <option>Cash</option>
                                    <option>Credit Card</option>
                                    <option>Debit Card</option>
                                    <option>UPI</option>
                                    <option>Net Banking</option>
                                    <option>Insurance</option>
                                </Form.Select>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Amount Received</Form.Label>
                                <InputGroup>
                                    <InputGroup.Text>₹</InputGroup.Text>
                                    <Form.Control
                                        type="number"
                                        value={paymentForm.amount}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                    />
                                </InputGroup>
                            </Form.Group>
                            <Form.Group className="mb-3">
                                <Form.Label>Reference / Transaction ID</Form.Label>
                                <Form.Control
                                    placeholder="Optional - for card/UPI payments"
                                    value={paymentForm.reference}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                                />
                            </Form.Group>
                        </Form>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
                    <Button variant="success" onClick={handlePaymentSubmit}>
                        <Check size={16} className="me-1" /> Confirm Payment
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Patient Details / Receipt Modal */}
            <Modal show={showPatientModal} onHide={() => setShowPatientModal(false)} centered size="lg">
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title><User size={20} className="me-2" /> Invoice Details</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedInvoice && (
                        <div>
                            <Row className="mb-4">
                                <Col md={6}>
                                    <h6 className="text-muted mb-2">Patient Information</h6>
                                    <div className="bg-light p-3 rounded">
                                        <div><strong>Name:</strong> {selectedInvoice.patient_name}</div>
                                        <div><strong>Patient ID:</strong> {selectedInvoice.patient_number || selectedInvoice.patient_id?.slice(0, 8) + '...'}</div>
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <h6 className="text-muted mb-2">Invoice Information</h6>
                                    <div className="bg-light p-3 rounded">
                                        <div><strong>Invoice:</strong> {selectedInvoice.invoice_number || `#${selectedInvoice.id}`}</div>
                                        <div><strong>Date:</strong> {new Date(selectedInvoice.generated_at).toLocaleDateString()}</div>
                                        <div><strong>Status:</strong> {getStatusBadge(selectedInvoice.status, selectedInvoice.generated_at, selectedInvoice)}</div>
                                    </div>
                                </Col>
                            </Row>

                            <h6 className="text-muted mb-2">Billing Summary</h6>
                            {loadingItems ? (
                                <div className="text-center py-4">
                                    <Spinner size="sm" /> Loading items...
                                </div>
                            ) : (
                                <Table bordered size="sm" className="mb-4">
                                    <thead className="bg-light">
                                        <tr>
                                            <th>Description</th>
                                            <th className="text-center" style={{ width: '80px' }}>Qty</th>
                                            <th className="text-end" style={{ width: '100px' }}>Rate</th>
                                            <th className="text-end" style={{ width: '120px' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoiceItems.length > 0 ? (
                                            invoiceItems.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td>{item.description}</td>
                                                    <td className="text-center">{item.quantity}</td>
                                                    <td className="text-end">{formatCurrency(item.unit_price)}</td>
                                                    <td className="text-end">{formatCurrency(item.total_price)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="4" className="text-muted text-center">No line items available</td>
                                            </tr>
                                        )}
                                        <tr className="table-light">
                                            <td colSpan="3" className="text-end"><strong>Grand Total</strong></td>
                                            <td className="text-end fw-bold text-success fs-5">{formatCurrency(selectedInvoice.total_amount)}</td>
                                        </tr>
                                    </tbody>
                                </Table>
                            )}

                            {selectedInvoice.status === 'Paid' && (
                                <Alert variant="success">
                                    <Check size={18} className="me-2" /> This invoice has been paid in full.
                                </Alert>
                            )}
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="outline-secondary" onClick={() => window.print()}>
                        <Printer size={16} className="me-1" /> Print
                    </Button>
                    {selectedInvoice?.status === 'Pending' && (
                        <Button variant="success" onClick={() => {
                            setShowPatientModal(false);
                            handleRecordPayment(selectedInvoice);
                        }}>
                            <CreditCard size={16} className="me-1" /> Record Payment
                        </Button>
                    )}
                    <Button variant="secondary" onClick={() => setShowPatientModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>

            {/* Report Modal */}
            <Modal show={showReportModal} onHide={() => setShowReportModal(false)} centered>
                <Modal.Header closeButton className="bg-primary text-white">
                    <Modal.Title><FileText size={20} className="me-2" /> Generate Report</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Report Type</Form.Label>
                            <Form.Select>
                                <option>Daily Collection Report</option>
                                <option>Pending Invoices Report</option>
                                <option>Overdue Bills Report</option>
                                <option>Monthly Revenue Report</option>
                                <option>Department-wise Report</option>
                            </Form.Select>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Date Range</Form.Label>
                            <Row>
                                <Col>
                                    <Form.Control type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                                </Col>
                                <Col>
                                    <Form.Control type="date" defaultValue={new Date().toISOString().split('T')[0]} />
                                </Col>
                            </Row>
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Format</Form.Label>
                            <Form.Select>
                                <option>PDF</option>
                                <option>Excel</option>
                                <option>CSV</option>
                            </Form.Select>
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowReportModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={() => {
                        // Generate CSV report
                        const today = new Date().toLocaleDateString();
                        const csvContent = [
                            ['Invoice #', 'Patient', 'Amount', 'Status', 'Date'],
                            ...invoices.map(inv => [
                                inv.invoice_number || inv.id,
                                inv.patient_name,
                                inv.total_amount,
                                inv.status,
                                new Date(inv.generated_at).toLocaleDateString()
                            ])
                        ].map(row => row.join(',')).join('\n');

                        const blob = new Blob([csvContent], { type: 'text/csv' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `billing_report_${today.replace(/\//g, '-')}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);

                        setShowReportModal(false);
                        setSuccessMessage('Report downloaded successfully!');
                        setTimeout(() => setSuccessMessage(''), 3000);
                    }}>
                        <Download size={16} className="me-1" /> Generate
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Daily Summary Modal */}
            <Modal show={showSummaryModal} onHide={() => setShowSummaryModal(false)} centered>
                <Modal.Header closeButton className="bg-warning">
                    <Modal.Title><Calendar size={20} className="me-2" /> Daily Summary</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {(() => {
                        const summary = getDailySummary();
                        return (
                            <div>
                                <h6 className="text-muted mb-3">Today's Performance - {new Date().toLocaleDateString()}</h6>

                                <Row className="g-3 mb-4">
                                    <Col xs={6}>
                                        <div className="bg-success bg-opacity-10 p-3 rounded text-center">
                                            <div className="text-success fw-bold fs-4">{summary.paidCount}</div>
                                            <small className="text-muted">Paid</small>
                                        </div>
                                    </Col>
                                    <Col xs={6}>
                                        <div className="bg-warning bg-opacity-10 p-3 rounded text-center">
                                            <div className="text-warning fw-bold fs-4">{summary.pendingCount}</div>
                                            <small className="text-muted">Pending</small>
                                        </div>
                                    </Col>
                                </Row>

                                <Table bordered size="sm">
                                    <tbody>
                                        <tr>
                                            <td>Total Invoices Today</td>
                                            <td className="text-end fw-bold">{summary.totalInvoices}</td>
                                        </tr>
                                        <tr className="table-success">
                                            <td>Collected Amount</td>
                                            <td className="text-end fw-bold text-success">{formatCurrency(summary.paidAmount)}</td>
                                        </tr>
                                        <tr className="table-warning">
                                            <td>Pending Amount</td>
                                            <td className="text-end fw-bold text-warning">{formatCurrency(summary.pendingAmount)}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Total Value</strong></td>
                                            <td className="text-end fw-bold">{formatCurrency(summary.paidAmount + summary.pendingAmount)}</td>
                                        </tr>
                                    </tbody>
                                </Table>
                            </div>
                        );
                    })()}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="outline-primary" onClick={() => window.print()}>
                        <Printer size={16} className="me-1" /> Print
                    </Button>
                    <Button variant="secondary" onClick={() => setShowSummaryModal(false)}>Close</Button>
                </Modal.Footer>
            </Modal>

            {/* New Invoice Modal - Using new component */}
            <NewInvoiceModal 
                show={showInvoiceModal}
                onHide={() => setShowInvoiceModal(false)}
                onSuccess={() => fetchBillingData()}
            />

            {/* Invoice Print Modal */}
            <InvoicePrint
                show={showInvoicePrint}
                onHide={() => setShowInvoicePrint(false)}
                patient={selectedInvoice ? {
                    name: selectedInvoice.patient_name,
                    patient_number: selectedInvoice.patient_number,
                    id: selectedInvoice.patient_id,
                    phone: selectedInvoice.patient_phone
                } : null}
                invoiceItems={invoiceItems}
                invoiceNumber={selectedInvoice?.invoice_number || `INV-${selectedInvoice?.id}`}
                paymentStatus={selectedInvoice?.status || 'pending'}
            />

            {/* Floating Settings Button */}
            <FloatingSettingsButton />

            {/* Billing & Payment Settings Modal */}
            <Modal show={showSettingsTab} onHide={() => setShowSettingsTab(false)} size="xl" centered dialogClassName="settings-modal-wide">
                <Modal.Header closeButton className="bg-dark text-white">
                    <Modal.Title className="d-flex align-items-center gap-2">
                        ⚙️ Settings
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0">
                    <div className="d-flex">
                        {/* Sidebar */}
                        <div className="bg-light border-end p-3" style={{ width: '200px', minHeight: '500px' }}>
                            <div className="list-group list-group-flush">
                                <button 
                                    className={`list-group-item list-group-item-action d-flex align-items-center gap-2 ${settingsActiveTab === 'billing' ? 'active' : ''}`}
                                    onClick={() => setSettingsActiveTab('billing')}
                                >
                                    🏥 Billing Settings
                                </button>
                                <button 
                                    className={`list-group-item list-group-item-action d-flex align-items-center gap-2 ${settingsActiveTab === 'payment' ? 'active' : ''}`}
                                    onClick={() => setSettingsActiveTab('payment')}
                                >
                                    💳 Payment & SMS
                                </button>
                            </div>
                        </div>
                        {/* Content */}
                        <div className="flex-grow-1 p-0" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            {settingsActiveTab === 'billing' && (
                                <BillingSettingsTab onClose={() => setShowSettingsTab(false)} />
                            )}
                            {settingsActiveTab === 'payment' && (
                                <PaymentSettingsTab onClose={() => setShowSettingsTab(false)} />
                            )}
                        </div>
                    </div>
                </Modal.Body>
            </Modal>

            {/* Advance Payment Modal */}
            <AdvancePaymentModal 
                show={showAdvanceModal}
                onHide={() => setShowAdvanceModal(false)}
                onSuccess={() => fetchBillingData()}
            />

            {/* Refund Modal */}
            <RefundModal 
                show={showRefundModal}
                onHide={() => setShowRefundModal(false)}
                invoice={selectedInvoice}
                onSuccess={() => fetchBillingData()}
            />

            {/* Payment Confirmation Modal */}
            <PaymentConfirmationModal
                show={showPaymentConfirmation}
                onHide={() => setShowPaymentConfirmation(false)}
                invoice={selectedInvoice}
                onSuccess={() => {
                    fetchBillingData();
                    setSuccessMessage('💳 Payment confirmed successfully!');
                    setTimeout(() => setSuccessMessage(''), 3000);
                }}
            />

            {/* Lab Payments Modal - Dual Department Payment Collection */}
            <Modal 
                show={showLabPaymentsModal} 
                onHide={() => setShowLabPaymentsModal(false)} 
                size="xl"
                centered
            >
                <Modal.Header closeButton className="bg-teal-gradient text-white" style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>
                    <Modal.Title className="d-flex align-items-center gap-2">
                        🧪 OPD Lab Payments
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-0">
                    <LabPaymentsTab />
                </Modal.Body>
            </Modal>

            {/* Billing Queue Modal - Gold Standard Centralized Billing */}
            <Modal 
                show={showBillingQueue} 
                onHide={() => setShowBillingQueue(false)} 
                size="xl"
                fullscreen="lg-down"
                centered
            >
                <Modal.Header closeButton className="text-white" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}>
                    <Modal.Title className="d-flex align-items-center gap-2">
                        📋 Centralized Billing Queue
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body className="p-3" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                    <BillingQueueTab 
                        onInvoiceCreated={() => {
                            fetchBillingData();
                            setSuccessMessage('✅ Invoice created from billing queue!');
                            setTimeout(() => setSuccessMessage(''), 4000);
                        }}
                    />
                </Modal.Body>
            </Modal>
        </Container>
    );
};

export default BillingDashboard;
