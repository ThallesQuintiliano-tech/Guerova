import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardTitle,
  Input,
  ListGroup,
  ListGroupItem,
  Spinner,
} from 'reactstrap';
import { useRef } from 'react';
import { useWhatsAppInbox } from './useWhatsAppInbox';

const MEDIA_PLACEHOLDER_TEXT = new Set(['[imagem]', '[sticker]', '📷 Foto', '[vídeo]', '🎬 Vídeo']);

export default function WhatsAppInbox({ connected }) {
  const inbox = useWhatsAppInbox(connected);

  const {
    selectedChat,
    chats,
    messages,
    loadingChats,
    loadingMessages,
    sending,
    error,
    draft,
    setDraft,
    sendMessage,
    sendToNumber,
    newPhone,
    setNewPhone,
    newContactName,
    setNewContactName,
    newMessage,
    setNewMessage,
    formatTime,
    setSelectedJid,
    selectedJid,
    saveChatName,
    sendImageFile,
    whatsappMessageMediaUrl,
    connected: waConnected,
  } = inbox;

  const imageInputRef = useRef(null);

  const nameLooksLikePhone =
    selectedChat?.phone &&
    selectedChat?.name &&
    selectedChat.name.replace(/\D/g, '') === selectedChat.phone.replace(/\D/g, '');

  const canSendNew = newPhone.replace(/\D/g, '').length >= 10 && newMessage.trim().length > 0;

  return (
    <>
      {!waConnected && (
        <Alert color="info" className="py-2 small mb-3">
          WhatsApp desconectado — abaixo ficam as conversas guardadas pelo Guerova. Conecte de novo para enviar ou
          receber mensagens novas.
        </Alert>
      )}
      {error && (
        <Alert color="warning" className="py-2 small mb-3">
          {error}
        </Alert>
      )}
      <div className="row g-3">
        <div className="col-md-5">
          <Card className="lm-card-soft mb-3">
            <CardBody>
              <CardTitle tag="h6" className="mb-2">
                Nova conversa
              </CardTitle>
              <p className="small text-muted mb-2">
                Digite o número com DDI (ex. 5511999999999). Só esta conversa entra na lista — o resto do WhatsApp não
                aparece aqui.
              </p>
              <Input
                className="mb-2"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="5511999999999"
                inputMode="numeric"
              />
              <Input
                className="mb-2"
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                placeholder="Nome do contacto (opcional)"
              />
              <Input
                type="textarea"
                rows={2}
                className="mb-2"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Primeira mensagem…"
              />
              <Button
                color="primary"
                size="sm"
                disabled={!waConnected || sending || !canSendNew}
                onClick={sendToNumber}
              >
                {sending ? 'A enviar…' : 'Enviar e abrir conversa'}
              </Button>
            </CardBody>
          </Card>
          <Card className="lm-card-soft h-100">
            <CardBody>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <CardTitle tag="h6" className="mb-0">
                  Conversas
                </CardTitle>
                {loadingChats && <Spinner size="sm" />}
              </div>
              {chats.length === 0 ? (
                <p className="text-muted small mb-0">
                  {loadingChats
                    ? 'A sincronizar conversas do WhatsApp…'
                    : 'Nenhuma conversa pelo Guerova ainda. Use «Nova conversa» ou envie mensagem a um número.'}
                </p>
              ) : (
                <ListGroup flush style={{ maxHeight: 480, overflowY: 'auto' }}>
                  {chats.map((c) => (
                    <ListGroupItem
                      key={c.id}
                      action
                      tag="button"
                      type="button"
                      className={`px-0 border-light text-start ${c.id === selectedJid ? 'bg-body-tertiary' : ''}`}
                      onClick={() => setSelectedJid(c.id)}
                    >
                      <div className="d-flex justify-content-between gap-2">
                        <div className="min-w-0">
                          <div className="fw-semibold text-truncate">{c.name}</div>
                          {c.phone && c.phone !== c.name && (
                            <div className="small text-muted">{c.phone}</div>
                          )}
                          <div className="small text-muted text-truncate mt-1">
                            {c.lastMessage || (c.lastAt ? '' : '—')}
                          </div>
                        </div>
                        <div className="text-end flex-shrink-0">
                          <div className="small text-muted">{formatTime(c.lastAt)}</div>
                          {c.unreadCount > 0 && (
                            <Badge color="success" pill className="mt-1">
                              {c.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </ListGroupItem>
                  ))}
                </ListGroup>
              )}
            </CardBody>
          </Card>
        </div>
        <div className="col-md-7">
          <Card className="lm-card-soft h-100">
            <CardBody className="d-flex flex-column">
              {!selectedChat ? (
                <p className="text-muted small mb-0">
                  Selecione uma conversa na lista ou use <strong>Nova conversa</strong> para mandar mensagem a um número.
                </p>
              ) : (
                <>
                  <div className="mb-3">
                    {nameLooksLikePhone ? (
                      <div className="d-flex flex-wrap gap-2 align-items-center">
                        <Input
                          bsSize="sm"
                          className="flex-grow-1"
                          style={{ maxWidth: 280 }}
                          placeholder="Nome do contacto"
                          defaultValue=""
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v) {
                              saveChatName(v);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const v = e.currentTarget.value.trim();
                              if (v) {
                                saveChatName(v);
                              }
                            }
                          }}
                        />
                        <span className="small text-muted">{selectedChat.phone}</span>
                      </div>
                    ) : (
                      <>
                        <div className="fw-semibold">{selectedChat.name}</div>
                        {selectedChat.phone && selectedChat.phone !== selectedChat.name && (
                          <div className="small text-muted">{selectedChat.phone}</div>
                        )}
                      </>
                    )}
                  </div>
                  <div
                    className="rounded p-3 mb-3 flex-grow-1 lm-wa-thread"
                    style={{
                      minHeight: 280,
                      maxHeight: 400,
                      overflowY: 'auto',
                      background: 'linear-gradient(180deg, #e8f5e9 0%, #f5f5f5 100%)',
                    }}
                  >
                    {loadingMessages && messages.length === 0 ? (
                      <div className="text-center py-4">
                        <Spinner size="sm" className="me-2" />
                        <span className="small text-muted">A carregar mensagens…</span>
                      </div>
                    ) : messages.length === 0 ? (
                      <span className="text-muted small">Sem mensagens nesta conversa ainda.</span>
                    ) : (
                      messages.map((m) => (
                        <div
                          key={m.id}
                          className={`d-flex mb-2 ${m.fromMe ? 'justify-content-end' : 'justify-content-start'}`}
                        >
                          <div
                            className={`rounded-3 px-3 py-2 small shadow-sm ${
                              m.fromMe ? 'bg-success text-white' : 'bg-white border'
                            }`}
                            style={{ maxWidth: '85%' }}
                          >
                            <div className="opacity-75" style={{ fontSize: 10 }}>
                              {m.fromMe ? 'Você' : selectedChat.name} · {formatTime(m.at)}
                            </div>
                            <div className="mt-1">
                              {m.hasMedia && selectedJid && (
                                <>
                                  {m.type === 'video' ? (
                                    <video
                                      controls
                                      src={whatsappMessageMediaUrl(selectedJid, m.id)}
                                      className="d-block rounded mb-1"
                                      style={{ maxWidth: '100%', maxHeight: 240 }}
                                    />
                                  ) : (
                                    <img
                                      src={whatsappMessageMediaUrl(selectedJid, m.id)}
                                      alt=""
                                      className="d-block rounded mb-1"
                                      style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'contain' }}
                                      loading="lazy"
                                    />
                                  )}
                                </>
                              )}
                              {m.caption ? <div>{m.caption}</div> : null}
                              {m.text &&
                              (!m.hasMedia ||
                                (m.caption && m.text === m.caption) ||
                                !MEDIA_PLACEHOLDER_TEXT.has(m.text)) ? (
                                <div>{m.text}</div>
                              ) : null}
                              {!m.hasMedia && !m.caption && !m.text ? '—' : null}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="d-flex gap-2 align-items-end">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="d-none"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          sendImageFile(file);
                        }
                        e.target.value = '';
                      }}
                    />
                    <Button
                      color="light"
                      className="flex-shrink-0"
                      disabled={!waConnected || sending}
                      onClick={() => imageInputRef.current?.click()}
                      title="Enviar imagem"
                    >
                      📷
                    </Button>
                    <Input
                      type="textarea"
                      rows={2}
                      className="flex-grow-1"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Mensagem ou legenda da imagem…"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <Button
                      color="success"
                      className="flex-shrink-0"
                      disabled={!waConnected || sending || !draft.trim()}
                      onClick={sendMessage}
                    >
                      {sending ? '…' : 'Enviar'}
                    </Button>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
