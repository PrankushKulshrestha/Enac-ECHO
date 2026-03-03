import { createContext, useContext, useEffect, useState } from 'react';
import { account } from '../lib/appwrite';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const session = await account.get();
      setUser(session);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    await account.createEmailPasswordSession(email, password);
    await checkAuth();
  }

  async function register(email, password, name) {
    await account.create('unique()', email, password, name);
    await login(email, password);
  }

  async function logout() {
    await account.deleteSession('current');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
