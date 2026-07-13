import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

async function parseApiJson(response) {
  const text = await response.text();
  if (!text.trim()) {
    return {};
  }
  try {
    return JSON.parse(text);
  } catch {
    const snippet = text.replace(/\s+/g, ' ').slice(0, 120);
    throw new Error(
      response.ok
        ? `Resposta inválida do servidor (esperado JSON). ${snippet}`
        : `Erro HTTP ${response.status}. ${snippet}`
    );
  }
}

function apiErrorMessage(response, body, fallback) {
  if (body?.error) return body.error;
  if (body?.message) return body.message;
  if (response.ok && body?.ok !== true) {
    return 'Resposta inválida do servidor (sem confirmação ok).';
  }
  return fallback || `Erro HTTP ${response.status}`;
}

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
      const j = await parseApiJson(r);
      if (!r.ok || !j?.ok) {
        throw new Error(apiErrorMessage(r, j, `Erro HTTP ${r.status}`));
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
      const j = await parseApiJson(r);
      if (!r.ok || !j?.ok) {
        throw new Error(apiErrorMessage(r, j, `Erro HTTP ${r.status}`));
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
      const j = await parseApiJson(r);
      if (!r.ok || !j?.ok) {
        throw new Error(apiErrorMessage(r, j, `Erro HTTP ${r.status}`));
      }
      await load();
      return j.campaign;
    },
    [apiFetch, load]
  );

  const remove = useCallback(
    async (id) => {
      const r = await apiFetch(`/api/campaigns/${id}`, { method: 'DELETE' });
      const j = await parseApiJson(r);
      if (!r.ok || !j?.ok) {
        throw new Error(apiErrorMessage(r, j, `Erro HTTP ${r.status}`));
      }
      await load();
      return true;
    },
    [apiFetch, load]
  );

  return { loading, error, campaigns, refetch: load, create, update, remove };
}

