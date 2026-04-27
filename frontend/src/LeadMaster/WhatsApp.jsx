import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Row, Col, Card, CardBody, CardTitle, ListGroup, ListGroupItem, Badge, Button } from 'reactstrap';
import { mockWhatsAppChats, getWhatsappOnlyMessages } from './mockData';

export default function WhatsApp() {
  const [selectedId, setSelectedId] = useState(mockWhatsAppChats[0]?.id ?? null);

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
        Inbox mock com <strong>histórico das conversas</strong> feitas pelo WhatsApp. O mesmo lead pode ser aberto no{' '}
        <Link to="/leadmaster/crm">CRM</Link> para ver timeline completa (inclui notas internas).
      </p>
      <Row className="g-3">
        <Col md={5}>
          <Card className="lm-card-soft h-100">
            <CardBody>
              <CardTitle tag="h6">Conectar número (Business)</CardTitle>
              <p className="small text-muted">
                Fluxo mockado: escaneie o QR Code como no WhatsApp Web para vincular à conta comercial.
              </p>
              <div
                className="border rounded d-flex align-items-center justify-content-center mx-auto my-3 bg-light"
                style={{ width: 180, height: 180 }}
              >
                <span className="text-muted small text-center px-2">QR Code (mock)</span>
              </div>
              <ol className="small ps-3 mb-0">
                <li>Abra o WhatsApp no celular</li>
                <li>Aparelhos conectados → Conectar um aparelho</li>
                <li>Aponte a câmera para este QR</li>
              </ol>
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
                      c.id === selectedId ? 'bg-light' : ''
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
                    <Badge color="light" className="text-muted border">
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
