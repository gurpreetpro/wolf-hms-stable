import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    LogOut,
    Menu,
    X,
    Users,
    ClipboardList,
    Activity,
    FlaskConical,
    Pill,
    Settings,
    UserCircle,
    ArrowLeft
} from 'lucide-react';
import ChatAssistant from './ChatAssistant';
import TopNav from './TopNav';
import BackButton from './BackButton';

const DashboardLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);


    useEffect(() => {
        try {
            const userStr = localStorage.getItem('user');
            // Guard against "undefined" string or null/empty
            if (!userStr || userStr === 'undefined' || userStr === 'null') {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                navigate('/login');
                return;
            }
            const userData = JSON.parse(userStr);
            if (!userData) {
                navigate('/login');
            } else {
                setUser(userData);
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
            navigate('/login');
        }
    }, [navigate]);




    // Show back button on all pages except dashboard
    const showBackButton = location.pathname !== '/';

    return (
        <div className="d-flex flex-column min-vh-100" style={{ backgroundColor: 'var(--bg-dark)' }}>
            <TopNav />

            {/* Main Content */}
            <div className="flex-grow-1 container-fluid p-4">
                {showBackButton && <BackButton />}
                <Outlet />
            </div>

            {/* AI Chat Assistant - Hide trigger on Ward Dashboard as it has its own Dock */}
            <ChatAssistant hideTrigger={location.pathname.startsWith('/ward')} />




        </div >
    );
};

export default DashboardLayout;

