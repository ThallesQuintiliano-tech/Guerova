import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, CardBody, CardTitle, FormGroup, Input, Label, Spinner } from 'reactstrap';
import { useMetaAdsConnection } from './useMetaAds';

export default function Configuracao() {
  const { loading, saving, error, connected, connection, save, listAdAccounts } = useMetaAdsConnection();
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

  useEffect(() => {
    if (!connection) return;
    setGraphVersion(connection.graphVersion || '');
    setAdAccountId(connection.adAccountId || '');
    setPageId(connection.pageId || '');
    setIgUserId(connection.igUserId || '');
    setPixelId(connection.pixelId || '');
  }, [connection]);

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
      const items = await listAdAccounts();
      setAdAccounts(items);
      if (items.length === 0) setAccountsError('Nenhuma ad account encontrada para este token.');
    } catch (e) {
      setAccountsError(e?.message || 'Falha ao listar ad accounts.');
      setAdAccounts([]);
    } finally {
      setAccountsBusy(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="h4 mb-4">Configurações</h2>
      <Card className="lm-card-soft" style={{ maxWidth: 640 }}>
        <CardBody>
          <CardTitle tag="h6" className="mb-3">
            Meta Ads (Marketing API)
          </CardTitle>
          <Alert color="info" className="py-2 small mb-3">
            <strong>Token diferente do WhatsApp.</strong> O access token da Cloud API (WhatsApp) não tem permissões de anúncios.
            Gera um token no{' '}
            <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer">
              Graph API Explorer
            </a>{' '}
            com a <strong>mesma app</strong>, permissão <code>ads_read</code> ou <code>ads_management</code>, e o utilizador
            que gere a ad account. Em app em modo desenvolvimento, o teu Facebook tem de ser Admin/Developer/Tester da app.
            Guia no <code>README.md</code> (secção Meta Ads).
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
          </Alert>
          <FormGroup>
            <Label>Access Token (precisa de ads_management ou ads_read)</Label>
            <Input
              type="password"
              placeholder="Cole aqui o access token"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
            <div className="small text-muted mt-1">
              O token é salvo no servidor (criptografado). Ao salvar, o backend valida permissões e se a ad account está em um
              Business.
            </div>
          </FormGroup>
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
            <Input placeholder="123456789012345" value={pixelId} onChange={(e) => setPixelId(e.target.value)} />
          </FormGroup>

          <div className="d-flex flex-wrap gap-2">
            <Button color="primary" type="button" disabled={saving || !canSave} onClick={onSave}>
              {saving ? <Spinner size="sm" className="me-1" /> : null}
              Salvar / Validar
            </Button>
            <Button color="outline-secondary" type="button" disabled={accountsBusy || !connected} onClick={onListAdAccounts}>
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
                  <li key={a.id}>
                    <span className="fw-semibold">{a.name || a.id}</span> · <code>{a.id}</code>
                    {a?.business?.id ? (
                      <>
                        {' '}
                        · Business: {a.business.name || a.business.id} (<code>{a.business.id}</code>)
                      </>
                    ) : (
                      <> · <span className="text-warning">sem Business</span></>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
