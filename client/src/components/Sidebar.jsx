import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Nav, Button } from 'react-bootstrap';

import { 
    LayoutDashboard, 
    Users, 
    FileText, 
    LogOut, 
    Activity, 
    Beaker, 
    Pill, 
    Scissors, 
    Settings, 
    DollarSign, 
    UserPlus, 
    User, 
    Archive, 
    Bed, 
    Shield,
    Navigation,
    Grid3x3 as Grid,
    Package,
    BrainCircuit,
    RefreshCcw
} from 'lucide-react';


const Sidebar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    let user = {};
    try {
        const userStr = localStorage.getItem('user');
        // Guard against "undefined" string or null/empty
        if (userStr && userStr !== 'undefined' && userStr !== 'null') {
            const storedUser = JSON.parse(userStr);
            user = storedUser || {};
        }
    } catch (e) {
        console.error('Error parsing user data in Sidebar:', e);
        user = {};
    }

    const userRole = user.role || '';

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const allLinks = [
        // ── Common ──
        { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'doctor', 'nurse', 'receptionist', 'lab_tech', 'pharmacist', 'anaesthetist'], section: 'common' },

        // ── Admin (A–Z sorted) ──
        { to: '/admin/articles', icon: FileText, label: '📚 Articles Manager', roles: ['admin'], section: 'admin' },
        { to: '/billing', icon: DollarSign, label: '💰 Billing & Revenue', roles: ['admin'], section: 'admin' },
        { to: '/insurance', icon: DollarSign, label: '💳 Claims Dashboard', roles: ['admin', 'billing', 'accountant'], section: 'admin' },
        { to: '/admin/superadmin', icon: Grid, label: '🖥️ Developer Dashboard', roles: ['super_admin'], section: 'admin' },
        { to: '/admin/enterprise-ai', icon: BrainCircuit, label: '🧠 Enterprise AI', roles: ['admin'], section: 'admin' },
        { to: '/admin/erp-sync', icon: RefreshCcw, label: '📊 ERP Tally Sync', roles: ['admin'], section: 'admin' },
        { to: '/admin/home-lab', icon: Beaker, label: '🏠 Home Lab', roles: ['admin', 'lab_tech'], section: 'admin' },
        { to: '/admin/vault', icon: Shield, label: '🔐 Insurance Vault', roles: ['admin'], section: 'admin' },
        { to: '/admin/reviews', icon: Activity, label: '⭐ Patient Reviews', roles: ['admin'], section: 'admin' },
        { to: '/admin/route-replay', icon: Navigation, label: '🗺️ Route Replay', roles: ['admin'], section: 'admin' },
        { to: '/admin/staff-locations', icon: Activity, label: '📍 Staff Locations', roles: ['admin'], section: 'admin' },
        { to: '/settings', icon: Settings, label: '⚙️ System Settings', roles: ['admin'], section: 'admin' },
        { to: '/admin/treatment-packages', icon: Package, label: '📦 Treatment Packages', roles: ['admin'], section: 'admin' },
        { to: '/users', icon: UserPlus, label: '👥 User Management', roles: ['admin'], section: 'admin' },
        { to: '/ward-management', icon: FileText, label: '🏥 Ward Management', roles: ['admin'], section: 'admin' },

        // ── Clinical ──
        { to: '/opd', icon: Users, label: 'OPD Reception', roles: ['receptionist', 'admin'], section: 'clinical' },
        { to: '/doctor', icon: Activity, label: 'Clinical Dashboard', roles: ['doctor'], section: 'clinical' },

        // ── Nursing ──
        { to: '/ward', icon: FileText, label: 'All Wards', roles: ['nurse', 'admin'], section: 'nursing' },
        { to: '/ward/Ward A', icon: FileText, label: 'Ward A', roles: ['nurse', 'admin'], section: 'nursing' },
        { to: '/ward/Ward B', icon: FileText, label: 'Ward B', roles: ['nurse', 'admin'], section: 'nursing' },
        { to: '/ward/Emergency', icon: Activity, label: 'Emergency', roles: ['nurse', 'admin'], section: 'nursing' },

        // ── Diagnostics ──
        { to: '/lab', icon: Beaker, label: 'Lab & Tests', roles: ['lab_tech', 'admin', 'doctor'], section: 'diagnostics' },
        { to: '/blood-bank', icon: Activity, label: 'Blood Bank', roles: ['blood_bank_tech', 'lab_tech', 'admin'], section: 'diagnostics' },

        // ── Pharmacy ──
        { to: '/pharmacy', icon: Pill, label: 'Pharmacy', roles: ['pharmacist', 'admin'], section: 'pharmacy' },

        // ── Surgical ──
        { to: '/ot', icon: Activity, label: 'OT Scheduler', roles: ['surgeon', 'doctor', 'nurse', 'admin', 'anaesthetist'], section: 'surgical' },
        { to: '/anaesthesia', icon: Scissors, label: 'Anaesthesia', roles: ['anaesthetist', 'admin', 'doctor'], section: 'surgical' },
        { to: '/pac', icon: Activity, label: 'Pre-Anesthesia (PAC)', roles: ['anaesthetist', 'admin', 'doctor'], section: 'surgical' },
        { to: '/intraop', icon: Activity, label: 'Intra-Op Console', roles: ['anaesthetist', 'admin', 'doctor'], section: 'surgical' },
        { to: '/pacu', icon: Bed, label: 'Recovery (PACU)', roles: ['nurse', 'admin', 'anaesthetist', 'doctor'], section: 'surgical' },

        // ── Support ──
        { to: '/cssd', icon: Archive, label: 'CSSD / Sterilization', roles: ['nurse', 'admin', 'ward_incharge'], section: 'support' },
        { to: '/security', icon: Shield, label: 'Security Overwatch', roles: ['security_guard', 'admin', 'security_manager'], section: 'support' },
    ];

    const filteredLinks = allLinks.filter(link => link.roles.includes(userRole));

    // Group by section for admin users
    const sections = {};
    filteredLinks.forEach(link => {
        const sec = link.section || 'other';
        if (!sections[sec]) sections[sec] = [];
        sections[sec].push(link);
    });

    const sectionLabels = {
        common: null,
        admin: '─── Administration ───',
        clinical: '─── Clinical ───',
        nursing: '─── Nursing ───',
        diagnostics: '─── Diagnostics ───',
        pharmacy: '─── Pharmacy ───',
        surgical: '─── Surgical Suite ───',
        support: '─── Support Services ───',
    };

    const sectionOrder = ['common', 'admin', 'clinical', 'nursing', 'diagnostics', 'pharmacy', 'surgical', 'support'];

    return (
        <div className="d-flex flex-column flex-shrink-0 p-3" style={{ width: '250px', height: '100vh', position: 'fixed', top: 0, left: 0, backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-color)', overflowY: 'auto' }}>
            <div className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-decoration-none">
                <span className="fs-4 fw-bold" style={{ color: 'var(--accent-cyan)' }}>🐺 Wolf HMS</span>
            </div>
            <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <Nav className="flex-column mb-auto">
                {sectionOrder.map(secKey => {
                    const links = sections[secKey];
                    if (!links || links.length === 0) return null;
                    const label = sectionLabels[secKey];
                    return (
                        <React.Fragment key={secKey}>
                            {label && (
                                <div className="px-2 mt-3 mb-1" style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>
                                    {label}
                                </div>
                            )}
                            {links.map((link, idx) => {
                                const Icon = link.icon;
                                return (
                                    <Nav.Item key={`${secKey}-${idx}`} className="mb-1">
                                        <Link
                                            to={link.to}
                                            className={`nav-link d-flex align-items-center gap-2 ${location.pathname === link.to ? 'active' : ''}`}
                                            style={{
                                                color: location.pathname === link.to ? '#fff' : '#94a3b8',
                                                backgroundColor: location.pathname === link.to ? 'var(--accent-cyan)' : 'transparent',
                                                borderRadius: '8px',
                                                transition: 'all 0.2s',
                                                fontSize: '0.85rem',
                                                padding: '6px 10px'
                                            }}
                                        >
                                            {Icon && <Icon size={18} />}
                                            {link.label}
                                        </Link>
                                    </Nav.Item>
                                );
                            })}
                        </React.Fragment>
                    );
                })}
            </Nav>
            <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <div className="dropdown">
                <div className="d-flex align-items-center text-decoration-none dropdown-toggle" id="dropdownUser1" data-bs-toggle="dropdown" aria-expanded="false">
                    <div className="rounded-circle me-2 d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px', backgroundColor: 'var(--accent-magenta)', color: '#fff' }}>
                        <User size={18} />
                    </div>
                    <strong style={{ color: '#f8fafc' }}>{user.username || 'User'}</strong>
                </div>
                <ul className="dropdown-menu text-small shadow" aria-labelledby="dropdownUser1" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    <li><button className="dropdown-item" onClick={handleLogout} style={{ color: 'var(--danger-red)' }}>Sign out</button></li>
                </ul>
            </div>
        </div>
    );
};

export default Sidebar;
