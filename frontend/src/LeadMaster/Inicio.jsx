import { Link } from 'react-router-dom';
import { Row, Col, Card, CardBody, Button, Badge } from 'reactstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faImage } from '@fortawesome/free-solid-svg-icons';
import { mockActiveListings, countActiveListings } from './mockData';

export default function Inicio() {
  const n = countActiveListings();

  return (
    <div className="p-4">
      <Row className="align-items-start g-4 mb-4">
        <Col lg={7}>
          <h1 className="lm-hero-title mb-2">
            Crie a sua campanha com <span className="lm-highlight">I.A.</span> para vender o seu imóvel
          </h1>
          <p className="text-muted mb-1" style={{ fontSize: '1.05rem', maxWidth: '38rem' }}>
            <strong>(Sem pagar caro e com você no controle)</strong>
          </p>
          <p className="text-muted mb-4" style={{ maxWidth: '38rem' }}>
            Você não precisa dominar tráfego pago: preenche o <strong>briefing do imóvel</strong> e a ferramenta
            devolve textos, títulos, botões e ideias de imagem/vídeo para colar no <strong>Gerenciador de Negócios</strong>
            — ou, no futuro, publicar via integração.
          </p>
          <Button
            tag={Link}
            color="primary"
            size="lg"
            className="rounded-pill px-4"
            to="/leadmaster/campanha/briefing"
          >
            Preencher briefing e gerar campanha
            <FontAwesomeIcon icon={faArrowRight} className="ms-2" />
          </Button>
        </Col>
        <Col lg={5} className="d-none d-lg-block text-center">
          <div
            className="mx-auto position-relative"
            style={{ maxWidth: 280, height: 200 }}
            aria-hidden="true"
          >
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 200,
                height: 130,
                background: 'linear-gradient(180deg, #a78bfa 0%, #6366f1 100%)',
                borderRadius: '12px 12px 4px 4px',
                boxShadow: '0 20px 40px rgba(99,102,241,0.25)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 28,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 150,
                height: 90,
                background: '#f8fafc',
                borderRadius: 8,
                border: '3px solid #e2e8f0',
              }}
            />
          </div>
        </Col>
      </Row>

      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h2 className="h5 mb-0">
          Imóveis ativos <Badge color="primary">{n}</Badge>
        </h2>
        <span className="text-muted small">Prévia do que pode ir para o anúncio (mock)</span>
      </div>
      <div className="d-flex gap-3 overflow-auto pb-2" style={{ scrollSnapType: 'x mandatory' }}>
        {mockActiveListings.map((listing) => (
          <Card
            key={listing.id}
            className="lm-card-soft flex-shrink-0"
            style={{ width: 300, scrollSnapAlign: 'start', borderTop: `4px solid ${listing.accent}` }}
          >
            <CardBody>
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <div className="fw-bold">{listing.title}</div>
                  <div className="small text-muted">
                    {listing.neighborhood} · {listing.city}
                  </div>
                </div>
                <Badge color="success" pill>
                  {listing.status}
                </Badge>
              </div>
              <div className="small fw-semibold text-primary mb-1">{listing.price}</div>
              {listing.beds != null && (
                <div className="small text-muted mb-2">{listing.beds} quartos</div>
              )}
              <div
                className="rounded border bg-light p-2 mb-2 small"
                style={{ minHeight: 72, borderLeft: `3px solid ${listing.accent}` }}
              >
                <div className="text-muted text-uppercase" style={{ fontSize: 10 }}>
                  Prévia do anúncio
                </div>
                <div className="fw-semibold">{listing.adPreview.headline}</div>
                <div className="text-muted" style={{ fontSize: 12 }}>
                  {listing.adPreview.primaryText}
                </div>
                <Badge color="light" className="text-dark border mt-1">
                  {listing.adPreview.cta}
                </Badge>
              </div>
              <div className="d-flex align-items-center text-muted small">
                <FontAwesomeIcon icon={faImage} className="me-1" />
                Criativo sugerido: foto 4:5 + carrossel
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
