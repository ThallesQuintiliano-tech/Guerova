/** Mock: imóveis, briefing, campanha (Meta Business) e relatórios — alinhado ao produto Guerova / Four Imóveis */

export const mockCredits = {
  label: 'Créditos LLM',
  remaining: 1250,
  total: 2000,
};

export const mockUser = {
  name: 'João Silva',
  subtitle: 'Minha Conta',
  initials: 'JS',
};

/** Imóveis ativos + prévia do que vai para o anúncio */
export const mockActiveListings = [
  {
    id: 'apt-guaianazes',
    title: 'Apartamento 2 dorms — Guaiãzes',
    neighborhood: 'Guaiãzes',
    city: 'São Paulo',
    price: 'R$ 289.000',
    beds: 2,
    status: 'ACTIVE',
    adPreview: {
      headline: '2 quartos com garagem — entrada facilitada',
      primaryText: 'Apartamento pronto para morar, condomínio com portaria 24h. Chame no WhatsApp e agende visita.',
      cta: 'Enviar mensagem',
    },
    accent: '#6366f1',
  },
  {
    id: 'sumare',
    title: 'Sumaré — condomínio fechado',
    neighborhood: 'Sumaré',
    city: 'SP',
    price: 'R$ 410.000',
    beds: 3,
    status: 'ACTIVE',
    adPreview: {
      headline: 'Condomínio com lazer completo',
      primaryText: 'Famílias que buscam segurança e área de lazer. Financiamento assessorado.',
      cta: 'Saiba mais',
    },
    accent: '#0ea5e9',
  },
  {
    id: 'solar-serra',
    title: 'Solar da Serra — Buscando imóveis',
    neighborhood: 'Mogi',
    city: 'SP',
    price: 'Sob consulta',
    beds: null,
    status: 'ACTIVE',
    adPreview: {
      headline: 'Quer vender ou comprar na região?',
      primaryText: 'Equipe especializada em permuta e avaliação. Mensagem direta no WhatsApp.',
      cta: 'Falar com corretor',
    },
    accent: '#22c55e',
  },
];

export const countActiveListings = () =>
  mockActiveListings.filter((l) => l.status === 'ACTIVE').length;

/** Perguntas do briefing do imóvel (variáveis → IA monta copy / título / botão / ideia de criativo) */
export const briefingFieldDefinitions = [
  {
    id: 'propertyTitle',
    label: 'Título / como você chama este imóvel no portfólio',
    type: 'text',
    placeholder: 'Ex.: Apartamento 2 dorms — Guaiãzes',
    defaultValue: 'Apartamento 2 dorms — Guaiãzes',
  },
  {
    id: 'propertyType',
    label: 'Tipo de imóvel',
    type: 'select',
    options: ['Apartamento', 'Casa', 'Cobertura', 'Terreno', 'Sala comercial'],
    defaultValue: 'Apartamento',
  },
  {
    id: 'neighborhood',
    label: 'Bairro / empreendimento',
    type: 'text',
    placeholder: 'Guaiãzes, Sumaré, Solar da Serra…',
    defaultValue: 'Guaiãzes',
  },
  {
    id: 'city',
    label: 'Cidade',
    type: 'text',
    defaultValue: 'São Paulo — SP',
  },
  {
    id: 'price',
    label: 'Preço ou faixa (como aparece no anúncio)',
    type: 'text',
    defaultValue: 'R$ 289.000',
  },
  {
    id: 'highlights',
    label: 'Destaques (garagem, andar, reforma, vista…)',
    type: 'textarea',
    rows: 2,
    defaultValue: '2 dormitórios, 1 vaga, portaria 24h, playground.',
  },
  {
    id: 'targetAudience',
    label: 'Quem você quer atrair? (público)',
    type: 'textarea',
    rows: 2,
    defaultValue: 'Primeira casa, jovens casais, até 15 km do trabalho.',
  },
  {
    id: 'tone',
    label: 'Tom de voz',
    type: 'select',
    options: ['Direto e confiável', 'Emocional / sonho da casa própria', 'Urgência (oportunidade)'],
    defaultValue: 'Direto e confiável',
  },
  {
    id: 'instagramListingUrl',
    label: 'Link do post / Reels do imóvel (Instagram)',
    type: 'text',
    placeholder: 'https://www.instagram.com/p/…',
    defaultValue: 'https://www.instagram.com/p/DVjTRKGjNnO/',
  },
  {
    id: 'financing',
    label: 'Financiamento / entrada',
    type: 'text',
    defaultValue: 'Aceita FGTS, assessoria com bancos parceiros.',
  },
];

/** Passos exibidos enquanto a IA “monta” a campanha a partir das respostas do briefing */
export const mockCampaignGenerationSteps = [
  'Lendo variáveis do briefing do imóvel',
  'Montando textos para o Gerenciador (títulos, textos principais, descrições)',
  'Sugerindo botões de chamada para ação e extensões',
  'Definindo ideias de imagem e roteiro curto de vídeo vertical (9:16)',
  'Montando público sugerido (idade, raio, interesses) para colar no conjunto de anúncios',
];

/**
 * Pacote “mastigado” para Meta Business Suite — copiar e colar.
 * No app real, viria do backend após o modelo da IA processar o briefing.
 */
