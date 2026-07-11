import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import toast from 'react-hot-toast';
import Navbar from '../common/Navbar';

const Withdraw = () => {
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ amount: '', bankName: '', bankAccount: '', bankHolder: '', phoneNumber: '' });

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        const amount = parseFloat(formData.amount);
        if (!amount || amount < 100) return toast.error('Minimum withdrawal is KES 100');
        if (amount > user.balance) return toast.error(`You have KES ${user.balance.toFixed(2)}`);
        if (!formData.bankName || !formData.bankAccount || !formData.bankHolder || !formData.phoneNumber) {
            return toast.error('All bank details are required');
        }

        setLoading(true);
        try {
            const response = await api.post('/withdrawals/request', formData);
            toast.success('Withdrawal request submitted successfully!');
            updateUser({ ...user, balance: response.data.data.remainingBalance });
            setFormData({ amount: '', bankName: '', bankAccount: '', bankHolder: '', phoneNumber: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Withdrawal failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Request Withdrawal</h2>
            <p className="text-sm text-gray-600 mb-4">Available Balance: <span className="font-bold text-green-600">KES {user?.balance?.toFixed(2) || '0.00'}</span></p>
            <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <div><label className="block text-sm font-medium mb-1">Amount (KES)</label><input type="number" name="amount" className="input-field" placeholder="Min 100" value={formData.amount} onChange={handleChange} required min="100" /></div>
                    <div><label className="block text-sm font-medium mb-1">Bank Name</label><input type="text" name="bankName" className="input-field" placeholder="e.g., Equity Bank" value={formData.bankName} onChange={handleChange} required /></div>
                    <div><label className="block text-sm font-medium mb-1">Bank Account Number</label><input type="text" name="bankAccount" className="input-field" placeholder="Account number" value={formData.bankAccount} onChange={handleChange} required /></div>
                    <div><label className="block text-sm font-medium mb-1">Account Holder Name</label><input type="text" name="bankHolder" className="input-field" placeholder="Full name on account" value={formData.bankHolder} onChange={handleChange} required /></div>
                    <div><label className="block text-sm font-medium mb-1">Phone Number</label><input type="tel" name="phoneNumber" className="input-field" placeholder="0712345678" value={formData.phoneNumber} onChange={handleChange} required /></div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50" disabled={loading}>{loading ? 'Processing...' : 'Request Withdrawal'}</button>
                </div>
            </form>
        </div>
    );
};

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
                        <div className="w-24 h-24 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-4xl text-white font-bold">{user?.firstName?.charAt(0) || 'U'}</div>
                        <div><h2 className="text-2xl font-bold">{user?.firstName} {user?.lastName}</h2><p className="text-gray-600">{user?.email}</p>
                            <div className="flex gap-2 mt-2">
                                <span className={`px-3 py-1 text-sm rounded-full ${user?.isActive ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{user?.isActive ? 'Active' : 'Inactive'}</span>
                                <span className={`px-3 py-1 text-sm rounded-full ${user?.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{user?.isVerified ? 'Verified' : 'Unverified'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4 mb-6">
                        <button onClick={() => setActiveTab('info')} className={`px-4 py-2 rounded-lg transition ${activeTab === 'info' ? 'bg-yellow-500 text-white' : 'bg-gray-200'}`}>Information</button>
                        <button onClick={() => setActiveTab('withdraw')} className={`px-4 py-2 rounded-lg transition ${activeTab === 'withdraw' ? 'bg-yellow-500 text-white' : 'bg-gray-200'}`}>Withdraw</button>
                    </div>
                    {activeTab === 'info' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {infoCards.map((item, i) => (
                                <div key={i} className="bg-gray-50 p-4 rounded-lg border"><p className="text-xs text-gray-500 uppercase font-semibold">{item.label}</p><p className="text-base font-semibold mt-1">{item.value}</p></div>
                            ))}
                        </div>
                    )}
                    {activeTab === 'withdraw' && <Withdraw />}
                </div>
            </div>
        </>
    );
};

export default Profile;