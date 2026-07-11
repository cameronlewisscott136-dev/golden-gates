import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import WithdrawalManagement from './WithdrawalManagement';
import { FaSignOutAlt, FaShieldAlt } from 'react-icons/fa';

const AdminDashboard = () => {
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const adminToken = localStorage.getItem('adminToken');
        if (!adminToken) {
            navigate('/admin/login');
            return;
        }
        setLoading(false);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        toast.success('Logged out successfully');
        navigate('/admin/login');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Admin Navbar */}
            <nav className="bg-white shadow-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
                                <FaShieldAlt className="text-white text-xl" />
                            </div>
                            <span className="ml-3 text-xl font-bold text-gray-900">Admin Dashboard</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
                            >
                                <FaSignOutAlt /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <WithdrawalManagement />
            </div>
        </div>
    );
};

export default AdminDashboard;