export function buildCampaignPackFromBriefing(briefing) {
  const t = briefing?.propertyTitle || 'Seu imóvel';
  const bairro = briefing?.neighborhood || 'sua região';
  const cidade = briefing?.city || '';
  const preco = briefing?.price || '';
  const dest = briefing?.highlights || '';
  const pub = briefing?.targetAudience || '';

  return {
    metaObjective: 'Mensagens (WhatsApp) — engajamento',
    headlines: [
      `${t} — visita esta semana`,
      `2 dorms em ${bairro} por ${preco}`,
      `Morar bem em ${bairro.split('—')[0]?.trim() || bairro} sem complicação`,
    ],
    primaryTexts: [
      `${dest} Localização em ${bairro}${cidade ? `, ${cidade}` : ''}. Responda no WhatsApp e receba fotos, planta e condições de financiamento em minutos.`,
      `Procurando imóvel para ${pub}? Este anúncio foi pensado para você. Toque em “Enviar mensagem” e fale com um especialista.`,
    ],
    descriptions: [
      `Financiamento e documentação com acompanhamento. ${briefing?.financing || ''}`,
      `Agende visita presencial ou tour virtual. Estoque atualizado diariamente.`,
    ],
    ctas: ['Enviar mensagem no WhatsApp', 'Saiba mais', 'Ligar agora'],
    linkCaptionSuggestions: [
      'Ver fotos e planta no Instagram',
      'Simular financiamento',
      'Agendar visita',
    ],
    imageIdeas: [
      `Foto capa 4:5: fachada do condomínio + selo de preço ${preco}.`,
      `Carrossel: sala integrada → cozinha → quartos → vaga de garagem.`,
      `Antes/depois se houver reforma; senão, planta humanizada com mobília leve.`,
    ],
    videoScript: [
      'Gancho 3s: pergunta “Morar em [bairro] ainda cabe no seu bolso?”',
      `Meio 12s: tour rápido dos ${dest.split(',')[0] || 'diferenciais'}.`,
      'CTA 5s: “Chama no WhatsApp que eu te mando a simulação hoje.”',
    ],
    audienceDraft: {
      age: '25–54',
      geoText: `Sugestão: raio de 10–15 km a partir de ${bairro}, ${cidade || 'sua base'}.`,
      interests: ['Imóveis', 'Financiamento imobiliário', 'Compra da primeira casa'],
    },
    whatsappFollowup:
      'Olá! Vi seu interesse no anúncio. Quer que eu envie planta + condomínio em PDF e horários para visita?',
  };
}

/** Dicas mock da “otimização por IA” (análise de performance) */
export const mockAiOptimizationTips = [
  'Saldo da campanha está confortável — pode testar +R$ 20/dia no conjunto que traz mais mensagens.',
  'Criativo “vídeo tour” está com CTR 40% maior que imagem estática: duplique o conjunto só com vídeo.',
  'Frequência 2,4 no remarketing: inclua exclusão de quem já enviou mensagem nos últimos 7 dias.',
  'Lance manual sugerido: mantenha “menor custo” por mais 3 dias antes de migrar para “limite de custo por resultado”.',
];

export const mockCampaignsAdsManager = [
  {
    id: 'cmp-1',
    name: 'Imóveis — Mogi (Meta Lead Ads)',
    platform: 'Meta',
    status: 'ACTIVE',
    objective: 'Leads',
    dailyBudget: 100,
    spend7d: 612.4,
    leads7d: 48,
    cpl: 12.76,
    frequency: 1.9,
    qualityRanking: 'Acima da média',
  },
  {
    id: 'cmp-2',
    name: 'Google — Imóveis (Search)',
    platform: 'Google',
    status: 'ACTIVE',
    objective: 'Leads',
    dailyBudget: 60,
    spend7d: 398.1,
    leads7d: 31,
    cpl: 12.84,
    searchImprShare: 68,
    optimizationScore: 84,
  },
  {
    id: 'cmp-3',
    name: 'Remarketing — Visitantes 30d',
    platform: 'Meta',
    status: 'PAUSED',
    objective: 'Tráfego',
    dailyBudget: 25,
    spend7d: 112.0,
    leads7d: 9,
    cpl: 12.44,
    frequency: 3.1,
    qualityRanking: 'Média',
  },
];

export const mockDashboardKpis = [
  { id: 'reach', label: 'Alcance (7d)', value: '5.062', delta: '+47%', positive: true, hint: 'pessoas' },
  { id: 'msg', label: 'Mensagens', value: '23', delta: '-15%', positive: false, hint: 'WhatsApp conectado' },
  { id: 'cpm', label: 'Custo por mensagem', value: 'R$ 5,62', delta: '-9,5%', positive: true, hint: 'últimos 7 dias' },
  { id: 'spend', label: 'Valor investido', value: 'R$ 129,22', delta: '-23%', positive: true, hint: 'Meta Ads' },
];

/** Mesmos KPIs — período anterior (7 dias) para comparação na UI */
export const mockDashboardKpisPrevious = [
  { id: 'reach', label: 'Alcance (7d ant.)', value: '3.452', delta: 'ref.', positive: true, hint: 'pessoas' },
  { id: 'msg', label: 'Mensagens (ant.)', value: '27', delta: 'ref.', positive: false, hint: 'WhatsApp conectado' },
  { id: 'cpm', label: 'Custo / msg (ant.)', value: 'R$ 6,21', delta: 'ref.', positive: false, hint: 'últimos 7 dias' },
  { id: 'spend', label: 'Investido (ant.)', value: 'R$ 167,70', delta: 'ref.', positive: true, hint: 'Meta Ads' },
];

/** Custo por lead qualificado (estágio Qualificado + Fechado) — mock */
export const mockQualifiedFunnelMetrics = {
  spendPeriod: 129.22,
  qualifiedCount: 8,
  cpq: 16.15,
  prevSpend: 167.7,
  prevQualifiedCount: 6,
  prevCpq: 27.95,
};

