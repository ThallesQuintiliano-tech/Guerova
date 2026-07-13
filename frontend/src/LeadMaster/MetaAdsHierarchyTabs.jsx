import { Badge, Spinner, Table } from 'reactstrap';
import {
  formatMetaInteger,
  formatMetaMoney,
  parseMetaCampaignInsights,
} from './metaAdsInsights';

const TABS = [
  {
    id: 'campaigns',
    label: 'Campanhas',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v9a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 12.5v-9zM3.5 3a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5h-9z" />
        <path d="M8 5.5l3 2.5H5l3-2.5z" />
      </svg>
    ),
  },
  {
    id: 'adsets',
    label: 'Conjuntos de anúncios',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <rect x="2" y="2" width="5" height="5" rx="0.5" />
        <rect x="9" y="2" width="5" height="5" rx="0.5" />
        <rect x="2" y="9" width="5" height="5" rx="0.5" />
        <rect x="9" y="9" width="5" height="5" rx="0.5" />
      </svg>
    ),
  },
  {
    id: 'ads',
    label: 'Anúncios',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <rect x="2" y="3" width="12" height="10" rx="1" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="4.5" cy="5.5" r="0.8" />
      </svg>
    ),
  },
];

function statusBadgeColor(status) {
  if (status === 'ACTIVE' || status === 'ENABLED') return 'success';
  if (status === 'PAUSED') return 'warning';
  return 'secondary';
}

function formatBudget(budget) {
  if (!budget?.amount) return '—';
  const label = budget.type === 'lifetime' ? 'total' : '/dia';
  return `${formatMetaMoney(budget.amount)} ${label}`;
}

function MetricsCells({ insights, loading }) {
  const m = parseMetaCampaignInsights(insights);
  if (!m && loading) {
    return (
      <>
        <td className="text-end">…</td>
        <td className="text-end">…</td>
        <td className="text-end">…</td>
        <td className="text-end">…</td>
        <td className="text-end">…</td>
      </>
    );
  }
  if (!m) {
    return (
      <>
        <td className="text-end">—</td>
        <td className="text-end">—</td>
        <td className="text-end">—</td>
        <td className="text-end">—</td>
        <td className="text-end">—</td>
      </>
    );
  }
  return (
    <>
      <td className="text-end">{formatMetaInteger(m.impressions)}</td>
      <td className="text-end">{formatMetaInteger(m.clicks)}</td>
      <td className="text-end">{formatMetaMoney(m.spend)}</td>
      <td className="text-end">{formatMetaInteger(m.conversations)}</td>
      <td className="text-end">{formatMetaMoney(m.costPerConversation)}</td>
    </>
  );
}

function CampaignsTable({ rows, loading }) {
  if (rows.length === 0) {
    return <div className="small text-muted py-3 px-2">Nenhuma campanha encontrada nesta conta.</div>;
  }
  return (
    <Table responsive hover className="small align-middle mb-0 lm-meta-table">
      <thead>
        <tr>
          <th>Campanha</th>
          <th>Status</th>
          <th>Objetivo</th>
          <th className="text-end">Impressões</th>
          <th className="text-end">Cliques</th>
          <th className="text-end">Gasto</th>
          <th className="text-end">Conversas</th>
          <th className="text-end">Custo / conversa</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((c) => (
          <tr key={c.id}>
            <td className="fw-semibold">{c.name || '—'}</td>
            <td>
              <Badge color={statusBadgeColor(c.effective_status || c.status)} pill>
                {c.effective_status || c.status || '—'}
              </Badge>
            </td>
            <td className="text-muted">{c.objective || '—'}</td>
            <MetricsCells insights={c.insights} loading={loading} />
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function AdsetsTable({ rows, loading }) {
  if (rows.length === 0) {
    return <div className="small text-muted py-3 px-2">Nenhum conjunto de anúncios encontrado.</div>;
  }
  return (
    <Table responsive hover className="small align-middle mb-0 lm-meta-table">
      <thead>
        <tr>
          <th>Conjunto de anúncios</th>
          <th>Status</th>
          <th>Campanha</th>
          <th className="text-end">Orçamento</th>
          <th className="text-end">Impressões</th>
          <th className="text-end">Cliques</th>
          <th className="text-end">Gasto</th>
          <th className="text-end">Conversas</th>
          <th className="text-end">Custo / conversa</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((a) => (
          <tr key={a.id}>
            <td className="fw-semibold">{a.name || '—'}</td>
            <td>
              <Badge color={statusBadgeColor(a.effective_status || a.status)} pill>
                {a.effective_status || a.status || '—'}
              </Badge>
            </td>
            <td className="text-muted text-monospace">{a.campaign_id || '—'}</td>
            <td className="text-end">{formatBudget(a.budget)}</td>
            <MetricsCells insights={a.insights} loading={loading} />
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

function AdsTable({ rows, loading }) {
  if (rows.length === 0) {
    return <div className="small text-muted py-3 px-2">Nenhum anúncio encontrado.</div>;
  }
  return (
    <Table responsive hover className="small align-middle mb-0 lm-meta-table">
      <thead>
        <tr>
          <th>Anúncio</th>
          <th>Status</th>
          <th>Conjunto</th>
          <th className="text-end">Orçamento</th>
          <th className="text-end">Impressões</th>
          <th className="text-end">Cliques</th>
          <th className="text-end">Gasto</th>
          <th className="text-end">Conversas</th>
          <th className="text-end">Custo / conversa</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((a) => (
          <tr key={a.id}>
            <td className="fw-semibold">{a.name || '—'}</td>
            <td>
              <Badge color={statusBadgeColor(a.effective_status || a.status)} pill>
                {a.effective_status || a.status || '—'}
              </Badge>
            </td>
            <td className="text-muted text-monospace">{a.adset_id || '—'}</td>
            <td className="text-end">{formatBudget(a.budget)}</td>
            <MetricsCells insights={a.insights} loading={loading} />
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export default function MetaAdsHierarchyTabs({
  campaigns = [],
  adsets = [],
  ads = [],
  loading = false,
  datePreset = 'last_30d',
  activeTab = 'campaigns',
  onTabChange,
}) {
  const handleTab = (tabId) => {
    onTabChange?.(tabId);
  };

  const presetLabel =
    datePreset === 'last_30d'
      ? 'últimos 30 dias'
      : datePreset === 'last_7d'
        ? 'últimos 7 dias'
        : datePreset;

  return (
    <div className="lm-meta-hierarchy">
      <div className="lm-meta-tabs" role="tablist">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`lm-meta-tab${activeTab === tab.id ? ' lm-meta-tab--active' : ''}`}
            onClick={() => handleTab(tab.id)}
          >
            <span className="lm-meta-tab__icon">{tab.icon}</span>
            <span className="lm-meta-tab__label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="lm-meta-panel">
        <div className="lm-meta-panel__toolbar">
          <span className="small text-muted">Métricas: {presetLabel}</span>
          {loading && (
            <span className="small text-muted">
              <Spinner size="sm" className="me-1" /> A carregar…
            </span>
          )}
        </div>

        {activeTab === 'campaigns' && <CampaignsTable rows={campaigns} loading={loading} />}
        {activeTab === 'adsets' && <AdsetsTable rows={adsets} loading={loading} />}
        {activeTab === 'ads' && <AdsTable rows={ads} loading={loading} />}
      </div>
    </div>
  );
}
