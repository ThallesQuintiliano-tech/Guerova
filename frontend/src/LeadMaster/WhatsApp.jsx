import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  CardBody,
  CardTitle,
  ListGroup,
  ListGroupItem,
  Badge,
  Button,
  Input,
  Label,
  FormGroup,
  Alert,
} from 'reactstrap';
import { mockWhatsAppChats, getWhatsappOnlyMessages } from './mockData';

/** fetch() só aceita valores de cabeçalho em ISO-8859-1; remove caracteres invisíveis / Unicode inválidos. */
function headerValueLatin1(value) {
  return Array.from(String(value).trim())
    .filter((ch) => {
      const c = ch.charCodeAt(0);
      return c >= 0 && c <= 255;
    })
    .join('');
}

export default function WhatsApp() {
  const [apiStatus, setApiStatus] = useState(null);
  const [sendTo, setSendTo] = useState(() =>
    String(import.meta.env.VITE_WHATSAPP_DEFAULT_RECIPIENT ?? '').replace(/\D/g, '')
  );
  const [sendMode, setSendMode] = useState('hello_world_template');
  const [sendMessage, setSendMessage] = useState('');
  const [bridgeSecret, setBridgeSecret] = useState('');
  const [sendResult, setSendResult] = useState(null);
  const [sendLoading, setSendLoading] = useState(false);

  const [selectedId, setSelectedId] = useState(mockWhatsAppChats[0]?.id ?? null);

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

  const selected = useMemo(
    () => mockWhatsAppChats.find((c) => c.id === selectedId) || null,
    [selectedId]
  );

  const thread = useMemo(
    () => (selected?.leadId ? getWhatsappOnlyMessages(selected.leadId) : []),
    [selected]
  );

  return (
    <div className="p-4">
      <h2 className="h4 mb-1">WhatsApp</h2>
      <p className="text-muted small mb-4">
        Inbox mock com <strong>histórico das conversas</strong>. A ligação real ao WhatsApp é pela{' '}
        <strong>Cloud API (Meta)</strong> no Laravel — configure o <code>backend/.env</code> (ver README do repositório).
        O CRM continua em <Link to="/leadmaster/crm">CRM</Link>.
      </p>
      {apiStatus?.error && (
        <Alert color="warning" className="py-2 small">
          Não foi possível ler <code>/api/whatsapp/status</code>. Confirme se o Laravel está em{' '}
          <code>http://127.0.0.1:8000</code> e o Vite com proxy <code>/api</code>.
        </Alert>
      )}
      {apiStatus && !apiStatus.error && (
        <Alert
          color={apiStatus.configured ? 'success' : apiStatus.webhook_verify_token_set ? 'info' : 'secondary'}
          className="py-2 small mb-3"
        >
          <div className="fw-semibold mb-1">Estado da integração Meta</div>
          <ul className="mb-0 ps-3">
            <li>
              <strong>Webhook</strong> (Meta chama o teu servidor):{' '}
              {apiStatus.webhook_verify_token_set ? (
                <>
                  <span className="text-success">pronto</span> — use o mesmo valor de{' '}
                  <code>WHATSAPP_WEBHOOK_VERIFY_TOKEN</code> no painel da Meta + URL HTTPS (ex. ngrok).
                </>
              ) : (
                <>
                  <span className="text-warning">pendente</span> — defina <code>WHATSAPP_WEBHOOK_VERIFY_TOKEN</code> no{' '}
                  <code>backend/.env</code>.
                </>
              )}
            </li>
            <li>
              <strong>Envio de mensagens</strong> (Graph API):{' '}
              {apiStatus.configured ? (
                <span className="text-success">token e Phone number ID definidos — pode testar o envio abaixo.</span>
              ) : (
                <>
                  <span className="text-muted">ainda sem credenciais</span> — no <code>backend/.env</code> preencha{' '}
                  <code>WHATSAPP_ACCESS_TOKEN</code> e <code>WHATSAPP_PHONE_NUMBER_ID</code> (Meta → WhatsApp → API
                  Setup). Isto é independente do webhook estar OK.
                </>
              )}
            </li>
            <li>
              <strong>App Secret</strong> (validar assinatura dos webhooks):{' '}
              {apiStatus.app_secret_set ? (
                <span className="text-success">definido.</span>
              ) : apiStatus.app_secret_skipped_local ? (
                <span className="text-muted">omitido em local (aceita webhook sem assinatura; em produção use o App Secret da Meta).</span>
              ) : (
                <span className="text-warning">defina WHATSAPP_APP_SECRET para a Meta confiar no POST do webhook.</span>
              )}
            </li>
          </ul>
        </Alert>
      )}
      <Row className="g-3">
        <Col md={5}>
          <Card className="lm-card-soft h-100 mb-3">
            <CardBody>
              <CardTitle tag="h6">Cloud API (Meta)</CardTitle>
              <p className="small text-muted mb-2">
                Não usa QR Code: o número é o do <strong>WhatsApp Business</strong> ligado ao app na Meta. Webhook:{' '}
                <code className="small">/api/whatsapp/webhook</code>.
              </p>
              <p className="small text-muted mb-0">
                Em desenvolvimento use um túnel (ex. ngrok) com HTTPS para o Meta conseguir chamar o webhook.
              </p>
            </CardBody>
          </Card>
          <Card className="lm-card-soft h-100">
            <CardBody>
              <CardTitle tag="h6">Enviar mensagem de teste</CardTitle>
              {apiStatus?.bridge_secret_required ? (
                <>
                  <p className="small text-muted">
                    Cabeçalho <code>X-Guerova-Secret</code> = valor de <code>WHATSAPP_BRIDGE_SECRET</code> no{' '}
                    <code>.env</code> do backend.
                  </p>
                  <FormGroup>
                    <Label className="small">Segredo (não fica guardado no browser)</Label>
                    <Input
                      type="password"
                      autoComplete="off"
                      value={bridgeSecret}
                      onChange={(e) => setBridgeSecret(e.target.value)}
                      placeholder="WHATSAPP_BRIDGE_SECRET"
                    />
                  </FormGroup>
                </>
              ) : (
                <Alert color="light" className="py-2 small">
                  Ambiente local: o segredo <code>X-Guerova-Secret</code> não é exigido.
                </Alert>
              )}
              <FormGroup>
                <Label className="small">Para (DDI + DDD + número, só dígitos)</Label>
                <Input value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="5511999999999" />
              </FormGroup>
              <FormGroup>
                <Label className="small">Modo de envio</Label>
                <Input type="select" value={sendMode} onChange={(e) => setSendMode(e.target.value)}>
                  <option value="hello_world_template">Template (hello_world) — recomendado para primeiro contato</option>
                  <option value="text">Texto livre (janela 24h)</option>
                </Input>
              </FormGroup>
              {sendMode === 'text' && (
                <FormGroup>
                  <Label className="small">Mensagem</Label>
                  <Input
                    type="textarea"
                    rows={3}
                    value={sendMessage}
                    onChange={(e) => setSendMessage(e.target.value)}
                    placeholder="Texto (janela de 24h / modelos conforme política Meta)"
                  />
                </FormGroup>
              )}
              <Button
                color="primary"
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
                    if (needsSecret && !secretHeader) {
                      setSendResult({
                        ok: false,
                        error:
                          'Segredo vazio ou com caracteres inválidos. Cola o WHATSAPP_BRIDGE_SECRET (só letras e números) sem espaços ou aspas “curvas”.',
                      });
                      return;
                    }
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
                    setSendResult({ ok: r.ok, status: r.status, body: j });
                  } catch (e) {
                    setSendResult({ ok: false, error: String(e) });
                  } finally {
                    setSendLoading(false);
                  }
                }}
              >
                {sendLoading ? 'A enviar…' : 'Enviar'}
              </Button>
              {sendResult && (
                <Alert color={sendResult.ok ? 'success' : 'danger'} className="mt-3 mb-0 small">
                  <pre className="mb-0 text-wrap" style={{ fontSize: 11 }}>
                    {JSON.stringify(sendResult.body ?? sendResult, null, 2)}
                  </pre>
                </Alert>
              )}
            </CardBody>
          </Card>
        </Col>
        <Col md={7}>
          <Card className="lm-card-soft mb-3">
            <CardBody>
              <CardTitle tag="h6" className="mb-3">
                Conversas recentes
              </CardTitle>
              <ListGroup flush>
                {mockWhatsAppChats.map((c) => (
                  <ListGroupItem
                    key={c.id}
                    className={`d-flex justify-content-between align-items-start px-0 border-light ${
                      c.id === selectedId ? 'bg-body-tertiary' : ''
                    }`}
                    action
                    tag="button"
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                  >
                    <div>
                      <div className="fw-semibold">{c.name}</div>
                      <div className="small text-muted">{c.phone}</div>
                      <div className="small text-muted mt-1">{c.last}</div>
                    </div>
                    <Badge className="text-body bg-body-secondary border">
                      {c.time}
                    </Badge>
                  </ListGroupItem>
                ))}
              </ListGroup>
            </CardBody>
          </Card>
          <Card className="lm-card-soft">
            <CardBody>
              <CardTitle tag="h6" className="mb-3">
                Histórico no WhatsApp
              </CardTitle>
              {!selected ? (
                <p className="text-muted small mb-0">Selecione uma conversa à esquerda.</p>
              ) : (
                <>
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                    <div>
                      <div className="fw-semibold">{selected.name}</div>
                      <div className="small text-muted">{selected.phone}</div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <Badge color="success" pill>
                        Lead {selected.leadId}
                      </Badge>
                      <Button tag={Link} size="sm" color="outline-primary" to={`/leadmaster/leads/${selected.leadId}`}>
                        Perfil completo
                      </Button>
                    </div>
                  </div>
                  <div
                    className="rounded p-3 lm-wa-thread"
                    style={{
                      maxHeight: 360,
                      overflowY: 'auto',
                      background: 'linear-gradient(180deg, #e8f5e9 0%, #f5f5f5 100%)',
                    }}
                  >
                    {thread.length === 0 ? (
                      <span className="text-muted small">Sem mensagens mock para este contato.</span>
                    ) : (
                      thread.map((m, i) => {
                        const outgoing = m.papel === 'Corretor';
                        return (
                          <div
                            key={i}
                            className={`d-flex mb-2 ${outgoing ? 'justify-content-end' : 'justify-content-start'}`}
                          >
                            <div
                              className={`rounded-3 px-3 py-2 small shadow-sm ${
                                outgoing ? 'bg-success text-white' : 'bg-white border'
                              }`}
                              style={{ maxWidth: '85%' }}
                            >
                              <div className="opacity-75" style={{ fontSize: 10 }}>
                                {m.papel} · {m.quando}
                              </div>
                              <div className="mt-1">{m.texto}</div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
