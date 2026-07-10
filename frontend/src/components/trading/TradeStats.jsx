import React, { useState, useEffect } from 'react';
import tradeService from '../../services/tradeService';
import Navbar from '../common/Navbar';
import { FaChartLine, FaCheckCircle, FaTimesCircle, FaTrophy, FaArrowUp, FaArrowDown, FaWallet, FaLock } from 'react-icons/fa';

const TradeStats = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await tradeService.getTradeStats();
                setStats(response.data);
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

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
        { label: 'Total Trades', value: stats?.totalTrades || 0, icon: <FaChartLine />, color: 'from-blue-400 to-blue-600' },
        { label: 'Winning Trades', value: stats?.winningTrades || 0, icon: <FaCheckCircle />, color: 'from-green-400 to-green-600' },
        { label: 'Losing Trades', value: stats?.losingTrades || 0, icon: <FaTimesCircle />, color: 'from-red-400 to-red-600' },
        { label: 'Win Rate', value: `${stats?.winRate || 0}%`, icon: <FaTrophy />, color: 'from-yellow-400 to-yellow-600' },
        { label: 'Total Profit', value: `$${stats?.totalProfit?.toFixed(2) || '0.00'}`, icon: <FaArrowUp />, color: 'from-green-400 to-green-600' },
        { label: 'Total Loss', value: `$${Math.abs(stats?.totalLoss || 0).toFixed(2)}`, icon: <FaArrowDown />, color: 'from-red-400 to-red-600' },
        { label: 'Net P/L', value: `$${((stats?.totalProfit || 0) + (stats?.totalLoss || 0)).toFixed(2)}`, icon: <FaWallet />, color: 'from-purple-400 to-purple-600' },
        { label: 'Open Trades', value: stats?.openTrades || 0, icon: <FaLock />, color: 'from-orange-400 to-orange-600' },
    ];

    return (
        <>
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Trade Statistics</h1>
                    <p className="text-gray-600 mt-1">Your trading performance overview</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((stat, index) => (
                        <div key={index} className={`bg-gradient-to-r ${stat.color} rounded-xl shadow-lg p-6 text-white hover:shadow-xl transition-shadow`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm opacity-90">{stat.label}</p>
                                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                                </div>
                                <div className="text-2xl opacity-70">{stat.icon}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Summary</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                                <span className="text-green-800 font-medium">Total Profit</span>
                                <span className="text-2xl font-bold text-green-600">+${stats?.totalProfit?.toFixed(2) || '0.00'}</span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                                <span className="text-red-800 font-medium">Total Loss</span>
                                <span className="text-2xl font-bold text-red-600">-${Math.abs(stats?.totalLoss || 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                                <span className="text-blue-800 font-medium">Net Performance</span>
                                <span className={`text-2xl font-bold ${((stats?.totalProfit || 0) + (stats?.totalLoss || 0)) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ${((stats?.totalProfit || 0) + (stats?.totalLoss || 0)).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
                                <span className="text-yellow-800 font-medium">Win/Loss Ratio</span>
                                <span className="text-2xl font-bold text-yellow-600">
                                    {stats?.winningTrades || 0}:{stats?.losingTrades || 0}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-600">Total Trades</span>
                                <span className="font-bold text-gray-900">{stats?.totalTrades || 0}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-600">Winning Trades</span>
                                <span className="font-bold text-green-600">{stats?.winningTrades || 0}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-600">Losing Trades</span>
                                <span className="font-bold text-red-600">{stats?.losingTrades || 0}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-600">Open Positions</span>
                                <span className="font-bold text-yellow-600">{stats?.openTrades || 0}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-600">Win Rate</span>
                                <span className="font-bold text-blue-600">{stats?.winRate || 0}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default TradeStats;