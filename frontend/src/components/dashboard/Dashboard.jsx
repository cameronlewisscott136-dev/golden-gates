import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import tradeService from '../../services/tradeService';
import transactionService from '../../services/transactionService';
import Navbar from '../common/Navbar';
import { FaWallet, FaChartLine, FaTrophy, FaUsers, FaArrowUp, FaArrowDown } from 'react-icons/fa';

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [recentTrades, setRecentTrades] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, tradesRes, transactionsRes] = await Promise.all([
                    tradeService.getTradeStats(),
                    tradeService.getTrades({ limit: 5 }),
                    transactionService.getTransactions({ limit: 5 })
                ]);
                setStats(statsRes.data);
                setRecentTrades(tradesRes.data.trades || []);
                setRecentTransactions(transactionsRes.data.transactions || []);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const statCards = [
        { label: 'Balance', value: `KES ${user?.balance?.toFixed(2) || '0.00'}`, icon: <FaWallet className="text-2xl" />, color: 'from-yellow-400 to-yellow-600' },
        { label: 'Total Trades', value: stats?.totalTrades || 0, icon: <FaChartLine className="text-2xl" />, color: 'from-blue-400 to-blue-600' },
        { label: 'Win Rate', value: `${stats?.winRate || 0}%`, icon: <FaTrophy className="text-2xl" />, color: 'from-green-400 to-green-600' },
        { label: 'Referrals', value: user?.totalReferrals || 0, icon: <FaUsers className="text-2xl" />, color: 'from-purple-400 to-purple-600' },
    ];

    if (loading) {
        return <><Navbar /><div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="spinner"></div></div></>;
    }

    return (
        <>
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-8 fade-in">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.firstName}! 👋</h1>
                    <p className="text-gray-600 mt-1">Here's what's happening with your account</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((stat, index) => (
                        <div key={index} className={`bg-gradient-to-r ${stat.color} rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-shadow`}>
                            <div className="flex justify-between items-start">
                                <div><p className="text-sm opacity-90">{stat.label}</p><p className="text-3xl font-bold mt-1">{stat.value}</p></div>
                                <div className="opacity-70">{stat.icon}</div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><FaChartLine className="text-yellow-500" /> Recent Trades</h3>
                        <div className="mt-4 overflow-x-auto">
                            {recentTrades.length === 0 ? <p className="text-gray-500 text-center py-4">No trades yet</p> : (
                                <table className="w-full">
                                    <thead><tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"><th className="pb-2">Asset</th><th className="pb-2">Type</th><th className="pb-2">Amount</th><th className="pb-2">Status</th></tr></thead>
                                    <tbody>
                                        {recentTrades.map((trade) => (
                                            <tr key={trade._id} className="border-t border-gray-100">
                                                <td className="py-2 font-medium">{trade.asset}</td>
                                                <td className="py-2"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${trade.type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{trade.type.toUpperCase()}</span></td>
                                                <td className="py-2">KES {trade.amount}</td>
                                                <td className="py-2"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${trade.status === 'open' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>{trade.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2"><FaWallet className="text-yellow-500" /> Recent Transactions</h3>
                        <div className="mt-4 overflow-x-auto">
                            {recentTransactions.length === 0 ? <p className="text-gray-500 text-center py-4">No transactions yet</p> : (
                                <table className="w-full">
                                    <thead><tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"><th className="pb-2">Type</th><th className="pb-2">Amount</th><th className="pb-2">Status</th></tr></thead>
                                    <tbody>
                                        {recentTransactions.map((tx) => (
                                            <tr key={tx._id} className="border-t border-gray-100">
                                                <td className="py-2"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${tx.type === 'deposit' ? 'bg-green-100 text-green-800' : tx.type === 'referral_bonus' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>{tx.type.replace('_', ' ').toUpperCase()}</span></td>
                                                <td className={`py-2 font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>KES {tx.amount}</td>
                                                <td className="py-2"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${tx.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{tx.status}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Dashboard;