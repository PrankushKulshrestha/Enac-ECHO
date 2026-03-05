import { createContext, useContext, useEffect, useState } from 'react';
import { account } from './appwrite';
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
      await fetchProfile();
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

  // ── REGISTER ────────────────────────────────────────────
  async function register(email, name) {
    const { ID } = await import('./appwrite');
    const dummyPassword = Math.random().toString(36) + Math.random().toString(36);

    // 1. Create Appwrite auth account
    const newUser = await account.create(ID.unique(), email, dummyPassword, name);

    // 2. Temp session so we can call the function (needs a JWT)
    await account.createEmailPasswordSession(email, dummyPassword);

    // 3. Create DB profile via server function (no permission issues)
    await createUserProfile(newUser.$id, name, email);

    // 4. Send magic link — this is the real login method
    await account.createMagicURLToken(
      newUser.$id,
      email,
      `${window.location.origin}/verify`
    );

    // 5. Kill temp session
    try { await account.deleteSession('current'); } catch {}
    localStorage.setItem('echo_pending_email', email);
  }

  // ── LOGIN ────────────────────────────────────────────────
  async function login(email) {
    // Check account exists via server function
    const result = await getUserByEmail(email);
    const docs   = result?.documents ?? result;
    if (!docs || docs.length === 0) {
      throw new Error('No account found with this email. Please register first.');
    }
    const userId = docs[0].userId;
    await account.createMagicURLToken(
      userId,
      email,
      `${window.location.origin}/verify`
    );
    localStorage.setItem('echo_pending_email', email);
  }

  // ── COMPLETE MAGIC LINK ──────────────────────────────────
  async function completeMagicURL(userId, secret) {
    const session       = await account.updateMagicURLSession(userId, secret);
    const sessionUserId = session.userId;
    const sessionEmail  = localStorage.getItem('echo_pending_email') || '';

    // Mark verified via server function
    try { await setVerified(); } catch (e) { console.error('setVerified:', e.message); }

    localStorage.removeItem('echo_pending_email');

    try {
      const currentUser = await account.get();
      setUser(currentUser);
    } catch {
      setUser({
        $id:               sessionUserId,
        email:             sessionEmail,
        name:              sessionEmail,
        emailVerification: true,
      });
    }

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
