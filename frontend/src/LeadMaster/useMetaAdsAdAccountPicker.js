import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useMetaAdsConnection } from './useMetaAds';

const LS_ACT = 'guerova.metaAds.selectedAct';

/**
 * Lista ad accounts do token Meta e permite alternar qual conta ver (sem novo login).
 */
export function useMetaAdsAdAccountPicker() {
  const { apiFetch } = useAuth();
  const { connected, connection, refetch: refetchConnection } = useMetaAdsConnection();
  const [adAccounts, setAdAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [savingDefault, setSavingDefault] = useState(false);
  const [selectedAct, setSelectedActState] = useState(() => localStorage.getItem(LS_ACT) || '');

  const setSelectedAct = useCallback((act) => {
    const v = act ? String(act) : '';
    setSelectedActState(v);
    if (v) localStorage.setItem(LS_ACT, v);
    else localStorage.removeItem(LS_ACT);
  }, []);

  useEffect(() => {
    if (!connected) {
      setAdAccounts([]);
      setSelectedAct('');
      return;
    }
    const defaultAct = connection?.adAccountId || '';
    if (!selectedAct && defaultAct) {
      setSelectedAct(defaultAct);
    }
  }, [connected, connection?.adAccountId, selectedAct, setSelectedAct]);

  const loadAdAccounts = useCallback(async () => {
    if (!connected) return [];
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch('/api/meta-ads/ad-accounts?limit=200');
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || `Erro HTTP ${r.status}`);
      const items = Array.isArray(j.adAccounts) ? j.adAccounts : [];
      setAdAccounts(items);
      return items;
    } catch (e) {
      setError(e?.message || 'Falha ao listar ad accounts');
      setAdAccounts([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [apiFetch, connected]);

  useEffect(() => {
    if (connected) loadAdAccounts();
  }, [connected, loadAdAccounts]);

  const saveAsDefault = useCallback(
    async (act) => {
      const id = act || selectedAct;
      if (!id) return;
      setSavingDefault(true);
      setError(null);
      try {
        const r = await apiFetch('/api/meta-ads/connection/ad-account', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adAccountId: id }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j?.ok) throw new Error(j?.error || `Erro HTTP ${r.status}`);
        setSelectedAct(id);
        await refetchConnection();
      } catch (e) {
        setError(e?.message || 'Falha ao guardar ad account padrão');
        throw e;
      } finally {
        setSavingDefault(false);
      }
    },
    [apiFetch, refetchConnection, selectedAct, setSelectedAct]
  );

  const activeAct = selectedAct || connection?.adAccountId || '';

  return {
    adAccounts,
    loading,
    error,
    selectedAct: activeAct,
    setSelectedAct,
    loadAdAccounts,
    saveAsDefault,
    savingDefault,
    connected,
  };
}
