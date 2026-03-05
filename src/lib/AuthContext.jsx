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

  // ── REGISTER ──────────────────────────────────────────
  async function register(email, name) {
    const dummyPassword = ID.unique() + ID.unique();

    // 1. Create Appwrite auth account
    const newUser = await account.create(ID.unique(), email, dummyPassword, name);

    // 2. Create a temp session so the SDK can attach credentials to the function call
    await account.createEmailPasswordSession(email, dummyPassword);

    // 3. Create DB profile via server function — runs with API key, no permission issues
    await createUserProfile(name, email);

    // 4. Send magic link — this is the real login method going forward
    await account.createMagicURLToken(
      newUser.$id,
      email,
      `${window.location.origin}/verify`,
    );

    // 5. Destroy temp session — user logs in via magic link only
    try { await account.deleteSession('current'); } catch {}

    localStorage.setItem('echo_pending_email', email);
  }

  // ── LOGIN ────────────────────────────────────────────
  async function login(email) {
    // Look up user profile to get their Appwrite userId
    const result = await getUserByEmail(email);
    const docs   = result?.documents ?? (Array.isArray(result) ? result : []);
    if (!docs || docs.length === 0) {
      throw new Error('No account found with this email. Please register first.');
    }
    const userId = docs[0].userId ?? docs[0].$id;
    await account.createMagicURLToken(
      userId,
      email,
      `${window.location.origin}/verify`,
    );
    localStorage.setItem('echo_pending_email', email);
  }

  // ── COMPLETE MAGIC LINK ──────────────────────────────
  async function completeMagicURL(userId, secret) {
    // Exchange the magic link token for a real session
    await account.updateMagicURLSession(userId, secret);

    const sessionEmail = localStorage.getItem('echo_pending_email') || '';
    localStorage.removeItem('echo_pending_email');

    // Confirm session is active
    let currentUser = null;
    try {
      currentUser = await account.get();
      setUser(currentUser);
    } catch {
      setUser({ $id: userId, email: sessionEmail, name: sessionEmail, emailVerification: true });
    }

    // Now session is live — safe to call authenticated function
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