export const mockLeadsSeries = [
  { day: 'Seg', leads: 12 },
  { day: 'Ter', leads: 18 },
  { day: 'Qua', leads: 15 },
  { day: 'Qui', leads: 22 },
  { day: 'Sex', leads: 19 },
  { day: 'Sáb', leads: 14 },
  { day: 'Dom', leads: 20 },
];

/** Relatórios no formato “mensagem WhatsApp” (Four Imóveis) */
/** Histórico unificado (WhatsApp + notas internas / ligação) — por lead do CRM */
export const mockLeadConversations = {
  l1: [
    { via: 'WhatsApp', papel: 'Corretor', texto: 'Olá João! Vi seu interesse no anúncio do Guaiãzes. Posso te mandar a planta?', quando: '07/04 18:02' },
    { via: 'WhatsApp', papel: 'Lead', texto: 'Oi, pode sim.', quando: '07/04 18:05' },
    { via: 'WhatsApp', papel: 'Corretor', texto: 'Segue o PDF. Quer agendar visita sábado?', quando: '07/04 18:06' },
    { via: 'WhatsApp', papel: 'Lead', texto: 'Tem planta do 2 quartos?', quando: '08/04 09:12' },
    { via: 'Interno', papel: 'Corretor', texto: 'Lead quente — pediu planta e visita.', quando: '08/04 09:20' },
  ],
  l2: [
    { via: 'WhatsApp', papel: 'Lead', texto: 'Vi o anúncio no Instagram.', quando: '06/04 11:00' },
    { via: 'WhatsApp', papel: 'Corretor', texto: 'Maravilha! Qual região você prefere?', quando: '06/04 11:05' },
    { via: 'WhatsApp', papel: 'Lead', texto: 'Qual o valor do condomínio?', quando: '06/04 19:40' },
  ],
  l3: [
    { via: 'WhatsApp', papel: 'Corretor', texto: 'Pedro, segue simulação Caixa em anexo.', quando: '05/04 16:00' },
    { via: 'WhatsApp', papel: 'Lead', texto: 'Consigo visitar amanhã?', quando: '05/04 16:22' },
    { via: 'Ligação', papel: 'Corretor', texto: 'Retorno de ligação: confirmada visita quinta 15h.', quando: '05/04 17:00' },
  ],
  l4: [
    { via: 'WhatsApp', papel: 'Lead', texto: 'Tenho imóvel para permuta.', quando: '04/04 10:11' },
    { via: 'WhatsApp', papel: 'Corretor', texto: 'Ótimo, envia fotos e IPTU que avaliamos.', quando: '04/04 10:30' },
    { via: 'WhatsApp', papel: 'Lead', texto: 'Obrigada pelos links!', quando: '04/04 22:15' },
  ],
  l5: [
    { via: 'WhatsApp', papel: 'Corretor', texto: 'Carlos, te espero sábado 10h na portaria.', quando: '03/04 08:00' },
    { via: 'WhatsApp', papel: 'Lead', texto: 'Combinado.', quando: '03/04 08:02' },
  ],
  l6: [
    { via: 'WhatsApp', papel: 'Lead', texto: 'A permuta foi avaliada?', quando: '02/04 14:00' },
    { via: 'Interno', papel: 'Corretor', texto: 'Banco sinalizou OK — preparar minuta.', quando: '02/04 16:30' },
  ],
  l7: [
    { via: 'WhatsApp', papel: 'Lead', texto: 'Fechamos então com essa proposta?', quando: '28/03 11:00' },
    { via: 'WhatsApp', papel: 'Corretor', texto: 'Sim! Minuta vai hoje ao e-mail.', quando: '28/03 11:10' },
    { via: 'WhatsApp', papel: 'Corretor', texto: 'Minuta assinada — parabéns!', quando: '30/03 09:00' },
  ],
  l8: [
    { via: 'WhatsApp', papel: 'Lead', texto: 'Entrada + FGTS fecha?', quando: '25/03 15:00' },
    { via: 'WhatsApp', papel: 'Corretor', texto: 'Sim, banco já aprovou perfil.', quando: '25/03 15:20' },
  ],
};

export const mockLeadEmails = {
  l1: 'joao.silva@email.com',
  l2: 'maria.santos@email.com',
  l3: 'pedro.oliveira@email.com',
  l4: 'ana.costa@email.com',
  l5: 'carlos.lima@email.com',
  l6: 'fernanda.souza@email.com',
  l7: 'ricardo.almeida@email.com',
  l8: 'juliana.mendes@email.com',
};

/** Imóvel de interesse inicial (mock); na UI o corretor pode alterar */
export const mockLeadInterestedListingId = {
  l1: 'apt-guaianazes',
  l2: 'sumare',
  l3: null,
  l4: 'solar-serra',
  l5: 'apt-guaianazes',
  l6: 'sumare',
  l7: 'apt-guaianazes',
  l8: 'sumare',
};

/** Ordem fixa das colunas do funil (Kanban + rotas) */
export const KANBAN_COLUMNS = ['Novo', 'Contato', 'Qualificado', 'Fechado'];

/** Definição de etapas + checklist sugerido ao avançar lead */
export const funnelStageDefinitions = [
  {
    id: 'Novo',
    title: 'Novo',
    hint: 'Lead recém-capturado (anúncio, site ou indicação). Registrar origem e consentimento.',
    checklist: ['Origem da lead registrada', 'Base legal / opt-in conferido'],
  },
  {
    id: 'Contato',
    title: 'Contato',
    hint: 'Primeira resposta ou conversa iniciada; ainda sem critério de compra claro.',
    checklist: ['Canal preferido anotado', 'Imóvel(is) de interesse preliminar'],
  },
  {
    id: 'Qualificado',
    title: 'Qualificado',
    hint: 'Perfil e intenção alinhados: visita, simulação ou proposta em andamento.',
    checklist: ['Visita ou proposta agendada', 'Capacidade de compra avaliada'],
  },
  {
    id: 'Fechado',
    title: 'Fechado',
    hint: 'Negócio ganho ou perdido com valor anotado para relatório financeiro.',
    checklist: ['Contrato ou minuta', 'Valor / comissão lançados'],
  },
];

