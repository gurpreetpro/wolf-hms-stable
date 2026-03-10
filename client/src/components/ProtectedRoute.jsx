import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isTokenValid } from '../utils/axiosInstance';
import { safeGetUser, clearAuth } from '../utils/safeStorage';

const ProtectedRoute = ({ allowedRoles }) => {
    const token = localStorage.getItem('token');
    const user = safeGetUser(); // Safe parse - handles "undefined" string

    // Check if token exists AND is not expired
    if (!token || token === 'undefined' || !isTokenValid()) {
        clearAuth();
        return <Navigate to="/login" replace />;
    }

    // User data corrupted - redirect to login
    if (!user) {
        clearAuth();
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // Redirect to unauthorized or dashboard if role doesn't match
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;

