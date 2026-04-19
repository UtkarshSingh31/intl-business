import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import LandingPage from './pages/LandingPage.jsx';
import BankerDashboard from './pages/BankerDashboard.jsx';
import PlayerDashboard from './pages/PlayerDashboard.jsx';
import SetupPage from './pages/SetupPage.jsx';

function ProtectedRoute({ children, requiredRole }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="page-loading">
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <p className="logo-text">International Business</p>
    </div>
  );

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={user.role === 'banker' ? '/banker' : '/play'} replace /> : <LandingPage />} />
      <Route path="/banker" element={
        <ProtectedRoute requiredRole="banker">
          <BankerWrapper />
        </ProtectedRoute>
      } />
      <Route path="/play" element={
        <ProtectedRoute requiredRole="player">
          <PlayerDashboard />
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function BankerWrapper() {
  const { user } = useAuth();
  // Will be set after room is fetched; for now route to setup if status unknown
  return <BankerDashboard />;
}
