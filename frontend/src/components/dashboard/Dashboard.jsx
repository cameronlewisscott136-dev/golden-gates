import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import tradeService from '../../services/tradeService';
import transactionService from '../../services/transactionService';
import authService from '../../services/authService';
import Navbar from '../common/Navbar';
import { FaWallet, FaChartLine, FaTrophy, FaUsers, FaLock, FaGift, FaCoins } from 'react-icons/fa';

const Dashboard = () => {
    const { user, updateUser } = useAuth();
    const [stats, setStats] = useState(null);
    const [recentTrades, setRecentTrades] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    const refreshBalance = async () => {
        try {
            const response = await authService.getCurrentUser();
            if (response.data?.user) {
                updateUser(response.data.user);
            }
        } catch (error) {
            console.error('Error refreshing balance:', error);
        }
    };

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
                await refreshBalance();
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();

        const interval = setInterval(refreshBalance, 10000);
        return () => clearInterval(interval);
    }, []);

    const statCards = [
        {
            label: 'Total Balance',
            value: `KES ${user?.totalBalance?.toFixed(2) || '0.00'}`,
            icon: <FaWallet className="text-2xl" />,
            color: 'from-yellow-400 to-yellow-600'
        },
        {
            label: 'Trading Balance',
            value: `KES ${user?.tradingBalance?.toFixed(2) || '0.00'}`,
            icon: <FaCoins className="text-2xl" />,
            color: 'from-blue-400 to-blue-600'
        },
        {
            label: 'Initial Capital',
            value: `KES ${user?.initialCapital?.toFixed(2) || '0.00'}`,
            icon: <FaLock className="text-2xl" />,
            color: 'from-green-400 to-green-600'
        },
        {
            label: 'Referral Bonus',
            value: `KES ${user?.bonusBalance?.toFixed(2) || '0.00'}`,
            icon: <FaGift className="text-2xl" />,
            color: 'from-purple-400 to-purple-600'
        },
    ];

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

    return (
        <>
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-8 fade-in">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.firstName}! 👋</h1>
                    <p className="text-gray-600 mt-1">Here's your account overview</p>
                </div>

                {/* Balance Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((stat, index) => (
                        <div key={index} className={`bg-gradient-to-r ${stat.color} rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-shadow`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm opacity-90">{stat.label}</p>
                                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                                </div>
                                <div className="opacity-70">{stat.icon}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Balance Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <p className="text-sm text-green-700">🔒 Initial Capital (Locked)</p>
                        <p className="text-xl font-bold text-green-600">KES {user?.initialCapital?.toFixed(2) || '0.00'}</p>
                        <p className="text-xs text-green-600 mt-1">Cannot be withdrawn or used for trading</p>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-700">📈 Profit Balance</p>
                        <p className="text-xl font-bold text-blue-600">KES {user?.profitBalance?.toFixed(2) || '0.00'}</p>
                        <p className="text-xs text-blue-600 mt-1">Can be used for trading</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                        <p className="text-sm text-purple-700">🎁 Bonus Balance</p>
                        <p className="text-xl font-bold text-purple-600">KES {user?.bonusBalance?.toFixed(2) || '0.00'}</p>
                        <p className="text-xs text-purple-600 mt-1">Can be traded or withdrawn</p>
                    </div>
                </div>

                {/* Referral Info */}
                {user?.referralCode && (
                    <div className="mt-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                                <p className="text-sm text-yellow-800">🎯 Your Referral Code</p>
                                <p className="text-xl font-bold text-yellow-700">{user.referralCode}</p>
                                <p className="text-xs text-yellow-600">Earn KES 200 for each friend who activates their account</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-yellow-800">Total Referrals</p>
                                <p className="text-2xl font-bold text-yellow-700">{user?.totalReferrals || 0}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <FaChartLine className="text-yellow-500" /> Recent Trades
                        </h3>
                        <div className="mt-4 overflow-x-auto">
                            {recentTrades.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No trades yet</p>
                            ) : (
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            <th className="pb-2">Asset</th>
                                            <th className="pb-2">Type</th>
                                            <th className="pb-2">Amount</th>
                                            <th className="pb-2">P/L</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentTrades.map((trade) => (
                                            <tr key={trade._id} className="border-t border-gray-100">
                                                <td className="py-2 font-medium">{trade.asset}</td>
                                                <td className="py-2">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${trade.type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {trade.type.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="py-2">KES {trade.amount}</td>
                                                <td className={`py-2 font-medium ${trade.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {trade.status === 'closed' ? `${trade.profitLoss >= 0 ? '+' : ''}KES ${trade.profitLoss.toFixed(2)}` : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <FaWallet className="text-yellow-500" /> Recent Transactions
                        </h3>
                        <div className="mt-4 overflow-x-auto">
                            {recentTransactions.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No transactions yet</p>
                            ) : (
                                <table className="w-full">
                                    <thead>
                                        <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                            <th className="pb-2">Type</th>
                                            <th className="pb-2">Amount</th>
                                            <th className="pb-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentTransactions.map((tx) => (
                                            <tr key={tx._id} className="border-t border-gray-100">
                                                <td className="py-2">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${tx.type === 'deposit' ? 'bg-green-100 text-green-800' :
                                                            tx.type === 'referral_bonus' ? 'bg-purple-100 text-purple-800' :
                                                                tx.type === 'withdrawal' ? 'bg-red-100 text-red-800' :
                                                                    'bg-blue-100 text-blue-800'
                                                        }`}>
                                                        {tx.type.replace('_', ' ').toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className={`py-2 font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    KES {tx.amount}
                                                </td>
                                                <td className="py-2">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${tx.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {tx.status}
                                                    </span>
                                                </td>
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