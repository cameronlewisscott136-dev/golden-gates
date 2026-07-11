import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const AdminLogin = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const API_URL = import.meta.env.DEV
        ? '/api'
        : 'https://golden-gates-oegh.onrender.com/api';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await axios.post(`${API_URL}/admin/auth/login`, {
                email,
                password
            });

            if (response.data.success) {
                localStorage.setItem('adminToken', response.data.data.token);
                localStorage.setItem('adminUser', JSON.stringify(response.data.data.admin));

                toast.success('Admin login successful!');
                navigate('/admin/dashboard');
            }
        } catch (error) {
            const message = error.response?.data?.message || 'Admin login failed';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 py-12 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
                <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto shadow-lg">
                        <span className="text-4xl text-white">🔐</span>
                    </div>
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Admin Login</h2>
                    <p className="mt-2 text-sm text-gray-600">Manage withdrawal requests</p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                className="input-field"
                                placeholder="admin@goldengates.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                type="password"
                                className="input-field"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition hover:shadow-lg"
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Admin Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;