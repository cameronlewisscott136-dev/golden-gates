import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import transactionService from '../../services/transactionService';
import api from '../../services/api';
import Navbar from '../common/Navbar';
import toast from 'react-hot-toast';
import { FaPlus, FaWallet, FaTimes } from 'react-icons/fa';

const TransactionList = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 0 });

  useEffect(() => {
    fetchTransactions();
  }, [pagination.page]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await transactionService.getTransactions({ page: pagination.page, limit: 10 });
      setTransactions(response.data.transactions);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // HANDLE DEPOSIT - Updated with navigation
  // ============================================
  const handleDeposit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    
    if (!amount || amount < 100) {
      toast.error('Minimum deposit is KES 100');
      return;
    }
    
    if (!phoneNumber) {
      toast.error('Phone number is required');
      return;
    }

    setDepositing(true);
    try {
      const response = await api.post('/auth/deposit', { 
        amount, 
        phoneNumber 
      });
      
      toast.success('STK Push sent! Check your phone.');
      setShowDeposit(false);
      setDepositAmount('');
      setPhoneNumber('');
      
      // Navigate to payment status page to check result
      if (response.data?.data?.externalReference) {
        navigate(`/payment-status/${response.data.data.externalReference}`);
      } else {
        fetchTransactions();
        // Refresh user balance
        const userResponse = await api.get('/auth/me');
        if (userResponse.data?.data?.user) {
          updateUser(userResponse.data.data.user);
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Deposit failed');
    } finally {
      setDepositing(false);
    }
  };

  const getTypeBadge = (type) => {
    const map = {
      deposit: 'bg-green-100 text-green-800',
      withdrawal: 'bg-red-100 text-red-800',
      trade_profit: 'bg-blue-100 text-blue-800',
      trade_loss: 'bg-red-100 text-red-800',
      referral_bonus: 'bg-purple-100 text-purple-800',
      capital_activation: 'bg-yellow-100 text-yellow-800',
      trade_open: 'bg-gray-100 text-gray-800'
    };
    return `px-2 py-1 text-xs font-semibold rounded-full ${map[type] || 'bg-gray-100 text-gray-800'}`;
  };

  const formatType = (type) => {
    return type.replace('_', ' ').toUpperCase();
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="spinner"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 fade-in">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Transactions</h1>
            <p className="text-gray-600 mt-1">Your transaction history</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-yellow-50 px-4 py-2 rounded-lg">
              <span className="text-sm text-gray-600">Balance:</span>
              <span className="ml-2 font-bold text-yellow-600">
                KES {user?.totalBalance?.toFixed(2) || '0.00'}
              </span>
            </div>
            <button 
              onClick={() => setShowDeposit(true)} 
              className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-semibold py-2 px-4 rounded-lg hover:shadow-lg hover:scale-105 transition flex items-center gap-2"
            >
              <FaPlus /> Deposit
            </button>
          </div>
        </div>

        {/* Balance Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <p className="text-xs text-green-700">🔒 Initial Capital</p>
            <p className="text-lg font-bold text-green-600">KES {user?.initialCapital?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700">📈 Profit Balance</p>
            <p className="text-lg font-bold text-blue-600">KES {user?.profitBalance?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
            <p className="text-xs text-purple-700">🎁 Bonus Balance</p>
            <p className="text-lg font-bold text-purple-600">KES {user?.bonusBalance?.toFixed(2) || '0.00'}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No transactions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance Before</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance After</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((tx) => (
                    <tr key={tx._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={getTypeBadge(tx.type)}>
                          {formatType(tx.type)}
                        </span>
                      </td>
                      <td className={`px-6 py-4 font-medium ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        KES {tx.amount}
                      </td>
                      <td className="px-6 py-4">KES {tx.balanceBefore}</td>
                      <td className="px-6 py-4">KES {tx.balanceAfter}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          tx.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {pagination.pages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-6">
            <button 
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })} 
              disabled={pagination.page === 1} 
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition"
            >
              Previous
            </button>
            <span className="text-gray-600">Page {pagination.page} of {pagination.pages}</span>
            <button 
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })} 
              disabled={pagination.page === pagination.pages} 
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 hover:bg-gray-300 transition"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* ============================================
          DEPOSIT MODAL
          ============================================ */}
      {showDeposit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-8 fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <FaWallet className="text-yellow-500" />
                Deposit Funds
              </h2>
              <button 
                onClick={() => setShowDeposit(false)} 
                className="text-gray-400 hover:text-gray-600 transition text-2xl"
              >
                <FaTimes />
              </button>
            </div>
            
            <p className="text-gray-600 mb-2">Minimum deposit: <strong>KES 100</strong></p>
            <p className="text-sm text-gray-500 mb-6">
              Funds will be added to your <strong>Profit Balance</strong> for trading.
              Initial capital is locked and cannot be deposited into.
            </p>

            <form onSubmit={handleDeposit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input 
                  type="tel" 
                  className="input-field" 
                  placeholder="0712345678" 
                  value={phoneNumber} 
                  onChange={(e) => setPhoneNumber(e.target.value)} 
                  required 
                />
                <p className="text-xs text-gray-500 mt-1">Enter the M-Pesa registered phone number</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (KES)
                </label>
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="Enter amount (min 100)" 
                  value={depositAmount} 
                  onChange={(e) => setDepositAmount(e.target.value)} 
                  min="100" 
                  required 
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {[100, 200, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setDepositAmount(amt.toString())}
                      className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition"
                    >
                      KES {amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
                <p className="text-sm text-blue-700">
                  💡 You will receive an M-Pesa prompt. Complete the payment to deposit funds.
                </p>
              </div>

              <div className="flex gap-4">
                <button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3 px-4 rounded-lg hover:shadow-lg hover:scale-105 transition disabled:opacity-50" 
                  disabled={depositing}
                >
                  {depositing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    'Pay with M-Pesa'
                  )}
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowDeposit(false)} 
                  className="flex-1 bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default TransactionList;