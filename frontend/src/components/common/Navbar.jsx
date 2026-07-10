import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FaHome, FaExchangeAlt, FaWallet, FaGift, FaUser, FaSignOutAlt } from 'react-icons/fa';

const Navbar = () => {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const navLinks = [
        { to: '/dashboard', label: 'Dashboard', icon: <FaHome /> },
        { to: '/trades', label: 'Trades', icon: <FaExchangeAlt /> },
        { to: '/transactions', label: 'Transactions', icon: <FaWallet /> },
        { to: '/referrals', label: 'Referrals', icon: <FaGift /> },
        { to: '/profile', label: 'Profile', icon: <FaUser /> },
    ];

    return (
        <nav className="bg-white shadow-lg sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/dashboard" className="flex items-center space-x-2">
                            <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                                <span className="text-white text-xl">💰</span>
                            </div>
                            <span className="text-xl font-bold text-yellow-600 hidden sm:block">
                                Golden Gates
                            </span>
                        </Link>
                    </div>

                    <div className="hidden md:flex items-center space-x-4">
                        {isAuthenticated ? (
                            <>
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        className="text-gray-700 hover:text-yellow-600 px-3 py-2 rounded-md text-sm font-medium transition duration-200 hover:bg-yellow-50 flex items-center gap-2"
                                    >
                                        {link.icon}
                                        {link.label}
                                    </Link>
                                ))}

                                <div className="border-l border-gray-300 h-8 mx-2" />

                                <div className="flex items-center space-x-4">
                                    <div className="bg-yellow-50 px-4 py-2 rounded-lg">
                                        <span className="text-sm text-gray-600">Balance:</span>
                                        <span className="ml-2 font-bold text-yellow-600">
                                            ${user?.balance?.toFixed(2) || '0.00'}
                                        </span>
                                    </div>

                                    <button
                                        onClick={handleLogout}
                                        className="text-gray-700 hover:text-red-600 transition duration-200 p-2 rounded-lg hover:bg-red-50"
                                    >
                                        <FaSignOutAlt className="w-5 h-5" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="text-gray-700 hover:text-yellow-600 px-3 py-2 rounded-md text-sm font-medium">
                                    Login
                                </Link>
                                <Link to="/register" className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 hover:shadow-lg hover:scale-105">
                                    Register
                                </Link>
                            </>
                        )}
                    </div>

                    <div className="md:hidden flex items-center">
                        {isAuthenticated && (
                            <div className="mr-4">
                                <span className="text-sm font-bold text-yellow-600">
                                    ${user?.balance?.toFixed(2) || '0.00'}
                                </span>
                            </div>
                        )}
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-gray-700 hover:text-yellow-600 focus:outline-none p-2 rounded-lg hover:bg-gray-100"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        {isAuthenticated ? (
                            <>
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.to}
                                        to={link.to}
                                        className="flex items-center gap-3 px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-yellow-600 hover:bg-yellow-50"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        {link.icon}
                                        {link.label}
                                    </Link>
                                ))}

                                <div className="border-t border-gray-200 pt-2 mt-2">
                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setIsOpen(false);
                                        }}
                                        className="flex items-center gap-3 w-full px-3 py-3 rounded-md text-base font-medium text-red-600 hover:bg-red-50"
                                    >
                                        <FaSignOutAlt />
                                        Logout
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="block px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:text-yellow-600 hover:bg-yellow-50" onClick={() => setIsOpen(false)}>
                                    Login
                                </Link>
                                <Link to="/register" className="block px-3 py-3 rounded-md text-base font-medium text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50" onClick={() => setIsOpen(false)}>
                                    Register
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;