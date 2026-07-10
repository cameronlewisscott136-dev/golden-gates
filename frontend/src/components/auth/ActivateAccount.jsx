import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import toast from 'react-hot-toast';

const ActivateAccount = () => {
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const depositAmount = parseFloat(amount);

        if (depositAmount < 200) {
            toast.error('Minimum deposit for activation is KES.200');
            return;
        }

        setLoading(true);

        try {
            const response = await authService.activateAccount(depositAmount);
            toast.success(response.message || 'Account activated successfully!');

            const updatedUser = { ...user, ...response.data };
            updateUser(updatedUser);

            navigate('/dashboard');
        } catch (error) {
            const message = error.response?.data?.message || 'Activation failed.';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-yellow-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 fade-in">
                <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                        <span className="text-4xl">🚀</span>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Activate Account
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Deposit <strong>KES. 200</strong> to start trading          </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Deposit Amount
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span className="text-gray-500">KES. </span>
                            </div>
                            <input
                                type="number"
                                className="input-field pl-12"
                                placeholder="Enter amount (minimum 200)"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                min="200"
                                required
                            />
                        </div>
                    </div>

                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <p className="text-sm text-green-800">
                            ✅ This will activate your account and you'll receive <strong>KES. 100</strong> referral bonus if you were referred!
                        </p>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : 'Activate Account'}
                    </button>

                    <p className="text-center text-sm text-gray-600">
                        <Link to="/dashboard" className="text-yellow-600 hover:text-yellow-500 font-medium">
                            Skip for now
                        </Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default ActivateAccount;