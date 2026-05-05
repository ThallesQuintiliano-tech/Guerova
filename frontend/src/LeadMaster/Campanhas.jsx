import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardBody, CardTitle, Table, Badge, Button, Alert, Spinner } from 'reactstrap';
import { mockCampaignsAdsManager } from './mockData';
import { useGoogleAdsCampaigns } from './useGoogleAdsCampaigns';
import { useInternalCampaigns } from './useInternalCampaigns';
import { useMetaAdsCampaigns } from './useMetaAdsCampaigns';

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
    loading: loadingMeta,
    error: errorMeta,
    connected: metaConnected,
    adAccountId: metaAdAccountId,
    pageId: metaPageId,
    metaCampaigns,
    refetch: refetchMeta,
  } = useMetaAdsCampaigns();
  const { loading: loadingInternal, error: errorInternal, campaigns: internalCampaigns, refetch: refetchInternal } =
    useInternalCampaigns();
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

  const showGoogle = connected;
  const tableRows = showGoogle ? adsCampaigns : mockCampaignsAdsManager;

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
            Lista no estilo <strong>Gerenciador de Anúncios</strong> — status, orçamento e performance.
            {showGoogle && (
              <>
                {' '}
                Dados <strong>Google Ads</strong> (últimos 7 dias) via API.
              </>
            )}
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          {!showGoogle && connectionInfo?.developerTokenConfigured === false && (
            <span className="small text-warning">Developer token não configurado no servidor</span>
          )}
          {!showGoogle && (
            <Button color="outline-primary" className="rounded-pill" type="button" disabled={oauthBusy} onClick={onConnect}>
              {oauthBusy ? <Spinner size="sm" /> : null}
              {oauthBusy ? ' Redirecionando…' : 'Conectar Google Ads'}
            </Button>
          )}
          {showGoogle && (
            <Button color="outline-secondary" size="sm" type="button" disabled={loading} onClick={() => refetch()}>
              Atualizar
            </Button>
          )}
          <Button tag={Link} color="primary" className="rounded-pill" to="/leadmaster/campanha/briefing">
            + Nova campanha (briefing + IA)
          </Button>
        </div>
      </div>

      {oauthReturnBanner === 'success' && (
        <Alert color="success" className="py-2 small" toggle={() => setOauthReturnBanner(null)}>
          Google Ads ligado com sucesso.
        </Alert>
      )}

      {savedBanner && (
        <Alert color="success" className="py-2 small" toggle={() => setSavedBanner(false)}>
          Campanha salva com sucesso.
        </Alert>
      )}

      {oauthErr && (
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
          {!loadingInternal && !errorInternal && internalCampaigns.length === 0 && (
            <div className="small text-muted">Nenhuma campanha salva ainda. Crie uma em “+ Nova campanha”.</div>
          )}
          {!loadingInternal && !errorInternal && internalCampaigns.length > 0 && (
            <Table responsive hover className="small align-middle mb-0 mt-2">
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th>Status</th>
                  <th>Cidade</th>
                  <th className="text-end">Criada</th>
                  <th className="text-end">Ações</th>
                </tr>
              </thead>
              <tbody>
                {internalCampaigns.map((c) => (
                  <tr
                    key={c.id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate('/leadmaster/campanha/pacote', {
                        state: internalPacoteState(c),
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate('/leadmaster/campanha/pacote', {
                          state: internalPacoteState(c),
                        });
                      }
                    }}
                  >
                    <td className="fw-semibold text-primary">{c.name}</td>
                    <td>
                      <Badge color={statusBadgeColor(c.status)} pill>
                        {c.status}
                      </Badge>
                    </td>
                    <td className="text-muted">{c?.briefing?.city || '—'}</td>
                    <td className="text-end text-muted">{String(c.created_at || '').slice(0, 10)}</td>
                    <td className="text-end" onClick={(e) => e.stopPropagation()}>
                      {c.status === 'DRAFT' || c.status === 'PAUSED' ? (
                        <Button
                          color="primary"
                          outline
                          size="sm"
                          type="button"
                          onClick={() =>
                            navigate('/leadmaster/campanha/pacote', {
                              state: { ...internalPacoteState(c), openPublish: true },
                            })
                          }
                        >
                          Publicar na Meta
                        </Button>
                      ) : (
                        <span className="small text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
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
              Ligue o token e a <strong>Ad Account</strong> em{' '}
              <Link to="/leadmaster/configuracao">Configurações → Meta Ads</Link>. O <strong>Page ID</strong> é usado ao
              publicar criativos; a listagem abaixo usa a ad account guardada.
            </div>
          )}
          {metaConnected && !metaAdAccountId && (
            <Alert color="warning" className="py-2 small mb-0">
              Conexão Meta sem <strong>Ad Account</strong>. Indique o ID da conta de anúncios em Configurações.
            </Alert>
          )}
          {metaConnected && metaAdAccountId && (
            <div className="small text-muted mb-2">
              Conta: <code className="small">{metaAdAccountId}</code>
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
            </Alert>
          )}
          {!loadingMeta && !errorMeta && metaConnected && metaAdAccountId && metaCampaigns.length === 0 && (
            <div className="small text-muted">Nenhuma campanha devolvida pela API para esta ad account.</div>
          )}
          {!loadingMeta && !errorMeta && metaConnected && metaAdAccountId && metaCampaigns.length > 0 && (
            <Table responsive hover className="small align-middle mb-0 mt-2">
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th>Status</th>
                  <th>Status efetivo</th>
                  <th>Objetivo</th>
                  <th className="text-end">Atualizada</th>
                  <th className="text-end">ID</th>
                </tr>
              </thead>
              <tbody>
                {metaCampaigns.map((c) => (
                  <tr key={c.id}>
                    <td className="fw-semibold">{c.name || '—'}</td>
                    <td>
                      <Badge color={statusBadgeColor(c.status)} pill>
                        {c.status || '—'}
                      </Badge>
                    </td>
                    <td>
                      <Badge color={statusBadgeColor(c.effective_status)} pill>
                        {c.effective_status || '—'}
                      </Badge>
                    </td>
                    <td className="text-muted">{c.objective || '—'}</td>
                    <td className="text-end text-muted">
                      {c.updated_time ? String(c.updated_time).replace('T', ' ').slice(0, 16) : '—'}
                    </td>
                    <td className="text-end text-muted text-monospace">{c.id}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {!showGoogle && (
        <Alert color="info" className="py-2 small mb-3">
          A secção <strong>Meta Ads</strong> acima usa a tua conexão (token + ad account). A tabela seguinte continua em{' '}
          <strong>demonstração</strong> para Google fictício — conecte o Google Ads para métricas reais da conta OAuth /{' '}
          <code className="small">GOOGLE_ADS_CUSTOMER_ID</code>.
        </Alert>
      )}

      {loading && showGoogle && (
        <div className="small text-muted mb-2">
          <Spinner size="sm" className="me-1" /> Carregando campanhas…
        </div>
      )}

      {error && showGoogle && (
        <Alert color="warning" className="py-2 small mb-3">
          {error}
        </Alert>
      )}

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
              {showGoogle && !loading && !error && tableRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-muted text-center py-4">
                    Nenhuma linha com métricas nos últimos 7 dias (ou conta sem campanhas).
                  </td>
                </tr>
              )}
              {tableRows.map((c) => {
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
    </div>
  );
}
