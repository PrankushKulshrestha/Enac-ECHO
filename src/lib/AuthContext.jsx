import { createContext, useContext, useEffect, useState } from 'react';
import { account, ID } from './appwrite';
import { createUserProfile, getUserByEmail, setVerified, getUserProfile } from './db';

const AuthContext = createContext(null);

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

  // ── REGISTER ────────────────────────────────────────
  async function register(email, name) {
    const dummyPassword = ID.unique() + ID.unique();

    // 1. Create Appwrite auth account
    const newUser = await account.create(ID.unique(), email, dummyPassword, name);

    // 2. Temp session so SDK can attach credentials to the function call
    await account.createEmailPasswordSession(email, dummyPassword);

    // 3. Create DB profile via server function
    await createUserProfile(name, email);

    // 4. Send magic link — real login method going forward
    try {
      await account.createMagicURLToken(
        newUser.$id,
        email,
        `${window.location.origin}/verify`,
      );
    } catch (e) {
      throw new Error('Account created but failed to send verification email: ' + e.message);
    }

    // 5. Destroy temp session
    try { await account.deleteSession('current'); } catch {}
    localStorage.setItem('echo_pending_email', email);
  }

  // ── LOGIN ────────────────────────────────────────────
  async function login(email) {
    // Look up user profile to get their Appwrite userId
    let docs = [];
    try {
      const result = await getUserByEmail(email);
      docs = result?.documents ?? (Array.isArray(result) ? result : []);
    } catch (e) {
      throw new Error('Could not look up account. Please try again. (' + e.message + ')');
    }

    if (docs.length === 0) {
      throw new Error('No account found with this email. Please register first.');
    }

    const userId = docs[0].userId ?? docs[0].$id;
    if (!userId) {
      throw new Error('Account data is corrupted. Please contact support.');
    }

    try {
      await account.createMagicURLToken(
        userId,
        email,
        `${window.location.origin}/verify`,
      );
    } catch (e) {
      throw new Error('Failed to send magic link: ' + e.message);
    }

    localStorage.setItem('echo_pending_email', email);
  }

  // ── COMPLETE MAGIC LINK ──────────────────────────────
  async function completeMagicURL(userId, secret) {
    // Exchange magic link token for a real session
    try {
      await account.updateMagicURLSession(userId, secret);
    } catch (e) {
      throw new Error('Magic link is invalid or expired. Please request a new one. (' + e.message + ')');
    }

    const sessionEmail = localStorage.getItem('echo_pending_email') || '';
    localStorage.removeItem('echo_pending_email');

    // Confirm session is active
    try {
      const currentUser = await account.get();
      setUser(currentUser);
    } catch {
      setUser({ $id: userId, email: sessionEmail, name: sessionEmail, emailVerification: true });
    }

    // Mark as verified — session is live so function call is authenticated
    try { await setVerified(); } catch (e) { console.error('setVerified failed:', e.message); }

    await fetchProfile();
    setLoading(false);
  }

  async function logout() {
    try { await account.deleteSession('current'); } catch {}
    setUser(null);
    setProfile(null);
  }

  async function refreshProfile() {
    await fetchProfile();
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      login, register, completeMagicURL,
      logout, refreshProfile, checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}