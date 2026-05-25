import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

const LS_TOKEN = 'guerova.token';
const LS_ACCOUNT_ID = 'guerova.accountId';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(LS_TOKEN) || '');
  const [user, setUser] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [accountId, setAccountId] = useState(() => localStorage.getItem(LS_ACCOUNT_ID) || '');
  const [booting, setBooting] = useState(true);

  const setActiveAccountId = useCallback((id) => {
    const v = String(id || '');
    setAccountId(v);
    if (v) localStorage.setItem(LS_ACCOUNT_ID, v);
    else localStorage.removeItem(LS_ACCOUNT_ID);
  }, []);

  const setSession = useCallback((nextToken, nextUser, nextAccounts) => {
    const t = String(nextToken || '');
    setToken(t);
    if (t) localStorage.setItem(LS_TOKEN, t);
    else localStorage.removeItem(LS_TOKEN);

    setUser(nextUser || null);
    setAccounts(Array.isArray(nextAccounts) ? nextAccounts : []);

    const firstAccountId = Array.isArray(nextAccounts) && nextAccounts[0]?.id ? String(nextAccounts[0].id) : '';
    const desired = accountId || firstAccountId;
    if (desired) setActiveAccountId(desired);
  }, [accountId, setActiveAccountId]);

  const apiFetch = useCallback(
    async (path, init = {}) => {
      const headers = { ...(init.headers || {}) };
      headers.Accept = headers.Accept || 'application/json';
      if (token) headers.Authorization = `Bearer ${token}`;
      if (accountId) headers['X-Account-Id'] = String(accountId);
      const r = await fetch(path, { ...init, headers });
      return r;
    },
    [token, accountId]
  );

  const login = useCallback(
    async ({ email, password }) => {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, password, deviceName: 'web' }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        throw new Error(j?.message || j?.error || 'Falha no login.');
      }
      setSession(j.token, j.user, j.accounts);
      return j;
    },
    [setSession]
  );

  /** Modelo A: redirect para Facebook (perfil + anúncios). */
  const loginWithFacebook = useCallback(async (redirectPath = '/leadmaster/inicio') => {
    const q = new URLSearchParams({ redirect: redirectPath });
    const r = await fetch(`/api/auth/facebook/authorize-url?${q}`, {
      headers: { Accept: 'application/json' },
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok || !j?.url) {
      throw new Error(j?.error || 'Não foi possível iniciar login com Facebook.');
    }
    window.location.href = j.url;
  }, []);

  const completeFacebookHandoff = useCallback(
    async (handoff) => {
      const r = await fetch('/api/auth/facebook/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ handoff }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        throw new Error(j?.error || 'Falha ao concluir login Facebook.');
      }
      setSession(j.token, j.user, j.accounts);
      if (j.defaultAccountId) {
        setActiveAccountId(String(j.defaultAccountId));
      }
      return j;
    },
    [setSession, setActiveAccountId]
  );

  const logout = useCallback(async () => {
    try {
      if (token) await apiFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setSession('', null, []);
      setActiveAccountId('');
    }
  }, [apiFetch, token, setSession, setActiveAccountId]);

  const refreshMe = useCallback(async () => {
    if (!token) return;
    const r = await apiFetch('/api/auth/me');
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.ok) throw new Error(j?.error || 'Falha ao carregar sessão.');
    setUser(j.user || null);
    const list = Array.isArray(j.accounts) ? j.accounts : [];
    setAccounts(list);
    if (list.length === 1 && list[0]?.id) {
      setActiveAccountId(String(list[0].id));
    } else if (!accountId && list[0]?.id) {
      setActiveAccountId(String(list[0].id));
    }
  }, [apiFetch, token, accountId, setActiveAccountId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (token) await refreshMe();
      } catch {
        if (alive) {
          setSession('', null, []);
          setActiveAccountId('');
        }
      } finally {
        if (alive) setBooting(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []); // only once

  const value = useMemo(
    () => ({
      booting,
      token,
      user,
      accounts,
      accountId,
      setActiveAccountId,
      apiFetch,
      login,
      loginWithFacebook,
      completeFacebookHandoff,
      logout,
      refreshMe,
      isAuthenticated: Boolean(token),
    }),
    [
      booting,
      token,
      user,
      accounts,
      accountId,
      setActiveAccountId,
      apiFetch,
      login,
      loginWithFacebook,
      completeFacebookHandoff,
      logout,
      refreshMe,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

