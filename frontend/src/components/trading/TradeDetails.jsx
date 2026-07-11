import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import tradeService from '../../services/tradeService';
import Navbar from '../common/Navbar';
import toast from 'react-hot-toast';
import { FaArrowLeft, FaCheckCircle, FaTimesCircle, FaClock } from 'react-icons/fa';

const TradeDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [trade, setTrade] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTrade();
    }, [id]);

    const fetchTrade = async () => {
        setLoading(true);
        try {
            const response = await tradeService.getTradeById(id);
            setTrade(response.data.trade);
        } catch (error) {
            toast.error('Failed to load trade details');
            navigate('/trades');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <><Navbar /><div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="spinner"></div></div></>;
    if (!trade) return null;

    return (
        <>
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 py-8 fade-in">
                <button onClick={() => navigate('/trades')} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"><FaArrowLeft /> Back to Trades</button>
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex justify-between items-start">
                            <div><h1 className="text-2xl font-bold">{trade.asset} Trade</h1><p className="text-sm text-gray-500 mt-1">ID: {trade._id}</p></div>
                            <div className="flex gap-2">
                                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${trade.type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{trade.type.toUpperCase()}</span>
                                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${trade.status === 'open' ? 'bg-yellow-100 text-yellow-800' : trade.status === 'closed' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>{trade.status.toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Amount</span><span className="font-bold">KES {trade.amount}</span></div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Open Price</span><span className="font-bold">KES {trade.openPrice}</span></div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Quantity</span><span className="font-bold">{trade.quantity}</span></div>
                                {trade.closePrice && <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Close Price</span><span className="font-bold">KES {trade.closePrice}</span></div>}
                                {trade.profitLoss !== 0 && <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Profit/Loss</span><span className={`font-bold text-lg ${trade.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>KES {trade.profitLoss}</span></div>}
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Open Time</span><span className="font-medium">{new Date(trade.openTime).toLocaleString()}</span></div>
                                {trade.closeTime && <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Close Time</span><span className="font-medium">{new Date(trade.closeTime).toLocaleString()}</span></div>}
                                {trade.duration > 0 && <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Duration</span><span className="font-medium">{trade.duration}s</span></div>}
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Status</span>
                                    <div className="flex items-center gap-2">
                                        {trade.status === 'open' ? <FaClock className="text-yellow-500" /> : trade.status === 'closed' ? <FaCheckCircle className="text-green-500" /> : <FaTimesCircle className="text-red-500" />}
                                        <span className="font-medium capitalize">{trade.status}</span>
                                    </div>
                                </div>
                                {trade.profitPercentage !== 0 && <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"><span className="text-gray-600">Return</span><span className={`font-bold ${trade.profitPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>{trade.profitPercentage.toFixed(2)}%</span></div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default TradeDetails;