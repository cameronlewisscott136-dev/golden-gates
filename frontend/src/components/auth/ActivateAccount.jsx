import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../../services/api';

const ActivateAccount = () => {
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const depositAmount = parseFloat(amount);
    const requiredAmount = 200;

    if (!depositAmount || depositAmount < requiredAmount) {
      toast.error(`Minimum deposit for activation is KES ${requiredAmount}`);
      return;
    }

    if (!phoneNumber) {
      toast.error('Phone number is required for M-Pesa payment');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/activate', {
        amount: depositAmount,
        phoneNumber: phoneNumber
      });

      toast.success(response.data.message || 'STK Push sent! Check your phone.');
      
      // Store the external reference for status checking
      localStorage.setItem('pendingActivation', response.data.data.externalReference);
      
      // Navigate to payment status page
      navigate(`/payment-status/${response.data.data.externalReference}`);
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
            Deposit <strong>KES 200</strong> via M-Pesa to start trading
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">📱</span>
              </div>
              <input
                type="tel"
                className="input-field pl-10"
                placeholder="e.g., 0712345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Enter the phone number registered with M-Pesa</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deposit Amount (KES)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-400">KES</span>
              </div>
              <input
                type="number"
                className="input-field pl-16"
                placeholder="200"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="200"
                required
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Minimum deposit is KES 200</p>
          </div>

          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              ✅ You will receive an M-Pesa prompt on your phone. 
              Complete the payment to activate your account.
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 hover:shadow-lg hover:scale-105 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Pay with M-Pesa'}
          </button>

          <p className="text-center text-sm text-gray-600">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-yellow-600 hover:text-yellow-500 font-medium"
            >
              Skip for now
            </button>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ActivateAccount;