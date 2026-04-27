import { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Badge,
  Button,
  Collapse,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  FormGroup,
  UncontrolledTooltip,
} from 'reactstrap';
import {
  mockKanban,
  mockActiveListings,
  mockLeadInterestedListingId,
  mockLeadEmails,
  getConversationForLead,
  listingLabelById,
  sumFechadoDealValues,
  formatBRLFromNumber,
  funnelStageDefinitions,
  KANBAN_COLUMNS,
  mockUser,
} from './mockData';
import { loadKanban, saveKanban, appendAuditLog, loadAuditLog, loadInterestMap, saveInterestMap } from './leadMasterStorage';

export default function CRM() {
  const [kanban, setKanban] = useState(() => loadKanban(mockKanban));
  const [interestByLead, setInterestByLead] = useState(() => loadInterestMap(mockLeadInterestedListingId));
  const [modal, setModal] = useState(null);
  const [draftListing, setDraftListing] = useState('');
  const [auditOpen, setAuditOpen] = useState(false);
  const [audit, setAudit] = useState(() => loadAuditLog());

  const fechadoSum = useMemo(() => sumFechadoDealValues(kanban), [kanban]);
  const fechadoCount = kanban.Fechado?.length ?? 0;

  const refreshAudit = () => setAudit(loadAuditLog());

  const openLead = useCallback(
    (column, lead) => {
      setModal({ column, lead });
      setDraftListing(interestByLead[lead.id] || '');
    },
    [interestByLead]
  );

  const closeModal = () => setModal(null);

  const saveInterest = () => {
    if (!modal) return;
    const next = { ...interestByLead, [modal.lead.id]: draftListing || null };
    setInterestByLead(next);
    saveInterestMap(next);
    closeModal();
  };

  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceCol = source.droppableId;
    const destCol = destination.droppableId;
    const moving = kanban[sourceCol][source.index];
    if (!moving || moving.id !== draggableId) return;

    if (sourceCol !== destCol) {
      const ok = window.confirm(`Mover "${moving.name}" de "${sourceCol}" para "${destCol}"?`);
      if (!ok) return;
    }

    setKanban((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      const [removed] = next[sourceCol].splice(source.index, 1);
      next[destCol].splice(destination.index, 0, removed);
      saveKanban(next);
      if (sourceCol !== destCol) {
        appendAuditLog({
          user: mockUser.name,
          action: 'move_lead',
          from: sourceCol,
          to: destCol,
          leadId: removed.id,
          leadName: removed.name,
        });
        refreshAudit();
      }
      return next;
    });
  };

  return (
    <div className="p-4">
      <h2 className="h4 mb-1">Leads (CRM)</h2>
      <p className="text-muted small mb-4">
        Arraste pelo ícone <strong>⠿</strong> à esquerda do card (segure e solte na outra coluna). Ao mudar de etapa,
        confirme no diálogo. <strong>Log de auditoria</strong> local. Clique no texto do card para o modal ou abra o{' '}
        <strong>perfil completo</strong>.
      </p>

      <DragDropContext onDragEnd={onDragEnd}>
        {/*
          Não use overflow-auto aqui: ancestrais com overflow quebram o sensor de arraste do @hello-pangea/dnd.
          O scroll horizontal fica no body / área principal; as colunas têm min-width fixo.
        */}
        <div className="d-flex gap-3 flex-nowrap pb-2 lm-kanban-dnd-row">
          {KANBAN_COLUMNS.map((col) => {
            const def = funnelStageDefinitions.find((d) => d.id === col);
            const hintId = `lm-funnel-hint-${col}`;
            return (
              <div key={col} className="lm-kanban-col flex-shrink-0">
                <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-1">
                  <div className="d-flex align-items-center gap-1">
                    <strong className="small" id={hintId}>
                      {col}
                    </strong>
                    <span className="text-muted small" style={{ cursor: 'help' }}>
                      ⓘ
                    </span>
                    <UncontrolledTooltip placement="top" target={hintId}>
                      {def?.hint}
                    </UncontrolledTooltip>
                  </div>
                  <div className="d-flex align-items-center gap-1 flex-wrap justify-content-end">
                    <Badge pill color="light" className="text-dark border">
                      {kanban[col]?.length ?? 0}
                    </Badge>
                    {col === 'Fechado' && (
                      <Badge pill color="success" className="border border-success">
                        Σ {formatBRLFromNumber(fechadoSum)}
                      </Badge>
                    )}
                  </div>
                </div>
                {def && (
                  <p className="small text-muted mb-2 lh-sm">
                    <strong>Checklist:</strong> {def.checklist.join(' · ')}
                  </p>
                )}
                {col === 'Fechado' && (
                  <p className="small text-muted mb-2 lh-sm">
                    Soma dos valores nos cards ({fechadoCount} negócios mock): referência de comissão / taxa.
                  </p>
                )}
                <Droppable droppableId={col} ignoreContainerClipping>
                  {(dropProvided) => (
                    <div
                      ref={dropProvided.innerRef}
                      {...dropProvided.droppableProps}
                      className="lm-kanban-droplist"
                      style={{ minHeight: 72 }}
                    >
                      {(kanban[col] ?? []).map((lead, index) => (
                        <Draggable key={lead.id} draggableId={lead.id} index={index}>
                          {(dragProvided, snapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              className="lm-kanban-card mb-2"
                              style={{
                                ...dragProvided.draggableProps.style,
                                boxShadow: snapshot.isDragging ? '0 8px 24px rgba(15,23,42,0.12)' : undefined,
                              }}
                            >
                              <div className="d-flex align-items-stretch gap-1">
                                {/* dragHandle em <div>: <button> costuma bloquear pointerdown do dnd */}
                                <div
                                  {...dragProvided.dragHandleProps}
                                  className="lm-kanban-drag-handle text-muted flex-shrink-0"
                                  aria-label="Arrastar para outra coluna"
                                >
                                  ⠿
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-link text-start text-dark text-decoration-none p-0 flex-grow-1"
                                  onClick={() => openLead(col, lead)}
                                >
                                  <div className="fw-semibold">{lead.name}</div>
                                  <div className="text-muted small">{lead.phone}</div>
                                  <div className="small mt-1">{lead.ctx}</div>
                                  <div className="small mt-1 text-primary">
                                    Imóvel: {listingLabelById(interestByLead[lead.id])}
                                  </div>
                                  {lead.value && (
                                    <div className="mt-2 d-flex justify-content-between align-items-center">
                                      <span className="small fw-bold text-success">{lead.value}</span>
                                      <Badge color="success" pill>
                                        {lead.badge}
                                      </Badge>
                                    </div>
                                  )}
                                  <div className="small text-muted mt-1">Abrir detalhes</div>
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {dropProvided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <div className="mt-4">
        <Button color="link" className="px-0" onClick={() => setAuditOpen((o) => !o)}>
          {auditOpen ? 'Ocultar' : 'Ver'} log de movimentações ({audit.length})
        </Button>
        <Collapse isOpen={auditOpen}>
          <div className="border rounded p-3 bg-light small" style={{ maxHeight: 220, overflowY: 'auto' }}>
            {audit.length === 0 && <span className="text-muted">Nenhuma movimentação entre colunas ainda.</span>}
            {audit.map((a, i) => (
              <div key={i} className="mb-2 pb-2 border-bottom">
                <span className="text-muted">{new Date(a.at).toLocaleString('pt-BR')}</span> —{' '}
                <strong>{a.user}</strong>: {a.leadName} ({a.leadId}) de <em>{a.from}</em> → <em>{a.to}</em>
              </div>
            ))}
          </div>
        </Collapse>
      </div>

      {modal && (
        <Modal isOpen toggle={closeModal} size="lg" centered>
          <ModalHeader toggle={closeModal}>
            {modal.lead.name} <span className="text-muted fw-normal small">— etapa: {modal.column}</span>
          </ModalHeader>
          <ModalBody>
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <div className="small text-muted">WhatsApp</div>
                <div className="fw-semibold">{modal.lead.phone}</div>
              </div>
              <div className="col-md-6">
                <div className="small text-muted">E-mail</div>
                <div className="fw-semibold">{mockLeadEmails[modal.lead.id] || '—'}</div>
              </div>
              <div className="col-12">
                <div className="small text-muted">Contexto no funil</div>
                <div>{modal.lead.ctx}</div>
              </div>
            </div>

            <div className="mb-3">
              <Button tag={Link} color="primary" size="sm" to={`/leadmaster/leads/${modal.lead.id}`}>
                Abrir perfil completo do lead
              </Button>
            </div>

            <FormGroup>
              <Label for="crm-lead-listing">Qual imóvel este lead está interessado?</Label>
              <Input
                id="crm-lead-listing"
                type="select"
                value={draftListing}
                onChange={(e) => setDraftListing(e.target.value)}
              >
                <option value="">Selecione…</option>
                {mockActiveListings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title} — {l.price} ({l.neighborhood})
                  </option>
                ))}
              </Input>
              <small className="text-muted d-block mt-1">Persistido no navegador (localStorage) junto com o funil.</small>
            </FormGroup>

            <h6 className="text-muted text-uppercase small mb-2">Histórico de conversa</h6>
            <p className="small text-muted mb-2">WhatsApp, ligação e notas internas.</p>
            <div className="border rounded p-3 bg-light" style={{ maxHeight: 220, overflowY: 'auto' }}>
              {getConversationForLead(modal.lead.id).length === 0 ? (
                <span className="text-muted small">Sem histórico mock.</span>
              ) : (
                getConversationForLead(modal.lead.id).map((m, i) => (
                  <div key={i} className="mb-2 pb-2 border-bottom border-white">
                    <div className="d-flex flex-wrap gap-2 align-items-center mb-1">
                      <Badge color={m.via === 'WhatsApp' ? 'success' : 'secondary'} pill className="small">
                        {m.via}
                      </Badge>
                      <span className="small fw-semibold">{m.papel}</span>
                      <span className="small text-muted ms-auto">{m.quando}</span>
                    </div>
                    <div className="small">{m.texto}</div>
                  </div>
                ))
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="light" onClick={closeModal}>
              Fechar
            </Button>
            <Button color="primary" onClick={saveInterest}>
              Salvar imóvel de interesse
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
