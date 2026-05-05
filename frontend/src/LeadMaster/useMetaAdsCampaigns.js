import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

/**
 * Carrega campanhas da conta Meta Ads configurada (token + ad account na conexão por conta).
 */
export function useMetaAdsCampaigns() {
  const { apiFetch, token, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [adAccountId, setAdAccountId] = useState(null);
  const [pageId, setPageId] = useState(null);
  const [metaCampaigns, setMetaCampaigns] = useState([]);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setConnected(false);
      setAdAccountId(null);
      setPageId(null);
      setMetaCampaigns([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r0 = await apiFetch('/api/meta-ads/connection');
      const j0 = await r0.json().catch(() => ({}));
      if (!r0.ok || j0?.paused) {
        setError(j0?.error || `Erro HTTP ${r0.status}`);
        setConnected(false);
        setMetaCampaigns([]);
        setAdAccountId(null);
        setPageId(null);
        return;
      }
      if (!j0?.ok) {
        setError(j0?.error || `Erro HTTP ${r0.status}`);
        setConnected(false);
        setMetaCampaigns([]);
        return;
      }
      const isConn = Boolean(j0.connected);
      setConnected(isConn);
      setAdAccountId(j0.adAccountId || null);
      setPageId(j0.pageId || null);
      if (!isConn || !j0.adAccountId) {
        setMetaCampaigns([]);
        return;
      }
      const r1 = await apiFetch('/api/meta-ads/campaigns?limit=100');
      const j1 = await r1.json().catch(() => ({}));
      if (!r1.ok) {
        setError(j1?.error || `Erro HTTP ${r1.status}`);
        setMetaCampaigns([]);
        return;
      }
      setMetaCampaigns(Array.isArray(j1.campaigns) ? j1.campaigns : []);
    } catch (e) {
      setError(e?.message || 'Falha ao carregar campanhas Meta Ads');
      setMetaCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, isAuthenticated]);

  useEffect(() => {
    load();
  }, [load, token]);

  return { loading, error, connected, adAccountId, pageId, metaCampaigns, refetch: load };
}
