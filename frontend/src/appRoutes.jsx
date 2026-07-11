import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';

// Auth
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import VerifyEmail from './components/auth/VerifyEmail';
import ActivateAccount from './components/auth/ActivateAccount';

// Dashboard
import Dashboard from './components/dashboard/Dashboard';

// Trading
import TradeList from './components/trading/TradeList';
import CreateTrade from './components/trading/CreateTrade';
import TradeStats from './components/trading/TradeStats';
import TradeDetails from './components/trading/TradeDetails';

// Transactions
import TransactionList from './components/transactions/TransactionList';

// Referrals
import ReferralDashboard from './components/referrals/ReferralDashboard';

// Profile
import Profile from './components/profile/Profile';

// Payment Status
import PaymentStatus from './components/payments/PaymentStatus';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Navigate to="/dashboard" />} />

      <Route element={<ProtectedRoute requireVerification={false} requireActivation={false} />}>
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/activate" element={<ActivateAccount />} />
        <Route path="/payment-status/:externalReference" element={<PaymentStatus />} />
      </Route>

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

      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
};

export default AppRoutes;