import { createContext, useContext } from 'react';

// Single source of truth for AuthContext.
// AuthContext.jsx imports THIS and calls createContext value here.
// All components import useAuth() from here.
export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}
