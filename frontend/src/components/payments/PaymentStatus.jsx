import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';

const PaymentStatus = () => {
    const { externalReference } = useParams();
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [status, setStatus] = useState('pending');
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        checkStatus();
        // Poll every 5 seconds
        const interval = setInterval(checkStatus, 5000);
        return () => clearInterval(interval);
    }, [externalReference]);

    const checkStatus = async () => {
        if (checking) return;
        setChecking(true);

        try {
            const response = await api.get(`/payments/status/${externalReference}`);
            const paymentData = response.data.data;

            setStatus(paymentData.status);

            if (paymentData.status === 'completed') {
                // Update user in context
                const updatedUser = { ...user, isActive: true, balance: user.balance + paymentData.amount };
                updateUser(updatedUser);

                toast.success('Account activated successfully!');
                setTimeout(() => navigate('/dashboard'), 2000);
            } else if (['failed', 'timeout', 'cancelled'].includes(paymentData.status)) {
                toast.error(`Payment ${paymentData.status}. Please try again.`);
                setTimeout(() => navigate('/activate'), 2000);
            }
        } catch (error) {
            console.error('Status check error:', error);
        } finally {
            setChecking(false);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-yellow-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 fade-in">
                <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                        <span className="text-4xl">⏳</span>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Payment Status
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Please complete the M-Pesa prompt on your phone
                    </p>
                </div>

                <div className="mt-8 space-y-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Reference:</span>
                            <span className="font-medium">{externalReference}</span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            <span className="text-gray-600">Status:</span>
                            <span className={`font-medium ${status === 'completed' ? 'text-green-600' :
                                    status === 'pending' ? 'text-yellow-600' :
                                        'text-red-600'
                                }`}>
                                {status.toUpperCase()}
                            </span>
                        </div>
                    </div>

                    {status === 'pending' && (
                        <>
                            <div className="flex justify-center">
                                <div className="spinner"></div>
                            </div>
                            <p className="text-center text-sm text-gray-500">
                                Waiting for payment confirmation...
                            </p>
                            <button
                                onClick={checkStatus}
                                className="w-full bg-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-300 transition"
                                disabled={checking}
                            >
                                {checking ? 'Checking...' : 'Check Status'}
                            </button>
                        </>
                    )}

                    {status === 'completed' && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                            <p className="text-green-800 text-center font-medium">
                                ✅ Account activated successfully!
                            </p>
                        </div>
                    )}

                    {['failed', 'timeout', 'cancelled'].includes(status) && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                            <p className="text-red-800 text-center">
                                ❌ Payment {status}. Please try again.
                            </p>
                            <button
                                onClick={() => navigate('/activate')}
                                className="w-full mt-3 bg-red-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-600 transition"
                            >
                                Try Again
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentStatus;