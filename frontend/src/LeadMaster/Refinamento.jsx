import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Row,
  Col,
  Card,
  CardBody,
  CardTitle,
  Label,
  Input,
  Button,
  Progress,
  ListGroup,
  ListGroupItem,
  Alert,
} from 'reactstrap';
import { mockAiOptimizationTips } from './mockData';

const steps = ['Briefing do imóvel', 'Refino + público', 'Campanha pronta'];

export default function Refinamento() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const briefing = state?.briefing;
  const propertyTitle = briefing?.propertyTitle || 'Imóvel';

  const [city, setCity] = useState(briefing?.city || 'Mogi das Cruzes — SP');
  const [centerPoint, setCenterPoint] = useState('Av. Bandeirantes, 1000 (referência)');
  const [radiusKm, setRadiusKm] = useState(12);
  const [focus, setFocus] = useState('Venda');
  const [propertyType, setPropertyType] = useState(briefing?.propertyType || 'Apartamento');
  const [priceMin, setPriceMin] = useState(150000);
  const [priceMax, setPriceMax] = useState(800000);
  const [salesVideoUrl, setSalesVideoUrl] = useState(
    briefing?.instagramListingUrl || 'https://www.instagram.com/reel/SEU_REEL_AQUI/'
  );

  const activeStep = 1;

  return (
    <div className="p-4">
      <h2 className="h4 mb-3">Refinar campanha</h2>
      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
        {steps.map((label, i) => (
          <div key={label} className="d-flex align-items-center gap-2">
            <span
              className={`lm-stepper-dot ${i < activeStep ? 'done' : ''} ${i === activeStep ? 'active' : ''}`}
            />
            <span className={`small ${i === activeStep ? 'fw-bold text-primary' : 'text-muted'}`}>{label}</span>
            {i < steps.length - 1 && <span className="text-muted px-1">→</span>}
          </div>
        ))}
      </div>
      <Progress value={55} className="mb-4" style={{ height: 6 }} />

      <Row className="g-3">
        <Col lg={8}>
          <Card className="lm-card-soft mb-3">
            <CardBody>
              <CardTitle tag="h6" className="mb-3">
                Vídeo de venda do imóvel
              </CardTitle>
              <Label>URL do vídeo (Reels, YouTube, drive público)</Label>
              <Input
                value={salesVideoUrl}
                onChange={(e) => setSalesVideoUrl(e.target.value)}
                placeholder="Cole o link do vídeo de tour ou depoimento"
              />
              <small className="text-muted d-block mt-1">
                Esse link entra no pacote como referência para duplicar o conjunto “só vídeo” no Meta.
              </small>
            </CardBody>
          </Card>

          <Card className="lm-card-soft mb-3">
            <CardBody>
              <CardTitle tag="h6" className="mb-3">
                Localização: cidade + raio a partir de um ponto
              </CardTitle>
              <Row className="g-3">
                <Col md={6}>
                  <Label>Cidade / região (nome no anúncio)</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} />
                </Col>
                <Col md={6}>
                  <Label>Ponto central (endereço, empreendimento ou pin)</Label>
                  <Input value={centerPoint} onChange={(e) => setCenterPoint(e.target.value)} />
                </Col>
                <Col md={12}>
                  <Label>Raio: {radiusKm} km</Label>
                  <Input
                    type="range"
                    min={1}
                    max={50}
                    value={radiusKm}
                    onChange={(e) => setRadiusKm(Number(e.target.value))}
                  />
                  <small className="text-muted">
                    Equivale ao público geográfico “pessoas que vivem em raio de X km” no Gerenciador.
                  </small>
                </Col>
                <Col md={6}>
                  <Label>Foco principal</Label>
                  <Input type="select" value={focus} onChange={(e) => setFocus(e.target.value)}>
                    <option>Venda</option>
                    <option>Locação</option>
                    <option>Lançamento</option>
                  </Input>
                </Col>
                <Col md={6}>
                  <Label>Tipo de imóvel</Label>
                  <Input type="select" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
                    <option>Apartamento</option>
                    <option>Casa</option>
                    <option>Terreno</option>
                    <option>Comercial</option>
                  </Input>
                </Col>
                <Col md={12}>
                  <Label>Faixa de preço (intenção)</Label>
                  <div className="d-flex gap-2 align-items-center flex-wrap">
                    <Input
                      type="number"
                      style={{ maxWidth: 140 }}
                      value={priceMin}
                      onChange={(e) => setPriceMin(Number(e.target.value))}
                    />
                    <span className="text-muted">até</span>
                    <Input
                      type="number"
                      style={{ maxWidth: 140 }}
                      value={priceMax}
                      onChange={(e) => setPriceMax(Number(e.target.value))}
                    />
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>

          <Card className="lm-card-soft border-primary border-opacity-25">
            <CardBody>
              <CardTitle tag="h6" className="mb-2">
                Otimização de campanha por IA (preview)
              </CardTitle>
              <p className="small text-muted mb-3">
                A IA analisa métricas (mock) e sugere ações: saldo, criativo, lance, exclusões de público, etc.
              </p>
              <ListGroup flush className="rounded border small">
                {mockAiOptimizationTips.map((tip) => (
                  <ListGroupItem key={tip} className="d-flex gap-2 border-light">
                    <span aria-hidden="true">
                      💡
                    </span>
                    <span>{tip}</span>
                  </ListGroupItem>
                ))}
              </ListGroup>
              <Alert color="info" className="mt-3 mb-0 small">
                Em produção, isso conecta aos dados reais da conta (CAPI, custo por mensagem, criativo por ID).
              </Alert>
            </CardBody>
          </Card>

          <div className="mt-4 d-flex gap-2">
            <Button color="light" className="border" type="button" onClick={() => navigate(-1)}>
              Voltar
            </Button>
            <Button color="primary" type="button" onClick={() => navigate('/leadmaster/dashboard')}>
              Ir para relatórios
            </Button>
          </div>
        </Col>
        <Col lg={4}>
          <Card className="lm-card-soft border-primary border-opacity-25">
            <CardBody>
              <CardTitle tag="h6">Resumo</CardTitle>
              <ul className="small ps-3 mb-0">
                <li>
                  <strong>Imóvel:</strong> {propertyTitle}
                </li>
                <li>
                  <strong>Cidade:</strong> {city}
                </li>
                <li>
                  <strong>Raio:</strong> {radiusKm} km de {centerPoint}
                </li>
                <li>
                  <strong>Foco:</strong> {focus}
                </li>
                <li>
                  <strong>Tipo:</strong> {propertyType}
                </li>
                <li>
                  <strong>Preço:</strong> R$ {priceMin.toLocaleString('pt-BR')} – R${' '}
                  {priceMax.toLocaleString('pt-BR')}
                </li>
                <li className="mt-2">
                  <strong>Vídeo:</strong>{' '}
                  <span className="text-muted text-break">{salesVideoUrl}</span>
                </li>
              </ul>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
