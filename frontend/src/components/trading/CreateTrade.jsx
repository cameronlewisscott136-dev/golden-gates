import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import tradeService from '../../services/tradeService';
import Navbar from '../common/Navbar';
import toast from 'react-hot-toast';
import { FaArrowUp, FaArrowDown, FaInfoCircle, FaWallet } from 'react-icons/fa';

const CreateTrade = () => {
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [estimatedClose, setEstimatedClose] = useState(null);
    const [currentPrice, setCurrentPrice] = useState(0);
    const [formData, setFormData] = useState({
        type: 'buy',
        asset: 'BTC',
        amount: '',
    });

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

    const minTrade = parseInt(import.meta.env.VITE_MIN_TRADE) || 10;
    const maxTrade = parseInt(import.meta.env.VITE_MAX_TRADE) || 1000;
    const profitPercentage = parseFloat(import.meta.env.VITE_TRADE_PROFIT_PERCENTAGE) || 0.5;
    const lossPercentage = parseFloat(import.meta.env.VITE_TRADE_LOSS_PERCENTAGE) || 0.3;

    useEffect(() => {
        // Generate realistic current price with small fluctuation
        const selectedAsset = assets.find(a => a.symbol === formData.asset);
        if (selectedAsset) {
            const fluctuation = (Math.random() * 4) - 2;
            const price = selectedAsset.basePrice * (1 + (fluctuation / 100));
            setCurrentPrice(Math.round(price * 100) / 100);
        }
    }, [formData.asset]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const amount = parseFloat(formData.amount);

        if (!amount || amount < minTrade) {
            toast.error(`Minimum trade amount is KES ${minTrade}`);
            return;
        }

        if (amount > maxTrade) {
            toast.error(`Maximum trade amount is KES ${maxTrade}`);
            return;
        }

        if (amount > user.balance) {
            toast.error(`Insufficient balance. You have KES ${user.balance.toFixed(2)}`);
            return;
        }

        setLoading(true);

        try {
            const response = await tradeService.createTrade({
                type: formData.type,
                asset: formData.asset,
                amount: amount,
            });

            toast.success(response.message || 'Trade opened successfully!');

            // Update user balance
            if (response.data?.remainingBalance !== undefined) {
                const updatedUser = { ...user, balance: response.data.remainingBalance };
                updateUser(updatedUser);
            }

            // Show estimated close time
            if (response.data?.estimatedCloseTime) {
                const closeTime = new Date(response.data.estimatedCloseTime);
                setEstimatedClose(closeTime);
                toast.success(`Trade will auto-close at approximately ${closeTime.toLocaleTimeString()}`);
            }

            // Navigate to trades list after short delay
            setTimeout(() => {
                navigate('/trades');
            }, 2000);

        } catch (error) {
            const message = error.response?.data?.message || 'Failed to create trade';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const getProfitEstimate = () => {
        const amount = parseFloat(formData.amount) || 0;
        if (amount === 0) return null;

        const minProfit = amount * (profitPercentage / 100);
        const maxProfit = amount * (2.5 / 100);
        const minLoss = amount * (lossPercentage / 100);
        const maxLoss = amount * (1.8 / 100);

        return {
            minProfit: minProfit.toFixed(2),
            maxProfit: maxProfit.toFixed(2),
            minLoss: minLoss.toFixed(2),
            maxLoss: maxLoss.toFixed(2),
        };
    };

    const profitEstimate = getProfitEstimate();

    return (
        <>
            <Navbar />
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Create Trade</h1>
                        <p className="text-gray-600 mt-1">Open a new position in KES</p>
                    </div>
                    <button
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition flex items-center gap-2"
                        onClick={() => navigate('/trades')}
                    >
                        ← Back to Trades
                    </button>
                </div>

                {/* Balance Card */}
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-xl shadow-lg p-6 mb-6 text-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm opacity-90">Available Balance</p>
                            <p className="text-3xl font-bold">KES {user?.balance?.toFixed(2) || '0.00'}</p>
                        </div>
                        <FaWallet className="text-4xl opacity-70" />
                    </div>
                    <div className="mt-2 flex gap-4 text-sm">
                        <span>Min: KES {minTrade}</span>
                        <span>Max: KES {maxTrade}</span>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-8">
                    <form onSubmit={handleSubmit}>
                        {/* Trade Type */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Trade Type
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'buy' })}
                                    className={`py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${formData.type === 'buy'
                                            ? 'bg-green-500 text-white shadow-md'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    <FaArrowUp />
                                    Buy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'sell' })}
                                    className={`py-3 px-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${formData.type === 'sell'
                                            ? 'bg-red-500 text-white shadow-md'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    <FaArrowDown />
                                    Sell
                                </button>
                            </div>
                        </div>

                        {/* Asset Selection */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Asset
                            </label>
                            <select
                                name="asset"
                                className="input-field"
                                value={formData.asset}
                                onChange={handleChange}
                                required
                            >
                                {assets.map((asset) => (
                                    <option key={asset.symbol} value={asset.symbol}>
                                        {asset.symbol} - {asset.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Current Price */}
                        <div className="bg-gray-50 p-3 rounded-lg mb-4">
                            <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-600">Current Price:</span>
                                <span className="font-bold text-gray-900">
                                    KES {currentPrice.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Amount */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount (KES)
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 font-semibold">KES</span>
                                </div>
                                <input
                                    type="number"
                                    name="amount"
                                    className="input-field pl-16"
                                    placeholder={`${minTrade} - ${maxTrade}`}
                                    value={formData.amount}
                                    onChange={handleChange}
                                    required
                                    min={minTrade}
                                    max={maxTrade}
                                    step="1"
                                />
                            </div>
                            <div className="flex justify-between mt-1 text-xs text-gray-500">
                                <span>Min: KES {minTrade}</span>
                                <span>Max: KES {maxTrade}</span>
                            </div>
                        </div>

                        {/* Quick Amount Buttons */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {[50, 100, 200, 500].map((amt) => (
                                <button
                                    key={amt}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, amount: amt.toString() })}
                                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition"
                                >
                                    KES {amt}
                                </button>
                            ))}
                        </div>

                        {/* Profit/Loss Estimate */}
                        {profitEstimate && (
                            <div className="bg-gray-50 p-4 rounded-lg mb-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <FaInfoCircle className="text-gray-400" />
                                    <span className="text-sm font-medium text-gray-700">Estimated Outcome</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="bg-green-50 p-2 rounded">
                                        <span className="text-green-700">Expected Profit:</span>
                                        <span className="block font-bold text-green-600">
                                            +KES {profitEstimate.minProfit} - {profitEstimate.maxProfit}
                                        </span>
                                    </div>
                                    <div className="bg-red-50 p-2 rounded">
                                        <span className="text-red-700">Expected Loss:</span>
                                        <span className="block font-bold text-red-600">
                                            -KES {profitEstimate.minLoss} - {profitEstimate.maxLoss}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Info Box */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-6">
                            <p className="text-sm text-blue-800">
                                💡 Trades auto-close after 10-40 seconds with small profits (0.1%-2.5%)
                                or losses (0.1%-1.8%). 55% chance of profit.
                            </p>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing Trade...
                                </span>
                            ) : (
                                `Open ${formData.type.toUpperCase()} Trade`
                            )}
                        </button>
                    </form>
                </div>

                {/* Estimated Close Time */}
                {estimatedClose && (
                    <div className="mt-4 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                            ⏰ Trade will auto-close at approximately {estimatedClose.toLocaleTimeString()}
                        </p>
                    </div>
                )}
            </div>
        </>
    );
};

export default CreateTrade;