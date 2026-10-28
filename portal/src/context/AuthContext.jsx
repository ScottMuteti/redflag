import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { startAuthentication } from '@simplewebauthn/browser';
import {
  beginLogin as beginLoginRequest,
  verifyLoginOtp as verifyLoginRequest,
  googleLogin as googleLoginRequest,
  passkeyLoginOptions,
  passkeyLoginVerify,
} from '../api/auth';

const TOKEN_KEY = 'redflag_token';
const USER_KEY = 'redflag_user';

const AuthContext = createContext(null);

// Expiry of a JWT in epoch ms, or 0 when it is missing or unreadable.
function tokenExpiry(token) {
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return exp ? exp * 1000 : 0;
  } catch {
    return 0;
  }
}

const tokenExpired = (token) => tokenExpiry(token) <= Date.now();

function readStoredUser() {
  const raw = localStorage.getItem(USER_KEY);
  const token = localStorage.getItem(TOKEN_KEY);
  if (!raw || !token || tokenExpired(token)) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return null;
  }
  return JSON.parse(raw);
}

// eslint-disable-next-line react/prop-types
export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [sessionExpired, setSessionExpired] = useState(false);

  const persist = useCallback((token, nextUser) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setSessionExpired(false);
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  // Sessions last 20 minutes; sign out the moment the token runs out rather
  // than waiting for the next API call to fail.
  useEffect(() => {
    if (!user) return undefined;
    const msLeft = tokenExpiry(localStorage.getItem(TOKEN_KEY)) - Date.now();
    const timer = setTimeout(() => {
      logout();
      setSessionExpired(true);
    }, Math.max(msLeft, 0));
    return () => clearTimeout(timer);
  }, [user, logout]);

  // Step one: verify the password; a code is emailed. No session yet.
  const beginLogin = useCallback(
    (email, password) => beginLoginRequest(email, password),
    [],
  );

  // Step two: verify the emailed code, then start the session.
  const completeLogin = useCallback(
    async (challengeId, code) => {
      const { token, user: loggedInUser } = await verifyLoginRequest(challengeId, code);
      persist(token, loggedInUser);
      return loggedInUser;
    },
    [persist],
  );

  // Google proves the email; the emailed code still follows (same as beginLogin).
  const beginGoogleLogin = useCallback((credential) => googleLoginRequest(credential), []);

  // Passkey sign-in: browser prompt, then the session starts straight away.
  const loginWithPasskey = useCallback(async () => {
    const { challengeId, options } = await passkeyLoginOptions();
    const response = await startAuthentication({ optionsJSON: options });
    const { token, user: loggedInUser } = await passkeyLoginVerify(challengeId, response);
    persist(token, loggedInUser);
    return loggedInUser;
  }, [persist]);

  // Merges profile edits into the stored user without a new login.
  const updateUser = useCallback((changes) => {
    setUser((prev) => {
      const next = { ...prev, ...changes };
      localStorage.setItem(USER_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      sessionExpired,
      beginLogin,
      beginGoogleLogin,
      completeLogin,
      loginWithPasskey,
      logout,
      updateUser,
    }),
    [
      user,
      sessionExpired,
      beginLogin,
      beginGoogleLogin,
      completeLogin,
      loginWithPasskey,
      logout,
      updateUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
