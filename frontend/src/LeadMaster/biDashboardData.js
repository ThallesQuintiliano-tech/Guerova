/** Dados do artifact Four Assessoria — Real Estate BI Dashboard */

export const biSalesGoal = {
  year: 2025,
  achieved: 4_300_000,
  target: 10_000_000,
  pct: 43,
  deltaPct: 8.3,
};

export const biKpis = [
  { id: 'mentorados', label: 'Mentorados Ativos', value: '250', delta: '↑ 18 este mês', positive: true },
  { id: 'vendas', label: 'Imóveis Vendidos', value: '87', delta: '↑ 12% MoM', positive: true },
  { id: 'ticket', label: 'Ticket Médio', value: 'R$49.4k', delta: 'Estável', positive: null },
  { id: 'trafego', label: 'Gasto Total Tráfego', value: 'R$84.2k', delta: '↑ 5.1% MoM', positive: true },
  { id: 'roi', label: 'ROI Tráfego', value: '51x', delta: '↑ Excelente', positive: true },
];

export const biFunnel = [
  { stage: 'Impressões (Alcance)', count: 185_000, stepConv: 100, totalConv: 100.0 },
  { stage: 'Cliques no Anúncio', count: 12_400, stepConv: 7, totalConv: 6.7 },
  { stage: 'Acessos ao WhatsApp', count: 4_820, stepConv: 39, totalConv: 2.6 },
  { stage: 'Conversas Iniciadas', count: 2_100, stepConv: 44, totalConv: 1.1 },
  { stage: 'Leads Qualificados', count: 620, stepConv: 30, totalConv: 0.3 },
  { stage: 'Propostas Enviadas', count: 142, stepConv: 23, totalConv: 0.1 },
  { stage: 'Vendas Realizadas', count: 87, stepConv: 61, totalConv: 0.0 },
];

export const biFunnelTotalConversion = 1.74;

export const biStateSalesRevenue = [
  { uf: 'RJ', sales: 812_000 },
  { uf: 'SP', sales: 762_000 },
  { uf: 'SC', sales: 356_000 },
  { uf: 'MG', sales: 323_000 },
  { uf: 'PR', sales: 297_000 },
  { uf: 'RS', sales: 210_000 },
  { uf: 'PE', sales: 114_000 },
  { uf: 'GO', sales: 85_000 },
  { uf: 'BA', sales: 79_000 },
];

/** Contagem de vendas por UF (para cores do mapa) */
export const biStateSalesCount = {
  SP: 24,
  RJ: 20,
  MG: 11,
  PR: 8,
  SC: 8,
  RS: 6,
  PE: 4,
  BA: 3,
  GO: 2,
};

export function stateVolumeTier(count) {
  if (count > 15) return 'high';
  if (count >= 8) return 'medium';
  if (count > 0) return 'low';
  return 'none';
}

export const biMonthlySalesTraffic = [
  { month: 'Jan', vendas: 520_000, trafego: 11_200 },
  { month: 'Fev', vendas: 610_000, trafego: 12_800 },
  { month: 'Mar', vendas: 780_000, trafego: 14_100 },
  { month: 'Abr', vendas: 690_000, trafego: 13_500 },
  { month: 'Mai', vendas: 850_000, trafego: 15_800 },
  { month: 'Jun', vendas: 850_000, trafego: 16_800 },
];

export const biPropertyTypes = [
  { name: 'Apartamento', value: 38, color: '#4f46e5' },
  { name: 'Casa', value: 27, color: '#2563eb' },
  { name: 'Terreno', value: 15, color: '#0ea5e9' },
  { name: 'Comercial', value: 12, color: '#14b8a6' },
  { name: 'Lote', value: 8, color: '#8b5cf6' },
];

export const biLeadSources = [
  { name: 'Meta Ads', value: 68, color: '#1877f2' },
  { name: 'Google Ads', value: 18, color: '#ea4335' },
  { name: 'Orgânico', value: 9, color: '#22c55e' },
  { name: 'Indicação', value: 5, color: '#f59e0b' },
];

export const biTrafficSummary = {
  totalSpend: 84_200,
  totalRevenue: 4_300_000,
};

export const biTrafficTop15 = [
  { name: 'Mariana Costa', spend: 1_000, revenue: null, roi: null },
  { name: 'Felipe Ribeiro', spend: 1_000, revenue: null, roi: null },
  { name: 'Rafael Pereira', spend: 1_000, revenue: null, roi: null },
  { name: 'Gustavo Moraes', spend: 990, revenue: 61_000, roi: 61.6 },
  { name: 'Camila Araújo', spend: 990, revenue: 10_000, roi: 10.1 },
  { name: 'Beatriz Almeida', spend: 990, revenue: null, roi: null },
  { name: 'Isabela Alves', spend: 980, revenue: null, roi: null },
  { name: 'Vinícius Almeida', spend: 980, revenue: null, roi: null },
  { name: 'Priscila Moraes', spend: 970, revenue: null, roi: null },
  { name: 'Mariana Almeida', spend: 960, revenue: 53_000, roi: 55.2 },
  { name: 'Carlos Ribeiro', spend: 960, revenue: 35_000, roi: 36.5 },
  { name: 'Priscila Lima', spend: 960, revenue: 27_000, roi: 28.1 },
  { name: 'Diego Araújo', spend: 960, revenue: null, roi: null },
  { name: 'Vanessa Costa', spend: 960, revenue: null, roi: null },
  { name: 'Mariana Moraes', spend: 960, revenue: null, roi: null },
];

export const MAP_COLORS = {
  high: '#1d4ed8',
  medium: '#6366f1',
  low: '#93c5fd',
  none: '#e2e8f0',
};

export function formatBRL(value, compact = false) {
  if (value == null) return '—';
  if (compact && value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1).replace('.', ',')}M`;
  }
  if (compact && value >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(1).replace('.', ',')}k`;
  }
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

export function formatBRLDot(value) {
  if (value == null) return '—';
  return `R$${value.toLocaleString('pt-BR')}`;
}
