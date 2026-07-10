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
    const [closing, setClosing] = useState(false);
    const [closePrice, setClosePrice] = useState('');

    useEffect(() => {
        fetchTrade();
    }, [id]);

    const fetchTrade = async () => {
        setLoading(true);
        try {
            const response = await tradeService.getTradeById(id);
            setTrade(response.data.trade);
            setClosePrice(response.data.trade.closePrice || '');
        } catch (error) {
            toast.error('Failed to load trade details');
            navigate('/trades');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseTrade = async (e) => {
        e.preventDefault();
        const price = parseFloat(closePrice);

        if (!price || price <= 0) {
            toast.error('Please enter a valid close price');
            return;
        }

        setClosing(true);
        try {
            await tradeService.closeTrade(id, { closePrice: price });
            toast.success('Trade closed successfully!');
            fetchTrade();
        } catch (error) {
            toast.error('Failed to close trade');
        } finally {
            setClosing(false);
        }
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

    if (!trade) return null;

    const getStatusBadge = (status) => {
        const map = {
            open: 'bg-yellow-100 text-yellow-800',
            closed: 'bg-blue-100 text-blue-800',
            cancelled: 'bg-red-100 text-red-800'
        };
        return `px-3 py-1 text-sm font-semibold rounded-full ${map[status] || 'bg-gray-100 text-gray-800'}`;
    };

    const getTypeBadge = (type) => {
        return `px-3 py-1 text-sm font-semibold rounded-full ${type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`;
    };

    return (
        <>
            <Navbar />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
                <button
                    onClick={() => navigate('/trades')}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition"
                >
                    <FaArrowLeft /> Back to Trades
                </button>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    {trade.asset} Trade
                                </h1>
                                <p className="text-sm text-gray-500 mt-1">ID: {trade._id}</p>
                            </div>
                            <div className="flex gap-2">
                                <span className={getTypeBadge(trade.type)}>
                                    {trade.type.toUpperCase()}
                                </span>
                                <span className={getStatusBadge(trade.status)}>
                                    {trade.status.toUpperCase()}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-600">Amount</span>
                                    <span className="font-bold text-gray-900">${trade.amount}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-600">Open Price</span>
                                    <span className="font-bold text-gray-900">${trade.openPrice}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-600">Quantity</span>
                                    <span className="font-bold text-gray-900">{trade.quantity}</span>
                                </div>
                                {trade.closePrice && (
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-600">Close Price</span>
                                        <span className="font-bold text-gray-900">${trade.closePrice}</span>
                                    </div>
                                )}
                                {trade.profitLoss !== 0 && (
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-600">Profit/Loss</span>
                                        <span className={`font-bold text-lg ${trade.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            ${trade.profitLoss}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-600">Open Time</span>
                                    <span className="font-medium">{new Date(trade.openTime).toLocaleString()}</span>
                                </div>
                                {trade.closeTime && (
                                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                        <span className="text-gray-600">Close Time</span>
                                        <span className="font-medium">{new Date(trade.closeTime).toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                    <span className="text-gray-600">Status</span>
                                    <div className="flex items-center gap-2">
                                        {trade.status === 'open' ? (
                                            <FaClock className="text-yellow-500" />
                                        ) : trade.status === 'closed' ? (
                                            <FaCheckCircle className="text-green-500" />
                                        ) : (
                                            <FaTimesCircle className="text-red-500" />
                                        )}
                                        <span className="font-medium capitalize">{trade.status}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {trade.status === 'open' && (
                            <div className="mt-8 border-t border-gray-200 pt-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Close Trade</h3>
                                <form onSubmit={handleCloseTrade} className="flex gap-4 items-end">
                                    <div className="flex-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Close Price ($)
                                        </label>
                                        <input
                                            type="number"
                                            className="input-field"
                                            placeholder="Enter closing price"
                                            value={closePrice}
                                            onChange={(e) => setClosePrice(e.target.value)}
                                            min="0.01"
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={closing}
                                    >
                                        {closing ? 'Closing...' : 'Close Trade'}
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default TradeDetails;