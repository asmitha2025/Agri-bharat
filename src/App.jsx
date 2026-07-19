import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, AuthProvider } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Farmers from './pages/Farmers';
import FarmerDetail from './pages/FarmerDetail';
import CallHistory from './pages/CallHistory';
import PestControl from './pages/PestControl';
import WeatherCenter from './pages/WeatherCenter';
import Schemes from './pages/Schemes';
import MarketPrices from './pages/MarketPrices';
import { DarkModeProvider } from './context/DarkModeContext';
import { LanguageProvider } from './context/LanguageContext';
import { Leaf, ShieldOff } from 'lucide-react';

/* ── Loading spinner ── */
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #0f0c29, #1a1a4e, #24243e)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="p-3 rounded-2xl" style={{ background: 'linear-gradient(135deg,#7c3aed,#059669)' }}>
          <Leaf className="w-8 h-8 text-white animate-pulse" />
        </div>
        <p className="text-purple-300 text-sm">Loading AgriBot…</p>
      </div>
    </div>
  );
}

/* ── Access Denied page (for regular users hitting admin-only routes) ── */
function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="p-5 rounded-2xl mb-4 bg-red-50 dark:bg-red-900/20">
        <ShieldOff className="w-12 h-12 text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Access Restricted</h2>
      <p className="text-gray-500 dark:text-gray-400 text-sm max-w-xs">
        This page is only accessible to Admin users. Please contact your administrator for access.
      </p>
      <a href="/dashboard"
        className="mt-6 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
        style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
        Back to Dashboard
      </a>
    </div>
  );
}

/* ── Protected: must be logged in ── */
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/* ── Admin-only: must be admin role ── */
function AdminRoute({ children }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAdmin) return <AccessDenied />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      {/* Protected (all logged-in users) */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"     element={<Dashboard />} />
        <Route path="pest-control"  element={<PestControl />} />
        <Route path="weather"       element={<WeatherCenter />} />
        <Route path="schemes"       element={<Schemes />} />
        <Route path="market"        element={<MarketPrices />} />

        {/* Admin-only routes */}
        <Route path="farmers"       element={<AdminRoute><Farmers /></AdminRoute>} />
        <Route path="farmers/:id"   element={<AdminRoute><FarmerDetail /></AdminRoute>} />
        <Route path="calls"         element={<AdminRoute><CallHistory /></AdminRoute>} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <DarkModeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </DarkModeProvider>
    </LanguageProvider>
  );
}
