import { createContext, useEffect, useState } from 'react';
import { account, ID } from './appwrite';
import { getUserByEmail, setVerified, getUserProfile, getUserProfileDirect, createUserProfile } from './db';

export const AuthContext = createContext(null);

// ── EMAIL ALLOWLIST ────────────────────────────────────────
const NSUT_EMAIL = /@nsut\.ac\.in$/i;

const DEV_ALLOWLIST = [
  'kulshresthaprankush@gmail.com',
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
      if (currentUser?.email) await fetchProfile(currentUser.email);
    } catch {
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────
  // FETCH USER PROFILE
  // ─────────────────────────────────
  async function fetchProfile(email) {
    try {
      const doc = await getUserProfile();
      setProfile(doc);
    } catch {
      try {
        const doc = await getUserProfileDirect(email);
        setProfile(doc ?? null);
      } catch {
        setProfile(null);
      }
    }
  }

  // ─────────────────────────────────
  // LOGIN (SEND MAGIC LINK)
  // ─────────────────────────────────
  async function login(email) {
    const trimmed = email.toLowerCase().trim();

    if (!isAllowedEmail(trimmed)) {
      throw new Error('Only @nsut.ac.in email addresses are allowed.');
    }

    let userId = ID.unique();
    try {
      const result = await getUserByEmail(trimmed);
      const docs = result?.documents ?? [];
      if (docs.length > 0) {
        userId = docs[0].userId ?? docs[0].$id;
      }
    } catch {}

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
  // COMPLETE MAGIC LINK LOGIN
  // ─────────────────────────────────
  async function completeMagicURL(userId, secret) {

    // 1. Clear any stale session
    try { await account.deleteSession('current'); } catch {}
    await new Promise(r => setTimeout(r, 300));

    // 2. Create new session from magic link
    try {
      await account.createSession(userId, secret);
    } catch (e) {
      throw new Error(
        'Magic link is invalid or expired. Please request a new one. (' +
        e.message + ')'
      );
    }

    await new Promise(r => setTimeout(r, 500));

    // 3. Get JWT immediately — must happen before any _execute() call
    try {
      const jwtResult = await account.createJWT();
      localStorage.setItem('echo_jwt', jwtResult.jwt);
    } catch (e) {
      console.error('JWT creation failed:', e.message);
    }

    const sessionEmail = localStorage.getItem('echo_pending_email') || '';
    localStorage.removeItem('echo_pending_email');

    // 4. Get the Auth account object
    let currentUser = null;
    try {
      currentUser = await account.get();
    } catch {
      currentUser = {
        $id: userId,
        email: sessionEmail,
        name: '',
        emailVerification: true,
      };
    }
    setUser(currentUser);

    const userEmail = currentUser.email || sessionEmail;
    const userDisplayId = currentUser.$id || userId;
    // Use email prefix as fallback name — dashboard shows 'Eco Hero' if name is empty
    const displayName = currentUser.name?.trim() || '';

    // 5. Ensure DB profile exists — create if missing
    let doc = null;
    try {
      doc = await getUserProfile();
    } catch {
      // No profile found — create one now
      try {
        doc = await createUserProfile(displayName, userEmail, userDisplayId);
        console.log('[ECHO] Profile created for', userEmail);
      } catch (e) {
        console.error('[ECHO] createUserProfile failed:', e.message);
      }
    }
    setProfile(doc ?? null);

    // 6. Mark email as verified in DB (non-fatal)
    try {
      await setVerified();
    } catch (e) {
      console.error('[ECHO] setVerified failed:', e.message);
    }

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
    try {
      const currentUser = await account.get();
      if (currentUser?.email) await fetchProfile(currentUser.email);
    } catch {
      await fetchProfile('');
    }
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      login, completeMagicURL,
      logout, refreshProfile, checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
