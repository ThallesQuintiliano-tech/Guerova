import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardBody, CardTitle, Row, Col, Label, Input, Button, FormText } from 'reactstrap';
import { buildInitialCampaignBriefing, campaignBriefingSections } from './campaignBriefing';

export default function BriefingImovel() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const editCampaign = state?.editCampaign;
  const [briefing, setBriefing] = useState(() =>
    editCampaign?.briefing && typeof editCampaign.briefing === 'object'
      ? { ...buildInitialCampaignBriefing(), ...editCampaign.briefing }
      : buildInitialCampaignBriefing()
  );

  const setField = (id, value) => setBriefing((prev) => ({ ...prev, [id]: value }));

  const onSubmit = (e) => {
    e.preventDefault();
    navigate('/leadmaster/campanha/gerando', {
      state: { briefing, editCampaign: editCampaign || null },
    });
  };

  const renderField = (f) => {
    const label = f.number ? `${f.number}. ${f.label}` : f.label;
    const disabled = Boolean(f.fixed);

    return (
      <Col md={f.type === 'textarea' ? 12 : 6} key={f.id}>
        <Label className="small fw-semibold">{label}</Label>
        {f.type === 'select' ? (
          <Input
            type="select"
            value={briefing[f.id] ?? ''}
            disabled={disabled}
            onChange={(e) => setField(f.id, e.target.value)}
          >
            {(f.options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </Input>
        ) : f.type === 'textarea' ? (
          <Input
            type="textarea"
            rows={f.rows || 3}
            value={briefing[f.id] ?? ''}
            disabled={disabled}
            onChange={(e) => setField(f.id, e.target.value)}
            placeholder={f.placeholder}
          />
        ) : (
          <Input
            type="text"
            value={briefing[f.id] ?? ''}
            disabled={disabled}
            onChange={(e) => setField(f.id, e.target.value)}
            placeholder={f.placeholder}
          />
        )}
        {f.hint ? <FormText color="muted">{f.hint}</FormText> : null}
        {f.fixed ? <FormText color="muted">Valor padrão recomendado para este fluxo.</FormText> : null}
      </Col>
    );
  };

  return (
    <div className="p-4">
      <h2 className="h4 mb-1">{editCampaign ? 'Editar briefing da campanha' : 'Briefing para campanha Meta Ads'}</h2>
      <p className="text-muted small mb-2">
        Modelo completo (campanha → conjunto → anúncio). As perguntas <strong>19 a 21</strong> (texto principal,
        título e descrição) são geradas automaticamente pela <strong>IA (Gemini)</strong> no passo seguinte, com base
        nos dados abaixo.
      </p>
      <p className="text-muted small mb-4">
        Campos fixos (objetivo WhatsApp, posicionamentos, CTA) já vêm pré-preenchidos conforme o playbook da agência.
      </p>
      <form onSubmit={onSubmit}>
        {campaignBriefingSections.map((section) => (
          <Card className="lm-card-soft mb-3" key={section.id}>
            <CardBody>
              <CardTitle tag="h6" className="mb-1 text-primary">
                {section.title}
              </CardTitle>
              {section.subtitle ? <p className="text-muted small mb-3">{section.subtitle}</p> : null}
              <Row className="g-3">{section.fields.map((f) => renderField(f))}</Row>
            </CardBody>
          </Card>
        ))}
        <AlertInfo />
        <div className="d-flex flex-wrap gap-2">
          <Button color="light" className="border" type="button" onClick={() => navigate('/leadmaster/inicio')}>
            Voltar
          </Button>
          <Button color="primary" type="submit" size="lg" className="rounded-pill px-4">
                {editCampaign ? 'Regenerar pacote com IA' : 'Gerar textos e pacote com IA'}
          </Button>
        </div>
      </form>
    </div>
  );
}

function AlertInfo() {
  return (
    <div className="alert alert-light border small mb-3">
      <strong>Será gerado pela IA:</strong> texto principal (primary text), título (headline), descrição secundária,
      variações de copy, roteiro de vídeo, follow-up WhatsApp e checklist para o Gerenciador de Anúncios.
    </div>
  );
}
