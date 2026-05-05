/**
 * Faixas alinhadas ao material visual de classificação de score (0–1000).
 * Valores fora do intervalo são truncados para exibição no gauge.
 */

export const SCORE_MAX = 1000;

const TIERS = [
  {
    id: 'muito_baixo',
    label: 'MUITO BAIXO',
    min: 0,
    max: 300,
    rangeLabel: '0 - 300',
    accent: '#dc2626',
    trackMuted: '#fecaca',
    filledSegments: 1,
    description:
      'Essa faixa indica grande probabilidade de inadimplência, portanto a chance de obter crédito é considerada muito baixa.',
    mood: 'sad',
  },
  {
    id: 'baixo',
    label: 'BAIXO',
    min: 301,
    max: 500,
    rangeLabel: '301 - 500',
    accent: '#ea580c',
    trackMuted: '#fed7aa',
    filledSegments: 2,
    description:
      'Essa faixa indica considerável probabilidade de inadimplência e, consequentemente, baixa chance de obter crédito.',
    mood: 'neutral',
  },
  {
    id: 'bom',
    label: 'BOM',
    min: 501,
    max: 700,
    rangeLabel: '501 - 700',
    accent: '#84cc16',
    trackMuted: '#d9f99d',
    filledSegments: 3,
    description:
      'Essa faixa indica baixa probabilidade de inadimplência e, consequentemente, boa chance de conseguir crédito.',
    mood: 'smile',
  },
  {
    id: 'excelente',
    label: 'EXCELENTE',
    min: 701,
    max: 1000,
    rangeLabel: '701 - 1000',
    accent: '#16a34a',
    trackMuted: '#bbf7d0',
    filledSegments: 4,
    description:
      'Essa faixa indica probabilidade muito baixa de inadimplência e, consequentemente, muito alta chance de obter crédito.',
    mood: 'great',
  },
];

/** Cores dos 4 segmentos do arco (esquerda → direita), como no material de referência. */
export const GAUGE_SEGMENT_COLORS = ['#dc2626', '#ea580c', '#84cc16', '#16a34a'];

export function clampScoreDisplay(value) {
  const n = Number(value);
  if (Number.isFinite(n)) {
    return Math.max(0, Math.min(SCORE_MAX, n));
  }
  return null;
}

/**
 * @param {unknown} scoreRaw
 * @param {string} [riskEnum] LOW | MEDIUM | HIGH | etc.
 */
export function classifyCreditScore(scoreRaw, riskEnum) {
  let score = clampScoreDisplay(scoreRaw);

  if (score === null && riskEnum) {
    const r = String(riskEnum).toUpperCase();
    if (r.includes('LOW')) score = 750;
    else if (r.includes('MEDIUM') || r.includes('MID')) score = 550;
    else if (r.includes('HIGH')) score = 350;
  }

  if (score === null) score = 0;

  const tier =
    TIERS.find((t) => score >= t.min && score <= t.max) ??
    TIERS[TIERS.length - 1];

  return {
    score,
    tier,
  };
}
