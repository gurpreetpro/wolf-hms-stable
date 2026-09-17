import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Container, Spinner } from 'react-bootstrap';
import {
    Users, Bed, TestTube2, Pill,
    BarChart3, UserCog, Settings, IndianRupee,
    Clock, Activity, Building2, Stethoscope,
    Droplet, Archive, ShieldAlert, Scan, Syringe,
    Sparkles, Utensils, RefreshCw, UserCheck, MonitorPlay, Shield,
    Siren, HeartPulse, Baby, ClipboardCheck, FileText, Gauge,
    FileSignature, Smile, Eye, Bone, Microscope, Ambulance,
    Shirt, Trash2, Wrench, ShoppingCart, Video, Receipt,
    Radio, Biohazard, ShieldCheck, Award, Calendar, CalendarDays,
    Search, X
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
        pendingTests: 0,
        activeEmergencies: 0
    });
    const [trendData, setTrendData] = useState({ revenue: [], patients: [] });
    const [loading, setLoading] = useState(true);
    const [showSettings, setShowSettings] = useState(false);
    const [activeCategory, setActiveCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

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

            // 7. Active Emergencies Count
            let activeEmergencies = 0;
            try {
                const emergRes = await axios.get('/api/emergency/status', { headers });
                if (Array.isArray(emergRes.data)) {
                    activeEmergencies = emergRes.data.filter(e => e.status === 'active' || e.status === 'triggered').length;
                } else if (emergRes.data && (emergRes.data.status === 'active' || emergRes.data.status === 'triggered')) {
                    activeEmergencies = 1;
                }
            } catch {
                // ignore
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
                pendingTests,
                activeEmergencies
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

    // Main navigation modules - Full Hospital Ecosystem Grid with Live Stats & Search Tags
    const modules = [
        // ==========================================
        // 🔴 CRITICAL & CLINICAL
        // ==========================================
        {
            icon: Siren,
            label: 'Emergency / Casualty',
            desc: 'Trauma & Resuscitation',
            path: '/admin/emergency',
            color: '#ef4444',
            bg: '#fef2f2',
            category: 'clinical',
            tags: ['emergency', 'casualty', 'trauma', 'er', 'triage', 'code blue', 'resuscitation', 'ambulance'],
            stat: stats.activeEmergencies > 0 ? stats.activeEmergencies : undefined,
            statLabel: 'Active Alert',
            statColor: 'text-danger fw-bold'
        },
        {
            icon: HeartPulse,
            label: 'ICU',
            desc: 'Intensive Care Unit',
            path: '/icu',
            color: '#dc2626',
            bg: '#fee2e2',
            category: 'clinical',
            tags: ['icu', 'critical care', 'ventilator', 'intensive care']
        },
        {
            icon: Baby,
            label: 'Neonatal (NICU)',
            desc: 'Newborn Intensive Care',
            path: '/admin/neonatal',
            color: '#ec4899',
            bg: '#fdf2f8',
            category: 'clinical',
            tags: ['nicu', 'neonatal', 'infant', 'pediatric', 'incubator', 'baby']
        },
        {
            icon: Users,
            label: 'OPD',
            desc: 'Outpatient Department',
            path: '/opd',
            color: '#3b82f6',
            bg: '#eff6ff',
            category: 'clinical',
            tags: ['opd', 'outpatient', 'queue', 'consultation', 'doctor'],
            stat: stats.activeOPD,
            statLabel: 'Active Patients',
            statColor: stats.activeOPD > 10 ? 'text-danger' : 'text-primary'
        },
        {
            icon: Stethoscope,
            label: 'Doctor Desk',
            desc: 'Consultations & E-Rx',
            path: '/doctor',
            color: '#2563eb',
            bg: '#dbeafe',
            category: 'clinical',
            tags: ['doctor', 'consultation', 'prescription', 'soap notes', 'clinical notes', 'erx']
        },
        {
            icon: Bed,
            label: 'Wards',
            desc: 'Bed Management & IPD',
            path: '/ward',
            color: '#10b981',
            bg: '#ecfdf5',
            category: 'clinical',
            tags: ['ward', 'ipd', 'beds', 'admission', 'inpatient', 'nursing'],
            stat: `${stats.bedOccupancy}/${stats.totalBeds}`,
            statLabel: 'Occupancy',
            statColor: stats.bedOccupancy > 45 ? 'text-danger' : 'text-success'
        },
        {
            icon: FileText,
            label: 'eMAR / Nursing',
            desc: 'Medication Administration',
            path: '/admin/emar',
            color: '#059669',
            bg: '#ecfdf5',
            category: 'clinical',
            tags: ['emar', 'nursing', 'medication', 'nurse', 'drug chart', 'dosage']
        },
        {
            icon: Gauge,
            label: 'Early Warning (EWS)',
            desc: 'Patient Deterioration Alerts',
            path: '/admin/ews',
            color: '#f59e0b',
            bg: '#fffbeb',
            category: 'clinical',
            tags: ['ews', 'news', 'early warning', 'vitals', 'deterioration', 'triage']
        },
        {
            icon: FileSignature,
            label: 'CPOE',
            desc: 'Physician Order Entry',
            path: '/admin/cpoe',
            color: '#6366f1',
            bg: '#eef2ff',
            category: 'clinical',
            tags: ['cpoe', 'orders', 'physician orders', 'prescriptions', 'investigations']
        },
        {
            icon: MonitorPlay,
            label: 'OT',
            desc: 'Operation Theater',
            path: '/ot',
            color: '#ea580c',
            bg: '#ffedd5',
            category: 'clinical',
            tags: ['ot', 'operation theater', 'surgery', 'surgeon', 'operating room']
        },
        {
            icon: Syringe,
            label: 'Anaesthesia',
            desc: 'Anaesthesia Console',
            path: '/anaesthesia',
            color: '#0d9488',
            bg: '#ccfbf1',
            category: 'clinical',
            tags: ['anaesthesia', 'anesthesia', 'sedation', 'gas', 'narcotics']
        },
        {
            icon: ClipboardCheck,
            label: 'PAC',
            desc: 'Pre-Anaesthesia Clinic',
            path: '/pac',
            color: '#0f766e',
            bg: '#ccfbf1',
            category: 'clinical',
            tags: ['pac', 'pre-op', 'anaesthesia fitness', 'pre anaesthesia']
        },
        {
            icon: Activity,
            label: 'PACU',
            desc: 'Post-Op Recovery Unit',
            path: '/pacu',
            color: '#14b8a6',
            bg: '#f0fdfa',
            category: 'clinical',
            tags: ['pacu', 'recovery', 'post-op', 'post anaesthesia']
        },
        {
            icon: Calendar,
            label: 'Appointments',
            desc: 'Booking & Scheduling',
            path: '/appointments',
            color: '#3b82f6',
            bg: '#eff6ff',
            category: 'clinical',
            tags: ['appointments', 'booking', 'scheduling', 'slots', 'calendar']
        },

        // ==========================================
        // 🟡 SPECIALTY & DIAGNOSTICS
        // ==========================================
        {
            icon: TestTube2,
            label: 'Laboratory',
            desc: 'Lab & Diagnostics (LIMS)',
            path: '/lab',
            color: '#8b5cf6',
            bg: '#f5f3ff',
            category: 'specialty',
            tags: ['lab', 'laboratory', 'lims', 'blood test', 'pathology', 'diagnostics'],
            stat: stats.pendingTests,
            statLabel: 'Pending Tests',
            statColor: stats.pendingTests > 5 ? 'text-warning' : 'text-muted'
        },
        {
            icon: Scan,
            label: 'Radiology',
            desc: 'X-Ray, CT, MRI & PACS',
            path: '/radiology',
            color: '#4f46e5',
            bg: '#e0e7ff',
            category: 'specialty',
            tags: ['radiology', 'x-ray', 'ct scan', 'mri', 'pacs', 'imaging', 'ultrasound']
        },
        {
            icon: Droplet,
            label: 'Blood Bank',
            desc: 'Inventory & Transfusion',
            path: '/blood-bank',
            color: '#dc2626',
            bg: '#fef2f2',
            category: 'specialty',
            tags: ['blood', 'blood bank', 'plasma', 'platelets', 'transfusion', 'crossmatch']
        },
        {
            icon: Smile,
            label: 'Dental Clinic',
            desc: 'Oral Care & Surgery',
            path: '/dental',
            color: '#06b6d4',
            bg: '#ecfeff',
            category: 'specialty',
            tags: ['dental', 'dentist', 'teeth', 'oral', 'cavity', 'orthodontics']
        },
        {
            icon: Eye,
            label: 'Ophthalmology',
            desc: 'Eye Care & Vision Diagnostics',
            path: '/ophthalmology',
            color: '#8b5cf6',
            bg: '#f5f3ff',
            category: 'specialty',
            tags: ['eye', 'vision', 'ophthalmology', 'optometry', 'cataract', 'retina']
        },
        {
            icon: Bone,
            label: 'Orthopedic',
            desc: 'Bones, Joints & Trauma',
            path: '/orthopedic',
            color: '#d97706',
            bg: '#fef3c7',
            category: 'specialty',
            tags: ['ortho', 'orthopedic', 'bone', 'fracture', 'joint', 'spine', 'plaster']
        },
        {
            icon: Microscope,
            label: 'Anatomic Pathology',
            desc: 'Histopathology & Biopsy',
            path: '/admin/pathology',
            color: '#9333ea',
            bg: '#faf5ff',
            category: 'specialty',
            tags: ['pathology', 'biopsy', 'histology', 'tissue', 'cytology', 'cancer']
        },

        // ==========================================
        // 🟠 OPERATIONS & FACILITIES
        // ==========================================
        {
            icon: Pill,
            label: 'Pharmacy',
            desc: 'Medicine Stock & Dispense',
            path: '/pharmacy',
            color: '#f59e0b',
            bg: '#fffbeb',
            category: 'operations',
            tags: ['pharmacy', 'drugs', 'medicines', 'inventory', 'dispensing', 'stock']
        },
        {
            icon: ShieldAlert,
            label: 'Security & Tactical',
            desc: 'Overwatch & Guard Cockpit',
            path: '/security',
            color: '#1e3a8a',
            bg: '#dbeafe',
            category: 'operations',
            tags: ['security', 'guard', 'patrol', 'overwatch', 'floor plan', 'sos', 'tactical']
        },
        {
            icon: Ambulance,
            label: 'Ambulance Fleet',
            desc: 'Dispatch & Transit Care',
            path: '/admin/ambulance',
            color: '#ea580c',
            bg: '#fff7ed',
            category: 'operations',
            tags: ['ambulance', 'fleet', 'emergency transport', 'ems', 'paramedic']
        },
        {
            icon: RefreshCw,
            label: 'CSSD',
            desc: 'Sterilization & Autoclave',
            path: '/cssd',
            color: '#0891b2',
            bg: '#cffafe',
            category: 'operations',
            tags: ['cssd', 'sterilization', 'autoclave', 'surgical instruments', 'hygiene']
        },
        {
            icon: Sparkles,
            label: 'Housekeeping',
            desc: 'Hygiene & Cleaning Tasks',
            path: '/housekeeping',
            color: '#db2777',
            bg: '#fce7f3',
            category: 'operations',
            tags: ['housekeeping', 'cleaning', 'hygiene', 'sanitization', 'janitor', 'spill']
        },
        {
            icon: Utensils,
            label: 'Dietary',
            desc: 'Kitchen & Meal Planning',
            path: '/dietary',
            color: '#65a30d',
            bg: '#ecfccb',
            category: 'operations',
            tags: ['dietary', 'kitchen', 'food', 'nutrition', 'meal plans', 'cafeteria']
        },
        {
            icon: Shirt,
            label: 'Laundry & Linen',
            desc: 'Linen Cycle & Washing',
            path: '/admin/laundry',
            color: '#0284c7',
            bg: '#f0f9ff',
            category: 'operations',
            tags: ['laundry', 'linen', 'bedsheets', 'washing', 'scrubs']
        },
        {
            icon: Trash2,
            label: 'Bio-Waste (BMW)',
            desc: 'Bio-Medical Waste Mgmt',
            path: '/admin/waste',
            color: '#b45309',
            bg: '#fef3c7',
            category: 'operations',
            tags: ['waste', 'bmw', 'bio-medical waste', 'hazard', 'color coded bins', 'disposal']
        },
        {
            icon: Wrench,
            label: 'Biomedical Assets',
            desc: 'Equipment Registry & PM',
            path: '/admin/assets',
            color: '#475569',
            bg: '#f1f5f9',
            category: 'operations',
            tags: ['assets', 'equipment', 'biomedical', 'maintenance', 'calibration', 'amc']
        },
        {
            icon: UserCheck,
            label: 'Visitors',
            desc: 'Pass Management & Entry',
            path: '/reception/visitors',
            color: '#7c3aed',
            bg: '#ede9fe',
            category: 'operations',
            tags: ['visitors', 'passes', 'guest', 'security pass', 'entry log']
        },
        {
            icon: Archive,
            label: 'Mortuary',
            desc: 'Morgue Management',
            path: '/admin/mortuary',
            color: '#4b5563',
            bg: '#f3f4f6',
            category: 'operations',
            tags: ['mortuary', 'morgue', 'deceased', 'body storage', 'autopsy', 'death register']
        },

        // ==========================================
        // 🔵 QUALITY & ACCREDITATION
        // ==========================================
        {
            icon: Biohazard,
            label: 'Infection Control',
            desc: 'Surveillance & Outbreaks',
            path: '/admin/infection-control',
            color: '#dc2626',
            bg: '#fef2f2',
            category: 'quality',
            tags: ['infection', 'infection control', 'hai', 'outbreak', 'microbiology', 'sterility']
        },
        {
            icon: ShieldCheck,
            label: 'Patient Safety',
            desc: 'Incident Reports & CAPA',
            path: '/admin/patient-safety',
            color: '#2563eb',
            bg: '#eff6ff',
            category: 'quality',
            tags: ['safety', 'patient safety', 'incident report', 'near miss', 'capa', 'adverse']
        },
        {
            icon: Award,
            label: 'NABH & Quality',
            desc: 'Accreditation & KPI Audit',
            path: '/admin/quality',
            color: '#d97706',
            bg: '#fef3c7',
            category: 'quality',
            tags: ['nabh', 'quality', 'audit', 'accreditation', 'compliance', 'standards', 'kpi']
        },
        {
            icon: ShieldAlert,
            label: 'Recovery Console',
            desc: 'Master Control & DPDP Data',
            path: '/admin/recovery',
            color: '#dc2626',
            bg: '#fef2f2',
            category: 'quality',
            tags: ['recovery', 'disaster recovery', 'dpdp', 'privacy', 'backup', 'data retention']
        },

        // ==========================================
        // ⚙️ ADMINISTRATION & FINANCE
        // ==========================================
        {
            icon: BarChart3,
            label: 'Finance & Invoices',
            desc: 'Billing & Payments',
            path: '/billing',
            color: '#06b6d4',
            bg: '#ecfeff',
            category: 'admin',
            tags: ['finance', 'billing', 'invoices', 'receipts', 'accounts', 'revenue'],
            stat: stats.pendingBills,
            statLabel: 'Unpaid Bills',
            statColor: stats.pendingBills > 0 ? 'text-danger' : 'text-muted'
        },
        {
            icon: Shield,
            label: 'Insurance Ops',
            desc: 'Claims & Wolf Vault',
            path: '/insurance',
            color: '#0ea5e9',
            bg: '#e0f2fe',
            category: 'admin',
            tags: ['insurance', 'tpa', 'preauth', 'claims', 'pmjay', 'ayushman', 'vault']
        },
        {
            icon: ShoppingCart,
            label: 'Procurement',
            desc: 'Purchase Orders & Vendors',
            path: '/admin/procurement',
            color: '#16a34a',
            bg: '#f0fdf4',
            category: 'admin',
            tags: ['procurement', 'purchase order', 'vendor', 'po', 'supplies', 'rfq']
        },
        {
            icon: UserCog,
            label: 'Staff Management',
            desc: 'User Accounts & Roles',
            path: '/admin/staff',
            color: '#ec4899',
            bg: '#fdf2f8',
            category: 'admin',
            tags: ['staff', 'users', 'roles', 'permissions', 'doctor accounts', 'hr']
        },
        {
            icon: CalendarDays,
            label: 'Staff Scheduling',
            desc: 'Duty Rosters & Shifts',
            path: '/admin/staff-scheduling',
            color: '#7c3aed',
            bg: '#f5f3ff',
            category: 'admin',
            tags: ['roster', 'shifts', 'scheduling', 'duty roster', 'attendance']
        },
        {
            icon: Building2,
            label: 'Ward Config',
            desc: 'Ward Setup & Bed Layout',
            path: '/admin/wards',
            color: '#84cc16',
            bg: '#f7fee7',
            category: 'admin',
            tags: ['ward config', 'bed configuration', 'wards', 'rooms', 'bed types']
        },
        {
            icon: IndianRupee,
            label: 'Price Approvals',
            desc: 'Pharmacy Price Changes',
            path: '/admin/prices',
            color: '#f59e0b',
            bg: '#fffbeb',
            category: 'admin',
            tags: ['prices', 'pricing', 'mrp', 'approvals', 'drug prices', 'discounts']
        },
        {
            icon: Activity,
            label: 'Equipment Approvals',
            desc: 'Equipment Change Requests',
            path: '/admin/equipment',
            color: '#eab308',
            bg: '#fefce8',
            category: 'admin',
            tags: ['equipment approvals', 'biomedical approval', 'sign off', 'procurement request']
        },

        // ==========================================
        // 📡 CONNECTED & VIRTUAL CARE
        // ==========================================
        {
            icon: Video,
            label: 'Telehealth',
            desc: 'Virtual Consultations',
            path: '/admin/telehealth',
            color: '#0284c7',
            bg: '#e0f2fe',
            category: 'digital',
            tags: ['telehealth', 'telemedicine', 'video call', 'virtual opd', 'remote doctor']
        },
        {
            icon: Receipt,
            label: 'POS Terminal',
            desc: 'Point of Sale Billing',
            path: '/admin/pos',
            color: '#059669',
            bg: '#ecfdf5',
            category: 'digital',
            tags: ['pos', 'point of sale', 'counter', 'quick bill', 'cash register', 'cafeteria']
        },
        {
            icon: Radio,
            label: 'Remote Monitoring',
            desc: 'RPM IoT & Vitals Telemetry',
            path: '/admin/rpm',
            color: '#6366f1',
            bg: '#eef2ff',
            category: 'digital',
            tags: ['rpm', 'remote patient monitoring', 'iot', 'vitals stream', 'smart monitor', 'wearable']
        }
    ];

    const categories = [
        { id: 'all', label: 'All Modules' },
        { id: 'clinical', label: 'Clinical & Inpatient', badge: '🔴' },
        { id: 'specialty', label: 'Specialty & Diagnostics', badge: '🟡' },
        { id: 'operations', label: 'Operations & Facilities', badge: '🟠' },
        { id: 'quality', label: 'Quality & Safety', badge: '🔵' },
        { id: 'admin', label: 'Admin & Finance', badge: '⚙️' },
        { id: 'digital', label: 'Virtual Care & IoT', badge: '📡' },
    ];

    const filteredModules = modules.filter(m => {
        const matchesCat = activeCategory === 'all' || m.category === activeCategory;
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch = !query ||
            m.label.toLowerCase().includes(query) ||
            m.desc.toLowerCase().includes(query) ||
            (m.tags && m.tags.some(t => t.toLowerCase().includes(query)));
        return matchesCat && matchesSearch;
    });

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
                    {/* Header + Search Bar */}
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
                        <h5 className="fw-bold mb-0 text-muted d-flex align-items-center">
                            <Stethoscope size={20} className="me-2 text-primary" />
                            Live Operational Modules
                            <span className="badge bg-secondary-subtle text-secondary ms-2" style={{ fontSize: '0.75rem', fontWeight: 500 }}>
                                {filteredModules.length} {filteredModules.length === 1 ? 'module' : 'modules'}
                            </span>
                        </h5>
                        <div className="position-relative" style={{ minWidth: '260px' }}>
                            <Search size={16} className="position-absolute text-muted" style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                            <input
                                type="text"
                                className="form-control form-control-sm ps-5 pe-4 py-2"
                                placeholder="Search all 47 modules..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ borderRadius: '20px', fontSize: '0.85rem' }}
                            />
                            {searchQuery && (
                                <X
                                    size={14}
                                    className="position-absolute text-muted"
                                    style={{ right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer' }}
                                    onClick={() => setSearchQuery('')}
                                />
                            )}
                        </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="d-flex flex-wrap gap-2 mb-3">
                        {categories.map(cat => {
                            const isActive = activeCategory === cat.id;
                            const count = cat.id === 'all'
                                ? modules.length
                                : modules.filter(m => m.category === cat.id).length;
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    className={`btn btn-sm ${isActive ? 'btn-primary text-white' : 'btn-outline-secondary'}`}
                                    style={{
                                        borderRadius: '20px',
                                        padding: '5px 12px',
                                        fontSize: '0.8rem',
                                        fontWeight: isActive ? '600' : '500',
                                        transition: 'all 0.2s ease',
                                        boxShadow: isActive ? '0 2px 8px rgba(37,99,235,0.3)' : 'none'
                                    }}
                                    onClick={() => setActiveCategory(cat.id)}
                                >
                                    {cat.badge && <span className="me-1">{cat.badge}</span>}
                                    {cat.label}
                                    <span className={`badge ms-2 ${isActive ? 'bg-white text-primary' : 'bg-light text-secondary'}`} style={{ fontSize: '0.7rem' }}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Cards Grid */}
                    {filteredModules.length === 0 ? (
                        <div className="text-center py-5 bg-light rounded-3 my-3">
                            <p className="text-muted mb-2">No operational modules found matching "<strong>{searchQuery}</strong>"</p>
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                            >
                                Reset Filters
                            </button>
                        </div>
                    ) : (
                        <Row className="g-3 mb-4">
                            {filteredModules.map((module, idx) => {
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
                    )}
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

