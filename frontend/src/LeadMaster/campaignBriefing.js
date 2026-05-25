/**
 * Briefing Meta Ads — modelo “2º briefing” (campanha → conjunto → anúncio).
 * Campos 19–21 (textos) são gerados pela IA no passo seguinte, não no formulário.
 */

export const campaignBriefingSections = [
  {
    id: 'campaign',
    title: 'Campanha',
    subtitle: 'Configuração no nível campanha (Gerenciador de Anúncios)',
    fields: [
      {
        id: 'campaignObjective',
        number: 1,
        label: 'Qual é o objetivo da campanha?',
        type: 'select',
        options: ['Engajamento: Conversas iniciadas pelo WhatsApp'],
        defaultValue: 'Engajamento: Conversas iniciadas pelo WhatsApp',
        fixed: true,
      },
      {
        id: 'campaignName',
        number: 2,
        label: 'Qual é o nome da campanha?',
        type: 'text',
        placeholder: 'Ex.: Vila Urupes - 01.01.2026',
        defaultValue: 'Vila Urupes - 01.01.2026',
      },
      {
        id: 'budgetStrategy',
        number: 3,
        label: 'Orçamento',
        type: 'select',
        options: ['Estratégia de orçamento — Orçamento do conjunto de anúncios'],
        defaultValue: 'Estratégia de orçamento — Orçamento do conjunto de anúncios',
        fixed: true,
      },
    ],
  },
  {
    id: 'adSet',
    title: 'Conjunto de anúncios',
    subtitle: 'Segmentação, orçamento diário e veiculação',
    fields: [
      {
        id: 'adSetName',
        number: 4,
        label: 'Nome do conjunto de anúncios',
        type: 'text',
        placeholder: 'Ex.: Suzano — São Paulo',
        defaultValue: 'Suzano — São Paulo',
        hint: 'Recomendamos usar a região de segmentação no nome.',
      },
      {
        id: 'conversionType',
        number: 5,
        label: 'Tipo de conversão',
        type: 'select',
        options: ['Destino de mensagens — WhatsApp Business'],
        defaultValue: 'Destino de mensagens — WhatsApp Business',
        fixed: true,
      },
      {
        id: 'targetAudience',
        number: 6,
        label: 'Público-alvo (idade, gênero)',
        type: 'text',
        defaultValue: 'Homens e mulheres, 25 a 55 anos',
      },
      {
        id: 'geoTargeting',
        number: 7,
        label: 'Localização geográfica da segmentação',
        type: 'textarea',
        rows: 2,
        placeholder: 'Ex.: Avenida Paulista, 100, Centro, São Paulo – SP, raio de 30 km do empreendimento',
        defaultValue: 'Avenida Paulista, 100, Centro, São Paulo – SP, raio de 30 km do empreendimento',
      },
      {
        id: 'dailyBudget',
        number: 8,
        label: 'Orçamento diário da campanha',
        type: 'text',
        defaultValue: 'R$ 50,00 por dia',
      },
      {
        id: 'schedulePeriod',
        number: 9,
        label: 'Período de veiculação',
        type: 'text',
        placeholder: 'Ex.: 01/06/2026 a 30/06/2026',
        defaultValue: '01/06/2026 a 30/06/2026',
      },
      {
        id: 'interestsSegment',
        number: 10,
        label: 'Interesses ou comportamentos / Advantage+',
        type: 'select',
        options: [
          'Interesse em imóveis, financiamento imobiliário, decoração, investimentos',
          'Público Advantage (I.A. da Meta escolhe)',
        ],
        defaultValue: 'Interesse em imóveis, financiamento imobiliário, decoração, investimentos',
      },
      {
        id: 'customAudience',
        number: 11,
        label: 'Público personalizado ou lookalike (opcional)',
        type: 'textarea',
        rows: 2,
        placeholder: 'Ex.: lookalike 1% de lista CSV de clientes que já compraram',
        defaultValue: '',
      },
      {
        id: 'placements',
        number: 12,
        label: 'Posicionamentos',
        type: 'select',
        options: ['Feed e Stories do Instagram e Facebook'],
        defaultValue: 'Feed e Stories do Instagram e Facebook',
        fixed: true,
      },
      {
        id: 'bidStrategy',
        number: 13,
        label: 'Estratégia de lances',
        type: 'select',
        options: ['Menor custo (automático)'],
        defaultValue: 'Menor custo (automático)',
        fixed: true,
      },
    ],
  },
  {
    id: 'ad',
    title: 'Anúncio',
    subtitle: 'Criativo e oferta — textos principais gerados pela IA após enviar',
    fields: [
      {
        id: 'propertyName',
        number: 14,
        label: 'Nome do imóvel ou empreendimento',
        type: 'text',
        placeholder: 'Ex.: Residencial Jardins do Vale',
        defaultValue: 'Residencial Jardins do Vale',
      },
      {
        id: 'propertyType',
        number: 15,
        label: 'Tipo de imóvel',
        type: 'text',
        placeholder: 'Ex.: Apartamento de 2 e 3 dormitórios',
        defaultValue: 'Apartamento de 2 e 3 dormitórios',
      },
      {
        id: 'priceRange',
        number: 16,
        label: 'Valor ou faixa de preço',
        type: 'text',
        defaultValue: 'A partir de R$ 380.000',
      },
      {
        id: 'propertyHighlights',
        number: 17,
        label: 'Principais diferenciais do imóvel',
        type: 'textarea',
        rows: 3,
        defaultValue: 'Área de lazer completa, vaga de garagem, próximo ao metrô, financiamento facilitado',
      },
      {
        id: 'adFormat',
        number: 18,
        label: 'Formato do anúncio',
        type: 'select',
        options: ['Imagem única + Carrossel', 'Vídeo do imóvel (recomendado — maior conversão)'],
        defaultValue: 'Vídeo do imóvel (recomendado — maior conversão)',
      },
      {
        id: 'cta',
        number: 22,
        label: 'CTA (botão de chamada para ação)',
        type: 'select',
        options: ['Fale conosco'],
        defaultValue: 'Fale conosco',
        fixed: true,
      },
      {
        id: 'creativeAssets',
        number: 23,
        label: 'Imagens ou vídeos utilizados',
        type: 'textarea',
        rows: 2,
        defaultValue: 'Fotos do empreendimento (fachada, área de lazer, planta), vídeo tour de 30 segundos',
      },
      {
        id: 'urgencyOffer',
        number: 24,
        label: 'Condição especial ou urgência',
        type: 'text',
        placeholder: 'Ex.: Últimas unidades — condições de lançamento até 30/06',
        defaultValue: 'Últimas unidades disponíveis — Condições de lançamento até 30/06',
      },
      {
        id: 'instagramListingUrl',
        number: null,
        label: 'Link do post / Reels (referência de criativo)',
        type: 'text',
        placeholder: 'https://www.instagram.com/p/...',
        defaultValue: 'https://www.instagram.com/p/DVjTRKGjNnO/',
      },
    ],
  },
];