/** Dados LGPD mock por lead (transparência na UI) */
export const mockLeadLgpd = {
  l1: {
    origin: 'Meta Ads — clique no anúncio',
    consent: 'Checkbox no formulário instantâneo (mock)',
    consentAt: '10/03/2025',
    retentionNote: 'Sugestão: manter conversas 24 meses; revisar a cada campanha.',
  },
  l2: {
    origin: 'Instagram — DM após Reels',
    consent: 'Continuidade do contato = interesse legítimo (mock)',
    consentAt: '08/03/2025',
    retentionNote: 'Export disponível para o titular dos dados.',
  },
  l3: {
    origin: 'Site — formulário “Simule seu financiamento”',
    consent: 'Política de privacidade aceita (mock)',
    consentAt: '02/04/2025',
    retentionNote: '—',
  },
  l4: {
    origin: 'Indicação de cliente',
    consent: 'Opt-in verbal registrado pelo corretor (mock)',
    consentAt: '28/03/2025',
    retentionNote: '—',
  },
  l5: {
    origin: 'WhatsApp Business — anúncio',
    consent: 'Conversa iniciada pelo lead (mock)',
    consentAt: '01/04/2025',
    retentionNote: '—',
  },
  l6: {
    origin: 'Google Ads — extensão de chamada',
    consent: 'Termos do anúncio (mock)',
    consentAt: '30/03/2025',
    retentionNote: '—',
  },
  l7: {
    origin: 'Remarketing Meta',
    consent: 'Pixel + conjunto de dados conforme política da conta (mock)',
    consentAt: '15/03/2025',
    retentionNote: 'Lead fechado — arquivar após prazo contratual.',
  },
  l8: {
    origin: 'Campanha de mensagens WhatsApp',
    consent: 'Opt-in no formulário (mock)',
    consentAt: '20/03/2025',
    retentionNote: '—',
  },
};

export function findLeadInKanban(kanban, leadId) {
  for (const col of KANBAN_COLUMNS) {
    const list = kanban[col] || [];
    const idx = list.findIndex((l) => l.id === leadId);
    if (idx >= 0) return { column: col, index: idx, lead: list[idx] };
  }
  return null;
}

/** Lista plana para busca global (nome, telefone, etapa) */
export function flattenKanbanForSearch(kanban) {
  const out = [];
  for (const col of KANBAN_COLUMNS) {
    (kanban[col] || []).forEach((lead) => {
      out.push({
        ...lead,
        column: col,
        searchLabel: `${lead.name} ${lead.phone} ${lead.ctx} ${col} ${lead.id}`,
      });
    });
  }
  return out;
}

export function listingLabelById(id) {
  if (!id) return '—';
  const l = mockActiveListings.find((x) => x.id === id);
  return l ? `${l.title} (${l.price})` : '—';
}

export function getConversationForLead(leadId) {
  return mockLeadConversations[leadId] || [];
}

export function getWhatsappOnlyMessages(leadId) {
  return getConversationForLead(leadId).filter((m) => m.via === 'WhatsApp');
}

export const mockWeeklyReports = [
  {
    id: 'r1',
    brand: '🚀 Four Imóveis',
    periodLabel: 'Relatório da semana passada',
    reach: 3440,
    messages: 27,
    costPerMessage: 6.21,
    spent: 167.7,
    bestCreativeLabel: 'Melhor criativo do período',
    bestCreativeUrl: 'https://www.instagram.com/p/DVjTRKGjNnO/',
    videoBreakdown: [
      { label: 'Sumaré] condomínio', messages: 5 },
      { label: '[GUAIANAZES] Apartamento', messages: 9 },
      { label: '[Solar da Serra] Buscando imóveis', messages: 1 },
      { label: '[Solar das Andorinhas - Suzano] Recém-casados e noivos', messages: 12 },
    ],
  },
  {
    id: 'r2',
    brand: '🚀 Four Imóveis',
    periodLabel: 'Relatório dos últimos 7 dias',
    reach: 5062,
    messages: 23,
    costPerMessage: 5.62,
    spent: 129.22,
    bestCreativeLabel: 'Melhor criativo do período',
    bestCreativeUrl: 'https://www.instagram.com/p/DQZsYnIjJ2G/',
    videoBreakdown: [
      { label: '[Madrid] Buscando imóveis', messages: 5 },
      { label: '[Solar da Serra] Buscando imóveis', messages: 4 },
      { label: '[Vilaggio de Roma - Suzano] Recém-casados e noivos', messages: 1 },
      { label: '[Taubaté] Buscando imóveis', messages: 13 },
    ],
  },
];

export const mockKanban = {
  Novo: [
    { id: 'l1', name: 'João Silva', phone: '(11) 98765-4321', ctx: 'Apartamento 2 quartos' },
    { id: 'l2', name: 'Maria Santos', phone: '(11) 91234-5678', ctx: 'Casa com quintal' },
  ],
  Contato: [
    { id: 'l3', name: 'Pedro Oliveira', phone: '(11) 99888-7766', ctx: 'Financiamento Caixa' },
    { id: 'l4', name: 'Ana Costa', phone: '(11) 97777-6655', ctx: 'Investimento locação' },
  ],
  Qualificado: [
    { id: 'l5', name: 'Carlos Lima', phone: '(11) 96655-4433', ctx: 'Visita sábado 10h' },
    { id: 'l6', name: 'Fernanda Souza', phone: '(11) 95544-3322', ctx: 'Permuta avaliada' },
  ],
  Fechado: [
    {
      id: 'l7',
      name: 'Ricardo Almeida',
      phone: '(11) 94433-2211',
      ctx: 'Minuta assinada',
      value: 'R$ 18.500',
      valueNum: 18500,
      badge: 'Ganho',
    },
    {
      id: 'l8',
      name: 'Juliana Mendes',
      phone: '(11) 93322-1100',
      ctx: 'Entrada + FGTS',
      value: 'R$ 12.200',
      valueNum: 12200,
      badge: 'Ganho',
    },
  ],
};

