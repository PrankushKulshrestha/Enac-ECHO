import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/useAuth';

export default function ProtectedRoute({ children }) {
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

  // ✅ FIX #2: Was checking `user.emailVerification` (Appwrite's built-in account field).
  // The app uses magic-link auth + a custom DB profile field `isVerified`.
  // Appwrite only sets `emailVerification: true` when you call account.updateVerification(),
  // which this app never does — so ALL users were permanently trapped at /unverified.
  // Correct check: use `profile.isVerified` which is set by setVerified() in completeMagicURL.
  //
  // We also wait for profile to be loaded (profile !== null) before checking,
  // so we don't flash /unverified while the profile fetch is still in-flight.
  if (profile !== null && !profile.isVerified) return <Navigate to="/unverified" replace />;

  return children;
}
