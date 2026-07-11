import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const AdminProtectedRoute = () => {
    // Check both localStorage and sessionStorage
    const adminToken = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');

    if (!adminToken) {
        // Clear any stale admin data
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        sessionStorage.removeItem('adminToken');
        return <Navigate to="/admin/login" replace />;
    }

    return <Outlet />;
};

export default AdminProtectedRoute;