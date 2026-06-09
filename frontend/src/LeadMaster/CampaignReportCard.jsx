import { useCallback, useEffect, useState } from 'react';
import { Card, CardBody, CardTitle, Spinner, Alert, Button, Table, Badge } from 'reactstrap';
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
} from 'recharts';
import { useAuth } from '../auth/AuthContext';
import {
  formatMetaInteger,
  formatMetaMoney,
  formatMetaPercent,
  parseMetaCampaignInsights,
} from './metaAdsInsights';

function Tile({ label, value }) {
  return (
    <div className="col-6 col-md-3">
      <div className="text-muted">{label}</div>
      <div className="fw-semibold">{value}</div>
    </div>
  );
}

function adStatusColor(status) {
  if (status === 'ACTIVE') return 'success';
  if (status === 'PAUSED') return 'warning';
  return 'secondary';
}

function formatBudget(budget, cur) {
  if (!budget || budget.amount == null) return '—';
  const value = formatMetaMoney(budget.amount, cur);
  const suffix = budget.type === 'daily' ? '/dia' : budget.type === 'lifetime' ? ' total' : '';
  return `${value}${suffix}`;
}

/**
 * Relatório detalhado de uma campanha: KPIs do período (agregado) + evolução diária.
 *
 * @param {{ id:string, adAccountId:string, name?:string, accountName?:string, currency?:string, metrics?:object }} campaign
 * @param {string} datePreset preset de período da Meta
 * @param {() => void} [onRemove] callback para remover do relatório
 */
