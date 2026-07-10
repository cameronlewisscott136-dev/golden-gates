import React from 'react';
import { useAuth } from '../../context/AuthContext';
import Navbar from '../common/Navbar';
import { FaUser, FaEnvelope, FaPhone, FaCheck, FaTimes, FaCalendar, FaGift, FaUsers, FaWallet } from 'react-icons/fa';

const Profile = () => {
    const { user } = useAuth();

    const infoCards = [
        { label: 'Full Name', value: `${user?.firstName || ''} ${user?.lastName || ''}`, icon: <FaUser className="text-yellow-500" /> },
        { label: 'Email', value: user?.email || 'N/A', icon: <FaEnvelope className="text-yellow-500" /> },
        { label: 'Phone', value: user?.phone || 'N/A', icon: <FaPhone className="text-yellow-500" /> },
        { label: 'Account Status', value: user?.isActive ? 'Active' : 'Inactive', icon: user?.isActive ? <FaCheck className="text-green-500" /> : <FaTimes className="text-red-500" /> },
        { label: 'Email Verified', value: user?.isVerified ? 'Yes' : 'No', icon: user?.isVerified ? <FaCheck className="text-green-500" /> : <FaTimes className="text-red-500" /> },
        { label: 'Member Since', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A', icon: <FaCalendar className="text-yellow-500" /> },
        { label: 'Referral Code', value: user?.referralCode || 'N/A', icon: <FaGift className="text-yellow-500" /> },
        { label: 'Total Referrals', value: user?.totalReferrals || 0, icon: <FaUsers className="text-yellow-500" /> },
        { label: 'Referral Earnings', value: `$${user?.referralEarnings?.toFixed(2) || '0.00'}`, icon: <FaWallet className="text-yellow-500" /> },
    ];

    return (
        <>
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
                    <p className="text-gray-600 mt-1">Your account information</p>
                </div>

                <div className="bg-white rounded-xl shadow-lg p-8">
                    {/* Profile Header */}
                    <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-200">
                        <div className="w-24 h-24 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-4xl text-white font-bold shadow-lg">
                            {user?.firstName?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                                {user?.firstName} {user?.lastName}
                            </h2>
                            <p className="text-gray-600">{user?.email}</p>
                            <div className="flex gap-2 mt-2">
                                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${user?.isActive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {user?.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <span className={`px-3 py-1 text-sm font-semibold rounded-full ${user?.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {user?.isVerified ? 'Verified' : 'Unverified'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Info Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {infoCards.map((item, index) => (
                            <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1">{item.icon}</div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">
                                            {item.label}
                                        </p>
                                        <p className="text-base font-semibold text-gray-900 mt-1">
                                            {item.value}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Account Summary */}
                <div className="bg-white rounded-xl shadow-lg p-8 mt-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Account Summary</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                            <p className="text-sm text-green-700 font-medium">Balance</p>
                            <p className="text-3xl font-bold text-green-600 mt-2">
                                ${user?.balance?.toFixed(2) || '0.00'}
                            </p>
                        </div>
                        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-700 font-medium">Total Trades</p>
                            <p className="text-3xl font-bold text-blue-600 mt-2">
                                {user?.totalTrades || 0}
                            </p>
                        </div>
                        <div className="bg-purple-50 p-6 rounded-lg border border-purple-200">
                            <p className="text-sm text-purple-700 font-medium">Referral Earnings</p>
                            <p className="text-3xl font-bold text-purple-600 mt-2">
                                ${user?.referralEarnings?.toFixed(2) || '0.00'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Profile;