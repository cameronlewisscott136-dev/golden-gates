import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import referralService from '../../services/referralService';
import Navbar from '../common/Navbar';
import toast from 'react-hot-toast';
import { FaUsers, FaCheckCircle, FaClock, FaWallet, FaCopy, FaShare } from 'react-icons/fa';

const ReferralDashboard = () => {
    const { user } = useAuth();
    const [referrals, setReferrals] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        fetchReferralData();
    }, []);

    const fetchReferralData = async () => {
        setLoading(true);
        try {
            const [refsRes, statsRes] = await Promise.all([
                referralService.getReferrals(),
                referralService.getReferralStats()
            ]);
            setReferrals(refsRes.data.referrals || []);
            setStats(refsRes.data);
        } catch (error) {
            console.error('Error fetching referral data:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyReferralCode = () => {
        const code = user?.referralCode || '';
        navigator.clipboard.writeText(code);
        setCopySuccess(true);
        toast.success('Referral code copied!');
        setTimeout(() => setCopySuccess(false), 3000);
    };

    const copyReferralLink = () => {
        const link = `${window.location.origin}/register?ref=${user?.referralCode || ''}`;
        navigator.clipboard.writeText(link);
        toast.success('Referral link copied!');
    };

    if (loading) {
        return (
            <>
                <Navbar />
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="spinner"></div>
                </div>
            </>
        );
    }

    const statCards = [
        { label: 'Total Referrals', value: stats?.totalReferrals || 0, icon: <FaUsers />, color: 'from-blue-400 to-blue-600' },
        { label: 'Active Referrals', value: stats?.active || 0, icon: <FaCheckCircle />, color: 'from-green-400 to-green-600' },
        { label: 'Pending Referrals', value: stats?.pending || 0, icon: <FaClock />, color: 'from-yellow-400 to-yellow-600' },
        { label: 'Total Earned', value: `$${stats?.totalEarned?.toFixed(2) || '0.00'}`, icon: <FaWallet />, color: 'from-purple-400 to-purple-600' },
    ];

    return (
        <>
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Referrals</h1>
                    <p className="text-gray-600 mt-1">Invite friends and earn rewards</p>
                </div>

                {/* Referral Code Section */}
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-xl shadow-lg p-6 mb-8 border border-yellow-200">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-sm font-medium text-yellow-800">Your Referral Code</p>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-3xl font-bold text-yellow-600 tracking-wider">
                                    {user?.referralCode || 'N/A'}
                                </span>
                                <button
                                    onClick={copyReferralCode}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 flex items-center gap-2"
                                >
                                    <FaCopy />
                                    {copySuccess ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-yellow-800">Share Link</p>
                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    type="text"
                                    className="input-field bg-white"
                                    value={`${window.location.origin}/register?ref=${user?.referralCode || ''}`}
                                    readOnly
                                />
                                <button
                                    onClick={copyReferralLink}
                                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 flex items-center gap-2"
                                >
                                    <FaShare />
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {statCards.map((stat, index) => (
                        <div key={index} className={`bg-gradient-to-r ${stat.color} rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-shadow`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm opacity-90">{stat.label}</p>
                                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                                </div>
                                <div className="text-2xl opacity-70">{stat.icon}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Referrals List */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Your Referrals</h3>
                        <p className="text-sm text-gray-500 mt-1">Bonus: ${stats?.bonusRate || 100} per referral</p>
                    </div>
                    {referrals.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No referrals yet. Share your code and start earning!</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Bonus Earned</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {referrals.map((ref) => (
                                        <tr key={ref._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium">
                                                {ref.referredUser?.firstName} {ref.referredUser?.lastName}
                                            </td>
                                            <td className="px-6 py-4">{ref.referredUser?.email}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${ref.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {ref.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-green-600">
                                                ${ref.bonusEarned || 0}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {new Date(ref.createdAt).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default ReferralDashboard;