import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import Dashboard from '../pages/Dashboard'; // Admin Dashboard
import DoctorDashboard from '../pages/DoctorDashboard';
import WardDashboard from '../pages/WardDashboard';
import OPDReception from '../pages/OPDReception';
import LabDashboard from '../pages/LabDashboard';
import PharmacyDashboard from '../pages/PharmacyDashboard';
import AnaesthesiaDashboard from '../pages/AnaesthesiaDashboard';
import BillingDashboard from '../pages/BillingDashboard';
import WardManagement from '../pages/WardManagement';
import { safeGetUser } from '../utils/safeStorage';
import { connectSocket } from '../services/socket';

const DashboardHome = () => {
    const user = safeGetUser() || {};
    
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token && user.hospital_id) {
            connectSocket(token, user.hospital_id);
        }
    }, [user.hospital_id]);

    switch (user.role) {
        case 'super_admin':
            return <Navigate to="/admin/superadmin" replace />;
        case 'administrator':
        case 'admin':
            return <Dashboard />;
        case 'doctor':
            return <DoctorDashboard />;
        case 'nurse':
            return <WardDashboard />;
        case 'receptionist':
            return <OPDReception />;
        case 'lab_tech':
            return <LabDashboard />;
        case 'pharmacist':
            return <PharmacyDashboard />;
        case 'anaesthetist':
            return <AnaesthesiaDashboard />;
        case 'billing':
            return <BillingDashboard />;
        case 'ward_incharge':
            return <WardManagement />;
        default:
            return <Navigate to="/login" replace />;
    }
};

export default DashboardHome;
