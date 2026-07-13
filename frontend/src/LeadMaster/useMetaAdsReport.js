import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';

/** Tempo que o relatório fica válido sem novo pedido à API (30 min). */
export const META_REPORT_CACHE_TTL_MS = 30 * 60 * 1000;

/** @type {Map<string, { fetchedAt: number, payload: object }>} */
const reportCache = new Map();

function isCacheValid(fetchedAt) {
  return typeof fetchedAt === 'number' && Date.now() - fetchedAt < META_REPORT_CACHE_TTL_MS;
}

function applyReportPayload(j, setters, fallbackPreset) {
  setters.setAccounts(Array.isArray(j.accounts) ? j.accounts : []);
  setters.setTokenUser(j.tokenUser || null);
  setters.setUsedDatePreset(j.datePreset || fallbackPreset);
}

/** Limpa cache do relatório (ex.: após mudar token ou forçar atualização). */
export function invalidateMetaAdsReportCache(datePreset) {
  if (datePreset) {
    reportCache.delete(datePreset);
    return;
  }
  reportCache.clear();
}

/**
 * Relatório consolidado (visão administrador): campanhas + métricas de TODAS as contas
 * de anúncio acessíveis pelo token Meta, numa única chamada ao backend.
 * Dados ficam em cache ~30 min — voltar à página não refaz o pedido.
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

  const setters = { setAccounts, setTokenUser, setUsedDatePreset };

  const load = useCallback(
    async (force = false) => {
      if (!isAuthenticated) {
        setLoading(false);
        setAccounts([]);
        setTokenUser(null);
        setError(null);
        invalidateMetaAdsReportCache();
        return;
      }

      setError(null);

      const cached = reportCache.get(datePreset);
      if (!force && cached && isCacheValid(cached.fetchedAt)) {
        applyReportPayload(cached.payload, setters, datePreset);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const qs = new URLSearchParams({ datePreset });
        const r = await apiFetch(`/api/meta-ads/report?${qs}`);
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j?.paused || !j?.ok) {
          setError(j?.error || `Erro HTTP ${r.status}`);
          setAccounts([]);
          return;
        }
        reportCache.set(datePreset, { fetchedAt: Date.now(), payload: j });
        applyReportPayload(j, setters, datePreset);
      } catch (e) {
        setError(e?.message || 'Falha ao carregar relatório Meta Ads');
        setAccounts([]);
      } finally {
        setLoading(false);
      }
    },
    [apiFetch, isAuthenticated, datePreset]
  );

  const prevTokenRef = useRef(token);

  useEffect(() => {
    if (prevTokenRef.current !== token) {
      invalidateMetaAdsReportCache();
      prevTokenRef.current = token;
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const refetch = useCallback(() => {
    invalidateMetaAdsReportCache(datePreset);
    return load(true);
  }, [load, datePreset]);

  return { loading, error, accounts, tokenUser, datePreset: usedDatePreset, refetch };
}
