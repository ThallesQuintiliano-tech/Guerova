import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, CardBody, CardTitle, Table, Badge, Button, Alert, Spinner, Input, FormGroup, Label } from 'reactstrap';
import { useMetaAdsReport } from './useMetaAdsReport';
import CampaignReportCard from './CampaignReportCard';
import {
  formatMetaInteger,
  formatMetaMoney,
  formatMetaPercent,
  parseMetaCampaignInsights,
} from './metaAdsInsights';

const DATE_PRESETS = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'last_7d', label: 'Últimos 7 dias' },
  { value: 'last_14d', label: 'Últimos 14 dias' },
  { value: 'last_30d', label: 'Últimos 30 dias' },
  { value: 'last_90d', label: 'Últimos 90 dias' },
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
  { value: 'maximum', label: 'Máximo (histórico)' },
];

function statusBadgeColor(status) {
  if (status === 'ACTIVE' || status === 'ENABLED') return 'success';
  if (status === 'PAUSED') return 'warning';
  return 'secondary';
}

function accountStatusInfo(code) {
  // https://developers.facebook.com/docs/marketing-api/reference/ad-account/ (account_status)
  if (code === 1) return { color: 'success', label: 'Ativa' };
  if (code === 2) return { color: 'danger', label: 'Desativada' };
  if (code === 3) return { color: 'warning', label: 'Pendente' };
  if (code === 101) return { color: 'danger', label: 'Fechada' };
  return { color: 'secondary', label: `Status ${code ?? '—'}` };
}

const emptyTotals = () => ({
  impressions: 0,
  clicks: 0,
  spend: 0,
  reach: 0,
  conversations: 0,
  linkClicks: 0,
  hasConversations: false,
});

function addToTotals(totals, metrics) {
  if (!metrics) return totals;
  totals.impressions += Number(metrics.impressions) || 0;
  totals.clicks += Number(metrics.clicks) || 0;
  totals.spend += Number(metrics.spend) || 0;
  totals.reach += Number(metrics.reach) || 0;
  totals.linkClicks += Number(metrics.linkClicks) || 0;
  if (metrics.conversations != null) {
    totals.conversations += Number(metrics.conversations) || 0;
    totals.hasConversations = true;
  }
  return totals;
}

function derive(totals) {
  const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : null;
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : null;
  const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : null;
  const costPerConversation = totals.conversations > 0 ? totals.spend / totals.conversations : null;
  return { ...totals, ctr, cpc, cpm, costPerConversation };
}

