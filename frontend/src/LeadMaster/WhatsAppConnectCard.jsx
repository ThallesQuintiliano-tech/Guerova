import { Button, Card, CardBody, CardTitle, Alert, Spinner } from 'reactstrap';

export default function WhatsAppConnectCard({
  status,
  loading,
  busy,
  error,
  connected,
  awaitingQr,
  connecting,
  onConnect,
  onDisconnect,
}) {

  if (loading) {
    return (
      <Card className="lm-card-soft mb-3">
        <CardBody className="text-center py-4">
          <Spinner size="sm" className="me-2" />
          A carregar conexão WhatsApp…
        </CardBody>
      </Card>
    );
  }

  const bridgeDown = status?.enabled && !status?.bridge_online;
  const disabled = !status?.enabled;

  return (
    <Card className="lm-card-soft mb-3">
      <CardBody>
        <CardTitle tag="h6" className="mb-2">
          Conectar WhatsApp (QR Code)
        </CardTitle>
        <p className="small text-muted mb-3">
          Igual ao <strong>WhatsApp Web</strong>: no telemóvel abra <strong>WhatsApp</strong> (atualizado) →{' '}
          <strong>Aparelhos conectados</strong> → <strong>Conectar um aparelho</strong> → leia o QR abaixo. Mantenha
          esta página aberta até aparecer «Conectado» (pode demorar alguns segundos após o scan).
        </p>
        <ul className="small text-muted mb-3 ps-3">
          <li>Se aparecer «não é possível conectar», clique em <strong>Desconectar</strong> e depois <strong>Gerar novo QR</strong>.</li>
          <li>Remova ligações antigas do WhatsApp Web no telemóvel se tiver muitos aparelhos ligados.</li>
          <li>Use a mesma rede Wi‑Fi no telemóvel e no PC, se possível.</li>
        </ul>

        {error && (
          <Alert color="danger" className="py-2 small">
            {error}
          </Alert>
        )}

        {disabled && (
          <Alert color="warning" className="py-2 small">
            Serviço não configurado. No <code>backend/.env</code> defina{' '}
            <code>WHATSAPP_WEB_BRIDGE_URL=http://127.0.0.1:3100</code> e execute na pasta{' '}
            <code>whatsapp-bridge</code>: <code>npm install</code> e <code>npm start</code>.
          </Alert>
        )}

        {bridgeDown && (
          <Alert color="danger" className="py-2 small">
            O bridge não está a responder ({status?.bridge_url || 'whatsapp-bridge'}).{' '}
            {status?.error || 'Inicie o serviço com npm start em whatsapp-bridge/.'}
          </Alert>
        )}

        {connected && (
          <Alert color="success" className="py-2 small">
            <strong>Conectado</strong>
            {status?.user?.name ? ` — ${status.user.name}` : ''}
            {status?.user?.id ? ` (${status.user.id})` : ''}
          </Alert>
        )}

        {awaitingQr && (
          <div className="text-center mb-3">
            <div
              className="d-inline-block p-3 rounded bg-white border"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}
            >
              <img
                src={status.qrImage}
                alt="QR Code WhatsApp"
                width={280}
                height={280}
                style={{ display: 'block' }}
              />
            </div>
            <p className="small text-muted mt-2 mb-0">
              O código renova automaticamente. Mantenha esta página aberta até aparecer «Conectado».
            </p>
          </div>
        )}

        {connecting && !awaitingQr && (
          <div className="text-center py-3 mb-2">
            <Spinner size="sm" className="me-2" />
            <span className="small text-muted">A preparar sessão…</span>
          </div>
        )}

        {status?.lastError && !error && (
          <Alert color="warning" className="py-2 small">
            {status.lastError}
          </Alert>
        )}

        <div className="d-flex flex-wrap gap-2">
          {!connected && (
            <Button color="success" size="sm" disabled={busy || disabled || bridgeDown} onClick={onConnect}>
              {busy ? 'A iniciar…' : awaitingQr ? 'Gerar novo QR' : 'Mostrar QR Code'}
            </Button>
          )}
          {(connected || awaitingQr || connecting) && (
            <Button color="outline-danger" size="sm" disabled={busy || disabled || bridgeDown} onClick={onDisconnect}>
              {busy ? 'A desligar…' : 'Desconectar'}
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