/** Soma dos valores numéricos anotados na coluna Fechado (ex.: comissão / taxa de serviço — mock) */
export function sumFechadoDealValues(kanban) {
  const rows = kanban?.Fechado ?? [];
  return rows.reduce((acc, r) => acc + (Number(r.valueNum) || 0), 0);
}

export function formatBRLFromNumber(n) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Última mensagem WhatsApp por lead (lista da inbox) */
export const mockWhatsAppChats = [
  {
    id: 'c1',
    leadId: 'l1',
    name: 'João Silva',
    phone: '(11) 98765-4321',
    last: 'Tem planta do 2 quartos?',
    time: '09:12',
  },
  {
    id: 'c2',
    leadId: 'l2',
    name: 'Maria Santos',
    phone: '(11) 91234-5678',
    last: 'Qual o valor do condomínio?',
    time: 'Ontem',
  },
  {
    id: 'c3',
    leadId: 'l3',
    name: 'Pedro Oliveira',
    phone: '(11) 99888-7766',
    last: 'Consigo visitar amanhã?',
    time: 'Seg',
  },
  {
    id: 'c4',
    leadId: 'l4',
    name: 'Ana Costa',
    phone: '(11) 97777-6655',
    last: 'Obrigada pelos links!',
    time: 'Dom',
  },
  {
    id: 'c5',
    leadId: 'l7',
    name: 'Ricardo Almeida',
    phone: '(11) 94433-2211',
    last: 'Minuta assinada — obrigado!',
    time: '30/03',
  },
];

/** Evolução semanal da propaganda (gastos + métricas — mock para gráficos) */
export const mockCampaignEvolution = [
  { semana: 'S1', investido: 98, leads: 4, impressoes: 8200, cliques: 210, mensagensWp: 3, alcance: 5100 },
  { semana: 'S2', investido: 112, leads: 6, impressoes: 9100, cliques: 245, mensagensWp: 4, alcance: 5600 },
  { semana: 'S3', investido: 105, leads: 5, impressoes: 8800, cliques: 230, mensagensWp: 5, alcance: 5400 },
  { semana: 'S4', investido: 129, leads: 8, impressoes: 10200, cliques: 290, mensagensWp: 6, alcance: 6200 },
  { semana: 'S5', investido: 142, leads: 7, impressoes: 11100, cliques: 310, mensagensWp: 5, alcance: 6800 },
  { semana: 'S6', investido: 118, leads: 9, impressoes: 9900, cliques: 275, mensagensWp: 7, alcance: 5900 },
  { semana: 'S7', investido: 156, leads: 11, impressoes: 12400, cliques: 340, mensagensWp: 8, alcance: 7200 },
  { semana: 'S8', investido: 134, leads: 10, impressoes: 10800, cliques: 300, mensagensWp: 6, alcance: 6500 },
];

/** Cohort por imóvel do portfólio (leads atribuídos — mock) */
export const mockListingCohortStats = [
  {
    listingId: 'apt-guaianazes',
    title: 'Apartamento 2 dorms — Guaiãzes',
    leads: 42,
    qualified: 11,
    closed: 3,
    spentSharePct: 38,
  },
  {
    listingId: 'sumare',
    title: 'Sumaré — condomínio fechado',
    leads: 28,
    qualified: 7,
    closed: 2,
    spentSharePct: 29,
  },
  {
    listingId: 'solar-serra',
    title: 'Solar da Serra — Buscando imóveis',
    leads: 19,
    qualified: 5,
    closed: 1,
    spentSharePct: 18,
  },
];

/** Campos comuns que o scraping pode gerar (transparência) */
export const scrapingOutputFields = [
  { field: 'Nome / razão social', description: 'Quando disponível em cadastro público ou página.' },
  { field: 'Telefone (WhatsApp)', description: 'Normalizado para DDD + número.' },
  { field: 'E-mail corporativo', description: 'Se existir em site ou redes.' },
  { field: 'Instagram / site', description: 'URLs para validação manual.' },
  { field: 'Segmento', description: 'Varia por setor (imobiliária, concessionária, área jurídica…).' },
  { field: 'Cidade / bairro', description: 'Geolocalização aproximada informada na fonte.' },
];

/**
 * Setores para scraping mockado — cada um tem colunas e linhas de exemplo.
 * Em produção viria de API/job; aqui só simulamos delay + slice.
 */
