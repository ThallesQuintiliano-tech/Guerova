import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardTitle, Row, Col, Label, Input, Button } from 'reactstrap';
import { briefingFieldDefinitions } from './mockData';

function initialBriefing() {
  const o = {};
  briefingFieldDefinitions.forEach((f) => {
    o[f.id] = f.defaultValue ?? '';
  });
  return o;
}

export default function BriefingImovel() {
  const navigate = useNavigate();
  const [briefing, setBriefing] = useState(initialBriefing);

  const setField = (id, value) => setBriefing((prev) => ({ ...prev, [id]: value }));

  const fields = useMemo(() => briefingFieldDefinitions, []);

  const onSubmit = (e) => {
    e.preventDefault();
    navigate('/leadmaster/campanha/gerando', { state: { briefing } });
  };

  return (
    <div className="p-4">
      <h2 className="h4 mb-1">Briefing do imóvel</h2>
      <p className="text-muted small mb-4">
        Responda às perguntas abaixo — <strong>cada resposta vira variável</strong> para a IA montar títulos, textos,
        botões e sugestões de imagem/vídeo para você <strong>copiar e colar no Gerenciador de Negócios</strong> (ou
        integrar via API no futuro).
      </p>
      <form onSubmit={onSubmit}>
        <Card className="lm-card-soft">
          <CardBody>
            <CardTitle tag="h6" className="mb-3 text-primary">
              Perguntas prontas (modelo briefing)
            </CardTitle>
            <Row className="g-3">
              {fields.map((f) => (
                <Col md={f.type === 'textarea' ? 12 : 6} key={f.id}>
                  <Label className="small fw-semibold">{f.label}</Label>
                  {f.type === 'select' ? (
                    <Input
                      type="select"
                      value={briefing[f.id] ?? ''}
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
                      onChange={(e) => setField(f.id, e.target.value)}
                      placeholder={f.placeholder}
                    />
                  ) : (
                    <Input
                      type="text"
                      value={briefing[f.id] ?? ''}
                      onChange={(e) => setField(f.id, e.target.value)}
                      placeholder={f.placeholder}
                    />
                  )}
                </Col>
              ))}
            </Row>
            <div className="mt-4 d-flex flex-wrap gap-2">
              <Button color="light" className="border" type="button" onClick={() => navigate('/leadmaster/inicio')}>
                Voltar
              </Button>
              <Button color="primary" type="submit" size="lg" className="rounded-pill px-4">
                Gerar campanha com IA
              </Button>
            </div>
          </CardBody>
        </Card>
      </form>
    </div>
  );
}
