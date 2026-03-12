import { useContext } from 'react';
import { AuthContext } from './AuthContext';

// Single hook used by all components to access auth state and actions.
// AuthContext itself is created and provided by AuthContext.jsx (AuthProvider).
export function useAuth() {
  return useContext(AuthContext);
}
