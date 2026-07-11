import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';
import toast from 'react-hot-toast';

const VerifyEmail = () => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await authService.verifyEmail(code);
            toast.success(response.message || 'Email verified successfully!');
            const updatedUser = { ...user, isVerified: true };
            updateUser(updatedUser);
            if (!user.isActive) navigate('/activate');
            else navigate('/dashboard');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Invalid code');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        setResending(true);
        try {
            await authService.resendVerification();
            toast.success('Verification code resent successfully!');
        } catch (error) {
            toast.error('Failed to resend code');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-yellow-100 py-12 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 fade-in">
                <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                        <span className="text-4xl">✉️</span>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Verify Your Email</h2>
                    <p className="mt-2 text-sm text-gray-600">We've sent a code to <strong>{user?.email}</strong></p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                        <input type="text" className="input-field text-center text-2xl tracking-widest" placeholder="Enter 6-digit code" value={code} onChange={(e) => setCode(e.target.value)} maxLength="6" required />
                    </div>
                    <button type="submit" className="btn-primary w-full py-3 text-lg" disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify Email'}
                    </button>
                    <div className="text-center">
                        <button type="button" onClick={handleResend} disabled={resending} className="text-yellow-600 hover:text-yellow-500 font-medium text-sm disabled:opacity-50">
                            {resending ? 'Sending...' : 'Resend Code'}
                        </button>
                    </div>
                    <p className="text-center text-sm text-gray-600">
                        <Link to="/login" className="text-yellow-600 hover:text-yellow-500 font-medium">Back to Login</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default VerifyEmail;