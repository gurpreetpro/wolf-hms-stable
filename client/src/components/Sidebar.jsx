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
    Grid3x3 as Grid 
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
        // Common
        { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'doctor', 'nurse', 'receptionist', 'lab_tech', 'pharmacist', 'anaesthetist'] },

        // Admin
        { to: '/users', icon: UserPlus, label: 'User Management', roles: ['admin'] },
        { to: '/ward-management', icon: FileText, label: 'Ward Management', roles: ['admin'] },
        { to: '/settings', icon: Settings, label: 'System Settings', roles: ['admin'] }, // Phase 15
        { to: '/billing', icon: DollarSign, label: 'Revenue & Finance', roles: ['admin'] },
        { to: '/admin/superadmin', icon: Grid, label: 'Developer Dashboard', roles: ['super_admin'] }, // Multi-Tenant (Super Admin Only)
        
        // Wolf Vault - Insurance (Beyond Gold)
        { to: '/admin/vault', icon: Shield, label: '🔐 Insurance Vault', roles: ['admin'] },
        { to: '/insurance', icon: DollarSign, label: '💳 Claims Dashboard', roles: ['admin', 'billing', 'accountant'] },

        // Receptionist
        { to: '/opd', icon: Users, label: 'OPD Reception', roles: ['receptionist', 'admin'] },

        // Doctor
        { to: '/doctor', icon: Activity, label: 'Clinical Dashboard', roles: ['doctor'] },

        // Nurse
        // Nurse - Ward Management
        { to: '/ward', icon: FileText, label: 'All Wards', roles: ['nurse', 'admin'] },
        { to: '/ward/Ward A', icon: FileText, label: 'Ward A', roles: ['nurse', 'admin'] },
        { to: '/ward/Ward B', icon: FileText, label: 'Ward B', roles: ['nurse', 'admin'] },
        { to: '/ward/Emergency', icon: Activity, label: 'Emergency', roles: ['nurse', 'admin'] },

        // Lab
        { to: '/lab', icon: Beaker, label: 'Lab & Tests', roles: ['lab_tech', 'admin', 'doctor'] },

        // CSSD (Phase 12)
        { to: '/cssd', icon: Archive, label: 'CSSD / Sterilization', roles: ['nurse', 'admin', 'ward_incharge'] },

        // Pharmacy
        { to: '/pharmacy', icon: Pill, label: 'Pharmacy', roles: ['pharmacist', 'admin'] },

        // Blood Bank
        { to: '/blood-bank', icon: Activity, label: 'Blood Bank', roles: ['blood_bank_tech', 'lab_tech', 'admin'] },

        // Anaesthetist
        { to: '/anaesthesia', icon: Scissors, label: 'Anaesthesia', roles: ['anaesthetist', 'admin', 'doctor'] },
        { to: '/pac', icon: Activity, label: 'Pre-Anesthesia (PAC)', roles: ['anaesthetist', 'admin', 'doctor'] },
        { to: '/intraop', icon: Activity, label: 'Intra-Op Console', roles: ['anaesthetist', 'admin', 'doctor'] }, // Phase 13
        { to: '/pacu', icon: Bed, label: 'Recovery (PACU)', roles: ['nurse', 'admin', 'anaesthetist', 'doctor'] }, // Phase 14


        
        // Surgical Suite (Phase 10)
        { to: '/ot', icon: Activity, label: 'OT Scheduler', roles: ['surgeon', 'doctor', 'nurse', 'admin', 'anaesthetist'] },

        // Security / Overwatch (Phase 2 Upgrade)
        { to: '/security', icon: Shield, label: 'Security Overwatch', roles: ['security_guard', 'admin', 'security_manager'] },

        // Wolf Care Patient App
        { to: '/admin/reviews', icon: Activity, label: '⭐ Patient Reviews', roles: ['admin'] },
        { to: '/admin/articles', icon: FileText, label: '📚 Health Articles', roles: ['admin'] },
        { to: '/admin/home-lab', icon: Beaker, label: '🏠 Home Lab', roles: ['admin', 'lab_tech'] },

        // Phase 5 - Delivery & Location Tracking
        { to: '/admin/route-replay', icon: Navigation, label: '🗺️ Route Replay', roles: ['admin'] },
        { to: '/admin/staff-locations', icon: Activity, label: '📍 Staff Locations', roles: ['admin'] },
    ];

    const filteredLinks = allLinks.filter(link => link.roles.includes(userRole));

    return (
        <div className="d-flex flex-column flex-shrink-0 p-3" style={{ width: '250px', height: '100vh', position: 'fixed', top: 0, left: 0, backgroundColor: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-color)' }}>
            <div className="d-flex align-items-center mb-3 mb-md-0 me-md-auto text-decoration-none">
                <span className="fs-4 fw-bold" style={{ color: 'var(--accent-cyan)' }}>HMS Premium</span>
            </div>
            <hr style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <Nav className="flex-column mb-auto">
                {filteredLinks.map((link, idx) => {
                    const Icon = link.icon;
                    return (
                        <Nav.Item key={idx} className="mb-1">
                            <Link
                                to={link.to}
                                className={`nav-link d-flex align-items-center gap-2 ${location.pathname === link.to ? 'active' : ''}`}
                                style={{
                                    color: location.pathname === link.to ? '#fff' : '#94a3b8', // White active, Gray inactive
                                    backgroundColor: location.pathname === link.to ? 'var(--accent-cyan)' : 'transparent',
                                    borderRadius: '8px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {Icon && <Icon size={20} />}
                                {link.label}
                            </Link>
                        </Nav.Item>
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
