import { useState } from "react";
import { Mail, RefreshCw, LogOut, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from '../lib/useAuth';

export default function UnverifiedPage() {
  const { user, logout, login } = useAuth();
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleResend() {
    setLoading(true);
    try {
      // Re-use the login function — it sends a fresh magic link to the user's email
      await login(user.email);
      setSent(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-hero-pattern flex items-center justify-center px-6 py-24">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-moss/10 border border-eco-100 p-10 text-center">
        <div className="w-16 h-16 bg-eco-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <Mail className="w-8 h-8 text-moss" strokeWidth={1.5} />
        </div>

        <h1 className="font-display font-bold text-2xl text-moss mb-2">
          Email not verified
        </h1>
        <p className="font-body text-bark/55 text-sm leading-relaxed mb-2">
          Your account email
        </p>
        <p className="font-display font-semibold text-moss text-sm mb-4">
          {user?.email}
        </p>
        <p className="font-body text-bark/45 text-xs leading-relaxed mb-8">
          hasn't been verified yet. Click the link we sent to your inbox to gain
          access to your dashboard.
        </p>

        <div className="space-y-3">
          {sent ? (
            <div className="flex items-center justify-center gap-2 text-eco-600 py-3 bg-eco-50 rounded-2xl">
              <CheckCircle className="w-4 h-4" />
              <span className="font-body text-sm">Verification email sent!</span>
            </div>
          ) : (
            <button
              onClick={handleResend}
              disabled={loading}
              className="w-full btn-primary justify-center py-3.5 disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Resend verification email
                </span>
              )}
            </button>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 font-body text-sm text-bark/45 hover:text-bark/70 transition-colors py-2"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
