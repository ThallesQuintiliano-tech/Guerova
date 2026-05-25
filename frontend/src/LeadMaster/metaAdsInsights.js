/** Extrai valor numérico de actions / cost_per_action_type da Meta Insights API. */
export function metaActionValue(rows, actionType) {
  if (!Array.isArray(rows)) return null;
  const row = rows.find((a) => a?.action_type === actionType);
  if (!row?.value) return null;
  const n = Number(row.value);
  return Number.isFinite(n) ? n : null;
}

export function formatMetaMoney(value, currency = 'BRL') {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(n);
}

export function formatMetaInteger(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat('pt-BR').format(n);
}

export function formatMetaPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(2)}%`;
}

/** Métricas principais de uma linha de insights (agregado). */
export function parseMetaCampaignInsights(row) {
  if (!row || typeof row !== 'object') return null;

  const conversations =
    metaActionValue(row.actions, 'onsite_conversion.messaging_conversation_started_7d') ??
    metaActionValue(row.actions, 'onsite_conversion.total_messaging_connection');

  const costPerConversation =
    metaActionValue(row.cost_per_action_type, 'onsite_conversion.messaging_conversation_started_7d') ??
    metaActionValue(row.cost_per_action_type, 'onsite_conversion.total_messaging_connection');

  return {
    dateStart: row.date_start,
    dateStop: row.date_stop,
    impressions: row.impressions,
    clicks: row.clicks,
    spend: row.spend,
    reach: row.reach,
    ctr: row.ctr,
    cpc: row.cpc,
    cpm: row.cpm,
    conversations,
    costPerConversation,
    linkClicks: metaActionValue(row.actions, 'link_click'),
  };
}
