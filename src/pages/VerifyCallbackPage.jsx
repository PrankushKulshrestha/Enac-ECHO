import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/useAuth';
import { CheckCircle, XCircle, Loader, Send, Mail } from 'lucide-react';

// Module-level flag — survives StrictMode's double-invoke of effects
let verifyAttempted = false;

export default function VerifyCallbackPage() {
  const [status, setStatus]               = useState('loading');
  const [resendEmail, setResendEmail]     = useState('');
  const [resendSent, setResendSent]       = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendError, setResendError]     = useState('');

  const [searchParams]              = useSearchParams();
  const { completeMagicURL, login } = useAuth();
  const navigate                    = useNavigate();

  useEffect(() => {
    if (verifyAttempted) return;
    verifyAttempted = true;

    const userId = searchParams.get('userId');
    const secret = searchParams.get('secret');

    const pendingEmail = localStorage.getItem('echo_pending_email') || '';
    setResendEmail(pendingEmail);

    if (!userId || !secret) { setStatus('error'); return; }

    completeMagicURL(userId, secret)
      .then(() => {
        setStatus('success');
        setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
      })
      .catch((err) => {
        console.error('Magic URL error:', err);
        verifyAttempted = false; // reset so user can retry after requesting new link
        setStatus('error');
      });
  }, []);

  async function handleResend(e) {
    e.preventDefault();
    const trimmed = resendEmail.trim().toLowerCase();
    if (!trimmed) return;
    setResendLoading(true);
    setResendError('');
    try {
      await login(trimmed);
      setResendSent(true);
    } catch (err) {
      setResendError(err.message || 'Could not send link. Please try again.');
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-hero-pattern flex items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl shadow-moss/10 border border-eco-100 p-10 text-center">

        {status === 'loading' && (
          <>
            <Loader className="w-12 h-12 text-moss animate-spin mx-auto mb-4" strokeWidth={1.5} />
            <h2 className="font-display font-bold text-xl text-moss">Signing you in...</h2>
            <p className="font-body text-bark/50 text-sm mt-2">Just a moment</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-eco-500 mx-auto mb-4" strokeWidth={1.5} />
            <h2 className="font-display font-bold text-xl text-moss mb-2">You're in! 🌱</h2>
            <p className="font-body text-bark/55 text-sm">Redirecting to your dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" strokeWidth={1.5} />
            <h2 className="font-display font-bold text-xl text-moss mb-2">Link Expired</h2>
            <p className="font-body text-bark/55 text-sm mb-6">
              This link has expired or already been used. Enter your email below to get a new one.
            </p>

            {resendSent ? (
              <div className="flex items-center justify-center gap-2 bg-eco-50 border border-eco-100 text-eco-700 rounded-2xl p-4 mb-4">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span className="font-body text-sm">New link sent! Check your inbox.</span>
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-3 mb-4 text-left">
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-bark/40" />
                  <input
                    type="email"
                    value={resendEmail}
                    onChange={e => setResendEmail(e.target.value)}
                    placeholder="you@nsut.ac.in"
                    required
                    className="w-full pl-10 pr-4 py-3 border-2 border-eco-100 rounded-2xl font-body text-sm text-bark focus:outline-none focus:border-moss transition-colors bg-cream/50"
                  />
                </div>
                {resendError && (
                  <p className="font-body text-xs text-red-500 px-1">{resendError}</p>
                )}
                <button
                  type="submit"
                  disabled={resendLoading}
                  className="w-full btn-primary justify-center py-3 disabled:opacity-60"
                >
                  {resendLoading
                    ? <><Loader className="w-4 h-4 animate-spin" />Sending...</>
                    : <><Send className="w-4 h-4" />Send New Link</>
                  }
                </button>
              </form>
            )}

            <button
              onClick={() => navigate('/login')}
              className="w-full font-body text-sm text-bark/45 hover:text-bark/70 transition-colors py-2"
            >
              Back to Login
            </button>
          </>
        )}

      </div>
    </div>
  );
}
