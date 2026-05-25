import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, CardBody, CardTitle, Table, Badge, Button, ButtonGroup, Spinner, Alert } from 'reactstrap';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Legend,
  Area,
} from 'recharts';
import {
  mockDashboardKpis,
  mockLeadsSeries,
  mockCampaignsAdsManager,
  mockWeeklyReports,
  mockCampaignEvolution,
  mockDashboardKpisPrevious,
  mockListingCohortStats,
  mockQualifiedFunnelMetrics,
} from './mockData';
import { useGoogleAdsCampaigns } from './useGoogleAdsCampaigns';
import { useMetaAdsCampaigns } from './useMetaAdsCampaigns';
import { featureGoogle } from '../config/leadMasterFeatures';

function statusBadgeColor(status) {
  if (status === 'ACTIVE' || status === 'ENABLED') return 'success';
  if (status === 'PAUSED') return 'warning';
  return 'secondary';
}

export default function Dashboard() {
  const [compare, setCompare] = useState(false);
  const googleAds = useGoogleAdsCampaigns();
  const {
    loading: metaLoading,
    error: metaError,
    connected: metaConnected,
    adAccountId: metaAdAccountId,
    pageId: metaPageId,
    metaCampaigns,
    refetch: refetchMeta,
  } = useMetaAdsCampaigns();

  return (
    <div className="p-4">
      <h2 className="h4 mb-1">Relatórios e campanhas</h2>
      <p className="text-muted small mb-4">
        Visão inspirada em relatórios reais (Four Imóveis) + gráficos de exemplo. As campanhas <strong>Meta Ads</strong>{' '}
        reais aparecem no cartão à direita quando a conexão está configurada em{' '}
        <Link to="/leadmaster/configuracao">Configurações</Link>.
        {featureGoogle ? ' Google Ads (OAuth) pode ser ligado ao ativar a integração Google no ambiente.' : null}
      </p>

      <h3 className="h6 text-uppercase text-muted mb-3">Resumo WhatsApp / Meta (mock)</h3>
      <Row className="g-3 mb-4">
        {mockWeeklyReports.map((r) => (
          <Col lg={6} key={r.id}>
            <Card className="lm-card-soft h-100" style={{ borderLeft: '4px solid #25d366' }}>
              <CardBody>
                <div className="fw-bold mb-2">{r.brand}</div>
                <div className="small text-muted mb-3">{r.periodLabel}</div>
                <ul className="small mb-3 ps-3">
                  <li>Alcance: {r.reach.toLocaleString('pt-BR')} pessoas</li>
                  <li>Mensagens: {r.messages}</li>
                  <li>Custo por mensagem: R$ {r.costPerMessage.toFixed(2).replace('.', ',')}</li>
                  <li>Valor investido: R$ {r.spent.toFixed(2).replace('.', ',')}</li>
                </ul>
                <div className="small mb-2">
                  <span className="text-warning me-1">★</span>
                  <strong>{r.bestCreativeLabel}:</strong>{' '}
                  <a href={r.bestCreativeUrl} target="_blank" rel="noopener noreferrer">
                    {r.bestCreativeUrl}
                  </a>
                </div>
                <CardTitle tag="h6" className="h6 text-muted mt-3 mb-2">
                  Mensagens por vídeo
                </CardTitle>
                <ul className="small ps-3 mb-0">
                  {r.videoBreakdown.map((v) => (
                    <li key={v.label}>
                      {v.label} — <strong>{v.messages}</strong>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
        <h3 className="h6 text-uppercase text-muted mb-0">Indicadores gerais</h3>
        <ButtonGroup size="sm">
          <Button color={!compare ? 'primary' : 'outline-secondary'} type="button" onClick={() => setCompare(false)}>
            Período atual (7d)
          </Button>
          <Button color={compare ? 'primary' : 'outline-secondary'} type="button" onClick={() => setCompare(true)}>
            Comparar com período anterior
          </Button>
        </ButtonGroup>
      </div>
      <Row className="g-3 mb-4">
        {mockDashboardKpis.map((k, idx) => (
          <Col sm={6} xl={3} key={k.id}>
            <Card className="lm-kpi-card h-100">
              <CardBody>
                <div className="text-muted small">{k.label}</div>
                <h3 className="mt-1 mb-0">{k.value}</h3>
                <div className={`small mt-1 ${k.positive ? 'text-success' : 'text-danger'}`}>{k.delta}</div>
                {compare && mockDashboardKpisPrevious[idx] && (
                  <div className="text-muted mt-2 pt-2 border-top" style={{ fontSize: 11 }}>
                    Período anterior: <strong>{mockDashboardKpisPrevious[idx].value}</strong>
                  </div>
                )}
                <div className="text-muted" style={{ fontSize: 11 }}>
                  {k.hint}
                </div>
              </CardBody>
            </Card>
          </Col>
        ))}
      </Row>
      <h3 className="h6 text-uppercase text-muted mb-3">Evolução da propaganda (8 semanas — mock)</h3>
      <Row className="g-3 mb-4">
        <Col lg={8}>
          <Card className="lm-card-soft">
            <CardBody>
              <CardTitle tag="h6" className="mb-2">
                Investimento × leads × mensagens WhatsApp
              </CardTitle>
              <p className="small text-muted mb-3">
                Barras: valor investido (R$). Linhas: leads captados e mensagens iniciadas no WhatsApp a partir dos
                anúncios.
              </p>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <ComposedChart data={mockCampaignEvolution} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === 'investido') return [`R$ ${Number(value).toFixed(2)}`, 'Investido'];
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="investido" name="Investido (R$)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="leads" name="Leads" stroke="#2563eb" strokeWidth={2} dot />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="mensagensWp"
                      name="Msgs WhatsApp"
                      stroke="#25d366"
                      strokeWidth={2}
                      dot
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col lg={4}>
          <Card className="lm-card-soft h-100">
            <CardBody>
              <CardTitle tag="h6" className="mb-2">
                Alcance e impressões
              </CardTitle>
              <p className="small text-muted mb-3">Área: impressões no feed/stories. Linha: alcance único.</p>
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <ComposedChart data={mockCampaignEvolution} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} width={36} />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="impressoes" name="Impressões" fill="#93c5fd" stroke="#3b82f6" />
                    <Line type="monotone" dataKey="alcance" name="Alcance" stroke="#0ea5e9" strokeWidth={2} dot />
                    <Line type="monotone" dataKey="cliques" name="Cliques" stroke="#f97316" strokeWidth={2} dot />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <h3 className="h6 text-uppercase text-muted mb-3">CPQ e cohort por imóvel</h3>
      <Row className="g-3 mb-4">
        <Col lg={4}>
          <Card className="lm-card-soft h-100">
            <CardBody>
              <CardTitle tag="h6">Custo por qualificado (CPQ)</CardTitle>
              <p className="small text-muted mb-2">
                Investimento no período ÷ leads em estágios <strong>Qualificado + Fechado</strong> (regra mock).
              </p>
              <h3 className="text-primary mb-2">R$ {mockQualifiedFunnelMetrics.cpq.toFixed(2)}</h3>
              <p className="small mb-1">
                Período anterior: <strong>R$ {mockQualifiedFunnelMetrics.prevCpq.toFixed(2)}</strong>
              </p>
              <p className="small text-muted mb-0">
                Gasto R$ {mockQualifiedFunnelMetrics.spendPeriod.toFixed(2)} ({mockQualifiedFunnelMetrics.qualifiedCount}{' '}
                qualificados) vs R$ {mockQualifiedFunnelMetrics.prevSpend.toFixed(2)} (
                {mockQualifiedFunnelMetrics.prevQualifiedCount} qualificados).
              </p>
            </CardBody>
          </Card>
        </Col>
        <Col lg={8}>
          <Card className="lm-card-soft h-100">
            <CardBody>
              <CardTitle tag="h6">Cohort por imóvel do portfólio</CardTitle>
              <p className="small text-muted mb-2">Leads atribuídos ao anúncio de cada imóvel (dados fictícios).</p>
              <Table size="sm" responsive className="mb-0 small">
                <thead>
                  <tr className="text-muted">
                    <th>Imóvel</th>
                    <th className="text-end">Leads</th>
                    <th className="text-end">Qualif.</th>
                    <th className="text-end">Fechados</th>
                    <th className="text-end">% do investimento</th>
                  </tr>
                </thead>
                <tbody>
                  {mockListingCohortStats.map((r) => (
                    <tr key={r.listingId}>
                      <td className="fw-semibold">{r.title}</td>
                      <td className="text-end">{r.leads}</td>
                      <td className="text-end">{r.qualified}</td>
                      <td className="text-end">{r.closed}</td>
                      <td className="text-end">{r.spentSharePct}%</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="g-3">
        <Col lg={7}>
          <Card className="lm-card-soft">
            <CardBody>
              <CardTitle tag="h6" className="mb-3">
                Leads / mensagens nos últimos 7 dias
              </CardTitle>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer>
                  <LineChart data={mockLeadsSeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="leads" stroke="#2563eb" strokeWidth={2} dot />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardBody>
          </Card>
        </Col>
        <Col lg={5}>
          <div className="d-flex flex-column gap-3">
            {featureGoogle && (
              <Card className="lm-card-soft">
                <CardBody>
                  <CardTitle tag="h6" className="mb-3">
                    {googleAds.connected ? 'Google Ads (últimos 7 dias)' : 'Campanhas ativas (exemplo)'}
                  </CardTitle>
                  {googleAds.connected && googleAds.loading && (
                    <div className="small text-muted mb-2">
                      <Spinner size="sm" className="me-1" /> Carregando…
                    </div>
                  )}
                  {googleAds.connected && googleAds.error && (
                    <div className="small text-warning mb-2">{googleAds.error}</div>
                  )}
                  <Table size="sm" borderless className="mb-0 small">
                    <thead>
                      <tr className="text-muted">
                        <th>Campanha</th>
                        <th>Plataforma</th>
                        <th className="text-end">Leads 7d</th>
                        <th className="text-end">CPL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {googleAds.connected &&
                        !googleAds.loading &&
                        !googleAds.error &&
                        (googleAds.connected ? googleAds.adsCampaigns : mockCampaignsAdsManager).length === 0 && (
                          <tr>
                            <td colSpan={4} className="text-muted text-center py-3">
                              Nenhuma campanha com dados no período.
                            </td>
                          </tr>
                        )}
                      {(googleAds.connected ? googleAds.adsCampaigns : mockCampaignsAdsManager).map((c) => {
                        const isGoogle = c.source === 'google_ads';
                        const cpl = c.cpl != null ? Number(c.cpl) : null;
                        return (
                          <tr key={c.id}>
                            <td>
                              <div className="fw-semibold">{c.name}</div>
                              <Badge
                                color={
                                  c.status === 'ACTIVE' || c.status === 'ENABLED'
                                    ? 'success'
                                    : c.status === 'PAUSED'
                                      ? 'warning'
                                      : 'secondary'
                                }
                                pill
                                className="me-1"
                              >
                                {c.status}
                              </Badge>
                              <span className="text-muted">{c.objective}</span>
                            </td>
                            <td>{c.platform}</td>
                            <td className="text-end">{c.leads7d}</td>
                            <td className="text-end">
                              {cpl != null ? `R$ ${cpl.toFixed(2)}` : isGoogle ? '—' : `R$ ${Number(c.cpl).toFixed(2)}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </CardBody>
              </Card>
            )}

            <Card className="lm-card-soft">
              <CardBody>
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                  <CardTitle tag="h6" className="mb-0">
                    Meta Ads — campanhas (Marketing API)
                  </CardTitle>
                  <Button color="outline-secondary" size="sm" type="button" disabled={metaLoading} onClick={() => refetchMeta()}>
                    Atualizar
                  </Button>
                </div>
                {!metaConnected && (
                  <p className="small text-muted mb-0">
                    Configure token e ad account em{' '}
                    <Link to="/leadmaster/configuracao">Configurações</Link>. Métricas de leads/CPL na Meta exigem
                    insights na API (lista mostra nome, status e objetivo).
                  </p>
                )}
                {metaConnected && !metaAdAccountId && (
                  <Alert color="warning" className="py-2 small mb-0">
                    Falta <strong>Ad Account</strong> na conexão Meta.
                  </Alert>
                )}
                {metaConnected && metaAdAccountId && (
                  <p className="small text-muted mb-2">
                    <code className="small">{metaAdAccountId}</code>
                    {metaPageId ? (
                      <>
                        {' '}
                        · Page <code className="small">{metaPageId}</code>
                      </>
                    ) : null}
                  </p>
                )}
                {metaLoading && (
                  <div className="small text-muted">
                    <Spinner size="sm" className="me-1" /> A carregar…
                  </div>
                )}
                {metaError && (
                  <Alert color="warning" className="py-2 small mb-0">
                    {metaError}
                  </Alert>
                )}
                {!metaLoading && !metaError && metaConnected && metaAdAccountId && metaCampaigns.length === 0 && (
                  <p className="small text-muted mb-0">Nenhuma campanha nesta ad account.</p>
                )}
                {!metaLoading && !metaError && metaConnected && metaAdAccountId && metaCampaigns.length > 0 && (
                  <Table size="sm" responsive className="mb-0 small">
                    <thead>
                      <tr className="text-muted">
                        <th>Campanha</th>
                        <th>Status</th>
                        <th>Objetivo</th>
                        <th className="text-end">Atualizada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metaCampaigns.map((c) => (
                        <tr key={c.id}>
                          <td className="fw-semibold">{c.name || '—'}</td>
                          <td>
                            <Badge color={statusBadgeColor(c.effective_status || c.status)} pill>
                              {c.effective_status || c.status || '—'}
                            </Badge>
                          </td>
                          <td className="text-muted">{c.objective || '—'}</td>
                          <td className="text-end text-muted">
                            {c.updated_time ? String(c.updated_time).slice(0, 10) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </CardBody>
            </Card>
          </div>
        </Col>
      </Row>
    </div>
  );
}
