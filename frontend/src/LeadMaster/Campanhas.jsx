import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardBody, CardTitle, Table, Badge, Button, Alert, Spinner } from 'reactstrap';
import { mockCampaignsAdsManager } from './mockData';
import { useGoogleAdsCampaigns } from './useGoogleAdsCampaigns';

function statusBadgeColor(status) {
  if (status === 'ACTIVE' || status === 'ENABLED') return 'success';
  if (status === 'PAUSED') return 'warning';
  return 'secondary';
}

export default function Campanhas() {
  const { loading, error, connected, adsCampaigns, refetch, startOAuth, connectionInfo } = useGoogleAdsCampaigns();
  const [searchParams, setSearchParams] = useSearchParams();
  const [oauthBusy, setOauthBusy] = useState(false);
  const [oauthErr, setOauthErr] = useState(null);
  const [oauthReturnBanner, setOauthReturnBanner] = useState(null);

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

      {oauthErr && (
        <Alert color="danger" className="py-2 small">
          {oauthErr}
        </Alert>
      )}

      {!showGoogle && (
        <Alert color="info" className="py-2 small mb-3">
          Tabela abaixo é <strong>demonstração</strong> (Meta + Google fictícios). Conecte o Google Ads para listar
          campanhas reais da conta vinculada ao <code className="small">GOOGLE_ADS_CUSTOMER_ID</code> / conexão OAuth.
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
