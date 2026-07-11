import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import tradeService from '../../services/tradeService';
import Navbar from '../common/Navbar';
import { FaPlus, FaEye } from 'react-icons/fa';

const TradeList = () => {
    const [trades, setTrades] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });

    useEffect(() => {
        fetchTrades();
    }, [filter, pagination.page]);

    const fetchTrades = async () => {
        setLoading(true);
        try {
            const params = { page: pagination.page, limit: 10 };
            if (filter !== 'all') params.status = filter;
            const response = await tradeService.getTrades(params);
            setTrades(response.data.trades);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Error fetching trades:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <><Navbar /><div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="spinner"></div></div></>;

    return (
        <>
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-8 fade-in">
                <div className="flex justify-between items-center mb-6">
                    <div><h1 className="text-3xl font-bold">Trades</h1><p className="text-gray-600 mt-1">Manage your trading activity</p></div>
                    <Link to="/trades/create" className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-semibold py-2 px-4 rounded-lg hover:shadow-lg hover:scale-105 transition flex items-center gap-2"><FaPlus /> New Trade</Link>
                </div>
                <div className="mb-6 flex flex-wrap gap-2">
                    {['all', 'open', 'closed', 'cancelled'].map((status) => (
                        <button key={status} onClick={() => setFilter(status)} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === status ? 'bg-yellow-500 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {trades.length === 0 ? <div className="text-center py-12"><p className="text-gray-500">No trades found</p></div> : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead><tr className="bg-gray-50"><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Asset</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">P/L</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th><th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th></tr></thead>
                                <tbody className="divide-y divide-gray-200">
                                    {trades.map((trade) => (
                                        <tr key={trade._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-medium">{trade.asset}</td>
                                            <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${trade.type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{trade.type.toUpperCase()}</span></td>
                                            <td className="px-6 py-4">KES {trade.amount}</td>
                                            <td className="px-6 py-4">KES {trade.price}</td>
                                            <td className={`px-6 py-4 font-medium ${trade.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>{trade.status === 'closed' ? `KES ${trade.profitLoss}` : '-'}</td>
                                            <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${trade.status === 'open' ? 'bg-yellow-100 text-yellow-800' : trade.status === 'closed' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>{trade.status}</span></td>
                                            <td className="px-6 py-4"><Link to={`/trades/${trade._id}`} className="text-yellow-600 hover:text-yellow-700 flex items-center gap-1"><FaEye /> View</Link></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                {pagination.pages > 1 && (
                    <div className="flex justify-center items-center gap-4 mt-6">
                        <button onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })} disabled={pagination.page === 1} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition">Previous</button>
                        <span className="text-gray-600">Page {pagination.page} of {pagination.pages}</span>
                        <button onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })} disabled={pagination.page === pagination.pages} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition">Next</button>
                    </div>
                )}
            </div>
        </>
    );
};

export default TradeList;