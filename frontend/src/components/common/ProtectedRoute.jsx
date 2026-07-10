import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ requireVerification = false, requireActivation = false }) => {
    const { isAuthenticated, loading, isVerified, isActive } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requireVerification && !isVerified) {
        return <Navigate to="/verify-email" replace />;
    }

    if (requireActivation && !isActive) {
        return <Navigate to="/activate" replace />;
    }

    return <Outlet />;
};

export default ProtectedRoute;