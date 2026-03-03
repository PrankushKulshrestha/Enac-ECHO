import { createContext, useContext, useEffect, useState } from 'react';
import { account, databases, DB_ID, ID, COLLECTIONS, Query } from './appwrite';

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

  async function register(email, password, name) {
    // 1. Create auth account
    const newUser = await account.create(ID.unique(), email, password, name);

    // 2. Login to get session for DB write
    await account.createEmailPasswordSession(email, password);

    // 3. Check if profile already exists, create only if not
    try {
      await databases.getDocument(DB_ID, COLLECTIONS.USERS, newUser.$id);
      // Document exists — just update name
      await databases.updateDocument(DB_ID, COLLECTIONS.USERS, newUser.$id, { name });
    } catch {
      // Document doesn't exist — create it
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

    // 4. Send magic link for verification
    await account.createMagicURLToken(
      newUser.$id,
      email,
      `${window.location.origin}/verify`
    );

    // 5. Logout — must verify before dashboard access
    try { await account.deleteSession('current'); } catch {}
    localStorage.setItem('echo_pending_email', email);
  }

  async function login(email, password) {
    const session = await account.createEmailPasswordSession(email, password);

    localStorage.setItem('cookieFallback', JSON.stringify({
      [`a_session_${import.meta.env.VITE_APPWRITE_PROJECT_ID}`]: session.$id,
      [`a_session_${import.meta.env.VITE_APPWRITE_PROJECT_ID}_legacy`]: session.$id,
    }));

    try {
      const currentUser = await account.get();
      setUser(currentUser);
      await fetchProfile(currentUser.$id);
    } catch {
      // Localhost fallback — get most recently updated doc for this email
      const result = await databases.listDocuments(DB_ID, COLLECTIONS.USERS, [
        Query.equal('email', email),
        Query.orderDesc('$updatedAt'),
        Query.limit(1),
      ]);
      if (result.documents.length > 0) {
        const dbUser = result.documents[0];
        setUser({
          $id:               dbUser.userId,
          email:             dbUser.email,
          name:              dbUser.name,
          emailVerification: dbUser.isVerified,
        });
        setProfile(dbUser);
      }
    } finally {
      setLoading(false);
    }
  }

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
    setUser({
      $id:               sessionUserId,
      email:             sessionEmail,
      name:              sessionEmail,
      emailVerification: true,
    });
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