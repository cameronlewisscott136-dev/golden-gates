import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Withdraw from './Withdraw';
import Navbar from '../common/Navbar';
import toast from 'react-hot-toast';
import { FaCopy } from 'react-icons/fa';

const Profile = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('info');

    const copyReferralCode = () => {
        navigator.clipboard.writeText(user?.referralCode || '');
        toast.success('Referral code copied!');
    };

    const infoCards = [
        { label: 'Full Name', value: `${user?.firstName || ''} ${user?.lastName || ''}` },
        { label: 'Email', value: user?.email || 'N/A' },
        { label: 'Phone', value: user?.phone || 'N/A' },
        { label: 'Account Status', value: user?.isActive ? '✅ Active' : '⏳ Inactive' },
        { label: 'Verified', value: user?.isVerified ? '✅ Yes' : '❌ No' },
        { label: 'Referral Code', value: user?.referralCode || 'N/A' },
        { label: 'Total Referrals', value: user?.totalReferrals || 0 },
        { label: 'Referral Earnings', value: `KES ${user?.referralEarnings?.toFixed(2) || '0.00'}` },
        { label: 'Total Deposited', value: `KES ${user?.totalDeposited?.toFixed(2) || '0.00'}` },
        { label: 'Total Withdrawn', value: `KES ${user?.totalWithdrawn?.toFixed(2) || '0.00'}` },
    ];

    return (
        <>
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 py-8 fade-in">
                <h1 className="text-3xl font-bold mb-6">Profile</h1>
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <div className="flex items-center gap-6 mb-8 pb-8 border-b">
                        <div className="w-24 h-24 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-4xl text-white font-bold">
                            {user?.firstName?.charAt(0) || 'U'}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{user?.firstName} {user?.lastName}</h2>
                            <p className="text-gray-600">{user?.email}</p>
                            <p className="text-gray-600 flex items-center gap-1">
                                <span>📱</span> {user?.phone || 'No phone registered'}
                            </p>
                            <div className="flex gap-2 mt-2">
                                <span className={`px-3 py-1 text-sm rounded-full ${user?.isActive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {user?.isActive ? 'Active' : 'Inactive'}
                                </span>
                                <span className={`px-3 py-1 text-sm rounded-full ${user?.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                    {user?.isVerified ? 'Verified' : 'Unverified'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 mb-6 flex-wrap">
                        <button
                            onClick={() => setActiveTab('info')}
                            className={`px-4 py-2 rounded-lg transition ${activeTab === 'info' ? 'bg-yellow-500 text-white' : 'bg-gray-200'}`}
                        >
                            Information
                        </button>
                        <button
                            onClick={() => setActiveTab('withdraw')}
                            className={`px-4 py-2 rounded-lg transition ${activeTab === 'withdraw' ? 'bg-yellow-500 text-white' : 'bg-gray-200'}`}
                        >
                            Withdraw
                        </button>
                    </div>

                    {activeTab === 'info' && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {infoCards.map((item, i) => (
                                    <div key={i} className="bg-gray-50 p-4 rounded-lg border">
                                        <p className="text-xs text-gray-500 uppercase font-semibold">{item.label}</p>
                                        <p className="text-base font-semibold mt-1">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                                <h4 className="font-semibold text-yellow-800 flex items-center gap-2">
                                    🎯 Your Referral Link
                                </h4>
                                <div className="flex items-center gap-2 mt-2">
                                    <input
                                        type="text"
                                        className="input-field flex-1 bg-white"
                                        value={`${window.location.origin}/register?ref=${user?.referralCode || ''}`}
                                        readOnly
                                    />
                                    <button
                                        onClick={copyReferralCode}
                                        className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center gap-2"
                                    >
                                        <FaCopy /> Copy
                                    </button>
                                </div>
                                <p className="text-sm text-yellow-700 mt-2">
                                    💰 Earn <strong>KES 100</strong> for every friend who joins using your referral code!
                                </p>
                            </div>
                        </>
                    )}

                    {activeTab === 'withdraw' && <Withdraw />}
                </div>
            </div>
        </>
    );
};

export default Profile;