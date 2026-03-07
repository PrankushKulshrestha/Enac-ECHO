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
    // If there's already an active session, delete it first.
    // Appwrite throws "Creation of a session is prohibited when a session is active"
    // if you try to exchange a magic link token while logged in.
    try {
      await account.deleteSession('current');
      setUser(null);
      setProfile(null);
    } catch {
      // No active session — this is the normal path, ignore the error.
    }

    // Exchange the magic link token for a real session
    try {
      await account.updateMagicURLSession(userId, secret);
    } catch (e) {
      throw new Error('Magic link is invalid or expired. Please request a new one. (' + e.message + ')');
    }

    localStorage.removeItem('echo_pending_email');

    // Wait for session to become active
    let currentUser = null;
    for (let i = 0; i < 10; i++) {
      try { currentUser = await account.get(); break; }
      catch { await new Promise(r => setTimeout(r, 500)); }
    }
    if (!currentUser) throw new Error('Session did not become active. Please try again.');
    setUser(currentUser);

    // Wait for JWT endpoint to be ready
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
      console.warn('JWT endpoint not ready after 5s — proceeding anyway.');
    }

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