/** @deprecated use campaignBriefingSections */
export const briefingFieldDefinitions = campaignBriefingSections.flatMap((s) => s.fields);

export function buildInitialCampaignBriefing() {
  const o = {};
  campaignBriefingSections.forEach((section) => {
    section.fields.forEach((f) => {
      o[f.id] = f.defaultValue ?? '';
    });
  });
  return o;
}

export function getCampaignDisplayName(briefing) {
  if (!briefing || typeof briefing !== 'object') return 'Campanha';
  return (
    String(briefing.campaignName || '').trim() ||
    String(briefing.propertyName || '').trim() ||
    String(briefing.propertyTitle || '').trim() ||
    'Campanha'
  );
}

/** Converte "R$ 50,00 por dia" → centavos (5000). */
export function parseDailyBudgetCents(briefing) {
  const raw = String(briefing?.dailyBudget || '').replace(/\s/g, '');
  const m = raw.match(/[\d]+(?:[.,]\d{1,2})?/);
  if (!m) return 5000;
  const n = parseFloat(m[0].replace(',', '.'));
  if (!Number.isFinite(n) || n <= 0) return 5000;
  return Math.round(n * 100);
}

export const mockCampaignGenerationSteps = [
  'Lendo briefing (campanha, conjunto e anúncio)',
  'Montando prompt estruturado para Meta Ads + WhatsApp',
  'Gerando textos principais, títulos e descrições com IA',
  'Sugerindo criativos, roteiro de vídeo e follow-up WhatsApp',
  'Organizando checklist para colar no Gerenciador de Anúncios',
];
