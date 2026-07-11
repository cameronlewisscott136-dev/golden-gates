import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { FaEnvelope, FaLock, FaShieldAlt } from 'react-icons/fa';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await api.post('/admin/auth/login', { email, password });

            if (response.data.success) {
                // Store admin token and user
                localStorage.setItem('adminToken', response.data.data.token);
                localStorage.setItem('adminUser', JSON.stringify(response.data.data.user));

                // Also store in session for redundancy
                sessionStorage.setItem('adminToken', response.data.data.token);

                toast.success('Admin login successful!');
                navigate('/admin/dashboard');
            }
        } catch (error) {
            console.error('Admin login error:', error);
            const message = error.response?.data?.message || 'Admin login failed';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8 fade-in">
                <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                        <FaShieldAlt className="text-4xl text-white" />
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Admin Login</h2>
                    <p className="mt-2 text-sm text-gray-600">Access the admin dashboard</p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Email</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaEnvelope className="text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    className="input-field pl-10"
                                    placeholder="admin@goldengates.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FaLock className="text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    className="input-field pl-10"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition hover:shadow-lg hover:scale-105 disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Admin Login'}
                    </button>
                    <p className="text-center text-sm text-gray-600">
                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                            className="text-blue-600 hover:text-blue-500 font-medium"
                        >
                            Regular User Login
                        </button>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;