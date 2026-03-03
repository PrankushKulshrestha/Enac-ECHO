import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';

export default function AdminRoute({ children }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full animate-spin"
            style={{ border: '3px solid #dcfce7', borderTopColor: '#2D4A22' }}
          />
          <span className="font-mono text-sm text-bark/50 tracking-widest uppercase">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (!profile?.isAdmin) return <Navigate to="/dashboard" replace />;

  return children;
}