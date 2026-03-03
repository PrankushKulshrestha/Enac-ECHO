import { createContext, useContext, useEffect, useState } from "react";
import { account, databases, DB_ID, COLLECTIONS, ID } from "./appwrite";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

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

  async function sendMagicURL(email) {
    await account.createMagicURLToken(
      ID.unique(),
      email,
      `${window.location.origin}/verify`,
    );
    localStorage.setItem("echo_pending_email", email);
  }

  async function completeMagicURL(userId, secret) {
    const session = await account.updateMagicURLSession(userId, secret);

    const sessionUserId = session.userId;
    const sessionEmail = localStorage.getItem("echo_pending_email") || "";

    // Create profile if new user
    try {
      await databases.getDocument(DB_ID, COLLECTIONS.USERS, sessionUserId);
    } catch {
      await databases.createDocument(DB_ID, COLLECTIONS.USERS, sessionUserId, {
        userId: sessionUserId,
        name: sessionEmail,
        email: sessionEmail,
        points: 0,
        totalDeposits: 0,
        createdAt: new Date().toISOString(),
      });
    }

    localStorage.removeItem("echo_pending_email");

    // Set user directly — don't call checkAuth which uses account.get()
    // account.get() fails on localhost due to cookie issues
    setUser({
      $id: sessionUserId,
      email: sessionEmail,
      name: sessionEmail,
      emailVerification: true,
    });

    await fetchProfile(sessionUserId);
    setLoading(false);
  }

  async function logout() {
    try {
      await account.deleteSession("current");
    } catch {}
    setUser(null);
    setProfile(null);
    localStorage.removeItem(`cookieFallback`);
  }

  async function refreshProfile() {
    if (user) await fetchProfile(user.$id);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        sendMagicURL,
        completeMagicURL,
        logout,
        refreshProfile,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
