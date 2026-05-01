import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

/**
 * Carrega estado da conexão Google Ads e campanhas agregadas (últimos 7 dias) para a conta ativa (header X-Account-Id).
 */
export function useGoogleAdsCampaigns() {
  const { apiFetch, token, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connectionInfo, setConnectionInfo] = useState(null);
  const [adsCampaigns, setAdsCampaigns] = useState([]);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setConnected(false);
      setAdsCampaigns([]);
      setConnectionInfo(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r0 = await apiFetch('/api/google-ads/connection');
      const j0 = await r0.json().catch(() => ({}));
      if (!r0.ok) {
        setError(j0?.error || `Erro HTTP ${r0.status}`);
        setConnected(false);
        setAdsCampaigns([]);
        setConnectionInfo(j0);
        return;
      }
      setConnectionInfo(j0);
      if (!j0?.connected) {
        setConnected(false);
        setAdsCampaigns([]);
        return;
      }
      setConnected(true);
      const r1 = await apiFetch('/api/google-ads/campaigns');
      const j1 = await r1.json().catch(() => ({}));
      if (!r1.ok) {
        setError(j1?.error || `Erro HTTP ${r1.status}`);
        setAdsCampaigns([]);
        return;
      }
      setAdsCampaigns(Array.isArray(j1.campaigns) ? j1.campaigns : []);
    } catch (e) {
      setError(e?.message || 'Falha ao carregar Google Ads');
      setAdsCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, isAuthenticated]);

  useEffect(() => {
    load();
  }, [load, token]);

  const startOAuth = useCallback(async () => {
    const r = await apiFetch('/api/google-ads/oauth/authorize-url');
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j?.url) {
      throw new Error(j?.error || 'Não foi possível obter a URL de autorização do Google.');
    }
    window.location.assign(j.url);
  }, [apiFetch]);

  return { loading, error, connected, connectionInfo, adsCampaigns, refetch: load, startOAuth };
}
