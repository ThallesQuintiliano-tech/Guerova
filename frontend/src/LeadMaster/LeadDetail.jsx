import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardTitle,
  Col,
  FormGroup,
  Input,
  Label,
  Nav,
  NavItem,
  NavLink,
  Row,
  Table,
} from 'reactstrap';
import {
  mockKanban,
  mockActiveListings,
  mockLeadInterestedListingId,
  mockLeadEmails,
  mockLeadLgpd,
  mockUser,
  getConversationForLead,
  getWhatsappOnlyMessages,
  listingLabelById,
  findLeadInKanban,
  funnelStageDefinitions,
} from './mockData';
import { loadKanban, loadInterestMap, saveInterestMap, loadTasks, saveTasks } from './leadMasterStorage';

const TABS = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'imovel', label: 'Imóvel de interesse' },
  { id: 'historico', label: 'Histórico completo' },
  { id: 'docs', label: 'Documentos' },
  { id: 'lgpd', label: 'LGPD' },
];

const mockDocuments = (leadId) => [
  { id: `${leadId}-doc1`, nome: 'Simulação_financiamento.pdf', tipo: 'Financeiro', quando: '05/04/2025' },
  { id: `${leadId}-doc2`, nome: 'Comprovante_residencia.jpg', tipo: 'Cadastro', quando: '—' },
];

function uid() {
  return `t-${Date.now().toString(36)}`;
}

