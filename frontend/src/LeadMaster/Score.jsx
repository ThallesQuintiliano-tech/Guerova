import { useMemo, useState } from 'react';
import { Alert, Button, Card, CardBody, CardTitle, Col, Input, Label, Row, Spinner, Table } from 'reactstrap';
import { useAuth } from '../auth/AuthContext';

const onlyDigits = (s) => String(s || '').replace(/\D+/g, '');

export default function Score() {
  const { apiFetch } = useAuth();
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const cpfDigits = useMemo(() => onlyDigits(cpf), [cpf]);
  const canSubmit = cpfDigits.length === 11 && !loading;

  const onSearch = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const r = await apiFetch('/api/admin/score/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf: cpfDigits }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.message || j?.error || 'Falha ao consultar score.');
      setData(j);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const enrichments = Array.isArray(data?.result?.enrichments) ? data.result.enrichments : [];
  const scores = enrichments[0]?.scores && Array.isArray(enrichments[0].scores) ? enrichments[0].scores : [];

  return (
    <div className="p-4">
      <h2 className="h4 mb-3">Score — Serasa Experian (Anti Fraud Scores)</h2>

      {error && (
        <Alert color="danger" className="small">
          {error}
        </Alert>
      )}

      <Row className="g-3">
        <Col lg={5}>
          <Card className="lm-card-soft">
            <CardBody>
              <CardTitle tag="h6" className="mb-3">
                Pesquisar por CPF
              </CardTitle>

              <div className="mb-2">
                <Label>CPF (11 dígitos)</Label>
                <Input
                  inputMode="numeric"
                  placeholder="Somente números"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                />
              </div>

              <Button color="primary" className="rounded-pill" onClick={onSearch} disabled={!canSubmit}>
                {loading ? (
                  <>
                    <Spinner size="sm" className="me-2" /> Consultando…
                  </>
                ) : (
                  'Consultar'
                )}
              </Button>

              <div className="small text-muted mt-3">
                Endpoint: <code>/api/admin/score/people</code>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col lg={7}>
          <Card className="lm-card-soft">
            <CardBody>
              <CardTitle tag="h6" className="mb-3">
                Resultado
              </CardTitle>

              {data ? (
                <>
                  <div className="small text-muted mb-2">
                    CPF consultado: <code>{data.cpf}</code>
                  </div>
                  <div className="table-responsive">
                    <Table size="sm" className="mb-0">
                      <thead>
                        <tr>
                          <th>Modelo</th>
                          <th>Score</th>
                          <th>Risco</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scores.map((s, idx) => (
                          <tr key={`${s.model || 'model'}-${idx}`}>
                            <td>{s.model}</td>
                            <td>{s.score}</td>
                            <td>{s.recomendationRiskEnum}</td>
                          </tr>
                        ))}
                        {!scores.length ? (
                          <tr>
                            <td colSpan={3} className="text-muted">
                              Nenhum score retornado.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </Table>
                  </div>

                  <details className="mt-3">
                    <summary className="small">Ver JSON completo</summary>
                    <pre className="small mb-0">{JSON.stringify(data.result, null, 2)}</pre>
                  </details>
                </>
              ) : (
                <div className="text-muted small">Faça uma consulta para ver o resultado.</div>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

