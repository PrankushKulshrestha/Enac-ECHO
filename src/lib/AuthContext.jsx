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
      // Check if we have a user set already from completeMagicURL
      // If so, keep them logged in — don't wipe state
      setUser((prev) => prev ?? null);
      setProfile((prev) => prev ?? null);
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
  const newUser = await account.create(ID.unique(), email, password, name);
  await account.createEmailPasswordSession(email, password);
  await databases.createDocument(DB_ID, COLLECTIONS.USERS, newUser.$id, {
    userId:        newUser.$id,
    name,
    email,
    points:        0,
    totalDeposits: 0,
    createdAt:     new Date().toISOString(),
  });
  await account.createMagicURLToken(
    ID.unique(),
    email,
    `${window.location.origin}/verify`
  );
  try { await account.deleteSession('current'); } catch {}
  localStorage.setItem('echo_pending_email', email);
}

  async function login(email, password) {
    const session = await account.createEmailPasswordSession(email, password);
    // Use session data directly without calling account.get()
    setUser({
      $id: session.userId,
      email,
      name: "",
      emailVerification: true,
    });
    await fetchProfile(session.userId);
    setLoading(false);
  }
  async function completeMagicURL(userId, secret) {
    const session = await account.updateMagicURLSession(userId, secret);
    console.log("session:", JSON.stringify(session));

    const sessionUserId = session.userId;
    const sessionEmail = localStorage.getItem("echo_pending_email") || "";

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
        login,
        register,
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
