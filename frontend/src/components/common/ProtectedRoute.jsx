import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ requireVerification = false, requireActivation = false }) => {
    const { isAuthenticated, loading, isVerified, isActive } = useAuth();

    if (loading) return <LoadingSpinner fullScreen />;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (requireVerification && !isVerified) return <Navigate to="/verify-email" replace />;
    if (requireActivation && !isActive) return <Navigate to="/activate" replace />;

    return <Outlet />;
};

export default ProtectedRoute;