import { createContext, useCallback, useMemo, useState } from 'react';
import { TOKEN_STORAGE_KEY } from '../lib/constants';
import { authenticate, prewarmBackend } from './authApi';

const SLOW_LOGIN_MS = 4500;

export const AuthContext = createContext(null);

/**
 * Holds the admin session. The token lives in sessionStorage (cleared when the
 * tab closes) and only its presence is checked, as in the legacy app.
 */
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_STORAGE_KEY));

  /**
   * Resolves to `{ success: true }` or `{ success: false, message }`.
   * `onSlow` is called when the server takes longer than 4.5s to answer,
   * so the UI can show the "waiting for the server" text.
   */
  const login = useCallback(async (email, password, { onSlow } = {}) => {
    const slowTimer = onSlow ? setTimeout(onSlow, SLOW_LOGIN_MS) : null;
    try {
      const result = await authenticate({ email, password });
      if (!result.success) return result;

      sessionStorage.setItem(TOKEN_STORAGE_KEY, result.token);
      setToken(result.token);
      return { success: true };
    } finally {
      if (slowTimer) clearTimeout(slowTimer);
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      isAuthenticated: Boolean(token),
      login,
      logout,
      prewarm: prewarmBackend,
    }),
    [token, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
