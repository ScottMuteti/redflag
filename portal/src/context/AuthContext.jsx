import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { login as loginRequest, registerOrganization as registerRequest } from '../api/auth';

const TOKEN_KEY = 'redflag_token';
const USER_KEY = 'redflag_user';

const AuthContext = createContext(null);

function readStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

// eslint-disable-next-line react/prop-types
export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);

  const persist = useCallback((token, nextUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async (email, password) => {
      const { token, user: loggedInUser } = await loginRequest(email, password);
      persist(token, loggedInUser);
      return loggedInUser;
    },
    [persist],
  );

  const registerOrganization = useCallback(
    async (payload) => {
      const { token, user: newUser } = await registerRequest(payload);
      persist(token, newUser);
      return newUser;
    },
    [persist],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, login, registerOrganization, logout }),
    [user, login, registerOrganization, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
