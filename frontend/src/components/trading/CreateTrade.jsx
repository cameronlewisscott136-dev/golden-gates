import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import tradeService from '../../services/tradeService';
import toast from 'react-hot-toast';
import { FaArrowUp, FaArrowDown, FaWallet, FaClock } from 'react-icons/fa';

const CreateTrade = () => {
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [currentPrice, setCurrentPrice] = useState(0);
    const [formData, setFormData] = useState({ type: 'buy', asset: 'BTC', amount: '' });
    const [dailyLimit, setDailyLimit] = useState(null);
    const [loadingLimit, setLoadingLimit] = useState(true);

    const assets = [
        { symbol: 'BTC', name: 'Bitcoin', basePrice: 4500000 },
        { symbol: 'ETH', name: 'Ethereum', basePrice: 250000 },
        { symbol: 'USDT', name: 'Tether', basePrice: 150 },
        { symbol: 'BNB', name: 'Binance Coin', basePrice: 50000 },
        { symbol: 'XRP', name: 'Ripple', basePrice: 80 },
        { symbol: 'ADA', name: 'Cardano', basePrice: 40 },
        { symbol: 'SOL', name: 'Solana', basePrice: 15000 },
        { symbol: 'DOT', name: 'Polkadot', basePrice: 5000 },
        { symbol: 'DOGE', name: 'Dogecoin', basePrice: 15 },
        { symbol: 'AVAX', name: 'Avalanche', basePrice: 10000 },
    ];

    const minTrade = 10;
    const maxTrade = 1000;
    const DAILY_LIMIT = 5;

    useEffect(() => {
        const selected = assets.find(a => a.symbol === formData.asset);
        if (selected) {
            const fluctuation = (Math.random() * 4) - 2;
            setCurrentPrice(Math.round((selected.basePrice * (1 + (fluctuation / 100))) * 100) / 100);
        }
    }, [formData.asset]);

    useEffect(() => {
        fetchDailyLimit();
    }, []);

    const fetchDailyLimit = async () => {
        setLoadingLimit(true);
        try {
            const response = await tradeService.getDailyStatus();
            setDailyLimit(response.data);
        } catch (error) {
            console.error('Error fetching daily limit:', error);
        } finally {
            setLoadingLimit(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const amount = parseFloat(formData.amount);

        if (!amount || amount < minTrade) return toast.error(`Minimum is KES ${minTrade}`);
        if (amount > maxTrade) return toast.error(`Maximum is KES ${maxTrade}`);
        if (amount > user.tradingBalance) return toast.error(`You have KES ${user.tradingBalance.toFixed(2)}`);

        // Check daily limit
        if (dailyLimit && dailyLimit.isLimited) {
            toast.error(`Daily trade limit reached. You have completed ${dailyLimit.used} trades today. Maximum is ${DAILY_LIMIT} trades per day.`);
            return;
        }

        setLoading(true);
        try {
            const response = await tradeService.createTrade({
                type: formData.type,
                asset: formData.asset,
                amount
            });

            toast.success('Trade opened successfully!');
            if (response.data?.remainingTradingBalance !== undefined) {
                updateUser({ ...user, tradingBalance: response.data.remainingTradingBalance });
            }

            // Refresh daily limit
            await fetchDailyLimit();

            setTimeout(() => navigate('/trades'), 1500);
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to create trade';
            toast.error(message);
            if (error.response?.data?.data?.dailyLimit) {
                setDailyLimit(error.response.data.data.dailyLimit);
            }
        } finally {
            setLoading(false);
        }
    };

    if (loadingLimit) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-8">
                <div className="flex justify-center items-center h-64">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    const canTrade = dailyLimit && !dailyLimit.isLimited;

    return (
        <div className="max-w-3xl mx-auto px-4 py-8 fade-in">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">Create Trade</h1>
                <button onClick={() => navigate('/trades')} className="btn-secondary">← Back</button>
            </div>

            {/* Daily Limit Banner */}
            <div className={`p-4 rounded-lg mb-6 ${dailyLimit?.isLimited ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        <FaClock className={dailyLimit?.isLimited ? 'text-red-500' : 'text-blue-500'} />
                        <span className={dailyLimit?.isLimited ? 'text-red-700' : 'text-blue-700'}>
                            Daily Trade Limit: <strong>{dailyLimit?.used || 0}/{DAILY_LIMIT}</strong>
                        </span>
                    </div>
                    {dailyLimit?.isLimited ? (
                        <span className="text-red-600 font-semibold">❌ Limit Reached</span>
                    ) : (
                        <span className="text-green-600 font-semibold">✅ {dailyLimit?.remaining || 0} trades remaining</span>
                    )}
                    <span className="text-xs text-gray-500">
                        Resets at midnight
                    </span>
                </div>
            </div>

            {/* Balance Card */}
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-xl shadow-lg p-6 mb-6 text-white">
                <div className="flex justify-between">
                    <div>
                        <p className="text-sm opacity-90">Trading Balance</p>
                        <p className="text-3xl font-bold">KES {user?.tradingBalance?.toFixed(2) || '0.00'}</p>
                        <p className="text-xs opacity-75 mt-1">🔒 Initial Capital: KES {user?.initialCapital?.toFixed(2) || '0.00'}</p>
                    </div>
                    <FaWallet className="text-4xl opacity-70" />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-8">
                <form onSubmit={handleSubmit}>
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">Trade Type</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'buy' })}
                                className={`py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${formData.type === 'buy' ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
                                disabled={!canTrade}
                            >
                                <FaArrowUp /> Buy
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, type: 'sell' })}
                                className={`py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition ${formData.type === 'sell' ? 'bg-red-500 text-white' : 'bg-gray-200'}`}
                                disabled={!canTrade}
                            >
                                <FaArrowDown /> Sell
                            </button>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Asset</label>
                        <select
                            name="asset"
                            className="input-field"
                            value={formData.asset}
                            onChange={(e) => setFormData({ ...formData, asset: e.target.value })}
                            required
                            disabled={!canTrade}
                        >
                            {assets.map(a => <option key={a.symbol} value={a.symbol}>{a.symbol} - {a.name}</option>)}
                        </select>
                    </div>

                    <div className="bg-gray-50 p-3 rounded-lg mb-4">
                        <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Current Price:</span>
                            <span className="font-bold">KES {currentPrice.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-1">Amount (KES)</label>
                        <input
                            type="number"
                            className="input-field"
                            placeholder={`${minTrade} - ${maxTrade}`}
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            required
                            min={minTrade}
                            max={maxTrade}
                            step="1"
                            disabled={!canTrade}
                        />
                        <div className="flex flex-wrap gap-2 mt-2">
                            {[50, 100, 200, 500].map(amt => (
                                <button
                                    key={amt}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, amount: amt.toString() })}
                                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition"
                                    disabled={!canTrade}
                                >
                                    KES {amt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
                        <p className="text-sm text-blue-800">💡 Trades auto-close after 10-40 seconds with small profits (0.1%-2.5%) or losses (0.1%-1.8%). 55% chance of profit.</p>
                    </div>

                    <button
                        type="submit"
                        className={`w-full py-3 text-lg rounded-lg transition ${canTrade ? 'btn-primary' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
                        disabled={loading || !canTrade}
                    >
                        {loading ? 'Processing...' : canTrade ? `Open ${formData.type.toUpperCase()} Trade` : 'Daily Limit Reached'}
                    </button>

                    {!canTrade && (
                        <p className="text-center text-sm text-red-600 mt-2">
                            You have reached the daily trade limit of {DAILY_LIMIT} trades. Come back tomorrow!
                        </p>
                    )}
                </form>
            </div>
        </div>
    );
};

export default CreateTrade;