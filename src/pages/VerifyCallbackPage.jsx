import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

let alreadyCalled = false; // module-level flag, survives re-renders

export default function VerifyCallbackPage() {
  const [status, setStatus]  = useState('loading');
  const [searchParams]       = useSearchParams();
  const { completeMagicURL } = useAuth();
  const navigate             = useNavigate();

  useEffect(() => {
    if (alreadyCalled) return;
    alreadyCalled = true;

    const userId = searchParams.get('userId');
    const secret = searchParams.get('secret');

    if (!userId || !secret) { setStatus('error'); return; }

    completeMagicURL(userId, secret)
      .then(() => {
        setStatus('success');
        setTimeout(() => {
          alreadyCalled = false; // reset for next time
          navigate('/dashboard', { replace: true });
        }, 1500);
      })
      .catch((err) => {
        console.error('Full error:', err);
        alreadyCalled = false; // reset on error so user can retry
        setStatus('error');
      });
  }, []);

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
              This link has expired or already been used. Request a new one.
            </p>
            <button onClick={() => navigate('/login')} className="btn-primary w-full justify-center">
              Back to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}