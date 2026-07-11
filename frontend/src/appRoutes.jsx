import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';

// Auth
import Login from './components/auth/Login.jsx';
import Register from './components/auth/Register.jsx';
import VerifyEmail from './components/auth/VerifyEmail.jsx';
import ActivateAccount from './components/auth/ActivateAccount.jsx';

// Dashboard
import Dashboard from './components/dashboard/Dashboard.jsx';

// Trading
import TradeList from './components/trading/TradeList.jsx';
import CreateTrade from './components/trading/CreateTrade.jsx';
import TradeStats from './components/trading/TradeStats.jsx';
import TradeDetails from './components/trading/TradeDetails.jsx';

// Transactions
import TransactionList from './components/transactions/TransactionList.jsx';

// Referrals
import ReferralDashboard from './components/referrals/ReferralDashboard.jsx';

// Profile
import Profile from './components/profile/Profile.jsx';

// Payment Status
import PaymentStatus from './components/payments/PaymentStatus.jsx';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Navigate to="/dashboard" />} />

      {/* Protected Routes - Partial Auth */}
      <Route element={<ProtectedRoute requireVerification={false} requireActivation={false} />}>
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/activate" element={<ActivateAccount />} />
        <Route path="/payment-status/:externalReference" element={<PaymentStatus />} />
      </Route>

      {/* Protected Routes - Full Auth */}
      <Route element={<ProtectedRoute requireVerification={true} requireActivation={true} />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/trades" element={<TradeList />} />
        <Route path="/trades/create" element={<CreateTrade />} />
        <Route path="/trades/stats" element={<TradeStats />} />
        <Route path="/trades/:id" element={<TradeDetails />} />
        <Route path="/transactions" element={<TransactionList />} />
        <Route path="/referrals" element={<ReferralDashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
};

export default AppRoutes;