import React, { Fragment, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Slider from 'react-slick';

import bg1 from '../../../assets/utils/images/originals/city.jpg';
import bg2 from '../../../assets/utils/images/originals/citydark.jpg';
import bg3 from '../../../assets/utils/images/originals/citynights.jpg';

import { Alert, Col, Row, Button, Form, FormGroup, Label, Input, Spinner } from 'reactstrap';
import { useAuth } from '../../../auth/AuthContext';

export default function Login() {
  const settings = useMemo(
    () => ({
      dots: true,
      infinite: true,
      speed: 500,
      arrows: true,
      slidesToShow: 1,
      slidesToScroll: 1,
      fade: true,
      initialSlide: 0,
      autoplay: true,
      adaptiveHeight: true,
    }),
    []
  );

  const { login, loginWithFacebook, completeFacebookHandoff } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const from = location.state?.from || '/leadmaster/inicio';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [fbBusy, setFbBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handoff = searchParams.get('handoff');
    if (!handoff) return;

    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const j = await completeFacebookHandoff(handoff);
        const target = j?.redirect || from;
        navigate(target, { replace: true });
      } catch (e) {
        if (alive) setError(e?.message || 'Falha ao concluir login Facebook.');
      } finally {
        if (alive) setLoading(false);
        searchParams.delete('handoff');
        setSearchParams(searchParams, { replace: true });
      }
    })();

    return () => {
      alive = false;
    };
  }, [searchParams, setSearchParams, completeFacebookHandoff, navigate, from]);

  useEffect(() => {
    const fb = searchParams.get('facebook');
    if (!fb || searchParams.get('handoff')) return;
    if (fb === 'denied') setError('Login cancelado no Facebook.');
    else if (fb === 'error') setError('Falha no login Facebook. Verifique META_APP_SECRET e o redirect URI na app Meta.');
    searchParams.delete('facebook');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const onFacebook = async () => {
    setError(null);
    setFbBusy(true);
    try {
      await loginWithFacebook(from);
    } catch (e) {
      setError(e?.message || 'Não foi possível abrir o Facebook.');
      setFbBusy(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Fragment>
      <div className="h-100">
        <Row className="h-100 g-0">
          <Col lg="4" className="d-none d-lg-block">
            <div className="slider-light">
              <Slider {...settings}>
                <div className="h-100 d-flex justify-content-center align-items-center bg-plum-plate">
                  <div className="slide-img-bg" style={{ backgroundImage: 'url(' + bg1 + ')' }} />
                  <div className="slider-content">
                    <h3>Guerova</h3>
                    <p>Entre com Facebook — campanhas Meta ligadas automaticamente.</p>
                  </div>
                </div>
                <div className="h-100 d-flex justify-content-center align-items-center bg-premium-dark">
                  <div className="slide-img-bg" style={{ backgroundImage: 'url(' + bg3 + ')' }} />
                  <div className="slider-content">
                    <h3>Só os seus dados</h3>
                    <p>Vê apenas as contas de anúncios do teu Facebook.</p>
                  </div>
                </div>
                <div className="h-100 d-flex justify-content-center align-items-center bg-sunny-morning">
                  <div className="slide-img-bg opacity-6" style={{ backgroundImage: 'url(' + bg2 + ')' }} />
                  <div className="slider-content">
                    <h3>Sem token manual</h3>
                    <p>Um clique para entrar e consultar campanhas.</p>
                  </div>
                </div>
              </Slider>
            </div>
          </Col>
          <Col lg="8" md="12" className="h-100 d-flex bg-white justify-content-center align-items-center">
            <Col lg="9" md="10" sm="12" className="mx-auto app-login-box">
              <div className="app-logo" />
              <h4 className="mb-0">
                <div>Bem-vindo,</div>
                <span>entre com o Facebook para continuar.</span>
              </h4>
              <Row className="divider" />

              {error && (
                <Alert color="danger" className="small">
                  {error}
                </Alert>
              )}

              {loading && searchParams.get('handoff') && (
                <div className="small text-muted mb-3">
                  <Spinner size="sm" className="me-2" /> A concluir login…
                </div>
              )}

              <Button color="primary" size="lg" className="w-100 mb-3" type="button" disabled={fbBusy || loading} onClick={onFacebook}>
                {fbBusy ? <Spinner size="sm" className="me-2" /> : null}
                Entrar com Facebook
              </Button>

              <p className="small text-muted text-center mb-3">
                Autoriza perfil e anúncios num único passo. As campanhas da tua conta ficam disponíveis em seguida.
              </p>

              <details className="small">
                <summary className="text-muted mb-2" style={{ cursor: 'pointer' }}>
                  Entrar com email e senha (equipa / admin)
                </summary>
                <Form onSubmit={onSubmit} className="mt-2">
                  <Row>
                    <Col md={6}>
                      <FormGroup>
                        <Label for="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="seu@email.com"
                          autoComplete="email"
                        />
                      </FormGroup>
                    </Col>
                    <Col md={6}>
                      <FormGroup>
                        <Label for="password">Senha</Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          autoComplete="current-password"
                        />
                      </FormGroup>
                    </Col>
                  </Row>
                  <Button color="outline-secondary" size="lg" type="submit" disabled={loading || fbBusy}>
                    {loading ? (
                      <>
                        <Spinner size="sm" className="me-2" /> Entrando…
                      </>
                    ) : (
                      'Entrar com email'
                    )}
                  </Button>
                </Form>
              </details>
            </Col>
          </Col>
        </Row>
      </div>
    </Fragment>
  );
}

