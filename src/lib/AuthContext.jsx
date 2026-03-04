import { createContext, useContext, useEffect, useState } from 'react';
import { account, databases, DB_ID, COLLECTIONS, ID, Query } from './appwrite';

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
      await fetchProfile(currentUser.$id);
    } catch {
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProfile(userId) {
    try {
      const doc = await databases.getDocument(DB_ID, COLLECTIONS.USERS, userId);
      setProfile(doc);
    } catch {
      setProfile(null);
    }
  }

  // ── REGISTER ────────────────────────────────────────────
  // Creates account with a dummy password (user never sees/uses it),
  // creates DB profile, then sends magic link for first-time login.
  async function register(email, name) {
    // 1. Create auth account with a random password the user never needs
    const dummyPassword = ID.unique() + ID.unique(); // long random string
    const newUser = await account.create(ID.unique(), email, dummyPassword, name);

    // 2. Temporary session to write DB profile
    await account.createEmailPasswordSession(email, dummyPassword);

    // 3. Create DB profile
    try {
      await databases.getDocument(DB_ID, COLLECTIONS.USERS, newUser.$id);
      await databases.updateDocument(DB_ID, COLLECTIONS.USERS, newUser.$id, { name });
    } catch {
      await databases.createDocument(DB_ID, COLLECTIONS.USERS, newUser.$id, {
        userId:        newUser.$id,
        name,
        email,
        points:        0,
        totalDeposits: 0,
        isVerified:    false,
        isAdmin:       false,
        createdAt:     new Date().toISOString(),
      });
    }

    // 4. Send magic link — this is their actual login link
    await account.createMagicURLToken(
      newUser.$id,
      email,
      `${window.location.origin}/verify`
    );

    // 5. Destroy the temporary session — user logs in via magic link only
    try { await account.deleteSession('current'); } catch {}
    localStorage.setItem('echo_pending_email', email);
  }

  // ── LOGIN ────────────────────────────────────────────────
  // Just sends a magic link — no password involved at all.
  async function login(email) {
    // Check if an account exists for this email first
    const result = await databases.listDocuments(DB_ID, COLLECTIONS.USERS, [
      Query.equal('email', email),
      Query.limit(1),
    ]);
    if (result.documents.length === 0) {
      throw new Error('No account found with this email. Please register first.');
    }
    const userId = result.documents[0].userId;
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

    // Mark as verified in DB
    try {
      await databases.updateDocument(DB_ID, COLLECTIONS.USERS, sessionUserId, {
        isVerified: true,
      });
    } catch (e) {
      console.error('could not set isVerified:', e.message);
    }

    localStorage.removeItem('echo_pending_email');

    // Fetch real account data from Appwrite
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

    await fetchProfile(sessionUserId);
    setLoading(false);
  }

  async function logout() {
    try { await account.deleteSession('current'); } catch {}
    setUser(null);
    setProfile(null);
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.$id);
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