export default function Relatorio() {
  const [datePreset, setDatePreset] = useState('last_30d');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const { loading, error, accounts, tokenUser, refetch } = useMetaAdsReport(datePreset);

  const toggleSelected = (campaignId) => {
    if (!campaignId) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(campaignId)) next.delete(campaignId);
      else next.add(campaignId);
      return next;
    });
  };

  const view = useMemo(() => {
    const grand = emptyTotals();
    let activeCampaigns = 0;
    let totalCampaigns = 0;

    const selectedCampaigns = [];

    const accountsView = accounts.map((acc) => {
      const accTotals = emptyTotals();
      const campaigns = (acc.campaigns || []).map((c) => {
        const metrics = parseMetaCampaignInsights(c.insights);
        addToTotals(accTotals, metrics);
        addToTotals(grand, metrics);
        totalCampaigns += 1;
        if (c.effective_status === 'ACTIVE' || c.status === 'ACTIVE') activeCampaigns += 1;
        const row = { ...c, metrics };
        if (c.id && selectedIds.has(c.id)) {
          selectedCampaigns.push({
            id: c.id,
            adAccountId: acc.id,
            name: c.name,
            accountName: acc.name,
            currency: acc.currency,
            metrics,
          });
        }
        return row;
      });
      return { ...acc, campaigns, totals: derive(accTotals) };
    });

    return {
      accounts: accountsView,
      grand: derive(grand),
      activeCampaigns,
      totalCampaigns,
      selectedCampaigns,
    };
  }, [accounts, selectedIds]);

  const accountsWithSpend = view.accounts.filter((a) => a.totals.spend > 0).length;

  return (
    <div className="p-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h2 className="h4 mb-1">Relatório de anúncios (todos os clientes)</h2>
          <p className="text-muted small mb-0">
            Visão de administrador: campanhas e resultados de <strong>todas as contas de anúncio</strong> acessíveis pelo
            seu token Meta, consolidadas num só lugar. Marque as <strong>caixas de seleção</strong> das campanhas para ver
            o relatório detalhado (KPIs + evolução diária) de cada uma.
            {tokenUser?.name ? (
              <>
                {' '}
                Token: <span className="text-muted">{tokenUser.name}</span>.
              </>
            ) : null}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2 align-items-end">
          <FormGroup className="mb-0">
            <Label className="small mb-1">Período</Label>
            <Input
              type="select"
              bsSize="sm"
              className="form-select-sm"
              style={{ minWidth: 180 }}
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Input>
          </FormGroup>
          <Button color="outline-secondary" size="sm" type="button" disabled={loading} onClick={() => refetch()}>
            {loading ? <Spinner size="sm" className="me-1" /> : null}
            Atualizar
          </Button>
        </div>
      </div>

      {error && (
        <Alert color="warning" className="py-2 small">
          {error}
          <div className="mt-1">
            Verifique o token em <Link to="/leadmaster/configuracao">Configurações → Meta Ads</Link> ou no{' '}
            <code>.env</code> (<code>META_ADS_ACCESS_TOKEN</code>).
          </div>
        </Alert>
      )}

      {loading && (
        <div className="small text-muted mb-3">
          <Spinner size="sm" className="me-1" /> A carregar relatório de todas as contas…
        </div>
      )}

      {!loading && !error && (
        <>
          <Row className="g-3 mb-4">
            <Col sm={6} xl={3}>
              <Card className="lm-kpi-card">
                <CardBody>
                  <div className="text-muted small">Contas (clientes)</div>
                  <h3 className="mt-1 mb-0">{view.accounts.length}</h3>
                  <div className="text-muted mt-1" style={{ fontSize: 11 }}>
                    {accountsWithSpend} com investimento no período
                  </div>
                </CardBody>
              </Card>
            </Col>
            <Col sm={6} xl={3}>
              <Card className="lm-kpi-card">
                <CardBody>
                  <div className="text-muted small">Investimento total</div>
                  <h3 className="mt-1 mb-0">{formatMetaMoney(view.grand.spend)}</h3>
                  <div className="text-muted mt-1" style={{ fontSize: 11 }}>
                    {view.totalCampaigns} campanha(s) · {view.activeCampaigns} ativa(s)
                  </div>
                </CardBody>
              </Card>
            </Col>
            <Col sm={6} xl={3}>
              <Card className="lm-kpi-card">
                <CardBody>
                  <div className="text-muted small">Impressões · Cliques</div>
                  <h3 className="mt-1 mb-0">{formatMetaInteger(view.grand.impressions)}</h3>
                  <div className="text-muted mt-1" style={{ fontSize: 11 }}>
                    {formatMetaInteger(view.grand.clicks)} cliques · CTR {formatMetaPercent(view.grand.ctr)}
                  </div>
                </CardBody>
              </Card>
            </Col>
            <Col sm={6} xl={3}>
              <Card className="lm-kpi-card">
                <CardBody>
                  <div className="text-muted small">Conversas iniciadas</div>
                  <h3 className="mt-1 mb-0">
                    {view.grand.hasConversations ? formatMetaInteger(view.grand.conversations) : '—'}
                  </h3>
                  <div className="text-muted mt-1" style={{ fontSize: 11 }}>
                    {view.grand.costPerConversation != null
                      ? `Custo/conversa ${formatMetaMoney(view.grand.costPerConversation)}`
                      : 'Sem conversas no período'}
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {view.accounts.length === 0 && (
            <Alert color="info" className="py-2 small">
              Nenhuma conta de anúncio acessível por este token. Confirme em{' '}
              <Link to="/leadmaster/configuracao">Configurações → Meta Ads</Link>.
            </Alert>
          )}

          {view.accounts.map((acc) => {
            const st = accountStatusInfo(acc.accountStatus);
            return (
              <Card key={acc.id} className="lm-card-soft mb-3">
                <CardBody>
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
                    <div>
                      <CardTitle tag="h6" className="mb-1">
                        {acc.name || acc.id} <Badge color={st.color} pill className="ms-1">{st.label}</Badge>
                      </CardTitle>
                      <div className="small text-muted">
                        <code className="small">{acc.id}</code>
                        {acc.currency ? <> · {acc.currency}</> : null}
                        {' · '}
                        {acc.campaigns.length} campanha(s)
                      </div>
                    </div>
                    <div className="text-end small">
                      <div className="fw-semibold">{formatMetaMoney(acc.totals.spend, acc.currency || 'BRL')}</div>
                      <div className="text-muted">
                        {formatMetaInteger(acc.totals.impressions)} impr · {formatMetaInteger(acc.totals.clicks)} cliques
                        {acc.totals.hasConversations ? (
                          <> · {formatMetaInteger(acc.totals.conversations)} conversas</>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {acc.error && (
                    <Alert color="warning" className="py-2 small mb-2">
                      {acc.error}
                    </Alert>
                  )}

                  {acc.campaigns.length === 0 && !acc.error && (
                    <div className="small text-muted">Sem campanhas nesta conta.</div>
                  )}

                  {acc.campaigns.length > 0 && (
                    <Table responsive hover className="small align-middle mb-0">
                      <thead>
                        <tr>
                          <th style={{ width: 36 }} className="text-center">
                            <span className="visually-hidden">Selecionar</span>
                          </th>
                          <th>Campanha</th>
                          <th>Status</th>
                          <th>Objetivo</th>
                          <th className="text-end">Impressões</th>
                          <th className="text-end">Cliques</th>
                          <th className="text-end">CTR</th>
                          <th className="text-end">Gasto</th>
                          <th className="text-end">Conversas</th>
                          <th className="text-end">Custo / conversa</th>
                        </tr>
                      </thead>
                      <tbody>
                        {acc.campaigns.map((c) => {
                          const m = c.metrics;
                          return (
                            <tr key={c.id}>
                              <td className="text-center">
                                <Input
                                  type="checkbox"
                                  className="m-0"
                                  checked={c.id ? selectedIds.has(c.id) : false}
                                  disabled={!c.id}
                                  onChange={() => toggleSelected(c.id)}
                                  aria-label={`Selecionar campanha ${c.name || c.id}`}
                                />
                              </td>
                              <td className="fw-semibold">{c.name || '—'}</td>
                              <td>
                                <Badge color={statusBadgeColor(c.effective_status || c.status)} pill>
                                  {c.effective_status || c.status || '—'}
                                </Badge>
                              </td>
                              <td className="text-muted">{c.objective || '—'}</td>
                              <td className="text-end">{m ? formatMetaInteger(m.impressions) : '—'}</td>
                              <td className="text-end">{m ? formatMetaInteger(m.clicks) : '—'}</td>
                              <td className="text-end">{m ? formatMetaPercent(m.ctr) : '—'}</td>
                              <td className="text-end">{m ? formatMetaMoney(m.spend, acc.currency || 'BRL') : '—'}</td>
                              <td className="text-end">
                                {m && m.conversations != null ? formatMetaInteger(m.conversations) : '—'}
                              </td>
                              <td className="text-end">
                                {m && m.costPerConversation != null
                                  ? formatMetaMoney(m.costPerConversation, acc.currency || 'BRL')
                                  : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="fw-semibold border-top">
                          <td colSpan={4}>Total da conta</td>
                          <td className="text-end">{formatMetaInteger(acc.totals.impressions)}</td>
                          <td className="text-end">{formatMetaInteger(acc.totals.clicks)}</td>
                          <td className="text-end">{formatMetaPercent(acc.totals.ctr)}</td>
                          <td className="text-end">{formatMetaMoney(acc.totals.spend, acc.currency || 'BRL')}</td>
                          <td className="text-end">
                            {acc.totals.hasConversations ? formatMetaInteger(acc.totals.conversations) : '—'}
                          </td>
                          <td className="text-end">
                            {acc.totals.costPerConversation != null
                              ? formatMetaMoney(acc.totals.costPerConversation, acc.currency || 'BRL')
                              : '—'}
                          </td>
                        </tr>
                      </tfoot>
                    </Table>
                  )}
                </CardBody>
              </Card>
            );
          })}

          {view.selectedCampaigns.length > 0 && (
            <div className="mt-4">
              <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                <h3 className="h6 text-uppercase text-muted mb-0">
                  Relatório das campanhas selecionadas ({view.selectedCampaigns.length})
                </h3>
                <Button color="outline-secondary" size="sm" type="button" onClick={() => setSelectedIds(new Set())}>
                  Limpar seleção
                </Button>
              </div>
              {view.selectedCampaigns.map((c) => (
                <CampaignReportCard
                  key={c.id}
                  campaign={c}
                  datePreset={datePreset}
                  onRemove={() => toggleSelected(c.id)}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
