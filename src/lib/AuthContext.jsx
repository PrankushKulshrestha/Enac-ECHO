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

function userNameStorageKey(email) {
  return `echo_name_${email}`;
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

  // name is optional — stored in localStorage so completeMagicURL can use it
  async function sendMagicLink(email, name = '') {
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

    // Persist name so completeMagicURL can forward it to the server
    if (name) {
      localStorage.setItem(userNameStorageKey(trimmed), name);
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
    try {
      await account.deleteSession('current');
      setUser(null);
      setProfile(null);
    } catch {
      // No active session — normal path, ignore.
    }

    // Exchange the magic link token for a real session
    try {
      await account.updateMagicURLSession(userId, secret);
    } catch (e) {
      throw new Error('Magic link is invalid or expired. Please request a new one. (' + e.message + ')');
    }

    const pendingEmail = localStorage.getItem('echo_pending_email') || '';
    localStorage.removeItem('echo_pending_email');

    // Retrieve name the user typed on the login page (if any)
    const pendingName = pendingEmail
      ? localStorage.getItem(userNameStorageKey(pendingEmail)) || ''
      : '';

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

    try {
      // Pass the name to setVerified so the server can store it when creating the profile doc
      await setVerified(pendingName || currentUser.name || '');
    } catch (e) {
      console.error('setVerified failed:', e.message);
    }

    // Clean up stored name after use
    if (pendingEmail) localStorage.removeItem(userNameStorageKey(pendingEmail));

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
