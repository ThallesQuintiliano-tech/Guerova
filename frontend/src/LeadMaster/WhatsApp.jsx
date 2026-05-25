import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, CardBody, CardTitle, Alert, Button, Input, Label, FormGroup } from 'reactstrap';
import WhatsAppConnectCard from './WhatsAppConnectCard';
import WhatsAppInbox from './WhatsAppInbox';
import { useWhatsAppWeb } from './useWhatsAppWeb';

/** fetch() só aceita valores de cabeçalho em ISO-8859-1 */
function headerValueLatin1(value) {
  return Array.from(String(value).trim())
    .filter((ch) => {
      const c = ch.charCodeAt(0);
      return c >= 0 && c <= 255;
    })
    .join('');
}

export default function WhatsApp() {
  const web = useWhatsAppWeb();
  const webConnected = web.connected;
  const [apiStatus, setApiStatus] = useState(null);
  const [showMeta, setShowMeta] = useState(false);
  const [sendTo, setSendTo] = useState(() =>
    String(import.meta.env.VITE_WHATSAPP_DEFAULT_RECIPIENT ?? '').replace(/\D/g, '')
  );
  const [sendMode, setSendMode] = useState('hello_world_template');
  const [sendMessage, setSendMessage] = useState('');
  const [bridgeSecret, setBridgeSecret] = useState('');
  const [sendResult, setSendResult] = useState(null);
  const [sendLoading, setSendLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/whatsapp/status')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (!cancelled) {
          setApiStatus(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setApiStatus({ error: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="p-4">
      <h2 className="h4 mb-1">WhatsApp</h2>
      <p className="text-muted small mb-4">
        {webConnected ? (
          <>
            Sessão ativa — aqui aparecem só conversas iniciadas pelo <strong>Guerova</strong> (nova mensagem ou envio
            pelo painel), não o histórico inteiro do telemóvel. CRM em <Link to="/leadmaster/crm">CRM</Link>.
          </>
        ) : (
          <>
            Conecte com <strong>QR Code</strong> para enviar mensagens. As conversas iniciadas pelo Guerova ficam
            guardadas mesmo desconectado. CRM em <Link to="/leadmaster/crm">CRM</Link>.
          </>
        )}
      </p>

      <Row className="g-3 mb-3">
        <Col md={webConnected ? 12 : 5}>
          <WhatsAppConnectCard
            status={web.status}
            loading={web.loading}
            busy={web.busy}
            error={web.error}
            connected={web.connected}
            awaitingQr={web.awaitingQr}
            connecting={web.connecting}
            onConnect={web.connect}
            onDisconnect={web.disconnect}
          />
        </Col>
        {!webConnected && (
          <Col md={7}>
            <Card className="lm-card-soft h-100">
              <CardBody>
                <CardTitle tag="h6">Depois de conectar</CardTitle>
                <p className="small text-muted mb-0">
                  As suas conversas do WhatsApp aparecem aqui automaticamente. Pode escolher um contacto e enviar
                  mensagens como no WhatsApp Web.
                </p>
              </CardBody>
            </Card>
          </Col>
        )}
      </Row>

      <WhatsAppInbox connected={webConnected} />

      <div className="mt-4">
        <Button color="link" className="p-0 small text-muted" onClick={() => setShowMeta((v) => !v)}>
          {showMeta ? 'Ocultar' : 'Mostrar'} integração Meta (Cloud API) — opcional
        </Button>
      </div>

      {showMeta && (
        <>
          {apiStatus?.error && (
            <Alert color="warning" className="py-2 small mt-2">
              Não foi possível ler <code>/api/whatsapp/status</code>.
            </Alert>
          )}
          {apiStatus && !apiStatus.error && (
            <Alert
              color={apiStatus.configured ? 'success' : 'secondary'}
              className="py-2 small mt-2"
            >
              <div className="fw-semibold mb-1">Meta Cloud API</div>
              <ul className="mb-0 ps-3 small">
                <li>
                  Envio Graph API:{' '}
                  {apiStatus.configured ? (
                    <span className="text-success">configurado</span>
                  ) : (
                    <span className="text-muted">sem token no .env</span>
                  )}
                </li>
                <li>
                  Webhook:{' '}
                  {apiStatus.webhook_verify_token_set ? (
                    <span className="text-success">token definido</span>
                  ) : (
                    <span className="text-muted">pendente</span>
                  )}
                </li>
              </ul>
            </Alert>
          )}
          <Card className="lm-card-soft mt-2">
            <CardBody>
              <CardTitle tag="h6">Teste Cloud API (Meta)</CardTitle>
              {apiStatus?.bridge_secret_required && (
                <FormGroup>
                  <Label className="small">X-Guerova-Secret</Label>
                  <Input
                    type="password"
                    autoComplete="off"
                    value={bridgeSecret}
                    onChange={(e) => setBridgeSecret(e.target.value)}
                  />
                </FormGroup>
              )}
              <FormGroup>
                <Label className="small">Para (só dígitos)</Label>
                <Input value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="5511999999999" />
              </FormGroup>
              <FormGroup>
                <Label className="small">Modo</Label>
                <Input type="select" value={sendMode} onChange={(e) => setSendMode(e.target.value)}>
                  <option value="hello_world_template">Template hello_world</option>
                  <option value="text">Texto livre</option>
                </Input>
              </FormGroup>
              {sendMode === 'text' && (
                <FormGroup>
                  <Label className="small">Mensagem</Label>
                  <Input
                    type="textarea"
                    rows={2}
                    value={sendMessage}
                    onChange={(e) => setSendMessage(e.target.value)}
                  />
                </FormGroup>
              )}
              <Button
                color="secondary"
                size="sm"
                disabled={
                  sendLoading ||
                  !sendTo ||
                  (sendMode === 'text' && !sendMessage) ||
                  (apiStatus?.bridge_secret_required && !bridgeSecret)
                }
                onClick={async () => {
                  setSendLoading(true);
                  setSendResult(null);
                  try {
                    const needsSecret = Boolean(apiStatus?.bridge_secret_required);
                    const secretHeader = needsSecret ? headerValueLatin1(bridgeSecret) : '';
                    const r = await fetch('/api/whatsapp/send', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        ...(needsSecret ? { 'X-Guerova-Secret': secretHeader } : {}),
                      },
                      body: JSON.stringify({
                        to: sendTo.replace(/\D/g, ''),
                        mode: sendMode,
                        message: sendMode === 'text' ? sendMessage : undefined,
                      }),
                    });
                    const j = await r.json().catch(() => ({}));
                    setSendResult({ ok: r.ok, body: j });
                  } catch (e) {
                    setSendResult({ ok: false, error: String(e) });
                  } finally {
                    setSendLoading(false);
                  }
                }}
              >
                {sendLoading ? 'A enviar…' : 'Enviar via Meta'}
              </Button>
              {sendResult && (
                <Alert color={sendResult.ok ? 'success' : 'danger'} className="mt-2 mb-0 small">
                  <pre className="mb-0 text-wrap" style={{ fontSize: 11 }}>
                    {JSON.stringify(sendResult.body ?? sendResult, null, 2)}
                  </pre>
                </Alert>
              )}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