export const scrapingSectors = [
  {
    id: 'imoveis',
    label: 'Imóveis',
    hint: 'Imobiliárias, construtoras, corretores',
    columns: [
      { key: 'empresa', label: 'Empresa' },
      { key: 'telefone', label: 'WhatsApp' },
      { key: 'email', label: 'E-mail' },
      { key: 'site', label: 'Site' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'extra', label: 'Observação' },
    ],
    sampleRows: [
      {
        empresa: 'Four Imóveis',
        telefone: '(11) 98765-1100',
        email: 'contato@fourimoveis.com.br',
        site: 'https://fourimoveis.com.br',
        instagram: '@fourimoveis',
        cidade: 'Mogi das Cruzes — SP',
        extra: 'Foco em lançamentos e usados',
      },
      {
        empresa: 'Solar da Serra Negócios',
        telefone: '(11) 91234-8899',
        email: 'comercial@solardaserra.com.br',
        site: 'https://solardaserra.com.br',
        instagram: '@solardaserra',
        cidade: 'Suzano — SP',
        extra: 'Permuta e financiamento',
      },
      {
        empresa: 'Corretor Autônomo — Ricardo Lima',
        telefone: '(11) 99876-5544',
        email: 'ricardo.lima.corretor@gmail.com',
        site: '—',
        instagram: '@ricardolimaimoveis',
        cidade: 'Guarulhos — SP',
        extra: 'Carteira zona leste',
      },
      {
        empresa: 'Incorp Construtora',
        telefone: '(11) 4002-8922',
        email: 'vendas@incorp.com.br',
        site: 'https://incorp.com.br',
        instagram: '@incorp',
        cidade: 'São Paulo — SP',
        extra: 'Incorporadora médio padrão',
      },
    ],
  },
  {
    id: 'carros',
    label: 'Carros',
    hint: 'Concessionárias, lojas de seminovos, revendas',
    columns: [
      { key: 'empresa', label: 'Estabelecimento' },
      { key: 'telefone', label: 'WhatsApp / central' },
      { key: 'email', label: 'E-mail' },
      { key: 'site', label: 'Site' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'extra', label: 'Marcas / foco' },
    ],
    sampleRows: [
      {
        empresa: 'AutoPrime Seminovos',
        telefone: '(11) 93333-2211',
        email: 'vendas@autoprime.com.br',
        site: 'https://autoprime.com.br',
        instagram: '@autoprime',
        cidade: 'São Paulo — SP',
        extra: 'VW, Fiat, Hyundai usados',
      },
      {
        empresa: 'Concessionária Sul Motors',
        telefone: '(21) 2544-8800',
        email: 'contato@sulmotors.com.br',
        site: 'https://sulmotors.com.br',
        instagram: '@sulmotors',
        cidade: 'Rio de Janeiro — RJ',
        extra: '0km Toyota e Honda',
      },
      {
        empresa: 'LevCar Multimarcas',
        telefone: '(19) 99711-4455',
        email: 'comercial@levcar.com.br',
        site: 'https://levcar.com.br',
        instagram: '@levcar',
        cidade: 'Campinas — SP',
        extra: 'Troca com troco, financiamento',
      },
    ],
  },
  {
    id: 'motos',
    label: 'Motos',
    hint: 'Concessionárias e lojas de motos',
    columns: [
      { key: 'empresa', label: 'Loja' },
      { key: 'telefone', label: 'WhatsApp' },
      { key: 'email', label: 'E-mail' },
      { key: 'site', label: 'Site' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'extra', label: 'Marcas' },
    ],
    sampleRows: [
      {
        empresa: 'MotoSpeed Yamaha',
        telefone: '(11) 98888-3322',
        email: 'vendas@motospeed.com.br',
        site: 'https://motospeed.com.br',
        instagram: '@motospeed',
        cidade: 'Osasco — SP',
        extra: 'Yamaha, Honda motos',
      },
      {
        empresa: 'Big Trail Motors',
        telefone: '(47) 99123-7788',
        email: 'contato@bigtrail.com.br',
        site: 'https://bigtrail.com.br',
        instagram: '@bigtrailmotors',
        cidade: 'Joinville — SC',
        extra: 'Trail e custom',
      },
    ],
  },
  {
    id: 'advogados',
    label: 'Advogados',
    hint: 'Escritórios e sociedades de advogados',
    columns: [
      { key: 'empresa', label: 'Escritório' },
      { key: 'telefone', label: 'Telefone / WhatsApp' },
      { key: 'email', label: 'E-mail' },
      { key: 'site', label: 'Site' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'extra', label: 'Área de atuação' },
    ],
    sampleRows: [
      {
        empresa: 'Silva & Associados Advogados',
        telefone: '(11) 3456-7890',
        email: 'contato@silvaadvogados.com.br',
        site: 'https://silvaadvogados.com.br',
        instagram: '@silvaadvogados',
        cidade: 'São Paulo — SP',
        extra: 'Cível, trabalhista, família',
      },
      {
        empresa: 'Martins Defesa Criminal',
        telefone: '(21) 98765-4321',
        email: 'atendimento@martinscriminal.com.br',
        site: 'https://martinscriminal.com.br',
        instagram: '@martinsdefesa',
        cidade: 'Niterói — RJ',
        extra: 'Criminal e audiências',
      },
      {
        empresa: 'Bastos Imobiliário & Direito',
        telefone: '(19) 3234-9090',
        email: 'bastos@bastoslaw.com.br',
        site: 'https://bastoslaw.com.br',
        instagram: '@bastoslaw',
        cidade: 'Campinas — SP',
        extra: 'Direito imobiliário e usucapião',
      },
    ],
  },
  {
    id: 'medicos',
    label: 'Médicos & clínicas',
    hint: 'Clínicas, consultórios, hospitais privados',
    columns: [
      { key: 'empresa', label: 'Nome fantasia' },
      { key: 'telefone', label: 'Central / WhatsApp' },
      { key: 'email', label: 'E-mail' },
      { key: 'site', label: 'Site' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'extra', label: 'Especialidade' },
    ],
    sampleRows: [
      {
        empresa: 'Clínica Vida Plena',
        telefone: '(11) 4004-5566',
        email: 'agendamento@vidaplena.com.br',
        site: 'https://vidaplena.com.br',
        instagram: '@clinicavidaplena',
        cidade: 'Santo André — SP',
        extra: 'Clínica geral e cardiologia',
      },
      {
        empresa: 'Dr. Paulo Endocrino',
        telefone: '(11) 97766-5544',
        email: 'secretaria@drpauloendo.com.br',
        site: 'https://drpauloendo.com.br',
        instagram: '@drpauloendo',
        cidade: 'São Paulo — SP',
        extra: 'Endocrinologia e obesidade',
      },
    ],
  },
  {
    id: 'dentistas',
    label: 'Dentistas',
    hint: 'Consultórios e clínicas odontológicas',
    columns: [
      { key: 'empresa', label: 'Clínica / profissional' },
      { key: 'telefone', label: 'WhatsApp' },
      { key: 'email', label: 'E-mail' },
      { key: 'site', label: 'Site' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'extra', label: 'Serviço' },
    ],
    sampleRows: [
      {
        empresa: 'Odonto Premium Mooca',
        telefone: '(11) 98877-6655',
        email: 'contato@odontopremium.com.br',
        site: 'https://odontopremium.com.br',
        instagram: '@odontopremium',
        cidade: 'São Paulo — SP',
        extra: 'Ortodontia e implantes',
      },
      {
        empresa: 'Sorriso Fácil Taubaté',
        telefone: '(12) 98123-4400',
        email: 'agenda@sorrisofacil.com.br',
        site: 'https://sorrisofacil.com.br',
        instagram: '@sorrisofaciltaubate',
        cidade: 'Taubaté — SP',
        extra: 'Harmonização e clareamento',
      },
    ],
  },
  {
    id: 'contabilidade',
    label: 'Contabilidade',
    hint: 'Escritórios contábeis',
    columns: [
      { key: 'empresa', label: 'Escritório' },
      { key: 'telefone', label: 'WhatsApp' },
      { key: 'email', label: 'E-mail' },
      { key: 'site', label: 'Site' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'extra', label: 'Foco' },
    ],
    sampleRows: [
      {
        empresa: 'Contábil Express Ltda',
        telefone: '(11) 3222-1100',
        email: 'comercial@contabilexpress.com.br',
        site: 'https://contabilexpress.com.br',
        instagram: '@contabilexpress',
        cidade: 'Guarulhos — SP',
        extra: 'MEI e pequenas empresas',
      },
      {
        empresa: 'Número Certo Contabilidade',
        telefone: '(19) 3030-7788',
        email: 'contato@numerocerto.com.br',
        site: 'https://numerocerto.com.br',
        instagram: '@numerocerto',
        cidade: 'Sumaré — SP',
        extra: 'Lucro presumido e real',
      },
    ],
  },
  {
    id: 'construcao',
    label: 'Construção',
    hint: 'Construtoras, reformas, engenharias',
    columns: [
      { key: 'empresa', label: 'Empresa' },
      { key: 'telefone', label: 'WhatsApp / obra' },
      { key: 'email', label: 'E-mail' },
      { key: 'site', label: 'Site' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'extra', label: 'Tipo de obra' },
    ],
    sampleRows: [
      {
        empresa: 'Engemaix Engenharia',
        telefone: '(11) 95544-3322',
        email: 'orcamento@engemaix.com.br',
        site: 'https://engemaix.com.br',
        instagram: '@engemaix',
        cidade: 'São Paulo — SP',
        extra: 'Reforma comercial e industrial',
      },
      {
        empresa: 'Casa Nova Reformas',
        telefone: '(11) 98444-2211',
        email: 'contato@casanova.com.br',
        site: 'https://casanova.com.br',
        instagram: '@casanovareformas',
        cidade: 'Taboão da Serra — SP',
        extra: 'Residencial alto padrão',
      },
    ],
  },
  {
    id: 'educacao',
    label: 'Educação & cursos',
    hint: 'Cursos, escolas, idiomas',
    columns: [
      { key: 'empresa', label: 'Instituição' },
      { key: 'telefone', label: 'WhatsApp' },
      { key: 'email', label: 'E-mail' },
      { key: 'site', label: 'Site' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'extra', label: 'Segmento' },
    ],
    sampleRows: [
      {
        empresa: 'Wizard Idiomas Mogi',
        telefone: '(11) 4777-8899',
        email: 'mogi@wizard.com.br',
        site: 'https://wizard.com.br',
        instagram: '@wizardmogi',
        cidade: 'Mogi das Cruzes — SP',
        extra: 'Inglês e espanhol',
      },
      {
        empresa: 'Drive CFC e reciclagem',
        telefone: '(11) 96655-7788',
        email: 'matricula@drivecfc.com.br',
        site: 'https://drivecfc.com.br',
        instagram: '@drivecfc',
        cidade: 'Suzano — SP',
        extra: 'CNH categoria B',
      },
    ],
  },
  {
    id: 'restaurantes',
    label: 'Restaurantes & food',
    hint: 'Restaurantes, dark kitchen, catering',
    columns: [
      { key: 'empresa', label: 'Estabelecimento' },
      { key: 'telefone', label: 'WhatsApp / delivery' },
      { key: 'email', label: 'E-mail' },
      { key: 'site', label: 'Site / iFood' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'extra', label: 'Tipo' },
    ],
    sampleRows: [
      {
        empresa: 'Sabor Caseiro Delivery',
        telefone: '(11) 98899-1122',
        email: 'pedidos@saborcaseiro.com.br',
        site: 'https://ifood.com.br/saborcaseiro',
        instagram: '@saborcaseiro',
        cidade: 'São Paulo — SP',
        extra: 'Marmitex corporativo',
      },
      {
        empresa: 'Pizzaria Forno 7',
        telefone: '(19) 99123-4455',
        email: 'eventos@forno7.com.br',
        site: 'https://forno7.com.br',
        instagram: '@forno7',
        cidade: 'Campinas — SP',
        extra: 'Pizza napolitana e eventos',
      },
    ],
  },
  {
    id: 'beleza',
    label: 'Beleza & estética',
    hint: 'Salões, clínicas de estética, barbearias',
    columns: [
      { key: 'empresa', label: 'Nome' },
      { key: 'telefone', label: 'WhatsApp' },
      { key: 'email', label: 'E-mail' },
      { key: 'site', label: 'Site / agenda' },
      { key: 'instagram', label: 'Instagram' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'extra', label: 'Serviço' },
    ],
    sampleRows: [
      {
        empresa: 'Studio Glow Estética',
        telefone: '(11) 97788-9900',
        email: 'agenda@studioglow.com.br',
        site: 'https://studioglow.com.br',
        instagram: '@studioglow',
        cidade: 'São Paulo — SP',
        extra: 'Microagulhamento e limpeza de pele',
      },
      {
        empresa: 'Barbearia Dom Barbosa',
        telefone: '(11) 95500-6677',
        email: 'dombarbosa@gmail.com',
        site: '—',
        instagram: '@dombarbosa',
        cidade: 'Mogi das Cruzes — SP',
        extra: 'Corte premium e barba',
      },
    ],
  },
  {
    id: 'outros',
    label: 'Outros segmentos',
    hint: 'Lista genérica B2B',
    columns: [
      { key: 'empresa', label: 'Nome / empresa' },
      { key: 'telefone', label: 'Telefone' },
      { key: 'email', label: 'E-mail' },
      { key: 'site', label: 'Site' },
      { key: 'instagram', label: 'Redes' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'extra', label: 'Segmento informado' },
    ],
    sampleRows: [
      {
        empresa: 'TechHelp TI Suporte',
        telefone: '(11) 94002-8000',
        email: 'comercial@techhelp.com.br',
        site: 'https://techhelp.com.br',
        instagram: '@techhelp',
        cidade: 'São Paulo — SP',
        extra: 'Outros — TI para PME',
      },
      {
        empresa: 'Limpeza Total Serviços',
        telefone: '(11) 98800-1234',
        email: 'orcamento@limpezatotal.com.br',
        site: 'https://limpezatotal.com.br',
        instagram: '@limpezatotal',
        cidade: 'Guarulhos — SP',
        extra: 'Outros — facilities',
      },
    ],
  },
];

