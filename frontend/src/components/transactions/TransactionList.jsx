import React, { useState, useEffect } from 'react';
import transactionService from '../../services/transactionService';
import Navbar from '../common/Navbar';
import toast from 'react-hot-toast';
import { FaWallet, FaPlus, FaTimes } from 'react-icons/fa';

const TransactionList = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDeposit, setShowDeposit] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
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

    const handleDeposit = async (e) => {
        e.preventDefault();
        const amount = parseFloat(depositAmount);

        if (!amount || amount < 100) {
            toast.error('Minimum deposit is $100');
            return;
        }

        setDepositing(true);
        try {
            await transactionService.deposit(amount);
            toast.success(`Successfully deposited $${amount}`);
            setShowDeposit(false);
            setDepositAmount('');
            fetchTransactions();
        } catch (error) {
            toast.error('Deposit failed. Please try again.');
        } finally {
            setDepositing(false);
        }
    };

    const getTypeBadge = (type) => {
        const map = {
            deposit: 'bg-green-100 text-green-800',
            withdrawal: 'bg-red-100 text-red-800',
            trade_profit: 'bg-green-100 text-green-800',
            trade_loss: 'bg-red-100 text-red-800',
            referral_bonus: 'bg-purple-100 text-purple-800',
            capital_activation: 'bg-yellow-100 text-yellow-800'
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
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fade-in">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
                        <p className="text-gray-600 mt-1">Your transaction history</p>
                    </div>
                    <button
                        onClick={() => setShowDeposit(true)}
                        className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 hover:shadow-lg hover:scale-105 flex items-center gap-2"
                    >
                        <FaPlus />
                        Deposit
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    {transactions.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500">No transactions found.</p>
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
                                                ${tx.amount}
                                            </td>
                                            <td className="px-6 py-4">${tx.balanceBefore}</td>
                                            <td className="px-6 py-4">${tx.balanceAfter}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${tx.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
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
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition"
                        >
                            Previous
                        </button>
                        <span className="text-gray-600">
                            Page {pagination.page} of {pagination.pages}
                        </span>
                        <button
                            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                            disabled={pagination.page === pagination.pages}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 transition"
                        >
                            Next
                        </button>
                    </div>
                )}
            </div>

            {/* Deposit Modal */}
            {showDeposit && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full p-8 fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">Deposit Funds</h2>
                            <button
                                onClick={() => setShowDeposit(false)}
                                className="text-gray-400 hover:text-gray-600 transition"
                            >
                                <FaTimes className="text-2xl" />
                            </button>
                        </div>
                        <p className="text-gray-600 mb-6">Minimum deposit: $100</p>
                        <form onSubmit={handleDeposit}>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Amount ($)
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-400">$</span>
                                    </div>
                                    <input
                                        type="number"
                                        className="input-field pl-8"
                                        placeholder="Enter amount"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        min="100"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    type="submit"
                                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3 px-4 rounded-lg transition duration-200 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={depositing}
                                >
                                    {depositing ? 'Processing...' : 'Deposit'}
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