export default function CampaignReportCard({ campaign, datePreset, onRemove }) {
  const { apiFetch } = useAuth();
  const { id, adAccountId, name, accountName, currency, metrics } = campaign;
  const cur = currency || 'BRL';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [series, setSeries] = useState([]);
  const [showAds, setShowAds] = useState(false);
  const [ads, setAds] = useState(null);
  const [adsLoading, setAdsLoading] = useState(false);
  const [adsError, setAdsError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const q = new URLSearchParams({ datePreset, timeIncrement: '1' });
        if (adAccountId) q.set('adAccountId', adAccountId);
        const r = await apiFetch(`/api/meta-ads/campaigns/${encodeURIComponent(id)}/insights?${q}`);
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j?.ok) throw new Error(j?.error || `Erro HTTP ${r.status}`);
        const rows = Array.isArray(j.insights) ? j.insights : [];
        const data = rows.map((row) => {
          const m = parseMetaCampaignInsights(row);
          return {
            date: String(row.date_start || '').slice(5),
            spend: Number(m?.spend) || 0,
            clicks: Number(m?.clicks) || 0,
            conversations: m?.conversations != null ? Number(m.conversations) : 0,
            impressions: Number(m?.impressions) || 0,
          };
        });
        if (!cancelled) setSeries(data);
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Falha ao carregar métricas diárias');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [apiFetch, id, adAccountId, datePreset]);

  const loadAds = useCallback(async () => {
    setAdsLoading(true);
    setAdsError(null);
    try {
      const q = new URLSearchParams({ datePreset });
      if (adAccountId) q.set('adAccountId', adAccountId);
      const r = await apiFetch(`/api/meta-ads/campaigns/${encodeURIComponent(id)}/ads?${q}`);
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || `Erro HTTP ${r.status}`);
      setAds(Array.isArray(j.ads) ? j.ads : []);
    } catch (e) {
      setAdsError(e?.message || 'Falha ao carregar anúncios');
      setAds([]);
    } finally {
      setAdsLoading(false);
    }
  }, [apiFetch, id, adAccountId, datePreset]);

  // Reinicia (e recarrega se aberto) quando muda o período.
  useEffect(() => {
    setAds(null);
    if (showAds) loadAds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datePreset]);

  const onToggleAds = () => {
    const next = !showAds;
    setShowAds(next);
    if (next && ads === null && !adsLoading) loadAds();
  };

  return (
    <Card className="lm-card-soft mb-3">
      <CardBody>
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
          <CardTitle tag="h6" className="mb-0">
            {name || id}
          </CardTitle>
          {onRemove ? (
            <Button color="outline-secondary" size="sm" type="button" onClick={onRemove}>
              Remover
            </Button>
          ) : null}
        </div>
        <div className="small text-muted mb-3">
          {accountName ? <strong>{accountName}</strong> : null}
          {accountName ? ' · ' : null}
          <code className="small">{adAccountId}</code> · campanha <code className="small">{id}</code>
        </div>

        <div className="row g-2 small mb-3">
          <Tile label="Investimento" value={metrics ? formatMetaMoney(metrics.spend, cur) : '—'} />
          <Tile label="Impressões" value={metrics ? formatMetaInteger(metrics.impressions) : '—'} />
          <Tile label="Cliques" value={metrics ? formatMetaInteger(metrics.clicks) : '—'} />
          <Tile label="Alcance" value={metrics ? formatMetaInteger(metrics.reach) : '—'} />
          <Tile label="CTR" value={metrics ? formatMetaPercent(metrics.ctr) : '—'} />
          <Tile label="CPC" value={metrics ? formatMetaMoney(metrics.cpc, cur) : '—'} />
          <Tile label="CPM" value={metrics ? formatMetaMoney(metrics.cpm, cur) : '—'} />
          <Tile label="Cliques no link" value={metrics ? formatMetaInteger(metrics.linkClicks) : '—'} />
          <Tile
            label="Conversas"
            value={metrics && metrics.conversations != null ? formatMetaInteger(metrics.conversations) : '—'}
          />
          <Tile
            label="Custo / conversa"
            value={metrics && metrics.costPerConversation != null ? formatMetaMoney(metrics.costPerConversation, cur) : '—'}
          />
        </div>

        {loading && (
          <div className="small text-muted">
            <Spinner size="sm" className="me-1" /> A carregar evolução diária…
          </div>
        )}
        {error && (
          <Alert color="warning" className="py-2 small mb-0">
            {error}
          </Alert>
        )}
        {!loading && !error && series.length === 0 && (
          <div className="small text-muted">Sem dados diários no período selecionado.</div>
        )}
        {!loading && !error && series.length > 0 && (
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <ComposedChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value, key) => {
                    if (key === 'spend') return [formatMetaMoney(value, cur), 'Investido'];
                    if (key === 'clicks') return [formatMetaInteger(value), 'Cliques'];
                    if (key === 'conversations') return [formatMetaInteger(value), 'Conversas'];
                    return [value, key];
                  }}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="spend" name="Investido (R$)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="clicks" name="Cliques" stroke="#2563eb" strokeWidth={2} dot />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="conversations"
                  name="Conversas"
                  stroke="#25d366"
                  strokeWidth={2}
                  dot
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-3 pt-3 border-top">
          <Button color="outline-primary" size="sm" type="button" onClick={onToggleAds}>
            {showAds ? 'Ocultar anúncios' : 'Ver anúncios da campanha'}
            {ads != null ? ` (${ads.length})` : ''}
          </Button>

          {showAds && (
            <div className="mt-2">
              {adsLoading && (
                <div className="small text-muted">
                  <Spinner size="sm" className="me-1" /> A carregar anúncios…
                </div>
              )}
              {adsError && (
                <Alert color="warning" className="py-2 small mb-0">
                  {adsError}
                </Alert>
              )}
              {!adsLoading && !adsError && ads != null && ads.length === 0 && (
                <div className="small text-muted">Nenhum anúncio nesta campanha.</div>
              )}
              {!adsLoading && !adsError && ads != null && ads.length > 0 && (
                <Table responsive hover className="small align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Anúncio</th>
                      <th>Status</th>
                      <th className="text-end">Orçamento</th>
                      <th className="text-end">Valor usado</th>
                      <th className="text-end">Impressões</th>
                      <th className="text-end">Cliques</th>
                      <th className="text-end">CTR</th>
                      <th className="text-end">Conversas</th>
                      <th className="text-end">Custo / conversa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ads.map((a) => {
                      const m = parseMetaCampaignInsights(a.insights);
                      return (
                        <tr key={a.id}>
                          <td className="fw-semibold">{a.name || a.id}</td>
                          <td>
                            <Badge color={adStatusColor(a.effective_status || a.status)} pill>
                              {a.effective_status || a.status || '—'}
                            </Badge>
                          </td>
                          <td className="text-end">{formatBudget(a.budget, cur)}</td>
                          <td className="text-end">{m ? formatMetaMoney(m.spend, cur) : formatMetaMoney(0, cur)}</td>
                          <td className="text-end">{m ? formatMetaInteger(m.impressions) : '—'}</td>
                          <td className="text-end">{m ? formatMetaInteger(m.clicks) : '—'}</td>
                          <td className="text-end">{m ? formatMetaPercent(m.ctr) : '—'}</td>
                          <td className="text-end">
                            {m && m.conversations != null ? formatMetaInteger(m.conversations) : '—'}
                          </td>
                          <td className="text-end">
                            {m && m.costPerConversation != null ? formatMetaMoney(m.costPerConversation, cur) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