export default function LeadDetail() {
  const { leadId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState('resumo');
  const [kanban, setKanban] = useState(() => loadKanban(mockKanban));
  const [interest, setInterest] = useState(() => loadInterestMap(mockLeadInterestedListingId));
  const [draftListing, setDraftListing] = useState('');
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');

  const located = useMemo(() => findLeadInKanban(kanban, leadId), [kanban, leadId]);
  const lead = located?.lead;
  const column = located?.column;

  useEffect(() => {
    setKanban(loadKanban(mockKanban));
  }, [leadId]);

  useEffect(() => {
    if (!leadId) return;
    setInterest(loadInterestMap(mockLeadInterestedListingId));
    setDraftListing(loadInterestMap(mockLeadInterestedListingId)[leadId] || '');
    setTasks(loadTasks(leadId));
  }, [leadId]);

  const lgpd = mockLeadLgpd[leadId] || {
    origin: 'Não informado (mock)',
    consent: '—',
    consentAt: '—',
    retentionNote: 'Defina política interna em produção.',
  };

  const saveListing = () => {
    const next = { ...interest, [leadId]: draftListing || null };
    setInterest(next);
    saveInterestMap(next);
  };

  const addTask = () => {
    const t = newTask.trim();
    if (!t || !leadId) return;
    const next = [...tasks, { id: uid(), title: t, due: '', done: false }];
    setTasks(next);
    saveTasks(leadId, next);
    setNewTask('');
  };

  const toggleTask = (id) => {
    const next = tasks.map((x) => (x.id === id ? { ...x, done: !x.done } : x));
    setTasks(next);
    saveTasks(leadId, next);
  };

  const exportJson = useCallback(() => {
    if (!lead) return;
    const blob = new Blob(
      [
        JSON.stringify(
          {
            exportadoEm: new Date().toISOString(),
            lead,
            etapa: column,
            imovelInteresse: listingLabelById(interest[leadId]),
            historico: getConversationForLead(leadId),
            lgpd,
            tarefas: tasks,
          },
          null,
          2
        ),
      ],
      { type: 'application/json' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lead-${leadId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [lead, column, interest, leadId, lgpd, tasks]);

  if (!leadId || !lead) {
    return (
      <div className="p-4">
        <h2 className="h5">Lead não encontrado</h2>
        <p className="text-muted small">Verifique o link ou volte ao CRM.</p>
        <Button tag={Link} color="primary" to="/leadmaster/crm">
          Ir ao CRM
        </Button>
      </div>
    );
  }

  const stageHint = funnelStageDefinitions.find((s) => s.id === column);

  return (
    <div className="p-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h2 className="h4 mb-1">{lead.name}</h2>
          <p className="text-muted small mb-0">
            Perfil único do lead · etapa atual:{' '}
            <Badge color="primary" pill>
              {column}
            </Badge>{' '}
            <span className="text-muted">({lead.id})</span>
          </p>
        </div>
        <div className="d-flex flex-wrap gap-2">
          <Button color="outline-secondary" size="sm" onClick={exportJson}>
            Exportar JSON (titular / backup)
          </Button>
          <Button tag={Link} color="outline-primary" size="sm" to="/leadmaster/crm">
            Voltar ao funil
          </Button>
        </div>
      </div>

      <Nav pills className="mb-3 flex-wrap gap-1">
        {TABS.map((t) => (
          <NavItem key={t.id}>
            <NavLink
              href="#"
              className={tab === t.id ? 'active' : ''}
              onClick={(e) => {
                e.preventDefault();
                setTab(t.id);
              }}
            >
              {t.label}
            </NavLink>
          </NavItem>
        ))}
      </Nav>

      {tab === 'resumo' && (
        <Row className="g-3">
          <Col md={6}>
            <Card className="lm-card-soft">
              <CardBody>
                <CardTitle tag="h6">Contato</CardTitle>
                <p className="small mb-1">
                  <strong>WhatsApp:</strong> {lead.phone}
                </p>
                <p className="small mb-1">
                  <strong>E-mail:</strong> {mockLeadEmails[leadId] || '—'}
                </p>
                <p className="small mb-0">
                  <strong>Contexto:</strong> {lead.ctx}
                </p>
              </CardBody>
            </Card>
          </Col>
          <Col md={6}>
            <Card className="lm-card-soft">
              <CardBody>
                <CardTitle tag="h6">Etapa do funil</CardTitle>
                <p className="small mb-2">{stageHint?.hint}</p>
                <div className="small fw-semibold mb-1">Checklist sugerido</div>
                <ul className="small ps-3 mb-0">
                  {(stageHint?.checklist || []).map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </Col>
          <Col xs={12}>
            <Card className="lm-card-soft">
              <CardBody>
                <CardTitle tag="h6">Lembretes e tarefas</CardTitle>
                <p className="small text-muted">Salvas no navegador ({mockUser.name}) — substituir por API em produção.</p>
                <div className="d-flex flex-wrap gap-2 mb-3">
                  <Input
                    placeholder="Ex.: Ligar amanhã 10h para confirmar visita"
                    value={newTask}
                    onChange={(e) => setNewTask(e.target.value)}
                    style={{ maxWidth: 360 }}
                  />
                  <Button color="primary" type="button" onClick={addTask}>
                    Adicionar
                  </Button>
                </div>
                <ul className="list-unstyled small mb-0">
                  {tasks.length === 0 && <li className="text-muted">Nenhuma tarefa ainda.</li>}
                  {tasks.map((t) => (
                    <li key={t.id} className="mb-2 d-flex align-items-center gap-2">
                      <Input type="checkbox" checked={t.done} onChange={() => toggleTask(t.id)} />
                      <span className={t.done ? 'text-decoration-line-through text-muted' : ''}>{t.title}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </Col>
        </Row>
      )}

      {tab === 'whatsapp' && (
        <Card className="lm-card-soft">
          <CardBody>
            <CardTitle tag="h6">Somente WhatsApp</CardTitle>
            <p className="small text-muted mb-3">Histórico das interações feitas pelo canal WhatsApp (mock).</p>
            <div className="rounded p-3 bg-light" style={{ maxHeight: 400, overflowY: 'auto' }}>
              {getWhatsappOnlyMessages(leadId).map((m, i) => (
                <div key={i} className="mb-3 pb-2 border-bottom border-white">
                  <Badge color={m.papel === 'Corretor' ? 'primary' : 'success'} pill className="me-2">
                    {m.papel}
                  </Badge>
                  <span className="small text-muted">{m.quando}</span>
                  <div className="small mt-1">{m.texto}</div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {tab === 'imovel' && (
        <Card className="lm-card-soft">
          <CardBody>
            <CardTitle tag="h6">Imóvel de interesse</CardTitle>
            <FormGroup>
              <Label for="ld-listing">Qual imóvel este lead está interessado?</Label>
              <Input id="ld-listing" type="select" value={draftListing} onChange={(e) => setDraftListing(e.target.value)}>
                <option value="">Selecione…</option>
                {mockActiveListings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title} — {l.price}
                  </option>
                ))}
              </Input>
            </FormGroup>
            <Button color="primary" onClick={saveListing}>
              Salvar
            </Button>
            <p className="small text-muted mt-3 mb-0">Pré-visualização: {listingLabelById(draftListing || interest[leadId])}</p>
          </CardBody>
        </Card>
      )}

      {tab === 'historico' && (
        <Card className="lm-card-soft">
          <CardBody>
            <CardTitle tag="h6">Histórico completo</CardTitle>
            <p className="small text-muted mb-3">WhatsApp, ligações e notas internas (mock).</p>
            <div className="rounded p-3 bg-light" style={{ maxHeight: 420, overflowY: 'auto' }}>
              {getConversationForLead(leadId).map((m, i) => (
                <div key={i} className="mb-3 pb-2 border-bottom border-white">
                  <Badge color="secondary" pill className="me-1">
                    {m.via}
                  </Badge>
                  <span className="small fw-semibold">{m.papel}</span>
                  <span className="small text-muted float-end">{m.quando}</span>
                  <div className="small mt-1">{m.texto}</div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {tab === 'docs' && (
        <Card className="lm-card-soft">
          <CardBody>
            <CardTitle tag="h6">Documentos</CardTitle>
            <p className="small text-muted mb-3">Exemplo de anexos — em produção integre Google Drive / bucket.</p>
            <Table size="sm" responsive className="mb-0 small">
              <thead>
                <tr>
                  <th>Arquivo</th>
                  <th>Tipo</th>
                  <th>Enviado em</th>
                </tr>
              </thead>
              <tbody>
                {mockDocuments(leadId).map((d) => (
                  <tr key={d.id}>
                    <td>{d.nome}</td>
                    <td>{d.tipo}</td>
                    <td>{d.quando}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>
      )}

      {tab === 'lgpd' && (
        <Card className="lm-card-soft">
          <CardBody>
            <CardTitle tag="h6">Transparência LGPD (mock)</CardTitle>
            <ul className="small mb-3">
              <li>
                <strong>Origem:</strong> {lgpd.origin}
              </li>
              <li>
                <strong>Consentimento / base:</strong> {lgpd.consent}
              </li>
              <li>
                <strong>Registrado em:</strong> {lgpd.consentAt}
              </li>
              <li>
                <strong>Retenção sugerida:</strong> {lgpd.retentionNote}
              </li>
            </ul>
            <p className="small text-muted mb-0">
              O botão <strong>Exportar JSON</strong> no topo simula um pacote de dados para o titular ou para auditoria
              interna.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
