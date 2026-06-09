import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

/**
 * Carrega campanhas da conta Meta Ads configurada (token + ad account na conexão por conta).
 */
/**
 * @param {string} [selectedAdAccountId] — act_… a consultar; se vazio, usa a da conexão guardada.
 */
export function useMetaAdsCampaigns(selectedAdAccountId = '') {
  const { apiFetch, token, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [adAccountId, setAdAccountId] = useState(null);
  const [pageId, setPageId] = useState(null);
  const [metaCampaigns, setMetaCampaigns] = useState([]);
  const [metaAccountName, setMetaAccountName] = useState(null);
  const [metaCampaignsTotal, setMetaCampaignsTotal] = useState(null);
  const [metaTokenUser, setMetaTokenUser] = useState(null);
  const [metaInsightsByCampaignId, setMetaInsightsByCampaignId] = useState({});
  const [insightsLoading, setInsightsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      setConnected(false);
      setAdAccountId(null);
      setPageId(null);
      setMetaCampaigns([]);
      setMetaAccountName(null);
      setMetaCampaignsTotal(null);
      setMetaTokenUser(null);
      setMetaInsightsByCampaignId({});
      setInsightsLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setInsightsLoading(false);
    setMetaInsightsByCampaignId({});
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
        setMetaAccountName(null);
        setMetaCampaignsTotal(null);
        setMetaTokenUser(null);
        setMetaInsightsByCampaignId({});
        return;
      }
      const actQuery =
        (selectedAdAccountId && String(selectedAdAccountId).trim()) ||
        j0.adAccountId ||
        '';
      const campaignsQs = new URLSearchParams({ limit: '100' });
      if (actQuery) campaignsQs.set('adAccountId', actQuery);
      const r1 = await apiFetch(`/api/meta-ads/campaigns?${campaignsQs}`);
      const j1 = await r1.json().catch(() => ({}));
      if (!r1.ok) {
        setError(j1?.error || `Erro HTTP ${r1.status}`);
        setMetaCampaigns([]);
        setMetaInsightsByCampaignId({});
        return;
      }
      const campaigns = Array.isArray(j1.campaigns) ? j1.campaigns : [];
      setMetaCampaigns(campaigns);
      // Mostra sempre a conta efetivamente consultada (pode diferir do default da conexão).
      if (j1.adAccountId) setAdAccountId(j1.adAccountId);
      setMetaAccountName(j1.adAccountName || null);
      setMetaCampaignsTotal(typeof j1.campaignsTotal === 'number' ? j1.campaignsTotal : null);
      setMetaTokenUser(j1.tokenUser || null);

      if (campaigns.length > 0) {
        setInsightsLoading(true);
        const actId = actQuery || j1.adAccountId || j0.adAccountId;
        const byId = {};
        await Promise.all(
          campaigns.map(async (c) => {
            if (!c?.id) return;
            const q = new URLSearchParams({ datePreset: 'last_30d' });
            if (actId) q.set('adAccountId', String(actId));
            const r = await apiFetch(`/api/meta-ads/campaigns/${encodeURIComponent(c.id)}/insights?${q}`);
            const j = await r.json().catch(() => ({}));
            if (r.ok && j?.ok && Array.isArray(j.insights) && j.insights[0]) {
              byId[c.id] = j.insights[0];
            }
          })
        );
        setMetaInsightsByCampaignId(byId);
        setInsightsLoading(false);
      }
    } catch (e) {
      setError(e?.message || 'Falha ao carregar campanhas Meta Ads');
      setMetaCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, isAuthenticated, selectedAdAccountId]);

  useEffect(() => {
    load();
  }, [load, token]);

  /**
   * Métricas da campanha na Meta (impressões, cliques, spend, etc.).
   * GET /api/meta-ads/campaigns/{id}/insights?adAccountId=…&datePreset=last_30d
   *
   * @param {string} campaignId - id numérico retornado pela Meta (campo id da campanha)
   * @param {{ datePreset?: string, timeIncrement?: number, fields?: string }} [opts]
   */
  const loadCampaignInsights = useCallback(
    async (campaignId, opts = {}) => {
      if (!campaignId || !isAuthenticated) {
        return { ok: false, error: 'Sem campanha ou sessão.' };
      }
      const q = new URLSearchParams();
      const act = (selectedAdAccountId && String(selectedAdAccountId).trim()) || adAccountId;
      if (act) q.set('adAccountId', act);
      if (opts.datePreset) q.set('datePreset', opts.datePreset);
      if (opts.timeIncrement != null) q.set('timeIncrement', String(opts.timeIncrement));
      if (opts.fields) q.set('fields', opts.fields);
      const qs = q.toString();
      const path = `/api/meta-ads/campaigns/${encodeURIComponent(campaignId)}/insights${qs ? `?${qs}` : ''}`;
      const r = await apiFetch(path);
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        return { ok: false, error: j?.error || j?.message || `HTTP ${r.status}`, raw: j };
      }
      return { ok: true, insights: j.insights || [], datePreset: j.datePreset, paging: j.paging };
    },
    [apiFetch, isAuthenticated, adAccountId, selectedAdAccountId]
  );

  return {
    loading,
    error,
    connected,
    adAccountId,
    pageId,
    metaCampaigns,
    metaAccountName,
    metaCampaignsTotal,
    metaTokenUser,
    metaInsightsByCampaignId,
    insightsLoading,
    refetch: load,
    loadCampaignInsights,
  };
}
