import React, { Fragment, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/leadmaster/inicio';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
                    <p>Entre para acessar sua conta e seus dados.</p>
                  </div>
                </div>
                <div className="h-100 d-flex justify-content-center align-items-center bg-premium-dark">
                  <div className="slide-img-bg" style={{ backgroundImage: 'url(' + bg3 + ')' }} />
                  <div className="slider-content">
                    <h3>Admin do sistema</h3>
                    <p>Gerencie contas e permissões globais.</p>
                  </div>
                </div>
                <div className="h-100 d-flex justify-content-center align-items-center bg-sunny-morning">
                  <div className="slide-img-bg opacity-6" style={{ backgroundImage: 'url(' + bg2 + ')' }} />
                  <div className="slider-content">
                    <h3>Usuários por conta</h3>
                    <p>Permissões específicas por cliente/empresa.</p>
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
                <span>faça login para continuar.</span>
              </h4>
              <Row className="divider" />

              <Form onSubmit={onSubmit}>
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
                        required
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
                        required
                      />
                    </FormGroup>
                  </Col>
                </Row>

                {error && (
                  <Alert color="danger" className="small">
                    {error}
                  </Alert>
                )}

                <div className="d-flex align-items-center">
                  <div className="ms-auto">
                    <Button color="primary" size="lg" type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Spinner size="sm" className="me-2" /> Entrando…
                        </>
                      ) : (
                        'Entrar'
                      )}
                    </Button>
                  </div>
                </div>
              </Form>
              <p className="text-muted small mt-3 mb-0">
                Dica: criei um usuário demo: <code>admin@guerova.local</code> / <code>admin123</code>
              </p>
            </Col>
          </Col>
        </Row>
      </div>
    </Fragment>
  );
}
