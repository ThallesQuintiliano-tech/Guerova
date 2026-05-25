import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardBody, CardTitle, Table, Badge, Button, Alert, Spinner, FormGroup, Label, Input } from 'reactstrap';
import { mockCampaignsAdsManager } from './mockData';
import { useGoogleAdsCampaigns } from './useGoogleAdsCampaigns';
import { useInternalCampaigns } from './useInternalCampaigns';
import { useMetaAdsCampaigns } from './useMetaAdsCampaigns';
import { useMetaAdsAdAccountPicker } from './useMetaAdsAdAccountPicker';
import {
  formatMetaInteger,
  formatMetaMoney,
  formatMetaPercent,
  parseMetaCampaignInsights,
} from './metaAdsInsights';
import { featureGoogle } from '../config/leadMasterFeatures';

function statusBadgeColor(status) {
  if (status === 'ACTIVE' || status === 'ENABLED') return 'success';
  if (status === 'PAUSED') return 'warning';
  return 'secondary';
}

function internalPacoteState(c) {
  return {
    briefing: c.briefing,
    savedPack: c.pack,
    savedCampaign: { id: c.id, name: c.name, status: c.status },
  };
}

export default function Campanhas() {
  const navigate = useNavigate();
  const { loading, error, connected, adsCampaigns, refetch, startOAuth, connectionInfo } = useGoogleAdsCampaigns();
  const {
    adAccounts: metaAdAccounts,
    loading: metaActsLoading,
    error: metaActsError,
    selectedAct: metaSelectedAct,
    setSelectedAct: setMetaSelectedAct,
    saveAsDefault: saveMetaActDefault,
    savingDefault: savingMetaActDefault,
    connected: metaPickerConnected,
  } = useMetaAdsAdAccountPicker();
  const {
    loading: loadingMeta,
    error: errorMeta,
    connected: metaConnected,
    adAccountId: metaAdAccountId,
    pageId: metaPageId,
    metaCampaigns,
    metaAccountName,
    metaCampaignsTotal,
    metaTokenUser,
    metaInsightsByCampaignId,
    insightsLoading,
    refetch: refetchMeta,
  } = useMetaAdsCampaigns(metaSelectedAct);
  const {
    loading: loadingInternal,
    error: errorInternal,
    campaigns: internalCampaigns,
    refetch: refetchInternal,
    update: updateInternalCampaign,
    remove: removeInternalCampaign,
  } = useInternalCampaigns();
  const [actionBusyId, setActionBusyId] = useState(null);
  const [actionErr, setActionErr] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { state } = useLocation();
  const [oauthBusy, setOauthBusy] = useState(false);
  const [oauthErr, setOauthErr] = useState(null);
  const [oauthReturnBanner, setOauthReturnBanner] = useState(null);
  const [savedBanner, setSavedBanner] = useState(false);

  useEffect(() => {
    const flag = searchParams.get('google_ads');
    if (!flag) return;

    const next = new URLSearchParams(searchParams);
    next.delete('google_ads');
    setSearchParams(next, { replace: true });

    if (!featureGoogle) return;

    if (flag === 'ok') {
      setOauthReturnBanner('success');
      refetch();
    } else if (flag === 'error') {
      setOauthReturnBanner('error');
      setOauthErr('Não foi possível concluir a ligação ao Google Ads. Tente novamente.');
    }
  }, [searchParams, setSearchParams, refetch]);

  useEffect(() => {
    if (state?.saved) {
      setSavedBanner(true);
      refetchInternal();
    }
  }, [state, refetchInternal]);

  const showGoogle = featureGoogle && connected;

  const onDeleteCampaign = async (c) => {
    const label = c?.name || 'esta campanha';
    if (!window.confirm(`Excluir "${label}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setActionErr(null);
    setActionBusyId(c.id);
    try {
      await removeInternalCampaign(c.id);
    } catch (e) {
      setActionErr(e?.message || 'Falha ao excluir campanha.');
    } finally {
      setActionBusyId(null);
    }
  };

  const onStatusChange = async (c, status) => {
    setActionErr(null);
    setActionBusyId(c.id);
    try {
      await updateInternalCampaign(c.id, { status });
    } catch (e) {
      setActionErr(e?.message || 'Falha ao alterar status.');
    } finally {
      setActionBusyId(null);
    }
  };

  const onConnect = async () => {
    setOauthErr(null);
    setOauthBusy(true);
    try {
      await startOAuth();
    } catch (e) {
      setOauthErr(e?.message || 'Falha ao iniciar conexão');
      setOauthBusy(false);
    }
  };

  return (
    <div className="p-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div>
          <h2 className="h4 mb-1">Campanhas</h2>
          <p className="text-muted small mb-0">
            Campanhas internas (briefing + IA) e <strong>Meta Ads</strong> ligadas à conta em Configurações.
            {showGoogle ? (
              <>
                {' '}
                Dados <strong>Google Ads</strong> (últimos 7 dias) via API.
              </>
            ) : null}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          {featureGoogle && !showGoogle && connectionInfo?.developerTokenConfigured === false && (
            <span className="small text-warning">Developer token não configurado no servidor</span>
          )}
          {featureGoogle && !showGoogle && (
            <Button color="outline-primary" className="rounded-pill" type="button" disabled={oauthBusy} onClick={onConnect}>
              {oauthBusy ? <Spinner size="sm" /> : null}
              {oauthBusy ? ' Redirecionando…' : 'Conectar Google Ads'}
            </Button>
          )}
          {featureGoogle && showGoogle && (
            <Button color="outline-secondary" size="sm" type="button" disabled={loading} onClick={() => refetch()}>
              Atualizar
            </Button>
          )}
          <Button tag={Link} color="primary" className="rounded-pill" to="/leadmaster/campanha/briefing">
            + Nova campanha (briefing + IA)
          </Button>
        </div>
      </div>

      {featureGoogle && oauthReturnBanner === 'success' && (
        <Alert color="success" className="py-2 small" toggle={() => setOauthReturnBanner(null)}>
          Google Ads ligado com sucesso.
        </Alert>
      )}

      {savedBanner && (
        <Alert color="success" className="py-2 small" toggle={() => setSavedBanner(false)}>
          Campanha salva com sucesso.
        </Alert>
      )}

      {featureGoogle && oauthErr && (
        <Alert color="danger" className="py-2 small">
          {oauthErr}
        </Alert>
      )}

      <Card className="lm-card-soft mb-3">
        <CardBody>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
            <CardTitle tag="h6" className="mb-0">
              Campanhas internas (briefing + pacote)
            </CardTitle>
            <Button color="outline-secondary" size="sm" type="button" disabled={loadingInternal} onClick={refetchInternal}>
              Atualizar
            </Button>
          </div>
          {loadingInternal && (
            <div className="small text-muted">
              <Spinner size="sm" className="me-1" /> Carregando campanhas internas…
            </div>
          )}
          {errorInternal && (
            <Alert color="warning" className="py-2 small mb-0 mt-2">
              {errorInternal}
            </Alert>
          )}
          {actionErr && (
            <Alert color="danger" className="py-2 small mb-0 mt-2" toggle={() => setActionErr(null)}>
              {actionErr}
            </Alert>
          )}
          {!loadingInternal && !errorInternal && internalCampaigns.length === 0 && (
            <div className="small text-muted">Nenhuma campanha salva ainda. Crie uma em “+ Nova campanha”.</div>
          )}
          {!loadingInternal && !errorInternal && internalCampaigns.length > 0 && (
            <Table responsive hover className="small align-middle mb-0 mt-2">
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th>Status</th>
                  <th>Região / conjunto</th>
                  <th className="text-end">Criada</th>
                  <th className="text-end">Ações</th>
                </tr>
              </thead>
              <tbody>
                {internalCampaigns.map((c) => {
                  const busy = actionBusyId === c.id;
                  return (
                    <tr key={c.id}>
                      <td className="fw-semibold">
                        <Button
                          color="link"
                          className="p-0 text-start text-primary fw-semibold text-decoration-none"
                          type="button"
                          onClick={() =>
                            navigate('/leadmaster/campanha/pacote', {
                              state: internalPacoteState(c),
                            })
                          }
                        >
                          {c.name}
                        </Button>
                      </td>
                      <td style={{ minWidth: 120 }}>
                        <Input
                          type="select"
                          bsSize="sm"
                          className="form-select-sm"
                          value={c.status || 'DRAFT'}
                          disabled={busy}
                          onChange={(e) => onStatusChange(c, e.target.value)}
                        >
                          <option value="DRAFT">DRAFT</option>
                          <option value="ACTIVE">ACTIVE</option>
                          <option value="PAUSED">PAUSED</option>
                          <option value="ARCHIVED">ARCHIVED</option>
                        </Input>
                      </td>
                      <td className="text-muted">
                        {c?.briefing?.adSetName || c?.briefing?.geoTargeting?.slice?.(0, 40) || '—'}
                      </td>
                      <td className="text-end text-muted">{String(c.created_at || '').slice(0, 10)}</td>
                      <td className="text-end">
                        <div className="d-flex flex-wrap gap-1 justify-content-end">
                          <Button
                            color="outline-secondary"
                            size="sm"
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              navigate('/leadmaster/campanha/pacote', {
                                state: internalPacoteState(c),
                              })
                            }
                          >
                            Ver pacote
                          </Button>
                          <Button
                            color="outline-primary"
                            size="sm"
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              navigate('/leadmaster/campanha/briefing', {
                                state: { editCampaign: c },
                              })
                            }
                          >
                            Editar
                          </Button>
                          {(c.status === 'DRAFT' || c.status === 'PAUSED') && (
                            <Button
                              color="outline-dark"
                              size="sm"
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                navigate('/leadmaster/campanha/pacote', {
                                  state: { ...internalPacoteState(c), openPublish: true },
                                })
                              }
                            >
                              Meta
                            </Button>
                          )}
                          <Button
                            color="outline-danger"
                            size="sm"
                            type="button"
                            disabled={busy}
                            onClick={() => onDeleteCampaign(c)}
                          >
                            {busy ? <Spinner size="sm" /> : 'Excluir'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      <Card className="lm-card-soft mb-3">
        <CardBody>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
            <CardTitle tag="h6" className="mb-0">
              Campanhas — Meta Ads (Marketing API)
            </CardTitle>
            <Button color="outline-secondary" size="sm" type="button" disabled={loadingMeta} onClick={() => refetchMeta()}>
              Atualizar
            </Button>
          </div>
          {!metaConnected && (
            <div className="small text-muted">
              Configure em <Link to="/leadmaster/configuracao">Configurações → Meta Ads</Link>: cole o{' '}
              <strong>access token</strong> do Graph API Explorer (ou defina <code>META_ADS_ACCESS_TOKEN</code> no{' '}
              <code>.env</code> do backend) e o <strong>Ad Account ID</strong> (<code>act_…</code>).
            </div>
          )}
          {metaPickerConnected && (
            <FormGroup className="mb-2">
              <Label className="small mb-1">Conta de anúncios (Meta)</Label>
              <div className="d-flex flex-wrap gap-2 align-items-center">
                <Input
                  type="select"
                  className="form-select-sm"
                  style={{ maxWidth: 480 }}
                  value={metaSelectedAct || ''}
                  disabled={metaActsLoading || metaAdAccounts.length === 0}
                  onChange={(e) => setMetaSelectedAct(e.target.value)}
                >
                  <option value="">— Selecione a conta —</option>
                  {metaAdAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name || a.id} · {a.id}
                    </option>
                  ))}
                </Input>
                <Button
                  color="outline-primary"
                  size="sm"
                  type="button"
                  disabled={!metaSelectedAct || savingMetaActDefault}
                  onClick={() => saveMetaActDefault()}
                >
                  {savingMetaActDefault ? <Spinner size="sm" className="me-1" /> : null}
                  Definir como padrão
                </Button>
                {metaActsLoading && <Spinner size="sm" />}
              </div>
              {metaActsError && <div className="small text-danger mt-1">{metaActsError}</div>}
              <div className="small text-muted mt-1">
                {metaAdAccounts.length > 0
                  ? `${metaAdAccounts.length} conta(s) com o teu token. Troca a seleção para ver campanhas de cada uma.`
                  : 'Lista vazia — em Configurações use «Listar ad accounts».'}
              </div>
            </FormGroup>
          )}
          {metaConnected && !metaAdAccountId && !metaSelectedAct && (
            <Alert color="warning" className="py-2 small mb-0">
              Selecione uma <strong>conta de anúncios</strong> acima ou configure em Configurações.
            </Alert>
          )}
          {metaConnected && (metaAdAccountId || metaSelectedAct) && (
            <div className="small text-muted mb-2">
              Conta: {metaAccountName ? <strong>{metaAccountName}</strong> : null}
              {metaAccountName ? ' · ' : null}
              <code className="small">{metaAdAccountId}</code>
              {metaCampaignsTotal != null ? (
                <>
                  {' '}
                  · <strong>{metaCampaignsTotal}</strong> campanha(s) na API
                </>
              ) : null}
              {metaTokenUser?.name ? (
                <>
                  {' '}
                  · token: <span className="text-muted">{metaTokenUser.name}</span>
                </>
              ) : null}
              {metaPageId ? (
                <>
                  {' '}
                  · Page ID: <code className="small">{metaPageId}</code>
                </>
              ) : null}
            </div>
          )}
          {loadingMeta && (
            <div className="small text-muted">
              <Spinner size="sm" className="me-1" /> A carregar campanhas da Meta…
            </div>
          )}
          {errorMeta && (
            <Alert color="warning" className="py-2 small mb-0 mt-2">
              {errorMeta}
              <div className="mt-1">
                Token expirado? Gere um novo no{' '}
                <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer">
                  Graph API Explorer
                </a>{' '}
                e atualize em <Link to="/leadmaster/configuracao">Configurações → Meta Ads</Link> ou no{' '}
                <code>.env</code> (<code>META_ADS_ACCESS_TOKEN</code>).
              </div>
            </Alert>
          )}
          {!loadingMeta && !errorMeta && metaConnected && metaAdAccountId && metaCampaigns.length === 0 && (
            <Alert color="warning" className="py-2 small mb-0 mt-2">
              A Meta confirma <strong>{metaCampaignsTotal ?? 0} campanha(s)</strong> na conta{' '}
              <strong>{metaAccountName || metaAdAccountId}</strong> (<code>{metaAdAccountId}</code>) para o utilizador do
              token (<em>{metaTokenUser?.name || '—'}</em>). Se no Gestor de Anúncios vês campanhas, verifica: (1) no
              topo do Gestor, o ID da conta é <code>1743722799947064</code>; (2) estás logado no Facebook com o mesmo
              utilizador que gerou o token; (3) gera um token novo com <code>ads_read</code> +{' '}
              <code>ads_management</code> na app Meta <strong>Guerova</strong> e guarda em{' '}
              <Link to="/leadmaster/configuracao">Configurações</Link>.
            </Alert>
          )}
          {insightsLoading && metaCampaigns.length > 0 && (
            <div className="small text-muted mt-2">
              <Spinner size="sm" className="me-1" /> A carregar métricas (últimos 30 dias)…
            </div>
          )}
          {!loadingMeta && !errorMeta && metaConnected && metaAdAccountId && metaCampaigns.length > 0 && (
            <>
              <Table responsive hover className="small align-middle mb-0 mt-2">
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
                  {metaCampaigns.map((c) => {
                    const m = parseMetaCampaignInsights(metaInsightsByCampaignId[c.id]);
                    return (
                      <tr key={c.id}>
                        <td className="fw-semibold">{c.name || '—'}</td>
                        <td>
                          <Badge color={statusBadgeColor(c.effective_status || c.status)} pill>
                            {c.effective_status || c.status || '—'}
                          </Badge>
                        </td>
                        <td className="text-muted">{c.objective || '—'}</td>
                        <td className="text-end">{m ? formatMetaInteger(m.impressions) : insightsLoading ? '…' : '—'}</td>
                        <td className="text-end">{m ? formatMetaInteger(m.clicks) : insightsLoading ? '…' : '—'}</td>
                        <td className="text-end">{m ? formatMetaMoney(m.spend) : insightsLoading ? '…' : '—'}</td>
                        <td className="text-end">{m ? formatMetaInteger(m.conversations) : insightsLoading ? '…' : '—'}</td>
                        <td className="text-end">
                          {m ? formatMetaMoney(m.costPerConversation) : insightsLoading ? '…' : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
              {metaCampaigns.map((c) => {
                const m = parseMetaCampaignInsights(metaInsightsByCampaignId[c.id]);
                if (!m) return null;
                return (
                  <Card key={`${c.id}-metrics`} className="mt-3 border-0 bg-light">
                    <CardBody className="py-3">
                      <CardTitle tag="h6" className="mb-2">
                        {c.name} — últimos 30 dias ({m.dateStart} → {m.dateStop})
                      </CardTitle>
                      <div className="row g-2 small">
                        <div className="col-6 col-md-3">
                          <div className="text-muted">Alcance</div>
                          <div className="fw-semibold">{formatMetaInteger(m.reach)}</div>
                        </div>
                        <div className="col-6 col-md-3">
                          <div className="text-muted">CTR</div>
                          <div className="fw-semibold">{formatMetaPercent(m.ctr)}</div>
                        </div>
                        <div className="col-6 col-md-3">
                          <div className="text-muted">CPC</div>
                          <div className="fw-semibold">{formatMetaMoney(m.cpc)}</div>
                        </div>
                        <div className="col-6 col-md-3">
                          <div className="text-muted">CPM</div>
                          <div className="fw-semibold">{formatMetaMoney(m.cpm)}</div>
                        </div>
                        <div className="col-6 col-md-3">
                          <div className="text-muted">Cliques na ligação</div>
                          <div className="fw-semibold">{formatMetaInteger(m.linkClicks)}</div>
                        </div>
                        <div className="col-6 col-md-3">
                          <div className="text-muted">ID campanha</div>
                          <div className="fw-semibold text-monospace">{c.id}</div>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </>
          )}
        </CardBody>
      </Card>

      {featureGoogle && !showGoogle && (
        <Alert color="info" className="py-2 small mb-3">
          A secção <strong>Meta Ads</strong> acima usa a tua conexão (token + ad account). A tabela seguinte continua em{' '}
          <strong>demonstração</strong> para Google fictício — conecte o Google Ads para métricas reais da conta OAuth /{' '}
          <code className="small">GOOGLE_ADS_CUSTOMER_ID</code>.
        </Alert>
      )}

      {featureGoogle && loading && showGoogle && (
        <div className="small text-muted mb-2">
          <Spinner size="sm" className="me-1" /> Carregando campanhas…
        </div>
      )}

      {featureGoogle && error && showGoogle && (
        <Alert color="warning" className="py-2 small mb-3">
          {error}
        </Alert>
      )}

      {featureGoogle && (
        <Card className="lm-card-soft">
          <CardBody>
            <CardTitle tag="h6" className="mb-3">
              {showGoogle ? 'Campanhas — Google Ads' : 'Todas as campanhas (exemplo)'}
            </CardTitle>
            <Table responsive hover className="small align-middle mb-0">
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th>Plataforma</th>
                  <th>Status</th>
                  <th>Objetivo</th>
                  <th className="text-end">Orçamento/dia</th>
                  <th className="text-end">Gasto 7d</th>
                  <th className="text-end">Leads</th>
                  <th className="text-end">Qualidade</th>
                </tr>
              </thead>
              <tbody>
                {showGoogle && !loading && !error && adsCampaigns.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-muted text-center py-4">
                      Nenhuma linha com métricas nos últimos 7 dias (ou conta sem campanhas).
                    </td>
                  </tr>
                )}
                {(showGoogle ? adsCampaigns : mockCampaignsAdsManager).map((c) => {
                  const isGoogle = c.source === 'google_ads';
                  return (
                    <tr key={c.id}>
                      <td className="fw-semibold">{c.name}</td>
                      <td>{c.platform}</td>
                      <td>
                        <Badge color={statusBadgeColor(c.status)} pill>
                          {c.status}
                        </Badge>
                      </td>
                      <td>{c.objective}</td>
                      <td className="text-end">
                        {isGoogle ? '—' : <>R$ {Number(c.dailyBudget).toFixed(2)}</>}
                      </td>
                      <td className="text-end">
                        {isGoogle ? <>R$ {Number(c.spend7d).toFixed(2)}</> : <>R$ {c.spend7d.toFixed(2)}</>}
                      </td>
                      <td className="text-end">{c.leads7d}</td>
                      <td className="text-end text-muted">
                        {isGoogle ? (
                          <>
                            {Number(c.impressions || 0).toLocaleString('pt-BR')} impr. · {Number(c.clicks || 0).toLocaleString('pt-BR')}{' '}
                            cliques
                            {c.cpl != null ? (
                              <>
                                {' '}
                                · CPL R$ {Number(c.cpl).toFixed(2)}
                              </>
                            ) : null}
                          </>
                        ) : c.platform === 'Meta' ? (
                          <>
                            freq. {c.frequency} · {c.qualityRanking}
                          </>
                        ) : (
                          <>
                            impr. share {c.searchImprShare}% · score {c.optimizationScore}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}


