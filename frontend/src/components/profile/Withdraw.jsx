import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FaPhone, FaWallet, FaClock, FaLock, FaGift } from 'react-icons/fa';

const Withdraw = () => {
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState('');
    const [summary, setSummary] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(true);

    const minWithdrawal = 100;
    const maxWithdrawal = 10000;

    useEffect(() => {
        fetchSummary();
    }, []);

    const fetchSummary = async () => {
        setLoadingSummary(true);
        try {
            const response = await api.get('/withdrawals/summary');
            setSummary(response.data.data);
        } catch (error) {
            console.error('Error fetching summary:', error);
        } finally {
            setLoadingSummary(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const withdrawAmount = parseFloat(amount);

        if (!withdrawAmount || withdrawAmount < minWithdrawal) {
            return toast.error(`Minimum withdrawal is KES ${minWithdrawal}`);
        }

        if (withdrawAmount > maxWithdrawal) {
            return toast.error(`Maximum withdrawal is KES ${maxWithdrawal}`);
        }

        if (!summary?.canWithdraw) {
            return toast.error('Insufficient bonus balance for withdrawal');
        }

        if (!user.phone) {
            return toast.error('No phone number registered. Please update your profile.');
        }

        setLoading(true);
        try {
            const response = await api.post('/withdrawals/request', { amount: withdrawAmount });
            toast.success('Withdrawal request submitted successfully!');
            updateUser({ ...user, bonusBalance: response.data.data.remainingBonusBalance });
            setAmount('');
            fetchSummary();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Withdrawal failed');
        } finally {
            setLoading(false);
        }
    };

    if (loadingSummary) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="flex justify-center items-center h-32">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    const canWithdraw = summary?.canWithdraw && summary?.withdrawableBalance >= minWithdrawal;

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <FaWallet className="text-yellow-500" />
                Request Withdrawal
            </h2>

            {/* Balance Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm text-green-700">🔒 Initial Capital</p>
                    <p className="text-lg font-bold text-green-600">KES {summary?.initialCapital?.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-green-600">Locked - Cannot withdraw</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-700">📈 Profit Balance</p>
                    <p className="text-lg font-bold text-blue-600">KES {summary?.profitBalance?.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-blue-600">Cannot withdraw - Use for trading</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-sm text-purple-700">🎁 Bonus Balance</p>
                    <p className="text-lg font-bold text-purple-600">KES {summary?.withdrawableBalance?.toFixed(2) || '0.00'}</p>
                    <p className="text-xs text-purple-600">Withdrawable</p>
                </div>
            </div>

            {/* Phone Info */}
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
                <div className="flex items-center gap-2">
                    <FaPhone className="text-blue-500" />
                    <p className="text-sm text-blue-700">
                        Withdrawals will be sent to: <strong>{user?.phone || 'Not set'}</strong>
                    </p>
                </div>
            </div>

            {/* Pending Withdrawals Alert */}
            {summary?.pendingWithdrawals > 0 && (
                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mb-4">
                    <div className="flex items-center gap-2">
                        <FaClock className="text-yellow-500" />
                        <p className="text-sm text-yellow-700">
                            You have {summary.pendingWithdrawals} pending withdrawal request(s).
                        </p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Amount (KES)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500 font-semibold">KES</span>
                            </div>
                            <input
                                type="number"
                                className="input-field pl-16"
                                placeholder={`${minWithdrawal} - ${maxWithdrawal}`}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min={minWithdrawal}
                                max={maxWithdrawal}
                                required
                            />
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-gray-500">
                            <span>Min: KES {minWithdrawal}</span>
                            <span>Max: KES {maxWithdrawal}</span>
                            <span>Available: KES {summary?.withdrawableBalance?.toFixed(2) || '0.00'}</span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className={`w-full font-semibold py-3 rounded-lg transition ${canWithdraw && !loading
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg hover:scale-105'
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        disabled={!canWithdraw || loading}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Processing...
                            </span>
                        ) : !canWithdraw ? (
                            summary?.pendingWithdrawals > 0 ? 'Pending Withdrawal(s) - Please Wait' : 'Insufficient Bonus Balance'
                        ) : (
                            'Request Withdrawal'
                        )}
                    </button>

                    {!canWithdraw && summary?.withdrawableBalance < minWithdrawal && (
                        <p className="text-sm text-red-600 text-center">
                            You need at least KES {minWithdrawal} in bonus balance to withdraw.
                            Current bonus: KES {summary?.withdrawableBalance?.toFixed(2) || '0.00'}
                        </p>
                    )}
                </div>
            </form>
        </div>
    );
};

export default Withdraw;