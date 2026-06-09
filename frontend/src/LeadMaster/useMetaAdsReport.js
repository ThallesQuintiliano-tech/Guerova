import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

/**
 * Relatório consolidado (visão administrador): campanhas + métricas de TODAS as contas
 * de anúncio acessíveis pelo token Meta, numa única chamada ao backend.
 *
 * @param {string} [datePreset] preset de período da Meta (ex.: last_7d, last_30d, maximum)
 */
export function useMetaAdsReport(datePreset = 'last_30d') {
  const { apiFetch, token, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [tokenUser, setTokenUser] = useState(null);
  const [usedDatePreset, setUsedDatePreset] = useState(datePreset);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setAccounts([]);
      setTokenUser(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ datePreset });
      const r = await apiFetch(`/api/meta-ads/report?${qs}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.paused || !j?.ok) {
        setError(j?.error || `Erro HTTP ${r.status}`);
        setAccounts([]);
        return;
      }
      setAccounts(Array.isArray(j.accounts) ? j.accounts : []);
      setTokenUser(j.tokenUser || null);
      setUsedDatePreset(j.datePreset || datePreset);
    } catch (e) {
      setError(e?.message || 'Falha ao carregar relatório Meta Ads');
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, isAuthenticated, datePreset]);

  useEffect(() => {
    load();
  }, [load, token]);

  return { loading, error, accounts, tokenUser, datePreset: usedDatePreset, refetch: load };
}
