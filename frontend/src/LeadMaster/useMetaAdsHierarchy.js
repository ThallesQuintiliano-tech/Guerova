import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

const TAB_ENDPOINTS = {
  campaigns: '/api/meta-ads/campaigns',
  adsets: '/api/meta-ads/adsets',
  ads: '/api/meta-ads/ads',
};

/** Tempo que os dados ficam válidos sem novo pedido à API (30 min). */
export const META_HIERARCHY_CACHE_TTL_MS = 30 * 60 * 1000;

/** @type {Map<string, { fetchedAt: number, payload: object }>} */
const tabCache = new Map();

/** @type {{ fetchedAt: number, payload: object } | null} */
let connectionCache = null;

function isCacheValid(fetchedAt) {
  return typeof fetchedAt === 'number' && Date.now() - fetchedAt < META_HIERARCHY_CACHE_TTL_MS;
}

function tabCacheKey(actQuery, tab) {
  return `${actQuery}:${tab}`;
}

function applyTabPayload(tab, j, setters) {
  if (j.adAccountId) setters.setAdAccountId(j.adAccountId);
  if (j.adAccountName) setters.setAdAccountName(j.adAccountName);
  if (j.datePreset) setters.setDatePreset(j.datePreset);

  if (tab === 'campaigns') {
    setters.setCampaigns(Array.isArray(j.campaigns) ? j.campaigns : []);
    setters.setCampaignsTotal(typeof j.campaignsTotal === 'number' ? j.campaignsTotal : null);
    if (j.tokenUser) setters.setTokenUser(j.tokenUser);
  } else if (tab === 'adsets') {
    setters.setAdsets(Array.isArray(j.adsets) ? j.adsets : []);
    setters.setAdsetsTotal(typeof j.adsetsTotal === 'number' ? j.adsetsTotal : null);
  } else if (tab === 'ads') {
    setters.setAds(Array.isArray(j.ads) ? j.ads : []);
    setters.setAdsTotal(typeof j.adsTotal === 'number' ? j.adsTotal : null);
  }
}

function applyConnectionPayload(j, setters) {
  const isConn = Boolean(j.connected);
  setters.setConnected(isConn);
  setters.setAdAccountId(j.adAccountId || null);
  setters.setPageId(j.pageId || null);
  return isConn;
}

/** Limpa cache (ex.: após mudar token ou forçar atualização). */
export function invalidateMetaAdsHierarchyCache(actQuery) {
  if (actQuery) {
    const prefix = `${actQuery}:`;
    for (const key of tabCache.keys()) {
      if (key.startsWith(prefix)) tabCache.delete(key);
    }
    return;
  }
  tabCache.clear();
  connectionCache = null;
}

/**
 * Carrega campanhas, conjuntos ou anúncios da conta Meta Ads (com métricas agregadas).
 * Dados ficam em cache ~30 min — voltar à página ou trocar de aba não refaz o pedido.
 * @param {string} [selectedAdAccountId] — act_… a consultar
 * @param {'campaigns'|'adsets'|'ads'} [activeTab]
 */
