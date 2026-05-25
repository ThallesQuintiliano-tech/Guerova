import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, CardBody, CardTitle, FormGroup, Input, Label, Spinner } from 'reactstrap';
import { useAuth } from '../auth/AuthContext';
import { useMetaAdsConnection } from './useMetaAds';

const DEFAULT_TEST_TARGETING = {
  geo_locations: { countries: ['BR'] },
  age_min: 21,
  age_max: 44,
};

export default function Configuracao() {
  const { isAuthenticated, accountId, accounts, apiFetch } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    loading,
    saving,
    error,
    connected,
    connection,
    save,
    listAdAccounts,
    probeAdAccounts,
    startOAuth,
    refetch: refetchMetaConnection,
  } = useMetaAdsConnection();
  const [oauthBusy, setOauthBusy] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [graphVersion, setGraphVersion] = useState('');
  const [adAccountId, setAdAccountId] = useState('');
  const [pageId, setPageId] = useState('');
  const [igUserId, setIgUserId] = useState('');
  const [pixelId, setPixelId] = useState('');
  const [banner, setBanner] = useState(null);
  const [accountsBusy, setAccountsBusy] = useState(false);
  const [accountsError, setAccountsError] = useState(null);
  const [adAccounts, setAdAccounts] = useState([]);
  const [testLink, setTestLink] = useState('https://www.facebook.com');
  const [testImageFile, setTestImageFile] = useState(null);
  const [testImageHash, setTestImageHash] = useState('');
  const [testUploading, setTestUploading] = useState(false);
  const [testPublishing, setTestPublishing] = useState(false);
  const [testBanner, setTestBanner] = useState(null);

  useEffect(() => {
    if (!connection) return;
    setGraphVersion(connection.graphVersion || '');
    setAdAccountId(connection.adAccountId || '');
    setPageId(connection.pageId || '');
    setIgUserId(connection.igUserId || '');
    setPixelId(connection.pixelId || '');
  }, [connection]);

  useEffect(() => {
    const status = searchParams.get('meta_ads');
    if (!status) return;
    if (status === 'ok') {
      setBanner({
        type: 'success',
        msg: 'Facebook conectado. Escolha a conta de anúncios (se tiver mais de uma) e veja as campanhas em Campanhas Meta.',
      });
      refetchMetaConnection();
    } else if (status === 'denied') {
      setBanner({ type: 'warning', msg: 'Conexão cancelada no Facebook.' });
    } else {
      setBanner({
        type: 'danger',
        msg: 'Falha ao conectar Facebook. Confira META_APP_SECRET e o redirect URI na app Meta.',
      });
    }
    searchParams.delete('meta_ads');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams, refetchMetaConnection]);

  const onConnectFacebook = async () => {
    setBanner(null);
    setOauthBusy(true);
    try {
      await startOAuth();
    } catch (e) {
      setBanner({ type: 'danger', msg: e?.message || 'Não foi possível iniciar login Facebook.' });
      setOauthBusy(false);
    }
  };

  const canSave = useMemo(() => Boolean(accessToken && accessToken.length >= 20), [accessToken]);

  const onSave = async () => {
    setBanner(null);
    try {
      await save({ accessToken, graphVersion, adAccountId, pageId, igUserId, pixelId });
      setAccessToken('');
      setBanner({ type: 'success', msg: 'Meta Ads conectado e validado (permissões + Business).' });
    } catch (e) {
      setBanner({ type: 'danger', msg: e?.message || 'Falha ao salvar conexão.' });
    }
  };

  const onListAdAccounts = async () => {
    setAccountsError(null);
    setAccountsBusy(true);
    try {
      let items;
      if (canSave) {
        items = await probeAdAccounts({ accessToken, graphVersion });
      } else if (connected) {
        items = await listAdAccounts();
      } else {
        setAccountsError('Cole o access token (permissões de anúncios) para testar, ou salve uma conexão primeiro.');
        setAdAccounts([]);
        return;
      }
      setAdAccounts(items);
      if (items.length === 0) setAccountsError('Nenhuma ad account encontrada para este token.');
    } catch (e) {
      setAccountsError(e?.message || 'Falha ao listar ad accounts.');
      setAdAccounts([]);
    } finally {
      setAccountsBusy(false);
    }
  };

  const canProbeOrList = connected || canSave;
  const oauthEnabled = Boolean(connection?.oauthEnabled);
  const usesEnvToken = connection?.tokenSource === 'env' || connection?.preferEnvToken;

  const onUploadTestImage = async () => {
    setTestBanner(null);
    if (!connected) {
      setTestBanner({ type: 'warning', msg: 'Guarde primeiro a conexão Meta (token + ad account).' });
      return;
    }
    if (!testImageFile) {
      setTestBanner({ type: 'warning', msg: 'Escolha uma imagem (JPEG, PNG, GIF ou WebP).' });
      return;
    }
    setTestUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', testImageFile);
      const r = await apiFetch('/api/meta-ads/ad-images', { method: 'POST', body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || `Erro HTTP ${r.status}`);
      setTestImageHash(String(j.image_hash || '').trim());
      setTestBanner({ type: 'success', msg: 'Imagem enviada — image_hash preenchido.' });
    } catch (e) {
      setTestBanner({ type: 'danger', msg: e?.message || 'Falha ao enviar imagem.' });
    } finally {
      setTestUploading(false);
    }
  };

  const onPublishTestCampaign = async () => {
    setTestBanner(null);
    if (!connected) {
      setTestBanner({ type: 'warning', msg: 'Conecte e guarde o token e a ad account em Salvar / Validar antes do teste.' });
      return;
    }
    const pid = String(pageId || '').trim();
    if (!pid) {
      setTestBanner({
        type: 'warning',
        msg: 'Indique o Page ID da Página do Facebook (campo acima). O criativo de ligação exige uma página.',
      });
      return;
    }
    const link = String(testLink || '').trim();
    if (!link || !/^https?:\/\//i.test(link)) {
      setTestBanner({ type: 'warning', msg: 'Use um URL de destino válido (https://…).' });
      return;
    }
    const hash = String(testImageHash || '').trim();
    if (!hash) {
      setTestBanner({ type: 'warning', msg: 'Envie uma imagem (Enviar imagem de teste) ou cole o image_hash.' });
      return;
    }
    const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const baseName = `Guerova teste ${stamp}`;
    setTestPublishing(true);
    try {
      const r = await apiFetch('/api/meta-ads/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign: {
            name: `${baseName} — Campanha`,
            objective: 'OUTCOME_TRAFFIC',
            status: 'PAUSED',
            special_ad_categories: [],
          },
          adset: {
            name: `${baseName} — Conjunto`,
            daily_budget: 5000,
            status: 'PAUSED',
            targeting: DEFAULT_TEST_TARGETING,
          },
          creative: {
            name: `${baseName} — Creative`,
            page_id: pid,
            message: 'Campanha de teste criada pelo Guerova (PAUSED).',
            link,
            headline: 'Teste Guerova',
            description: 'Validação da Marketing API.',
            call_to_action_type: 'LEARN_MORE',
            image_hash: hash,
          },
          ad: {
            name: `${baseName} — Anúncio`,
            status: 'PAUSED',
          },
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.error || `Erro HTTP ${r.status}`);
      setTestBanner({
        type: 'success',
        msg: `Campanha de teste criada na Meta (PAUSED). IDs: campaign ${j?.ids?.campaign_id || '—'} · adset ${j?.ids?.adset_id || '—'} · ad ${j?.ids?.ad_id || '—'}. Confira no Gestor de Anúncios.`,
      });
    } catch (e) {
      setTestBanner({ type: 'danger', msg: e?.message || 'Falha ao criar campanha de teste.' });
    } finally {
      setTestPublishing(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="h4 mb-4">Configurações</h2>
      <Card className="lm-card-soft" style={{ maxWidth: 720 }}>
        <CardBody>
          <CardTitle tag="h6" className="mb-3">
            Meta Ads (Marketing API)
          </CardTitle>
          <Alert color="warning" className="py-2 small mb-2">
            No servidor Laravel, ative <code>META_ADS_ENABLED=true</code> no ficheiro <code>.env</code> e reinicie o
            backend. Sem isto, a API devolve a mensagem de integração pausada.
          </Alert>
          {isAuthenticated && !accountId && (
            <Alert color="danger" className="py-2 small mb-2">
              <strong>Conta Guerova em falta.</strong> No topo do Lead Master, escolha uma conta no seletor (o pedido
              precisa do cabeçalho <code>X-Account-Id</code>). Sem isso, Salvar e Listar falham com erros como{' '}
              <em>Informe a conta</em> ou 403.              {Array.isArray(accounts) && accounts.length === 0 && (
                <span className="d-block mt-1">
                  O teu utilizador não tem nenhuma conta associada — peça a um administrador para te adicionar a uma
                  conta no Guerova.
                </span>
              )}
            </Alert>
          )}
          <Alert color="info" className="py-2 small mb-3">
            <div className="fw-semibold mb-1">Que token usar</div>
            <ul className="mb-2 ps-3">
              <li>
                <strong>Tipo:</strong> <em>User access token</em> da Graph API (não use o token da WhatsApp Cloud API).
              </li>
              <li>
                <strong>Permissões:</strong> <code>ads_read</code> e <code>ads_management</code> no Graph API Explorer.
                Opcional: <code>business_management</code> — a Meta só devolve o objeto <code>business</code> na ad account
                com esse scope; sem ele o Guerova lista contas e valida o <code>act_…</code> apenas com leitura da conta.
              </li>
              <li>
                <strong>App:</strong> a mesma app Meta em{' '}
                <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer">
                  Graph API Explorer
                </a>
                . Opcional no <code>.env</code>: <code>META_APP_ID</code> + <code>META_APP_SECRET</code> para mensagens de
                erro mostrarem os scopes reais do token.
              </li>
              <li>
                O utilizador com que gera o token deve ter acesso à <strong>conta de anúncios</strong>. Com{' '}
                <code>business_management</code>, ao salvar confirma-se também o vínculo ao Business; sem esse scope
                confirma-se só que o token consegue ler a ad account indicada.
              </li>
              <li>
                App em modo desenvolvimento: o Facebook do token tem de ser <strong>Admin, Developer ou Tester</strong> da
                app.
              </li>
            </ul>
            <div className="fw-semibold mb-1">Passos rápidos</div>
            <ol className="mb-0 ps-3">
              <li>Explorador → escolha a app → &quot;Generate Access Token&quot; → adicione ads_read e ads_management.</li>
              <li>Cole o token abaixo → <strong>Listar ad accounts</strong> (valida sem gravar).</li>
              <li>Preencha <strong>Ad Account ID</strong> (ex. <code>act_…</code>) com Business, Page ID se for publicar.</li>
              <li>
                <strong>Salvar / Validar</strong> — o token fica guardado criptografado por conta do Guerova.
              </li>
              <li>
                Opcional: na secção <strong>Campanha de teste na Meta</strong> (abaixo), com Page ID + imagem, cria
                campanha/conjunto/anúncio em <strong>PAUSED</strong> para validar a API sem passar pelo briefing.
              </li>
            </ol>
          </Alert>
          {banner && (
            <Alert color={banner.type} className="py-2 small" toggle={() => setBanner(null)}>
              {banner.msg}
            </Alert>
          )}
          {error && (
            <Alert color="warning" className="py-2 small">
              {error}
            </Alert>
          )}
          {loading && (
            <div className="small text-muted mb-2">
              <Spinner size="sm" className="me-1" /> Carregando status da conexão…
            </div>
          )}
          <Alert color={connected ? 'success' : 'secondary'} className="py-2 small">
            Status: <strong>{connected ? 'Conectado' : 'Não conectado'}</strong>
            {connected && usesEnvToken ? (
              <> — token lido do <code>.env</code> (<code>META_ADS_ACCESS_TOKEN</code>).</>
            ) : connected ? (
              <> — token guardado neste workspace.</>
            ) : null}
          </Alert>
          <FormGroup>
            <Label>Access Token (Graph API Explorer)</Label>
            <Input
              type="password"
              placeholder="Cole o token ou use META_ADS_ACCESS_TOKEN no .env do backend"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
            <div className="small text-muted mt-1">
              Também pode definir <code>META_ADS_ACCESS_TOKEN</code> e <code>META_ADS_AD_ACCOUNT_ID</code> no{' '}
              <code>backend/.env</code> — o servidor sincroniza automaticamente (sem login Facebook).
            </div>
          </FormGroup>
          {oauthEnabled && (
            <details className="small mb-3">
              <summary className="text-muted" style={{ cursor: 'pointer' }}>
                Opcional: Conectar com Facebook (OAuth)
              </summary>
              <div className="d-flex flex-wrap gap-2 mt-2 mb-2">
                <Button color="outline-secondary" type="button" disabled={oauthBusy || loading} onClick={onConnectFacebook}>
                  {oauthBusy ? <Spinner size="sm" className="me-1" /> : null}
                  Conectar com Facebook
                </Button>
              </div>
              <p className="small text-muted mb-0">
                Só necessário se <code>META_ADS_OAUTH_ENABLED=true</code> no servidor.
              </p>
            </details>
          )}
          <FormGroup>
            <Label>Graph API version (opcional)</Label>
            <Input placeholder="v21.0" value={graphVersion} onChange={(e) => setGraphVersion(e.target.value)} />
          </FormGroup>
          <FormGroup>
            <Label>Ad Account ID (vinculada ao Business)</Label>
            <Input placeholder="act_1234567890" value={adAccountId} onChange={(e) => setAdAccountId(e.target.value)} />
          </FormGroup>
          <FormGroup>
            <Label>Page ID (opcional, necessário para publicar creative)</Label>
            <Input placeholder="1234567890" value={pageId} onChange={(e) => setPageId(e.target.value)} />
          </FormGroup>
          <FormGroup>
            <Label>IG User ID (opcional)</Label>
            <Input placeholder="1784..." value={igUserId} onChange={(e) => setIgUserId(e.target.value)} />
          </FormGroup>
          <FormGroup>
            <Label>Pixel ID (opcional)</Label>
            <Input
              placeholder="Só preencha com o ID real do Pixel na Meta"
              value={pixelId}
              onChange={(e) => setPixelId(e.target.value)}
            />
            <div className="small text-muted mt-1">
              Não use valores de exemplo — deixe em branco se não tiver Pixel.
            </div>
          </FormGroup>

          <div className="d-flex flex-wrap gap-2">
            <Button color="primary" type="button" disabled={saving || !canSave} onClick={onSave}>
              {saving ? <Spinner size="sm" className="me-1" /> : null}
              Salvar / Validar
            </Button>
            <Button
              color="outline-secondary"
              type="button"
              disabled={accountsBusy || !canProbeOrList}
              onClick={onListAdAccounts}
            >
              {accountsBusy ? <Spinner size="sm" className="me-1" /> : null}
              Listar ad accounts
            </Button>
          </div>

          {accountsError && (
            <Alert color="warning" className="py-2 small mt-3">
              {accountsError}
            </Alert>
          )}
          {adAccounts.length > 0 && (
            <div className="small mt-3">
              <div className="fw-semibold mb-1">Ad accounts encontradas</div>
              <ul className="mb-0 ps-3">
                {adAccounts.map((a) => (
                  <li key={a.id} className="mb-1">
                    <span className="fw-semibold">{a.name || a.id}</span> · <code>{a.id}</code>
                    {a?.business?.id ? (
                      <>
                        {' '}
                        · Business: {a.business.name || a.business.id} (<code>{a.business.id}</code>)
                      </>
                    ) : (
                      <> · <span className="text-muted">sem Business</span></>
                    )}
                    <Button
                      color="link"
                      size="sm"
                      className="p-0 ms-2 align-baseline"
                      type="button"
                      onClick={() => setAdAccountId(a.id)}
                    >
                      Usar
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardBody>
      </Card>

      <Card className="lm-card-soft mt-4" style={{ maxWidth: 720 }}>
        <CardBody>
          <CardTitle tag="h6" className="mb-2">
            Campanha de teste na Meta
          </CardTitle>
          <p className="small text-muted mb-3">
            Cria na ad account guardada uma campanha, conjunto, criativo de ligação e anúncio, todos em{' '}
            <strong>PAUSED</strong> (não gasta à escala até ativar). Exige conexão salva,{' '}
            <strong>Page ID</strong> e uma <strong>imagem</strong>. Também podes usar o fluxo completo em{' '}
            <strong>Campanha → Pacote → Publicar na Meta</strong>.
          </p>
          {testBanner && (
            <Alert color={testBanner.type} className="py-2 small mb-3" toggle={() => setTestBanner(null)}>
              {testBanner.msg}
            </Alert>
          )}
          <Alert color="light" className="border py-2 small mb-3">
            Requisitos: <code>META_ADS_ENABLED=true</code>, token e <strong>Ad Account ID</strong> já guardados em{' '}
            <strong>Salvar / Validar</strong>, <strong>Page ID</strong> no formulário acima (pode ser o da tua Página de
            testes), permissões <code>ads_management</code> + <code>ads_read</code>.
          </Alert>
          <FormGroup>
            <Label>URL de destino do anúncio de teste</Label>
            <Input value={testLink} onChange={(e) => setTestLink(e.target.value)} placeholder="https://…" />
          </FormGroup>
          <FormGroup>
            <Label>Imagem do teste</Label>
            <div className="d-flex flex-wrap align-items-end gap-2">
              <Input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="flex-grow-1"
                style={{ maxWidth: 360 }}
                disabled={!connected}
                onChange={(e) => {
                  setTestImageFile(e.target.files?.[0] ?? null);
                  setTestBanner(null);
                }}
              />
              <Button color="secondary" outline type="button" disabled={!connected || testUploading} onClick={onUploadTestImage}>
                {testUploading ? <Spinner size="sm" className="me-1" /> : null}
                Enviar imagem de teste
              </Button>
            </div>
          </FormGroup>
          <FormGroup>
            <Label>
              image_hash <span className="text-muted fw-normal small">(após enviar ou cole manualmente)</span>
            </Label>
            <Input
              value={testImageHash}
              onChange={(e) => setTestImageHash(e.target.value)}
              placeholder="Preenchido após enviar a imagem"
              disabled={!connected}
            />
          </FormGroup>
          <Button color="dark" type="button" disabled={!connected || testPublishing} onClick={onPublishTestCampaign}>
            {testPublishing ? <Spinner size="sm" className="me-1" /> : null}
            Criar campanha de teste (PAUSED) na Meta
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
