import { useEffect, useState } from 'react';
import { account, ID } from './appwrite';
import { setVerified, getUserProfile } from './db';
import { AuthContext } from './useAuth';

const NSUT_EMAIL = /@nsut\.ac\.in$/i;
const DEV_ALLOWLIST = [
  'kulshresthaprankush@gmail.com',
];

function userIdStorageKey(email) {
  return `echo_uid_${email}`;
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    try {
      const currentUser = await account.get();
      setUser(currentUser);
      try { await fetchProfile(); } catch { setProfile(null); }
    } catch {
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProfile() {
    try {
      const doc = await getUserProfile();
      setProfile(doc);
    } catch {
      setProfile(null);
    }
  }

  async function sendMagicLink(email) {
    const trimmed = email.trim().toLowerCase();
    if (!NSUT_EMAIL.test(trimmed) && !DEV_ALLOWLIST.includes(trimmed)) {
      throw new Error('Only @nsut.ac.in email addresses are allowed.');
    }

    const storageKey = userIdStorageKey(trimmed);
    let userId = localStorage.getItem(storageKey);
    if (!userId) {
      userId = ID.unique();
      localStorage.setItem(storageKey, userId);
    }

    try {
      await account.createMagicURLToken(userId, trimmed, `${window.location.origin}/verify`);
    } catch (e) {
      localStorage.removeItem(storageKey);
      throw new Error('Failed to send magic link: ' + e.message);
    }

    localStorage.setItem('echo_pending_email', trimmed);
  }

  async function completeMagicURL(userId, secret) {
    // Step 1: Exchange the magic link token for a real session
    try {
      await account.updateMagicURLSession(userId, secret);
    } catch (e) {
      throw new Error('Magic link is invalid or expired. Please request a new one. (' + e.message + ')');
    }

    localStorage.removeItem('echo_pending_email');

    // Step 2: Wait until account.get() confirms the session is active.
    // Appwrite can take a moment to propagate the session after token exchange.
    let currentUser = null;
    for (let i = 0; i < 10; i++) {
      try { currentUser = await account.get(); break; }
      catch { await new Promise(r => setTimeout(r, 500)); }
    }
    if (!currentUser) throw new Error('Session did not become active. Please try again.');
    setUser(currentUser);

    // Step 3: Confirm JWT issuance works before proceeding.
    // The JWT endpoint sometimes lags behind the session endpoint — we must
    // verify it succeeds here, because _execute() depends on it immediately.
    // Without this confirmed wait, _execute() gets a silent JWT failure and
    // sends no auth header, causing the function to return 401.
    let jwtReady = false;
    for (let i = 0; i < 10; i++) {
      try {
        await account.createJWT();
        jwtReady = true;
        break;
      } catch {
        await new Promise(r => setTimeout(r, 500));
      }
    }
    if (!jwtReady) {
      console.warn('JWT endpoint did not become ready — proceeding anyway.');
    }

    // Step 4: Now safe to call server functions
    try { await setVerified(); } catch (e) { console.error('setVerified failed:', e.message); }
    await fetchProfile();
  }

  async function logout() {
    try { await account.deleteSession('current'); } catch {}
    setUser(null);
    setProfile(null);
  }

  async function refreshProfile() { await fetchProfile(); }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      sendMagicLink,
      login: sendMagicLink,
      completeMagicURL,
      logout, refreshProfile, checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