/**
 * Gera preview mock: repete/expande linhas até `quantity` (máx. 40 para UI).
 */
const origemWebTipos = [
  'Google Maps (ficha do local)',
  'Site oficial — página Contato',
  'Instagram — bio do perfil',
  'LinkedIn — empresa',
  'Facebook — página comercial',
  'Google — resultados orgânicos',
];

function buildMockUrlOrigem(src, i, tipo, cidade) {
  const q = encodeURIComponent(`${src.empresa} ${cidade}`);
  const maps = `https://www.google.com/maps/search/?api=1&query=${q}`;
  if (tipo.startsWith('Instagram')) {
    const h = String(src.instagram || 'empresa').replace(/^@/, '');
    return `https://www.instagram.com/${h}/`;
  }
  if (tipo.startsWith('LinkedIn')) {
    return `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(src.empresa)}`;
  }
  if (tipo.startsWith('Facebook')) {
    return `https://www.facebook.com/search/pages/?q=${encodeURIComponent(src.empresa)}`;
  }
  if (tipo.startsWith('Site') && src.site && String(src.site).startsWith('http')) {
    return `${src.site.replace(/\/$/, '')}/contato`;
  }
  if (tipo.startsWith('Google —')) {
    return `https://www.google.com/search?q=${q}`;
  }
  return maps;
}

