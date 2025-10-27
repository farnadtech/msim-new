
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext-supabase';
import { DataProvider } from './contexts/DataContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from './contexts/ThemeContext';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import AdminDashboard from './pages/AdminDashboard';
import SellerDashboard from './pages/SellerDashboard';
import BuyerDashboard from './pages/BuyerDashboard';
import SimDetailsPage from './pages/SimDetailsPage';
import Header from './components/Header';
import Footer from './components/Footer';
import RondNumbersPage from './pages/RondNumbersPage';
import AuctionsPage from './pages/AuctionsPage';
import PackagesPage from './pages/PackagesPage';
import CarrierSimsPage from './pages/CarrierSimsPage';

const PrivateRoute: React.FC<{ children: React.ReactElement; roles: string[] }> = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 dark:border-blue-400"></div>
        </div>
    );
  }

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/login" />;
  }
  return children;
};

const AppContent: React.FC = () => {
  return (
      <HashRouter>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/sim/:id" element={<SimDetailsPage />} />
              <Route path="/rond-numbers" element={<RondNumbersPage />} />
              <Route path="/auctions" element={<AuctionsPage />} />
              <Route path="/packages" element={<PackagesPage />} />
              <Route path="/carrier/:carrierName" element={<CarrierSimsPage />} />

              <Route
                path="/admin/*"
                element={
                  <PrivateRoute roles={['admin']}>
                    <AdminDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/seller/*"
                element={
                  <PrivateRoute roles={['seller']}>
                    <SellerDashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/buyer/*"
                element={
                  <PrivateRoute roles={['buyer']}>
                    <BuyerDashboard />
                  </PrivateRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </HashRouter>
  );
};


const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <DataProvider>
            <AppContent />
          </DataProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
