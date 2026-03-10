import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Container, Spinner } from 'react-bootstrap';
import {
    Users, Bed, TestTube2, Pill, Scissors,
    BarChart3, UserCog, Settings, IndianRupee,
    Clock, Activity, Building2, Stethoscope,
    Droplet, Archive, ShieldAlert, Scan, Syringe,
    Sparkles, Utensils, RefreshCw, UserCheck, MonitorPlay, Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { formatCurrency } from '../utils/currency';
import MorningBriefing from '../components/MorningBriefing';
import ActivityFeed from '../components/ActivityFeed';
import RevenueChart from '../components/RevenueChart';
import PatientTrendChart from '../components/PatientTrendChart';
import SettingsModal from '../components/settings/SettingsModal';
import { safeGetUser } from '../utils/safeStorage';

const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalStaff: 0,
        todayRevenue: 0,
        pendingBills: 0,
        bedOccupancy: 0,
        totalBeds: 50,
        activeOPD: 0,
        pendingTests: 0
    });
    const [trendData, setTrendData] = useState({ revenue: [], patients: [] });
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);

    // Get user from localStorage safely
    const user = safeGetUser() || {};

    const fetchDashboardData = async () => {
        try {
            // [SECURITY UPGRADE] Redirect Security Chief to Command Center
            const user = safeGetUser();
            if (user?.role === 'security_manager') {
                navigate('/security');
                return;
            }

            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            // 1. Basic User & Stats Data
            const usersRes = await axios.get('/api/auth/users', { headers });

            // 2. Queue Data (OPD)
            let activeOPD = 0;
            try {
                const opdRes = await axios.get('/api/opd/queue', { headers });
                activeOPD = opdRes.data.filter(p => p.status === 'checked_in' || p.status === 'waiting').length;
            } catch (error) {
                console.warn('Failed to fetch OPD queue', error);
            }

            // 3. Admission Data (Wards)
            let activeAdmissions = 0;
            let admissions = [];
            try {
                const admRes = await axios.get('/api/admissions/active', { headers });
                admissions = admRes.data || [];
                activeAdmissions = admissions.length;
            } catch {
                // ignore
            }

            // 4. Lab Data (Pending Tests)
            let pendingTests = 0;
            try {
                const labRes = await axios.get('/api/lab/test-requests', { headers });
                // Filter for pending if the API returns all
                pendingTests = labRes.data.filter(t => t.status === 'pending' || t.status === 'sample_collected').length;
            } catch {
                // ignore
            }

            // 5. Finance Data
            let invoices = [];
            try {
                const invoicesRes = await axios.get('/api/finance/invoices', { headers });
                invoices = invoicesRes.data || [];
            } catch {
                // ignore
            }

            // 6. NEW: Analytics Data
            let trends = { revenue: [], patients: [] };
            try {
                const analyticsRes = await axios.get('/api/admin/analytics', { headers });
                trends = analyticsRes.data;
            } catch (err) {
                console.warn('Failed to fetch analytics', err);
            }

            const pendingInvoices = invoices.filter(i => i.status === 'Pending');
            const todayRevenue = invoices
                .filter(i => new Date(i.generated_at).toDateString() === new Date().toDateString())
                .reduce((sum, i) => sum + parseFloat(i.total_amount || 0), 0);

            setStats({
                totalStaff: usersRes.data.length,
                pendingBills: pendingInvoices.length,
                todayRevenue,
                bedOccupancy: activeAdmissions,
                totalBeds: 50,
                activeOPD,
                pendingTests
            });
            setTrendData(trends);
            setLoading(false);
        } catch (err) {
            console.error('Dashboard data error:', err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Main navigation modules - Icon Grid with LIVE STATS
    const modules = [
        {
            icon: Users,
            label: 'OPD',
            desc: 'Outpatient Department',
            path: '/opd',
            color: '#3b82f6',
            bg: '#eff6ff',
            stat: stats.activeOPD,
            statLabel: 'Active Patients',
            statColor: stats.activeOPD > 10 ? 'text-danger' : 'text-primary'
        },
        {
            icon: Bed,
            label: 'Wards',
            desc: 'Bed Management',
            path: '/ward',
            color: '#10b981',
            bg: '#ecfdf5',
            stat: `${stats.bedOccupancy}/${stats.totalBeds}`,
            statLabel: 'Occupancy',
            statColor: stats.bedOccupancy > 45 ? 'text-danger' : 'text-success'
        },
        {
            icon: TestTube2,
            label: 'Laboratory',
            desc: 'Lab & Diagnostics',
            path: '/lab',
            color: '#8b5cf6',
            bg: '#f5f3ff',
            stat: stats.pendingTests,
            statLabel: 'Pending Tests',
            statColor: stats.pendingTests > 5 ? 'text-warning' : 'text-muted'
        },
        {
            icon: Pill,
            label: 'Pharmacy',
            desc: 'Medicine Inventory',
            path: '/pharmacy',
            color: '#f59e0b',
            bg: '#fffbeb',
            // stat: 'OK', // Placeholder until inventory API 
            // statLabel: 'Stock Status'
        },
        {
            icon: BarChart3,
            label: 'Finance',
            desc: 'Billing & Reports',
            path: '/billing',
            color: '#06b6d4',
            bg: '#ecfeff',
            stat: stats.pendingBills,
            statLabel: 'Unpaid Bills',
            statColor: stats.pendingBills > 0 ? 'text-danger' : 'text-muted'
        },
        
        // --- NEW DEPARTMENTS ---
        { icon: Droplet, label: 'Blood Bank', desc: 'Blood Inventory', path: '/blood-bank', color: '#dc2626', bg: '#fef2f2' },
        { icon: Scan, label: 'Radiology', desc: 'X-Ray & Imaging', path: '/radiology', color: '#4f46e5', bg: '#e0e7ff' },
        { icon: Archive, label: 'Mortuary', desc: 'Morgue Management', path: '/admin/mortuary', color: '#4b5563', bg: '#f3f4f6' },
        { icon: ShieldAlert, label: 'Security', desc: 'Command Center', path: '/security', color: '#1e3a8a', bg: '#dbeafe' },
        { icon: MonitorPlay, label: 'OT', desc: 'Operation Theater', path: '/ot', color: '#ea580c', bg: '#ffedd5' },
        { icon: Syringe, label: 'Anaesthesia', desc: 'Pre-Op & PACU', path: '/anaesthesia', color: '#0d9488', bg: '#ccfbf1' },
        { icon: RefreshCw, label: 'CSSD', desc: 'Sterilization', path: '/cssd', color: '#0891b2', bg: '#cffafe' },
        { icon: Sparkles, label: 'Housekeeping', desc: 'Cleaning & Hygiene', path: '/housekeeping', color: '#db2777', bg: '#fce7f3' },
        { icon: Utensils, label: 'Dietary', desc: 'Kitchen & Food', path: '/dietary', color: '#65a30d', bg: '#ecfccb' },
        { icon: UserCheck, label: 'Visitors', desc: 'Pass Management', path: '/reception/visitors', color: '#7c3aed', bg: '#ede9fe' },

        // --- ADMIN TOOLS ---
        { icon: UserCog, label: 'Staff', desc: 'User Management', path: '/admin/staff', color: '#ec4899', bg: '#fdf2f8' },
        { icon: Building2, label: 'Ward Config', desc: 'Ward Management', path: '/admin/wards', color: '#84cc16', bg: '#f7fee7' },
        { icon: IndianRupee, label: 'Price Approvals', desc: 'Pharmacy Prices', path: '/admin/prices', color: '#f59e0b', bg: '#fffbeb' },
        { icon: Activity, label: 'Equipment Approvals', desc: 'Equipment Changes', path: '/admin/equipment', color: '#eab308', bg: '#fefce8' },
        { icon: ShieldAlert, label: 'Recovery Console', desc: 'Master Control Panel', path: '/admin/recovery', color: '#dc2626', bg: '#fef2f2' },
        { icon: Shield, label: 'Insurance Ops', desc: 'Claims & Vault', path: '/insurance', color: '#0ea5e9', bg: '#e0f2fe' },
    ];

    if (loading) {
        return (
            <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
                <Spinner animation="border" variant="primary" />
            </Container>
        );
    }

    return (
        <Container className="py-4">
            {/* Header */}
            <div className="text-center mb-0">
                <div className="d-flex justify-content-center align-items-center gap-3 mb-2">
                    <img src="/wolf_logo.png" alt="Wolf Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                    <h2 className="fw-bold mb-0 text-dark">Welcome to WOLF HMS</h2>
                </div>
                <p className="text-muted mb-4">Command Center & Operational Overview</p>
            </div>

            {/* Morning Briefing Strip */}
            <MorningBriefing todayRevenue={stats.todayRevenue} activePatients={stats.bedOccupancy + stats.activeOPD} />

            {/* Stats Row */}
            <Row className="g-3 mb-4">
                <Col xs={6} md={3}>
                    <Card className="border-0 shadow-sm text-center py-3" style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                        <div className="text-white">
                            <h3 className="fw-bold mb-0">{stats.totalStaff}</h3>
                            <small>Total Staff</small>
                        </div>
                    </Card>
                </Col>
                <Col xs={6} md={3}>
                    <Card className="border-0 shadow-sm text-center py-3" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                        <div className="text-white">
                            <h3 className="fw-bold mb-0">{formatCurrency(stats.todayRevenue)}</h3>
                            <small>Today's Revenue</small>
                        </div>
                    </Card>
                </Col>
                <Col xs={6} md={3}>
                    <Card className="border-0 shadow-sm text-center py-3" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                        <div className="text-white">
                            <h3 className="fw-bold mb-0">{stats.pendingBills}</h3>
                            <small>Pending Bills</small>
                        </div>
                    </Card>
                </Col>
                <Col xs={6} md={3}>
                    <Card className="border-0 shadow-sm text-center py-3" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                        <div className="text-white">
                            <h3 className="fw-bold mb-0">{stats.bedOccupancy}/{stats.totalBeds}</h3>
                            <small>Bed Occupancy</small>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* Trends Row */}
            <Row className="g-3 mb-4">
                <Col md={6}>
                    <RevenueChart data={trendData.revenue} />
                </Col>
                <Col md={6}>
                    <PatientTrendChart data={trendData.patients} />
                </Col>
            </Row>

            <Row>
                {/* Main Modules (Left - 9 Cols) */}
                <Col lg={9}>
                    <h5 className="fw-bold mb-3 text-muted">
                        <Stethoscope size={18} className="me-2" />
                        Live Operational Modules
                    </h5>
                    <Row className="g-3 mb-4">
                        {modules.map((module, idx) => {
                            const Icon = module.icon;
                            return (
                                <Col xs={6} md={4} key={idx}>
                                    <Card
                                        className="border-0 shadow-sm h-100 module-card"
                                        onClick={() => navigate(module.path)}
                                        style={{
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            borderRadius: '12px',
                                            borderLeft: `4px solid ${module.color}`
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.transform = 'translateY(-5px)';
                                            e.currentTarget.style.boxShadow = '0 10px 40px rgba(0,0,0,0.15)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.transform = 'translateY(0)';
                                            e.currentTarget.style.boxShadow = '0 .125rem .25rem rgba(0,0,0,.075)';
                                        }}
                                    >
                                        <Card.Body className="text-center py-4">
                                            <div className="d-flex justify-content-between align-items-start mb-2 px-2">
                                                <div
                                                    className="d-flex align-items-center justify-content-center rounded-circle"
                                                    style={{
                                                        width: 45,
                                                        height: 45,
                                                        backgroundColor: module.bg
                                                    }}
                                                >
                                                    <Icon size={22} style={{ color: module.color }} />
                                                </div>
                                                {module.stat !== undefined && (
                                                    <div className="text-end">
                                                        <h4 className={`fw-bold mb-0 ${module.statColor || 'text-dark'}`}>{module.stat}</h4>
                                                        <small style={{ fontSize: '0.75rem', color: '#666' }}>{module.statLabel}</small>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="text-start px-2 mt-3">
                                                <h6 className="fw-bold mb-1">{module.label}</h6>
                                                <small className="text-muted">{module.desc}</small>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            );
                        })}
                    </Row>
                </Col>

                {/* Activity Feed (Right - 3 Cols) */}
                <Col lg={3}>
                    <div className="sticky-top" style={{ top: '20px' }}>
                        <ActivityFeed />
                    </div>
                </Col>
            </Row>

            {/* Settings Link */}
            <div className="text-center mt-4">
                <Card
                    className="border-0 shadow-sm d-inline-block"
                    onClick={() => setShowSettings(true)}
                    style={{ cursor: 'pointer', borderRadius: '12px' }}
                >
                    <Card.Body className="d-flex align-items-center gap-2 px-4 py-2">
                        <Settings size={18} className="text-muted" />
                        <span className="text-muted">Account Settings</span>
                    </Card.Body>
                </Card>
            </div>

            {/* Settings Modal */}
            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                user={user}
            />
        </Container>
    );
};

export default Dashboard;

