import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FaUser, FaEnvelope, FaPhone, FaLock, FaGift } from 'react-icons/fa';

const Register = () => {
    const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', referralCode: '' });
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await register(formData);
            toast.success(response.message || 'Registration successful! Check your email.');
            navigate('/verify-email');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-yellow-100 py-12 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 fade-in">
                <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                        <span className="text-4xl">👤</span>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Create Account</h2>
                    <p className="mt-2 text-sm text-gray-600">Start your trading journey with Golden Gates</p>
                </div>
                <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaUser className="text-gray-400 text-sm" /></div>
                                <input type="text" name="firstName" className="input-field pl-10" placeholder="John" value={formData.firstName} onChange={handleChange} required />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                            <input type="text" name="lastName" className="input-field" placeholder="Doe" value={formData.lastName} onChange={handleChange} required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaEnvelope className="text-gray-400" /></div>
                            <input type="email" name="email" className="input-field pl-10" placeholder="you@example.com" value={formData.email} onChange={handleChange} required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaPhone className="text-gray-400" /></div>
                            <input type="tel" name="phone" className="input-field pl-10" placeholder="0712345678" value={formData.phone} onChange={handleChange} required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaLock className="text-gray-400" /></div>
                            <input type="password" name="password" className="input-field pl-10" placeholder="Min 6 characters" value={formData.password} onChange={handleChange} required />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Referral Code (Optional)</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><FaGift className="text-gray-400" /></div>
                            <input type="text" name="referralCode" className="input-field pl-10" placeholder="Enter referral code" value={formData.referralCode} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                        <p className="text-sm text-yellow-800">💡 Invite friends and earn <strong>KES 100</strong> for each successful referral!</p>
                    </div>
                    <button type="submit" className="btn-primary w-full py-3 text-lg" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                    <p className="text-center text-sm text-gray-600">
                        Already have an account? <Link to="/login" className="text-yellow-600 hover:text-yellow-500 font-medium">Sign in here</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default Register;