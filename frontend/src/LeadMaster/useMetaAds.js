import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export function useMetaAdsConnection() {
  const { apiFetch, token, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connection, setConnection] = useState(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setError(null);
      setConnected(false);
      setConnection(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch('/api/meta-ads/connection');
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || `Erro HTTP ${r.status}`);
      setConnected(Boolean(j.connected));
      setConnection(j);
    } catch (e) {
      setError(e?.message || 'Falha ao carregar Meta Ads');
      setConnected(false);
      setConnection(null);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, isAuthenticated]);

  useEffect(() => {
    load();
  }, [load, token]);

  const save = useCallback(
    async ({ accessToken, graphVersion, adAccountId, pageId, igUserId, pixelId }) => {
      setSaving(true);
      setError(null);
      try {
        const r = await apiFetch('/api/meta-ads/connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken, graphVersion, adAccountId, pageId, igUserId, pixelId }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j?.ok) throw new Error(j?.error || `Erro HTTP ${r.status}`);
        await load();
        return j;
      } finally {
        setSaving(false);
      }
    },
    [apiFetch, load]
  );

  const listAdAccounts = useCallback(
    async () => {
      const r = await apiFetch('/api/meta-ads/ad-accounts');
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || `Erro HTTP ${r.status}`);
      return Array.isArray(j.adAccounts) ? j.adAccounts : [];
    },
    [apiFetch]
  );

  return { loading, saving, error, connected, connection, refetch: load, save, listAdAccounts };
}

