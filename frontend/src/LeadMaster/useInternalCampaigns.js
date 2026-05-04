import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

export function useInternalCampaigns() {
  const { apiFetch, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [campaigns, setCampaigns] = useState([]);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setError(null);
      setCampaigns([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await apiFetch('/api/campaigns');
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        throw new Error(j?.error || `Erro HTTP ${r.status}`);
      }
      setCampaigns(Array.isArray(j.campaigns) ? j.campaigns : []);
    } catch (e) {
      setError(e?.message || 'Falha ao carregar campanhas');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, isAuthenticated]);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(
    async ({ name, briefing, pack, status }) => {
      const r = await apiFetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, briefing, pack, status }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        throw new Error(j?.error || `Erro HTTP ${r.status}`);
      }
      await load();
      return j.campaign;
    },
    [apiFetch, load]
  );

  const update = useCallback(
    async (id, payload) => {
      const r = await apiFetch(`/api/campaigns/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        throw new Error(j?.error || `Erro HTTP ${r.status}`);
      }
      await load();
      return j.campaign;
    },
    [apiFetch, load]
  );

  return { loading, error, campaigns, refetch: load, create, update };
}