export function useMetaAdsHierarchy(selectedAdAccountId = '', activeTab = 'campaigns') {
  const { apiFetch, token, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [adAccountId, setAdAccountId] = useState(null);
  const [adAccountName, setAdAccountName] = useState(null);
  const [pageId, setPageId] = useState(null);
  const [tokenUser, setTokenUser] = useState(null);
  const [datePreset, setDatePreset] = useState('last_30d');

  const [campaigns, setCampaigns] = useState([]);
  const [campaignsTotal, setCampaignsTotal] = useState(null);
  const [adsets, setAdsets] = useState([]);
  const [adsetsTotal, setAdsetsTotal] = useState(null);
  const [ads, setAds] = useState([]);
  const [adsTotal, setAdsTotal] = useState(null);

  const setters = {
    setAdAccountId,
    setAdAccountName,
    setDatePreset,
    setCampaigns,
    setCampaignsTotal,
    setTokenUser,
    setAdsets,
    setAdsetsTotal,
    setAds,
    setAdsTotal,
  };

  const loadTab = useCallback(
    async (tab, actQuery, { force = false } = {}) => {
      const endpoint = TAB_ENDPOINTS[tab];
      if (!endpoint) return;

      const cacheKey = tabCacheKey(actQuery, tab);
      const cached = tabCache.get(cacheKey);
      if (!force && cached && isCacheValid(cached.fetchedAt)) {
        applyTabPayload(tab, cached.payload, setters);
        return;
      }

      const qs = new URLSearchParams({ limit: '200', datePreset: 'last_30d' });
      if (actQuery) qs.set('adAccountId', actQuery);

      const r = await apiFetch(`${endpoint}?${qs}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        throw new Error(j?.error || `Erro HTTP ${r.status}`);
      }

      tabCache.set(cacheKey, { fetchedAt: Date.now(), payload: j });
      applyTabPayload(tab, j, setters);
    },
    [apiFetch]
  );

  const load = useCallback(
    async (force = false) => {
      if (!isAuthenticated) {
        setLoading(false);
        setConnected(false);
        setAdAccountId(null);
        setPageId(null);
        setCampaigns([]);
        setAdsets([]);
        setAds([]);
        setError(null);
        invalidateMetaAdsHierarchyCache();
        return;
      }

      setError(null);

      const connSetters = { setConnected, setAdAccountId, setPageId };

      try {
        let j0 = null;

        if (!force && connectionCache && isCacheValid(connectionCache.fetchedAt)) {
          j0 = connectionCache.payload;
          applyConnectionPayload(j0, connSetters);
        } else {
          setLoading(true);
          const r0 = await apiFetch('/api/meta-ads/connection');
          j0 = await r0.json().catch(() => ({}));
          if (!r0.ok || j0?.paused) {
            setError(j0?.error || `Erro HTTP ${r0.status}`);
            setConnected(false);
            return;
          }
          if (!j0?.ok) {
            setError(j0?.error || `Erro HTTP ${r0.status}`);
            setConnected(false);
            return;
          }
          connectionCache = { fetchedAt: Date.now(), payload: j0 };
          applyConnectionPayload(j0, connSetters);
        }

        if (!j0.connected) {
          setCampaigns([]);
          setAdsets([]);
          setAds([]);
          return;
        }

        const actQuery =
          (selectedAdAccountId && String(selectedAdAccountId).trim()) || j0.adAccountId || '';

        if (!actQuery) {
          setCampaigns([]);
          setAdsets([]);
          setAds([]);
          return;
        }

        const cacheKey = tabCacheKey(actQuery, activeTab);
        const cachedTab = tabCache.get(cacheKey);
        const tabFresh = !force && cachedTab && isCacheValid(cachedTab.fetchedAt);

        if (tabFresh) {
          applyTabPayload(activeTab, cachedTab.payload, setters);
          return;
        }

        setLoading(true);
        await loadTab(activeTab, actQuery, { force });
      } catch (e) {
        setError(e?.message || 'Falha ao carregar dados Meta Ads');
      } finally {
        setLoading(false);
      }
    },
    [apiFetch, isAuthenticated, selectedAdAccountId, activeTab, loadTab]
  );

  const prevTokenRef = useRef(token);

  useEffect(() => {
    if (prevTokenRef.current !== token) {
      invalidateMetaAdsHierarchyCache();
      prevTokenRef.current = token;
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const refetch = useCallback(() => {
    const actQuery =
      (selectedAdAccountId && String(selectedAdAccountId).trim()) || adAccountId || '';
    if (actQuery) invalidateMetaAdsHierarchyCache(actQuery);
    connectionCache = null;
    return load(true);
  }, [load, selectedAdAccountId, adAccountId]);

  return {
    loading,
    error,
    connected,
    adAccountId,
    adAccountName,
    pageId,
    tokenUser,
    datePreset,
    campaigns,
    campaignsTotal,
    adsets,
    adsetsTotal,
    ads,
    adsTotal,
    refetch,
  };
}
