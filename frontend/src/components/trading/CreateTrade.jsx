import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import tradeService from '../../services/tradeService';
import Navbar from '../common/Navbar';
import toast from 'react-hot-toast';

const CreateTrade = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        type: 'buy',
        asset: 'BTC',
        amount: '',
        price: '',
        quantity: ''
    });

    const assets = ['BTC', 'ETH', 'USDT', 'BNB', 'XRP', 'ADA', 'SOL', 'DOT', 'DOGE', 'AVAX'];

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const amount = parseFloat(formData.amount);
        const price = parseFloat(formData.price);
        const quantity = parseFloat(formData.quantity);

        if (!amount || amount <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (!price || price <= 0) {
            toast.error('Please enter a valid price');
            return;
        }

        if (!quantity || quantity <= 0) {
            toast.error('Please enter a valid quantity');
            return;
        }

        setLoading(true);

        try {
            const response = await tradeService.createTrade({
                type: formData.type,
                asset: formData.asset,
                amount,
                price,
                quantity
            });

            toast.success(response.message || 'Trade created successfully!');
            navigate('/trades');
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to create trade';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Navbar />
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Create Trade</h1>
                        <p className="text-gray-600 mt-1">Open a new position</p>
                    </div>
                    <button className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition" onClick={() => navigate('/trades')}>
                        ← Back
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-8">
                    <form onSubmit={handleSubmit}>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Trade Type
                            </label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'buy' })}
                                    className={`py-3 px-4 rounded-lg font-semibold transition ${formData.type === 'buy'
                                            ? 'bg-green-500 text-white shadow-md'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    Buy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'sell' })}
                                    className={`py-3 px-4 rounded-lg font-semibold transition ${formData.type === 'sell'
                                            ? 'bg-red-500 text-white shadow-md'
                                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                >
                                    Sell
                                </button>
                            </div>
                        </div>

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
                                    <option key={asset} value={asset}>{asset}</option>
                                ))}
                            </select>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Amount ($)
                            </label>
                            <input
                                type="number"
                                name="amount"
                                className="input-field"
                                placeholder="Enter amount"
                                value={formData.amount}
                                onChange={handleChange}
                                required
                                min="1"
                                step="0.01"
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Price ($)
                            </label>
                            <input
                                type="number"
                                name="price"
                                className="input-field"
                                placeholder="Enter price"
                                value={formData.price}
                                onChange={handleChange}
                                required
                                min="0.01"
                                step="0.01"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantity
                            </label>
                            <input
                                type="number"
                                name="quantity"
                                className="input-field"
                                placeholder="Enter quantity"
                                value={formData.quantity}
                                onChange={handleChange}
                                required
                                min="0.0001"
                                step="0.0001"
                            />
                        </div>

                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-6">
                            <p className="text-sm text-yellow-800">
                                💰 Total Value: <strong>${(parseFloat(formData.price) * parseFloat(formData.quantity) || 0).toFixed(2)}</strong>
                            </p>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={loading}
                        >
                            {loading ? 'Creating Trade...' : `Create ${formData.type.toUpperCase()} Trade`}
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
};

export default CreateTrade;