export function buildMockScrapingPreview(sectorId, cityFilter, quantity) {
  const sector = scrapingSectors.find((s) => s.id === sectorId) || scrapingSectors.find((s) => s.id === 'outros');
  const cap = Math.min(Math.max(Number(quantity) || 10, 3), 40);
  const base = sector.sampleRows;
  const rows = [];
  for (let i = 0; i < cap; i++) {
    const src = base[i % base.length];
    const suffix = i >= base.length ? ` (#${i + 1})` : '';
    const cidade = cityFilter?.trim() ? cityFilter.trim() : src.cidade;
    const tipo = origemWebTipos[i % origemWebTipos.length];
    rows.push({
      id: `web-${sector.id}-${String(i + 1).padStart(3, '0')}`,
      ...src,
      empresa: `${src.empresa}${suffix}`,
      cidade,
      fonteTipo: tipo,
      urlOrigem: buildMockUrlOrigem(src, i, tipo, cidade),
      capturadoEm: new Date(Date.now() - i * 47 * 60 * 1000).toLocaleString('pt-BR'),
    });
  }
  return {
    sectorId: sector.id,
    sectorLabel: sector.label,
    columns: [
      { key: 'id', label: 'ID' },
      ...sector.columns,
      { key: 'fonteTipo', label: 'Origem na internet' },
      { key: 'urlOrigem', label: 'URL capturada' },
      { key: 'capturadoEm', label: 'Capturado em' },
    ],
    rows,
    totalRequested: quantity,
    shown: rows.length,
  };
}

export const mockScrapingGuide = [
  'O fluxo principal do produto é: briefing do imóvel preenchido → IA gera o pacote de campanha (sem confundir com scraping).',
  'O scraping mockado na grade de leads só simula listas B2B por setor — dados fictícios para demonstração de UI e exportação CSV.',
  'Em produção: jobs assíncronos, validação LGPD e opt-in antes de disparar campanhas.',
];
