import { useLocation, useNavigate } from 'react-router-dom';
import { Row, Col, Card, CardBody, CardTitle, Button, Badge, Alert } from 'reactstrap';
import { buildCampaignPackFromBriefing } from './mockData';

export default function PacoteCampanha() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const briefing = state?.briefing;

  if (!briefing) {
    return (
      <div className="p-4">
        <Alert color="warning">
          Nenhum briefing encontrado. Volte e preencha o briefing do imóvel.
        </Alert>
        <Button color="primary" type="button" onClick={() => navigate('/leadmaster/campanha/briefing')}>
          Ir para o briefing
        </Button>
      </div>
    );
  }

  const pack = buildCampaignPackFromBriefing(briefing);

  const copyBlock = (label, items) => (
    <Card className="lm-card-soft mb-3">
      <CardBody>
        <div className="d-flex justify-content-between align-items-center mb-2">
          <CardTitle tag="h6" className="mb-0 text-primary">
            {label}
          </CardTitle>
          <Button
            size="sm"
            color="light"
            className="border"
            type="button"
            onClick={() => {
              const text = Array.isArray(items) ? items.join('\n\n') : String(items);
              navigator.clipboard.writeText(text);
            }}
          >
            Copiar
          </Button>
        </div>
        {Array.isArray(items) ? (
          <ul className="small mb-0 ps-3">
            {items.map((x) => (
              <li key={x} className="mb-2">
                {x}
              </li>
            ))}
          </ul>
        ) : (
          <p className="small mb-0">{items}</p>
        )}
      </CardBody>
    </Card>
  );

  return (
    <div className="p-4">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
        <div>
          <h2 className="h4 mb-1">Pacote para o Gerenciador de Negócios</h2>
          <p className="text-muted small mb-0">
            A IA <strong>não substitui</strong> o briefing: ela usa as <strong>variáveis que você preencheu</strong>{' '}
            para gerar textos prontos — você cola nos campos de criação de anúncio (ou usa integração futura).
          </p>
        </div>
        <div className="d-flex gap-2">
          <Button outline color="secondary" onClick={() => navigate('/leadmaster/campanha/briefing')}>
            Ajustar briefing
          </Button>
          <Button color="success" onClick={() => navigate('/leadmaster/campanha/refinamento', { state: { briefing } })}>
            Refinar campanha
          </Button>
        </div>
      </div>

      <Alert color="light" className="border small mb-4">
        <strong>Publicar sem abrir o Gerenciador?</strong> Existem soluções de mercado que exploram fluxo guiado /
        API (ex.:{' '}
        <a href="https://app.giobrain.com/register-landing" target="_blank" rel="noopener noreferrer">
          GioBrain
        </a>
        ). Integração oficial com a Meta exige permissões, revisão de app e políticas — podemos evoluir o produto
        nessa direção após validar o pacote “copiar e colar”.
      </Alert>

      <Row className="g-3">
        <Col lg={6}>
          <Card className="lm-card-soft mb-3">
            <CardBody>
              <CardTitle tag="h6" className="text-primary">
                Objetivo sugerido (Meta)
              </CardTitle>
              <Badge color="info" className="mb-2">
                {pack.metaObjective}
              </Badge>
              <p className="small text-muted mb-0">
                Público rascunho: {pack.audienceDraft.age} · {pack.audienceDraft.geoText}
              </p>
              <p className="small mb-0 mt-2">
                <strong>Interesses sugeridos:</strong> {pack.audienceDraft.interests.join(', ')}
              </p>
            </CardBody>
          </Card>
          {copyBlock('Títulos (até 40 caracteres cada)', pack.headlines)}
          {copyBlock('Textos principais', pack.primaryTexts)}
          {copyBlock('Descrições', pack.descriptions)}
          {copyBlock('Botões / CTAs', pack.ctas)}
          {copyBlock('Legendas de link', pack.linkCaptionSuggestions)}
        </Col>
        <Col lg={6}>
          {copyBlock('Ideias de imagem (criativo estático)', pack.imageIdeas)}
          {copyBlock('Roteiro sugerido — vídeo vertical 9:16 (Reels / Stories)', pack.videoScript)}
          <Card className="lm-card-soft">
            <CardBody>
              <CardTitle tag="h6" className="text-primary">
                Mensagem de follow-up (WhatsApp)
              </CardTitle>
              <pre
                className="small bg-light p-3 rounded border mb-3"
                style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}
              >
                {pack.whatsappFollowup}
              </pre>
              <p className="small text-muted mb-0">
                Post de referência:{' '}
                <a href={briefing.instagramListingUrl} target="_blank" rel="noopener noreferrer">
                  {briefing.instagramListingUrl}
                </a>
              </p>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
