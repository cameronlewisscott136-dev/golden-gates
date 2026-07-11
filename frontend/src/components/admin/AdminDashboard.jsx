import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, amount: 0 });
    const [actionLoading, setActionLoading] = useState(null);
    const navigate = useNavigate();

    const API_URL = import.meta.env.DEV
        ? '/api'
        : 'https://golden-gates-oegh.onrender.com/api';

    useEffect(() => {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            navigate('/admin/login');
            return;
        }
        fetchWithdrawals();
    }, []);

    const fetchWithdrawals = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const response = await axios.get(`${API_URL}/admin/withdrawals/pending`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setWithdrawals(response.data.data.withdrawals);
            setStats({
                total: response.data.data.count,
                amount: response.data.data.totalPending
            });
        } catch (error) {
            if (error.response?.status === 401 || error.response?.status === 403) {
                localStorage.removeItem('adminToken');
                localStorage.removeItem('adminUser');
                navigate('/admin/login');
                toast.error('Session expired. Please login again.');
            } else {
                toast.error('Failed to load withdrawals');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, action) => {
        if (action === 'reject') {
            const reason = prompt('Reason for rejection:');
            if (!reason) return;
        }

        setActionLoading(id);
        try {
            const token = localStorage.getItem('adminToken');

            if (action === 'approve') {
                await axios.put(`${API_URL}/admin/withdrawals/${id}/approve`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Withdrawal approved!');
            } else if (action === 'reject') {
                const reason = prompt('Reason for rejection:');
                if (!reason) {
                    setActionLoading(null);
                    return;
                }
                await axios.put(`${API_URL}/admin/withdrawals/${id}/reject`, { reason }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Withdrawal rejected!');
            }

            // Refresh list
            fetchWithdrawals();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading(null);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
        toast.success('Logged out');
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
            {/* Navbar */}
            <nav className="bg-white shadow-lg sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <span className="text-xl font-bold text-gray-900">Admin Dashboard</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600 hidden md:block">
                                Pending: {stats.total} | Total: KES {stats.amount.toFixed(2)}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-6">Withdrawal Requests</h1>

                {withdrawals.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                        <p className="text-gray-500 text-lg">No pending withdrawal requests</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {withdrawals.map((withdrawal) => (
                                        <tr key={withdrawal._id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-medium">{withdrawal.user?.firstName} {withdrawal.user?.lastName}</p>
                                                    <p className="text-xs text-gray-500">{withdrawal.user?.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{withdrawal.user?.phone}</td>
                                            <td className="px-6 py-4 font-bold text-blue-600">
                                                KES {withdrawal.amount.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(withdrawal.createdAt).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleAction(withdrawal._id, 'approve')}
                                                        disabled={actionLoading === withdrawal._id}
                                                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg transition disabled:opacity-50"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(withdrawal._id, 'reject')}
                                                        disabled={actionLoading === withdrawal._id}
                                                        className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition disabled:opacity-50"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;