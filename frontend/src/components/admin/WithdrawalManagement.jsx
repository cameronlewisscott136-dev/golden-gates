import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FaCheckCircle, FaTimesCircle, FaClock, FaWallet, FaPhone, FaUser } from 'react-icons/fa';

const WithdrawalManagement = () => {
    const [withdrawals, setWithdrawals] = useState([]);
    const [stats, setStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchWithdrawals();
    }, [filter]);

    const fetchWithdrawals = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/admin/withdrawals/all?status=${filter}`);
            setWithdrawals(response.data.data.withdrawals);
            setStats(response.data.data.stats);
        } catch (error) {
            console.error('Error fetching withdrawals:', error);
            toast.error('Failed to load withdrawals');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id, action, data = {}) => {
        setActionLoading(true);
        try {
            let endpoint = '';
            let method = 'put';
            let message = '';

            switch (action) {
                case 'approve':
                    endpoint = `/admin/withdrawals/${id}/approve`;
                    message = 'Withdrawal approved!';
                    break;
                case 'complete':
                    endpoint = `/admin/withdrawals/${id}/complete`;
                    message = 'Withdrawal completed!';
                    break;
                case 'reject':
                    const reason = prompt('Enter reason for rejection:');
                    if (!reason) {
                        setActionLoading(false);
                        return;
                    }
                    endpoint = `/admin/withdrawals/${id}/reject`;
                    data = { reason };
                    message = 'Withdrawal rejected!';
                    break;
                default:
                    return;
            }

            await api[endpoint.includes('reject') ? 'put' : 'put'](endpoint, data);
            toast.success(message);
            fetchWithdrawals();
            setSelectedWithdrawal(null);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: 'bg-yellow-100 text-yellow-800',
            processing: 'bg-blue-100 text-blue-800',
            completed: 'bg-green-100 text-green-800',
            failed: 'bg-red-100 text-red-800'
        };
        return `px-2 py-1 text-xs font-semibold rounded-full ${badges[status] || 'bg-gray-100 text-gray-800'}`;
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'pending': return <FaClock className="text-yellow-500" />;
            case 'processing': return <FaClock className="text-blue-500" />;
            case 'completed': return <FaCheckCircle className="text-green-500" />;
            case 'failed': return <FaTimesCircle className="text-red-500" />;
            default: return null;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Withdrawal Management</h2>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-700">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">
                        {stats.pending?.count || 0} (KES {stats.pending?.totalAmount?.toFixed(2) || '0.00'})
                    </p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">Processing</p>
                    <p className="text-2xl font-bold text-blue-600">
                        {stats.processing?.count || 0} (KES {stats.processing?.totalAmount?.toFixed(2) || '0.00'})
                    </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700">Completed</p>
                    <p className="text-2xl font-bold text-green-600">
                        {stats.completed?.count || 0} (KES {stats.completed?.totalAmount?.toFixed(2) || '0.00'})
                    </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <p className="text-sm text-red-700">Failed</p>
                    <p className="text-2xl font-bold text-red-600">
                        {stats.failed?.count || 0} (KES {stats.failed?.totalAmount?.toFixed(2) || '0.00'})
                    </p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4">
                {['pending', 'processing', 'completed', 'failed'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilter(status)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === status
                                ? 'bg-yellow-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}
            </div>

            {/* Withdrawals List */}
            <div className="overflow-x-auto">
                {withdrawals.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No {filter} withdrawals found
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {withdrawals.map((withdrawal) => (
                                <tr key={withdrawal._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <FaUser className="text-gray-400" />
                                            <div>
                                                <p className="font-medium">{withdrawal.user?.firstName} {withdrawal.user?.lastName}</p>
                                                <p className="text-xs text-gray-500">{withdrawal.user?.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1">
                                            <FaPhone className="text-gray-400" />
                                            {withdrawal.user?.phone}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 font-bold text-blue-600">
                                        KES {withdrawal.amount.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`flex items-center gap-1 ${getStatusBadge(withdrawal.status)}`}>
                                            {getStatusIcon(withdrawal.status)}
                                            {withdrawal.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-500">
                                        {new Date(withdrawal.createdAt).toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        {withdrawal.status === 'pending' && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleAction(withdrawal._id, 'approve')}
                                                    className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition"
                                                    disabled={actionLoading}
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleAction(withdrawal._id, 'reject')}
                                                    className="px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition"
                                                    disabled={actionLoading}
                                                >
                                                    Reject
                                                </button>
                                            </div>
                                        )}
                                        {withdrawal.status === 'processing' && (
                                            <button
                                                onClick={() => handleAction(withdrawal._id, 'complete')}
                                                className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition"
                                                disabled={actionLoading}
                                            >
                                                Complete
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default WithdrawalManagement;