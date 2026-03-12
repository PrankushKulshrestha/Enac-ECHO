import { createContext, useEffect, useState } from 'react';
import { account, ID } from './appwrite';
import { getUserByEmail, setVerified, getUserProfile, createUserProfile } from './db';

// AuthContext is defined here and consumed via useAuth.js
export const AuthContext = createContext(null);

// ── EMAIL ALLOWLIST ────────────────────────────────────────
const NSUT_EMAIL = /@nsut\.ac\.in$/i;

const DEV_ALLOWLIST = [
  'kulshresthaprankush@gmail.com',
  'iitjee202312345@gmail.com',
  'jojot3750@gmail.com',
];

function isAllowedEmail(email) {
  return NSUT_EMAIL.test(email) || DEV_ALLOWLIST.includes(email.toLowerCase().trim());
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { checkAuth(); }, []);

  // ─────────────────────────────────
  // CHECK EXISTING SESSION
  // ─────────────────────────────────
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

  // ─────────────────────────────────
  // FETCH USER PROFILE FROM DB
  // ─────────────────────────────────
  async function fetchProfile() {
    try {
      const doc = await getUserProfile();
      setProfile(doc);
    } catch {
      setProfile(null);
    }
  }

  // ─────────────────────────────────
  // LOGIN — SEND MAGIC LINK
  // ─────────────────────────────────
  async function login(email, name = '') {
    const trimmed = email.toLowerCase().trim();

    if (!isAllowedEmail(trimmed)) {
      throw new Error('Only @nsut.ac.in email addresses are allowed.');
    }

    // Reuse existing userId if we have one, else generate fresh
    let userId = ID.unique();
    try {
      const result = await getUserByEmail(trimmed);
      const docs   = result?.documents ?? [];
      if (docs.length > 0) {
        userId = docs[0].userId ?? docs[0].$id;
      }
    } catch {}

    // Persist name so completeMagicURL can forward it
    if (name) {
      localStorage.setItem(`echo_name_${trimmed}`, name);
    }

    try {
      await account.createMagicURLToken(
        userId,
        trimmed,
        `${window.location.origin}/verify`,
      );
    } catch (e) {
      throw new Error('Failed to send magic link: ' + e.message);
    }

    localStorage.setItem('echo_pending_email', trimmed);
  }

  // ─────────────────────────────────
  // COMPLETE MAGIC LINK — CALLED ON /verify
  // ─────────────────────────────────
  async function completeMagicURL(userId, secret) {

    // 1. Clear any stale session first
    try { await account.deleteSession('current'); } catch {}
    setUser(null);
    setProfile(null);
    await new Promise(r => setTimeout(r, 300));

    // 2. Exchange magic link token for a real session
    //    account.createSession() is the v1.5+ replacement for updateMagicURLSession()
    try {
      await account.createSession(userId, secret);
    } catch (e) {
      throw new Error(
        'Magic link is invalid or expired. Please request a new one. (' +
        e.message + ')',
      );
    }

    await new Promise(r => setTimeout(r, 500));

    // 3. Create a JWT immediately — passed in request body to server functions
    //    (Appwrite Cloud strips custom headers; body JWT is the reliable fallback)
    try {
      const jwtResult = await account.createJWT();
      localStorage.setItem('echo_jwt', jwtResult.jwt);
    } catch (e) {
    }

    const pendingEmail = localStorage.getItem('echo_pending_email') || '';
    localStorage.removeItem('echo_pending_email');

    const pendingName = pendingEmail
      ? localStorage.getItem(`echo_name_${pendingEmail}`) || ''
      : '';

    // 4. Get Auth account object
    let currentUser = null;
    try {
      currentUser = await account.get();
    } catch {
      currentUser = { $id: userId, email: pendingEmail, name: '', emailVerification: true };
    }
    setUser(currentUser);

    const userEmail     = currentUser.email || pendingEmail;
    const userDisplayId = currentUser.$id   || userId;
    const displayName   = pendingName || currentUser.name?.trim() || '';

    // 5. Ensure DB profile exists — create on first login
    let doc = null;
    try {
      doc = await getUserProfile();
    } catch {
      try {
        doc = await createUserProfile(displayName, userEmail, userDisplayId);
      } catch (e) {
      }
    }
    setProfile(doc ?? null);

    // 6. Mark as verified in DB (non-fatal)
    try {
      await setVerified(displayName);
    } catch (e) {
    }

    // Clean up stored name after use
    if (pendingEmail) localStorage.removeItem(`echo_name_${pendingEmail}`);

    setLoading(false);
  }

  // ─────────────────────────────────
  // LOGOUT
  // ─────────────────────────────────
  async function logout() {
    try { await account.deleteSession('current'); } catch {}
    localStorage.removeItem('echo_jwt');
    setUser(null);
    setProfile(null);
  }

  // ─────────────────────────────────
  // REFRESH PROFILE
  // ─────────────────────────────────
  async function refreshProfile() {
    await fetchProfile();
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      login,
      sendMagicLink: login,   // alias kept for any legacy callers
      completeMagicURL,
      logout, refreshProfile, checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
